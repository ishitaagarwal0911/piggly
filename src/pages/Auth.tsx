import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import piggyImage from '@/assets/piggy.png';

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200 p-6">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl space-y-6">
        {/* Piggy Image */}
        <div className="flex justify-center mb-2">
          <img src={piggyImage} alt="Piggly" className="w-32 h-32 object-contain" />
        </div>

        {/* Welcome Text */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Welcome to <span className="text-orange-500">Piggly</span>
          </h1>
          <p className="text-sm text-gray-600">
            A place where you can track all your expenses and income
          </p>
        </div>

        {!linkSent ? (
          <div className="space-y-4 pt-2">
            <p className="text-sm font-medium text-gray-700 text-center">
              Let's Get Started...
            </p>
            
            <form onSubmit={handleSendMagicLink} className="space-y-4">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                className="h-12 px-4 rounded-xl border-2 border-gray-200 focus:border-orange-400 transition-colors"
              />

              <Button 
                type="submit" 
                size="lg" 
                className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-all hover:scale-[1.02] active:scale-[0.98]" 
                disabled={isLoading}
              >
                {isLoading ? 'Sending...' : 'Send Sign-In Link'}
              </Button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-orange-50 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 mx-auto">
                <Mail className="w-8 h-8 text-orange-500" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-base font-semibold text-gray-900">Check your email!</p>
                <p className="text-sm text-gray-600">
                  We sent a secure sign-in link to
                </p>
                <p className="text-sm font-medium text-gray-900">{email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-gray-600 space-y-2 bg-gray-50 rounded-xl p-4">
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
                  className="gap-1 text-gray-600"
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
                  className="text-orange-500 font-medium"
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
