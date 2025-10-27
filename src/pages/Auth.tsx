import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const Auth = () => {
  const { user, loading, sendOTP, verifyOTP } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      await sendOTP(email);
      setStep('otp');
      toast.success('Check your email for the verification code');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send verification code');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      await verifyOTP(email, otp);
      toast.success('Successfully signed in!');
    } catch (error: any) {
      toast.error(error.message || 'Invalid verification code');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    try {
      await sendOTP(email);
      toast.success('Code resent to your email');
      setOtp('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeEmail = () => {
    setStep('email');
    setOtp('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome</h1>
          <p className="text-muted-foreground">
            {step === 'email' 
              ? 'Enter your email to get started' 
              : 'Enter the code we sent to your email'}
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
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
              />
            </div>

            <Button type="submit" size="lg" className="w-full gap-2" disabled={isLoading}>
              <Mail className="w-5 h-5" />
              {isLoading ? 'Sending...' : 'Send Verification Code'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-6">
            <div className="space-y-2">
              <Label>Verification Code</Label>
              <p className="text-sm text-muted-foreground mb-4">
                We sent a code to <span className="font-medium text-foreground">{email}</span>
              </p>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp} disabled={isLoading}>
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
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={isLoading || otp.length !== 6}>
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleChangeEmail}
                disabled={isLoading}
                className="gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Change Email
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResendOTP}
                disabled={isLoading}
              >
                Resend Code
              </Button>
            </div>
          </form>
        )}

        <p className="text-xs text-center text-muted-foreground">
          Your data is securely synced and encrypted
        </p>
      </Card>
    </div>
  );
};

export default Auth;
