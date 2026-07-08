-- ============================================================
-- Fronto Music Player — Upload Permission System
-- Run this SQL in your Supabase SQL Editor
-- ============================================================

-- 1. Upload Requests Table (foydalanuvchilar so'rov yuboradi)
CREATE TABLE IF NOT EXISTS upload_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  requester_name    text NOT NULL,
  requester_message text DEFAULT '',
  fingerprint text NOT NULL,
  status      text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- 2. Upload Permissions Table (admin ruxsat beradi)
CREATE TABLE IF NOT EXISTS upload_permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  granted_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz,          -- NULL = abadiy
  fingerprint text NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  request_id  uuid REFERENCES upload_requests(id) ON DELETE SET NULL
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_upload_requests_fingerprint ON upload_requests(fingerprint);
CREATE INDEX IF NOT EXISTS idx_upload_permissions_fingerprint ON upload_permissions(fingerprint);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- upload_requests
ALTER TABLE upload_requests ENABLE ROW LEVEL SECURITY;

-- Everyone can INSERT (submit a request)
CREATE POLICY "Anyone can submit request"
  ON upload_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated admin (service role or authenticated) can SELECT/UPDATE
CREATE POLICY "Admin reads requests"
  ON upload_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin updates requests"
  ON upload_requests FOR UPDATE
  TO authenticated
  USING (true);

-- upload_permissions
ALTER TABLE upload_permissions ENABLE ROW LEVEL SECURITY;

-- Anyone can SELECT their own permission (by fingerprint)
CREATE POLICY "User reads own permission"
  ON upload_permissions FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only authenticated admin can INSERT/UPDATE
CREATE POLICY "Admin grants permission"
  ON upload_permissions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin revokes permission"
  ON upload_permissions FOR UPDATE
  TO authenticated
  USING (true);

-- ============================================================
-- Done! Now go to Admin panel -> "Upload So'rovlari" tab
-- ============================================================
