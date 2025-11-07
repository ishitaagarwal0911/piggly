import { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Check, Sparkles, CheckCircle2 } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useDigitalGoods } from '@/hooks/useDigitalGoods';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SubscriptionPaywallProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubscribed?: () => void;
}

export const SubscriptionPaywall = ({
  open,
  onOpenChange,
  onSubscribed,
}: SubscriptionPaywallProps) => {
  const { purchaseSubscription } = useSubscription();
  const { isAvailable } = useDigitalGoods();
  const { user } = useAuth();
  const [purchasing, setPurchasing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Check for test success parameter in URL
  useEffect(() => {
    if (open) {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('test_success') === 'true') {
        setShowSuccess(true);
      }
    }
  }, [open]);

  const canPurchase = !!user && isAvailable && !purchasing;

  const benefits = [
    'Unlimited transactions',
    'Detailed expense charts',
    'Monthly & yearly analytics',
    'Category management',
    'Cloud sync across devices',
    'No ads, forever',
  ];

  const handleSubscribe = async () => {
    try {
      setPurchasing(true);
      await purchaseSubscription();
      setShowSuccess(true);
    } catch (error) {
      console.error('Subscription error:', error);
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('Digital Goods service not available')) {
        toast.error('Open the app installed from Google Play to complete the purchase.');
      } else {
        toast.error('Failed to complete subscription. Please try again.');
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleContinue = () => {
    setShowSuccess(false);
    onOpenChange(false);
    onSubscribed?.();
  };

  const getHelperText = () => {
    if (!user) return 'Please sign in to subscribe.';
    return null;
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        {showSuccess ? (
          // Success Screen
          <>
            <div className="px-4 sm:px-6 py-8 text-center space-y-6">
              <div className="flex justify-center animate-scale-in">
                <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Payment Successful!</h2>
                <p className="text-muted-foreground">Welcome to Premium</p>
              </div>

              <div className="space-y-3 text-left max-w-sm mx-auto">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-green-500" />
                    </div>
                    <span className="text-sm text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleContinue}
                size="lg"
                className="w-full max-w-sm"
              >
                Continue
              </Button>
            </div>
          </>
        ) : (
          // Paywall Screen
          <>
            <DrawerHeader className="text-center pb-2 px-4 sm:px-6">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <DrawerTitle className="text-xl">Unlock Full Access</DrawerTitle>
            </DrawerHeader>

            <div className="px-4 sm:px-6 pb-8 space-y-6">
              {/* Pricing */}
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 text-center border border-primary/20 shadow-notion">
                <div className="text-3xl font-bold text-foreground mb-1">
                  ₹50
                  <span className="text-sm font-normal text-muted-foreground">/month</span>
                </div>
                <p className="text-sm text-muted-foreground">Cancel anytime</p>
              </div>

              {/* Benefits */}
              <div className="space-y-3">
                <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  What you get
                </p>
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <Button
                onClick={handleSubscribe}
                disabled={!canPurchase}
                size="lg"
                className="w-full"
              >
                {purchasing ? 'Processing...' : 'Subscribe Now'}
              </Button>

              {getHelperText() && (
                <p className="text-sm text-center text-muted-foreground -mt-3">
                  {getHelperText()}
                </p>
              )}

              <p className="text-xs text-center text-muted-foreground">
                Charged monthly via Google Play. Cancel anytime from your Google Play subscriptions.
              </p>
            </div>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
};
