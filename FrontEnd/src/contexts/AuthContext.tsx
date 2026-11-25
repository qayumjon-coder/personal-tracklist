import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Checks whether an authenticated Supabase user holds admin privileges.
 * Enforces `app_metadata.role === 'admin'` if set, or matches `VITE_ADMIN_EMAIL` when configured.
 */
function checkIsAdmin(session: Session | null): boolean {
  if (!session?.user) return false;
  const role = session.user.app_metadata?.role;
  const configuredAdminEmail = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim().toLowerCase();

  if (role && role !== 'admin') return false;
  if (configuredAdminEmail) {
    return (
      role === 'admin' ||
      session.user.email?.toLowerCase() === configuredAdminEmail
    );
  }
  return true;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(checkIsAdmin(session) ? session : null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(checkIsAdmin(nextSession) ? nextSession : null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { success: false, message: error.message };
    }
    if (!checkIsAdmin(data.session)) {
      await supabase.auth.signOut();
      return { success: false, message: 'Access Denied: Admin privileges required.' };
    }
    return { success: true, message: 'Access Granted' };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: checkIsAdmin(session),
        isLoading,
        user: session?.user ?? null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
