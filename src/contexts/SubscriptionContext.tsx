import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { useDigitalGoods } from '@/hooks/useDigitalGoods';
import type { Subscription } from '@/types/subscription';

interface SubscriptionContextType {
  hasActiveSubscription: boolean;
  loading: boolean;
  expiryDate: Date | null;
  checkSubscription: () => Promise<void>;
  purchaseSubscription: () => Promise<void>;
  subscription: Subscription | null;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { purchaseProduct, listPurchases, isAvailable } = useDigitalGoods();
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);

  const checkSubscription = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gt('expiry_time', new Date().toISOString())
        .order('expiry_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        console.log('[Subscription] Active subscription found:', {
          id: data.id,
          product_id: data.product_id,
          expiry_time: data.expiry_time,
          is_active: data.is_active
        });
        setSubscription(data);
        setHasActiveSubscription(true);
        setExpiryDate(new Date(data.expiry_time));
      } else {
        console.log('[Subscription] No active subscription found for user:', user?.id);
        // Check Digital Goods API for any unreported purchases
        if (isAvailable) {
          const purchases = await listPurchases();
          if (purchases.length > 0) {
            // Verify with backend
            for (const purchase of purchases) {
              await verifyPurchase(purchase.purchaseToken);
            }
            // Recheck after verification
            await checkSubscription();
            return;
          }
        }
        setHasActiveSubscription(false);
        setSubscription(null);
        setExpiryDate(null);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setHasActiveSubscription(false);
    } finally {
      setLoading(false);
    }
  };

  const verifyPurchase = async (purchaseToken: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-purchase', {
        body: { purchaseToken },
      });

      if (error) throw error;
      
      // Handle pending state
      if (data?.pending) {
        console.log('Purchase is pending:', data.message);
        return data;
      }
      
      return data;
    } catch (error) {
      console.error('Error verifying purchase:', error);
      throw error;
    }
  };

  const purchaseSubscription = async () => {
    if (!user) {
      throw new Error('User must be logged in to purchase');
    }

    try {
      setLoading(true);
      const purchaseToken = await purchaseProduct('premium_monthly');
      
      if (!purchaseToken) {
        throw new Error('Purchase failed - no token received');
      }

      // Verify purchase with backend
      const result = await verifyPurchase(purchaseToken);
      
      // Handle pending state
      if (result?.pending) {
        // Set up a timer to recheck in 30 seconds
        setTimeout(() => {
          console.log('Rechecking pending purchase...');
          checkSubscription();
        }, 30000);
        throw new Error('Payment is being processed. This may take a few minutes.');
      }
      
      // Refresh subscription status
      await checkSubscription();
    } catch (error) {
      console.error('Purchase error:', error);
      const errorMessage = error instanceof Error ? error.message : '';
      
      // Provide specific error messages
      if (errorMessage.includes('pending') || errorMessage.includes('being processed')) {
        throw new Error('Payment is being processed. Please wait a moment and try again.');
      } else if (errorMessage.includes('Digital Goods service not available')) {
        throw new Error('Please open the app installed from Google Play to complete the purchase.');
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      checkSubscription();
    } else {
      setLoading(false);
    }
  }, [user]);

  return (
    <SubscriptionContext.Provider
      value={{
        hasActiveSubscription,
        loading,
        expiryDate,
        checkSubscription,
        purchaseSubscription,
        subscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
