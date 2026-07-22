import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
  const [fingerprint] = useState(getFingerprint);

  const checkPermission = async () => {
    setStatus('checking');
    try {
      const now = new Date().toISOString();

      // Check active permissions
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
        // Filter out expired
        const valid = perms.filter(p =>
          !p.expires_at || new Date(p.expires_at) > new Date(now)
        );
        if (valid.length > 0) {
          setStatus('granted');
          return;
        }
      }

      // Check pending requests
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
  };

  useEffect(() => {
    checkPermission();
  }, [fingerprint]);

  const submitRequest = async (name: string, message: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Prevent duplicate pending requests
      const { data: existing } = await supabase
        .from('upload_requests')
        .select('id, status')
        .eq('fingerprint', fingerprint)
        .eq('status', 'pending');

      if (existing && existing.length > 0) {
        return { success: false, error: 'Sizda allaqachon kutilayotgan so\'rov mavjud.' };
      }

      const { error } = await supabase
        .from('upload_requests')
        .insert([{
          requester_name: name.trim(),
          requester_message: message.trim(),
          fingerprint,
          status: 'pending',
        }]);

      if (error) {
        throw error;
      }

      localStorage.setItem('fronto_uploader_name', name.trim());
      setStatus('pending');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'So\'rov yuborishda xatolik' };
    }
  };

  return { status, fingerprint, checkPermission, submitRequest };
}
