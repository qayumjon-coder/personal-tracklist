import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { UPLOAD_LIMITS } from '../utils/constants';

export type PermissionStatus = 'checking' | 'granted' | 'denied' | 'pending' | 'none';

// Generate or retrieve a stable browser fingerprint stored in localStorage
function getFingerprint(): string {
  const key = 'fronto_fp';
  let fp = localStorage.getItem(key);
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem(key, fp);
  }
  return fp;
}

export function useUploadPermission() {
  const [status, setStatus] = useState<PermissionStatus>('checking');
  const [guestUploadCount, setGuestUploadCount] = useState<number>(0);
  const [fingerprint] = useState(getFingerprint);

  const checkPermission = useCallback(async () => {
    setStatus('checking');
    try {
      // Check how many songs this guest has already uploaded (best effort)
      const { count } = await supabase
        .from('songs')
        .select('id', { count: 'exact', head: true })
        .eq('uploader_fp', fingerprint);
      if (typeof count === 'number') {
        setGuestUploadCount(count);
      }

      // Preferred path: privacy-preserving RPC (after security_hardening_migration.sql)
      const { data: rpcStatus, error: rpcError } = await supabase.rpc('get_my_upload_status', {
        p_fingerprint: fingerprint,
      });

      if (!rpcError && typeof rpcStatus === 'string') {
        const validStatuses: PermissionStatus[] = ['granted', 'denied', 'pending', 'none'];
        setStatus(validStatuses.includes(rpcStatus as PermissionStatus) ? (rpcStatus as PermissionStatus) : 'none');
        return;
      }

      // Fallback path if RPC is not yet deployed in Supabase
      const now = new Date().toISOString();
      const { data: perms, error } = await supabase
        .from('upload_permissions')
        .select('id, expires_at, is_active')
        .eq('fingerprint', fingerprint)
        .eq('is_active', true);

      if (error) {
        console.error('Permission check error:', error);
        setStatus('denied');
        return;
      }

      if (perms && perms.length > 0) {
        const valid = perms.filter(p => !p.expires_at || new Date(p.expires_at) > new Date(now));
        if (valid.length > 0) {
          setStatus('granted');
          return;
        }
      }

      const { data: reqs } = await supabase
        .from('upload_requests')
        .select('id, status')
        .eq('fingerprint', fingerprint)
        .order('created_at', { ascending: false })
        .limit(1);

      if (reqs && reqs.length > 0) {
        if (reqs[0].status === 'pending') {
          setStatus('pending');
          return;
        }
        if (reqs[0].status === 'rejected') {
          setStatus('denied');
          return;
        }
      }

      setStatus('none');
    } catch (err) {
      console.error('Error checking permissions:', err);
      setStatus('denied');
    }
  }, [fingerprint]);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  const submitRequest = async (name: string, message: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanName = name.trim().slice(0, 60);
      const cleanMsg = message.trim().slice(0, 300);
      if (!cleanName) {
        return { success: false, error: 'Iltimos, ismingizni kiriting.' };
      }

      const { data: existing } = await supabase
        .from('upload_requests')
        .select('id, status')
        .eq('fingerprint', fingerprint)
        .eq('status', 'pending');

      if (existing && existing.length > 0) {
        return { success: false, error: "Sizda allaqachon kutilayotgan so'rov mavjud." };
      }

      const { error } = await supabase
        .from('upload_requests')
        .insert([{
          requester_name: cleanName,
          requester_message: cleanMsg,
          fingerprint,
          status: 'pending',
        }]);

      if (error) throw error;

      localStorage.setItem('fronto_uploader_name', cleanName);
      setStatus('pending');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "So'rov yuborishda xatolik" };
    }
  };

  const remainingGuestQuota = Math.max(0, UPLOAD_LIMITS.MAX_SONGS_PER_GUEST - guestUploadCount);

  return { status, fingerprint, guestUploadCount, remainingGuestQuota, checkPermission, submitRequest };
}
