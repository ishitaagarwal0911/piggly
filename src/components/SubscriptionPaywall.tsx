import { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Check, Sparkles } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
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
  const [purchasing, setPurchasing] = useState(false);

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
      toast.success('Subscription activated!');
      onOpenChange(false);
      onSubscribed?.();
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Failed to complete subscription. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-center pb-2 px-4 sm:px-6">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <DrawerTitle className="text-2xl">Unlock Full Access</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 sm:px-6 pb-8 space-y-6">
          {/* Pricing */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 text-center border border-primary/20 shadow-notion">
            <div className="text-4xl font-bold text-foreground mb-1">
              ₹50
              <span className="text-lg font-normal text-muted-foreground">/month</span>
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
                <span className="text-foreground">{benefit}</span>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <Button
            onClick={handleSubscribe}
            disabled={purchasing}
            size="lg"
            className="w-full text-lg h-14 rounded-xl"
          >
            {purchasing ? 'Processing...' : 'Subscribe Now'}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Charged monthly via Google Play. Cancel anytime from your Google Play subscriptions.
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
