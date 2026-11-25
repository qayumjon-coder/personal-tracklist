-- ============================================================
-- Fronto Music Player — Security Hardening Migration
-- Run this SQL in your Supabase SQL Editor
-- ============================================================

-- 1. Admin check helper
-- Requires app_metadata.role = 'admin' on the admin user.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- ============================================================
-- 2. Upload Permissions & Requests Privacy (Fix Fingerprint Leak)
-- ============================================================

-- Remove legacy & duplicate policies cleanly
DROP POLICY IF EXISTS "User reads own permission" ON public.upload_permissions;
DROP POLICY IF EXISTS "Admin grants permission" ON public.upload_permissions;
DROP POLICY IF EXISTS "Admin revokes permission" ON public.upload_permissions;
DROP POLICY IF EXISTS "Only admins read permissions" ON public.upload_permissions;
DROP POLICY IF EXISTS "Only admins grant permissions" ON public.upload_permissions;
DROP POLICY IF EXISTS "Only admins update permissions" ON public.upload_permissions;
DROP POLICY IF EXISTS "Only admins delete permissions" ON public.upload_permissions;

DROP POLICY IF EXISTS "Admin reads requests" ON public.upload_requests;
DROP POLICY IF EXISTS "Admin updates requests" ON public.upload_requests;
DROP POLICY IF EXISTS "Anyone can submit request" ON public.upload_requests;
DROP POLICY IF EXISTS "Only admins read requests" ON public.upload_requests;
DROP POLICY IF EXISTS "Only admins update requests" ON public.upload_requests;
DROP POLICY IF EXISTS "Only admins delete requests" ON public.upload_requests;
DROP POLICY IF EXISTS "Guests can submit bounded upload requests" ON public.upload_requests;

-- Only admins can query/manage raw permission & request tables
CREATE POLICY "Only admins read permissions"
  ON public.upload_permissions FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Only admins grant permissions"
  ON public.upload_permissions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins update permissions"
  ON public.upload_permissions FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins delete permissions"
  ON public.upload_permissions FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Only admins read requests"
  ON public.upload_requests FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Only admins update requests"
  ON public.upload_requests FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins delete requests"
  ON public.upload_requests FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Controlled public request insertion with length validation
CREATE POLICY "Guests can submit bounded upload requests"
  ON public.upload_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND char_length(trim(requester_name)) BETWEEN 1 AND 60
    AND char_length(coalesce(requester_message, '')) <= 300
    AND char_length(fingerprint) BETWEEN 10 AND 128
  );

-- Safe RPC: Guests check ONLY their own fingerprint status without reading the whole table
CREATE OR REPLACE FUNCTION public.get_my_upload_status(p_fingerprint text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_perm boolean;
  v_req_status text;
BEGIN
  IF p_fingerprint IS NULL OR char_length(p_fingerprint) < 10 THEN
    RETURN 'none';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.upload_permissions
    WHERE fingerprint = p_fingerprint
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_has_perm;

  IF v_has_perm THEN
    RETURN 'granted';
  END IF;

  SELECT status
  FROM public.upload_requests
  WHERE fingerprint = p_fingerprint
  ORDER BY created_at DESC
  LIMIT 1
  INTO v_req_status;

  IF v_req_status = 'pending' THEN
    RETURN 'pending';
  ELSIF v_req_status = 'rejected' THEN
    RETURN 'denied';
  END IF;

  RETURN 'none';
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_upload_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_upload_status(text) TO anon, authenticated;

-- ============================================================
-- 3. Songs Table RLS & Guest Upload Quota Enforcement
-- ============================================================

-- Helper checking whether a guest fingerprint holds active permission & is within quota (max 7)
CREATE OR REPLACE FUNCTION public.can_guest_upload(p_fingerprint text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_fingerprint IS NOT NULL
    AND char_length(p_fingerprint) BETWEEN 10 AND 128
    AND EXISTS (
      SELECT 1 FROM public.upload_permissions
      WHERE fingerprint = p_fingerprint
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())
    )
    AND (
      SELECT count(*) FROM public.songs
      WHERE uploader_fp = p_fingerprint
    ) < 7;
$$;

DROP POLICY IF EXISTS "Public read songs" ON public.songs;
DROP POLICY IF EXISTS "Public can view songs" ON public.songs;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.songs;
DROP POLICY IF EXISTS "Admin update songs" ON public.songs;
DROP POLICY IF EXISTS "Admins can update songs" ON public.songs;
DROP POLICY IF EXISTS "Only admins update songs" ON public.songs;
DROP POLICY IF EXISTS "Admin delete songs" ON public.songs;
DROP POLICY IF EXISTS "Admins can delete songs" ON public.songs;
DROP POLICY IF EXISTS "Only admins delete songs" ON public.songs;
DROP POLICY IF EXISTS "Authorized insert songs" ON public.songs;
DROP POLICY IF EXISTS "Admins or permitted uploaders can insert songs" ON public.songs;

CREATE POLICY "Public read songs"
  ON public.songs FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authorized insert songs"
  ON public.songs FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    public.is_admin() OR public.can_guest_upload(uploader_fp)
  );

CREATE POLICY "Only admins update songs"
  ON public.songs FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins delete songs"
  ON public.songs FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- 4. Storage Bucket & Object Policies (Block SVG/HTML, Restrict Mutating Ops)
-- ============================================================
UPDATE storage.buckets
SET
  file_size_limit = 20971520, -- 20MB limit
  allowed_mime_types = ARRAY[
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav',
    'audio/flac', 'audio/x-flac', 'audio/ogg', 'audio/aac', 'audio/mp4',
    'audio/m4a', 'audio/x-m4a', 'audio/webm',
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'
  ]
WHERE id = 'music-files';

DROP POLICY IF EXISTS "Public can view music files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update music files" ON storage.objects;
DROP POLICY IF EXISTS "Only admins update music files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete music files" ON storage.objects;
DROP POLICY IF EXISTS "Only admins delete music files" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload to music files" ON storage.objects;

CREATE POLICY "Public can view music files"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'music-files');

CREATE POLICY "Only admins update music files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'music-files' AND public.is_admin())
  WITH CHECK (bucket_id = 'music-files' AND public.is_admin());

CREATE POLICY "Only admins delete music files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'music-files' AND public.is_admin());

CREATE POLICY "Allow upload to music files"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'music-files'
    AND (
      public.is_admin()
      OR (storage.foldername(name))[1] = ANY (ARRAY['audio'::text, 'covers'::text])
    )
  );
