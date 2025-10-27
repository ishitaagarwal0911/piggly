import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const Auth = () => {
  const { user, loading, sendOTP } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

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
      <div className="w-full max-w-md bg-card rounded-2xl p-8 shadow-notion border border-border/50 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Welcome</h1>
          <p className="text-sm text-muted-foreground">
            {linkSent 
              ? 'Check your email to continue' 
              : 'Sign in with your email'}
          </p>
        </div>

        {!linkSent ? (
          <form onSubmit={handleSendMagicLink} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                className="transition-smooth"
              />
            </div>

            <Button type="submit" size="lg" className="w-full gap-2" disabled={isLoading}>
              <Mail className="w-5 h-5" />
              {isLoading ? 'Sending...' : 'Send Sign-In Link'}
            </Button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mx-auto">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">Sign-in link sent!</p>
                <p className="text-xs text-muted-foreground">
                  We sent a secure sign-in link to
                </p>
                <p className="text-sm font-medium text-foreground">{email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-muted-foreground space-y-2">
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
                  onClick={handleResend}
                  disabled={isLoading}
                >
                  Resend Link
                </Button>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-center text-muted-foreground">
          Your data is securely synced and encrypted
        </p>
      </div>
    </div>
  );
};

export default Auth;
