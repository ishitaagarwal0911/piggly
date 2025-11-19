import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isInitialized: boolean;
  sendOTP: (email: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const initAuth = async () => {
      // Set up auth state listener FIRST
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (mounted) {
            setSession(session);
            setUser(session?.user ?? null);
          }
        }
      );

      // Check for cached session in localStorage for instant restore
      try {
        const cachedSession = localStorage.getItem('supabase.auth.token');
        if (cachedSession && mounted) {
          const parsed = JSON.parse(cachedSession);
          if (parsed.currentSession) {
            setSession(parsed.currentSession);
            setUser(parsed.currentSession.user);
          }
        }
      } catch (e) {
        // Ignore cache errors
      }

      // Set loading false immediately for instant render
      if (mounted) {
        setLoading(false);
        setIsInitialized(true);
      }

      // THEN verify session in background
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted && session) {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('[Auth] Init error:', error);
      }

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    };

    initAuth();
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
    <AuthContext.Provider value={{ user, session, loading, isInitialized, sendOTP, verifyOtp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
