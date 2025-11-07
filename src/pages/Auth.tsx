import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
const authIcon = '/piggly-auth.png';
import { isPWA } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const { user, loading, isInitialized, sendOTP, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    if (user && isInitialized && sessionReady) {
      const timer = setTimeout(() => {
        navigate('/', { replace: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, isInitialized, sessionReady, navigate]);

  // Handle code exchange for session
  useEffect(() => {
    const handleSessionExchange = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      
      if (code) {
        try {
          await supabase.auth.exchangeCodeForSession(code);
          await new Promise(resolve => setTimeout(resolve, 200));
          setSessionReady(true);
        } catch (error) {
          console.error('Session exchange failed:', error);
          setSessionReady(true);
        }
        return;
      }
      
      // Handle hash-based tokens as fallback
      const hash = window.location.hash;
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          try {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            await new Promise(resolve => setTimeout(resolve, 200));
            setSessionReady(true);
          } catch (error) {
            console.error('Hash session failed:', error);
            setSessionReady(true);
          }
          return;
        }
      }

      // No code/hash params - check existing session
      const { data: { session } } = await supabase.auth.getSession();
      setSessionReady(true);
    };

    handleSessionExchange();
  }, []);

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      await sendOTP(email);
      setLinkSent(true);
      toast.success('Check your email for the sign-in link');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send sign-in link');
      if (import.meta.env.DEV) {
        console.error(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    try {
      await sendOTP(email);
      toast.success('Sign-in link resent to your email');
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setLinkSent(false);
    setEmail('');
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in with Google');
      console.error(error);
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 py-4 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-40 h-40 mb-6 relative">
            <img 
              src={authIcon} 
              alt="Piggly - Personal Finance Tracker" 
              className="w-full h-full object-contain drop-shadow-lg"
              decoding="async"
            />
          </div>
          <h1 className="text-2xl font-bold text-center text-foreground mb-2">
            Welcome to Piggly
          </h1>
          <p className="text-muted-foreground text-center">
            A place where you can track all your expenses and income.
          </p>
        </div>

        {!linkSent ? (
          <div className="space-y-6 pt-2">
            {/* Google Sign-In */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full h-12 gap-3 bg-background hover:bg-accent"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or sign in with email</span>
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={handleSendMagicLink} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-12"
                />
              </div>

              <Button 
                type="submit" 
                size="lg" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Sign-In Link'}
              </Button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-secondary/50 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-base font-medium text-foreground">Check your email!</p>
                <p className="text-sm text-muted-foreground">
                  We sent a secure sign-in link to
                </p>
                <p className="text-sm font-medium text-foreground">{email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-muted-foreground space-y-2 bg-secondary/30 rounded-xl p-4">
                <p>• Click the link in your email to sign in</p>
                <p>• The link expires in 1 hour</p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  disabled={isLoading}
                  className="gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResend}
                  disabled={isLoading}
                >
                  Resend Link
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
