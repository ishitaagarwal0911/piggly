import { useState, useEffect, useRef } from 'react';
import type { DigitalGoodsService, ItemDetails } from '@/types/subscription';

export const useDigitalGoods = () => {
  const [service, setService] = useState<DigitalGoodsService | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const initPromiseRef = useRef<{
    resolve: () => void;
    reject: (error: Error) => void;
  } | null>(null);

  useEffect(() => {
    // Skip initialization on mount - only init when actually needed
    if (!initialized) {
      setLoading(false);
      return;
    }

    const initializeService = async () => {
      try {
        if ('getDigitalGoodsService' in window) {
          const digitalGoodsService = await window.getDigitalGoodsService!(
            'https://play.google.com/billing'
          );
          setService(digitalGoodsService);
          setIsAvailable(true);
          // Resolve the promise when initialization succeeds
          initPromiseRef.current?.resolve();
        } else {
          // Resolve anyway if service not available (so we don't block forever)
          initPromiseRef.current?.resolve();
        }
      } catch (error) {
        console.error('Failed to initialize Digital Goods API:', error);
        // Reject the promise on error
        initPromiseRef.current?.reject(error instanceof Error ? error : new Error('Initialization failed'));
      } finally {
        setLoading(false);
      }
    };

    initializeService();
  }, [initialized]);

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

  const initialize = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Store promise callbacks in ref so useEffect can resolve/reject them
      initPromiseRef.current = { resolve, reject };
      // Trigger initialization
      setInitialized(true);
    });
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
