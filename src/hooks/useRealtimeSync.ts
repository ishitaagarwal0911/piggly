import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useRealtimeSync = (onTransactionChange: (payload: any) => void, onCategoryChange: () => void, onSettingsChange: () => void) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

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
          onTransactionChange(payload);
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
          onCategoryChange();
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
          onSettingsChange();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(categoriesChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, [user, onTransactionChange, onCategoryChange, onSettingsChange]);
};
