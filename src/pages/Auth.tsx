import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import piggyImage from '@/assets/piggy.png';

const Auth = () => {
  const { user, loading, isInitialized, sendOTP } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  useEffect(() => {
    if (user && isInitialized) {
      navigate('/', { replace: true });
    }
  }, [user, isInitialized, navigate]);

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
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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

            <div className="space-y-3">
              <div className="text-xs text-muted-foreground space-y-2 bg-secondary/30 rounded-xl p-4">
                <p>• Click the link in your email to sign in</p>
                <p>• The link expires in 1 hour</p>
                <p>• You can close this window</p>
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
                  onClick={() => handleSendMagicLink({ preventDefault: () => {} } as any)}
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
