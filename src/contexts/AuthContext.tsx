import { createContext, useContext, useLayoutEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isInitialized: boolean;
  sendOTP: (email: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Get the correct Supabase localStorage key (sb-<project-ref>-auth-token)
const getSupabaseStorageKey = (): string => {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const matches = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  const projectRef = matches?.[1] || '';
  return `sb-${projectRef}-auth-token`;
};

const STORAGE_KEY = getSupabaseStorageKey();

// Decode JWT and check if expired (with 60-second buffer)
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiry = payload.exp * 1000;
    return Date.now() >= expiry - 60000;
  } catch {
    return true;
  }
};

// Synchronous cache read at module level - checks refresh_token validity
const getCachedAuthState = (): { user: User | null; session: Session | null } => {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const session = JSON.parse(cached);
      if (session?.refresh_token && !isTokenExpired(session.refresh_token)) {
        return { user: session.user, session };
      }
    }
  } catch {
    // Ignore cache errors
  }
  return { user: null, session: null };
};

const initialAuth = getCachedAuthState();

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(initialAuth.user);
  const [session, setSession] = useState<Session | null>(initialAuth.session);
  const [isInitialized] = useState(true); // Always true - deterministic initial state

  useLayoutEffect(() => {
    let mounted = true;
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
        }
      }
    );

    // Background session verification/refresh (won't cause redirects)
    supabase.auth.getSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const sendOTP = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/`
      }
    });
    if (error) throw error;
  };

  const verifyOtp = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    });
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, isInitialized, sendOTP, verifyOtp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
