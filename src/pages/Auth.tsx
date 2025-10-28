import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Mail, ArrowLeft, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import piggyImage from '@/assets/piggy.png';
import { isPWA } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const { user, loading, isInitialized, sendOTP, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (user && isInitialized) {
      navigate('/', { replace: true });
    }
  }, [user, isInitialized, navigate]);

  // Check for verification success from magic link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isVerified = params.get('verified') === 'true';
    const shouldReturnToPWA = params.get('return') === 'pwa';
    const code = params.get('code');
    
    // Handle code exchange for session
    if (code) {
      supabase.auth.exchangeCodeForSession(code).catch(() => {
        // Silently fail, user can retry with OTP
      });
    }
    
    // Handle hash-based tokens as fallback
    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      
      if (accessToken && refreshToken) {
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        }).catch(() => {
          // Silently fail, user can retry with OTP
        });
      }
    }
    
    if (isVerified) {
      setVerified(true);
      
      // If in browser (not PWA), show message to return to PWA
      if (shouldReturnToPWA && !isPWA()) {
        toast.success('Successfully signed in!', {
          description: 'Please open Piggly from your home screen to continue.',
          duration: 10000,
        });
      } else {
        // In PWA or regular browser, show success and redirect
        toast.success('Successfully signed in!');
        // Let the user/session check in the first useEffect handle the redirect
      }
    }
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
      console.error(error);
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
    setOtp('');
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setVerifying(true);
    try {
      await verifyOtp(email, otp);
      toast.success('Successfully signed in!');
      // Let onAuthStateChange handle the redirect
    } catch (error: any) {
      if (error.message?.includes('expired')) {
        toast.error('Code expired. Please request a new one.');
      } else if (error.message?.includes('invalid')) {
        toast.error('Invalid code. Please check and try again.');
      } else {
        toast.error(error.message || 'Failed to verify code');
      }
      console.error(error);
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          {verified && (
            <p className="text-sm text-muted-foreground">Completing sign in...</p>
          )}
        </div>
      </div>
    );
  }

  // Show success screen if verified
  if (verified && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md bg-card rounded-2xl p-8 shadow-notion space-y-6 text-center">
          <div className="flex justify-center">
            <img src={piggyImage} alt="Piggly" className="w-28 h-28 object-contain opacity-90" />
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">
                ✓ Successfully Signed In!
              </h2>
              
              {!isPWA() ? (
                <div className="space-y-3 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Please open <span className="font-semibold text-foreground">Piggly</span> from your home screen to continue
                  </p>
                  <div className="bg-secondary/50 rounded-xl p-4 text-xs text-muted-foreground">
                    Your session is saved and you'll be automatically logged in when you open the app
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Redirecting you to your dashboard...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md bg-card rounded-2xl p-8 shadow-notion space-y-6">
        {/* Piggy Image */}
        <div className="flex justify-center">
          <img src={piggyImage} alt="Piggly" className="w-28 h-28 object-contain opacity-90" />
        </div>

        {/* Welcome Text */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Welcome to Piggly
          </h1>
          <p className="text-sm text-muted-foreground">
            A place where you can track all your expenses and income
          </p>
        </div>

        {!linkSent ? (
          <div className="space-y-6 pt-2">
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

            {/* OTP Input - Recommended for iOS PWA */}
            <div className="space-y-4">
              <div className="text-center space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {isPWA() ? 'Enter the 6-digit code' : 'Or enter the 6-digit code'}
                  </p>
                  {isPWA() && (
                    <p className="text-xs text-muted-foreground">
                      Recommended on iPhone
                    </p>
                  )}
                </div>
                
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    disabled={verifying}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button
                  onClick={handleVerify}
                  disabled={verifying || otp.length !== 6}
                  className="w-full"
                >
                  {verifying ? 'Verifying...' : 'Verify Code'}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-muted-foreground space-y-2 bg-secondary/30 rounded-xl p-4">
                <p>• Click the link in your email to sign in</p>
                <p>• Or enter the 6-digit code above</p>
                <p>• The code expires in 1 hour</p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  disabled={isLoading || verifying}
                  className="gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSendMagicLink({ preventDefault: () => {} } as any)}
                  disabled={isLoading || verifying}
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
