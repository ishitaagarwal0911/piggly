import { useState, useEffect, useRef } from 'react';
import type { DigitalGoodsService, ItemDetails } from '@/types/subscription';

export const useDigitalGoods = () => {
  const [service, setService] = useState<DigitalGoodsService | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Use refs for synchronous state tracking
  const isInitializedRef = useRef(false);
  const initPromiseRef = useRef<Promise<void> | null>(null);

  // Initialize automatically on mount
  useEffect(() => {
    if (isInitializedRef.current) return; // Already initialized
    
    const initializeService = async () => {
      try {
        if ('getDigitalGoodsService' in window) {
          const digitalGoodsService = await window.getDigitalGoodsService!(
            'https://play.google.com/billing'
          );
          setService(digitalGoodsService);
          setIsAvailable(true);
          console.log('[DigitalGoods] Successfully initialized');
        } else {
          console.log('[DigitalGoods] Not available in this environment');
        }
      } catch (error) {
        console.error('[DigitalGoods] Failed to initialize:', error);
      } finally {
        setLoading(false);
        isInitializedRef.current = true;
      }
    };

    // Store the initialization promise so it can be awaited
    initPromiseRef.current = initializeService();
  }, []);

  const getProductDetails = async (productId: string): Promise<ItemDetails | null> => {
    if (!service) return null;
    
    try {
      const details = await service.getDetails([productId]);
      return details[0] || null;
    } catch (error) {
      console.error('Failed to get product details:', error);
      return null;
    }
  };

  const listPurchases = async () => {
    if (!service) return [];
    
    try {
      return await service.listPurchases();
    } catch (error) {
      console.error('Failed to list purchases:', error);
      return [];
    }
  };

  const purchaseProduct = async (productId: string): Promise<string | null> => {
    if (!service) {
      throw new Error('Digital Goods service not available');
    }

    try {
      const paymentRequest = new PaymentRequest(
        [
          {
            supportedMethods: 'https://play.google.com/billing',
            data: {
              sku: productId,
            },
          },
        ],
        {
          total: {
            label: 'Premium Subscription',
            amount: {
              currency: 'INR',
              value: '50.00',
            },
          },
        }
      );

      const paymentResponse = await paymentRequest.show();
      const { purchaseToken } = paymentResponse.details;
      
      await paymentResponse.complete('success');
      
      return purchaseToken;
    } catch (error) {
      console.error('Purchase failed:', error);
      throw error;
    }
  };

  // Idempotent initialize function
  const initialize = async (): Promise<void> => {
    // If initialization promise exists, wait for it
    if (initPromiseRef.current) {
      await initPromiseRef.current;
      return;
    }
    
    // If already initialized, return immediately
    if (isInitializedRef.current) {
      return;
    }
    
    // This shouldn't happen, but handle it gracefully
    console.warn('[DigitalGoods] Initialize called before mount');
    return;
  };

  return {
    service,
    isAvailable,
    loading,
    initialize,
    getProductDetails,
    listPurchases,
    purchaseProduct,
  };
};
