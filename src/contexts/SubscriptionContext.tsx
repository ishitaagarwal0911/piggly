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
        setSubscription(data);
        setHasActiveSubscription(true);
        setExpiryDate(new Date(data.expiry_time));
      } else {
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
      await verifyPurchase(purchaseToken);
      
      // Refresh subscription status
      await checkSubscription();
    } catch (error) {
      console.error('Purchase error:', error);
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
