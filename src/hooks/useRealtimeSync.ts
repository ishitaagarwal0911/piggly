import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useRealtimeSync = (
  onTransactionChange: (payload: any) => void, 
  onCategoryChange?: () => void, 
  onSettingsChange?: () => void
) => {
  const { user } = useAuth();
  
  // Store callbacks in refs to avoid re-subscribing when they change
  const transactionCallbackRef = useRef(onTransactionChange);
  const categoryCallbackRef = useRef(onCategoryChange);
  const settingsCallbackRef = useRef(onSettingsChange);
  
  // Update refs when callbacks change
  useEffect(() => {
    transactionCallbackRef.current = onTransactionChange;
    categoryCallbackRef.current = onCategoryChange;
    settingsCallbackRef.current = onSettingsChange;
  });

  useEffect(() => {
    if (!user) return;
    
    if (import.meta.env.DEV) {
      console.log('[useRealtimeSync] Subscribing to channels for user:', user.id);
    }

    // Subscribe to transactions changes
    const transactionsChannel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          transactionCallbackRef.current?.(payload);
        }
      )
      .subscribe();

    // Subscribe to categories changes
    const categoriesChannel = supabase
      .channel('categories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          categoryCallbackRef.current?.();
        }
      )
      .subscribe();

    // Subscribe to settings changes
    const settingsChannel = supabase
      .channel('settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_settings',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          settingsCallbackRef.current?.();
        }
      )
      .subscribe();

    return () => {
      if (import.meta.env.DEV) {
        console.log('[useRealtimeSync] Unsubscribing from channels');
      }
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(categoriesChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, [user?.id]); // Only re-subscribe if user ID changes
};
