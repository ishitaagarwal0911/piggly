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
  restorePurchases: () => Promise<{ success: boolean; message: string }>;
  subscription: Subscription | null;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const { purchaseProduct, listPurchases, isAvailable, initialize } = useDigitalGoods();

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
        console.log('[Subscription] No active subscription found');
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
      
      // Initialize Digital Goods API
      initialize();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!isAvailable) {
        throw new Error('Digital Goods service not available');
      }
      
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

  const restorePurchases = async (): Promise<{ success: boolean; message: string }> => {
    if (!user) {
      return { success: false, message: 'Please sign in first' };
    }

    // Initialize Digital Goods API
    initialize();
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!isAvailable) {
      return { success: false, message: 'Digital Goods service not available on this device' };
    }

    try {
      setLoading(true);
      const purchases = await listPurchases();
      
      if (purchases.length === 0) {
        return { success: false, message: 'No purchases found to restore' };
      }

      console.log('[Subscription] Restoring purchases:', purchases.length);
      
      let restored = false;
      let lastError = '';

      for (const purchase of purchases) {
        try {
          const result = await verifyPurchase(purchase.purchaseToken);
          
          if (result?.pending) {
            lastError = 'Purchase is pending approval. Please check back in a few minutes.';
          } else {
            restored = true;
          }
        } catch (error) {
          console.error('[Subscription] Failed to verify purchase:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          if (errorMessage.includes('already linked')) {
            lastError = 'This purchase is already linked to another account';
          } else {
            lastError = errorMessage;
          }
        }
      }

      // Refresh subscription status
      await checkSubscription();

      if (restored) {
        return { success: true, message: 'Purchase restored successfully!' };
      } else {
        return { success: false, message: lastError || 'Failed to restore purchases' };
      }
    } catch (error) {
      console.error('[Subscription] Restore error:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to restore purchases' 
      };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      // Defer subscription check by 2 seconds to avoid blocking initial render
      const timer = setTimeout(() => {
        checkSubscription();
      }, 2000);
      return () => clearTimeout(timer);
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
        restorePurchases,
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
