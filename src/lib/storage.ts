import { Transaction, ExportData } from '@/types/transaction';
import { supabase } from '@/integrations/supabase/client';
import { loadSettings } from './settings';
import { cacheTransactions, getCachedTransactions } from './cache';

export const saveTransactions = async (transactions: Transaction[], userId?: string): Promise<void> => {
  try {
    const uid = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!uid) throw new Error('Not authenticated');

    // Cache immediately for instant feedback
    cacheTransactions(transactions, uid);

    // Upsert transactions
    const { error } = await supabase
      .from('transactions')
      .upsert(
        transactions.map(t => ({
          id: t.id,
          user_id: uid,
          amount: t.amount,
          type: t.type,
          category: t.category,
          note: t.note,
          date: t.date.toISOString(),
          created_at: t.createdAt.toISOString(),
          updated_at: t.updatedAt?.toISOString(),
        }))
      );
    
    if (error) throw error;
  } catch (error) {
    console.error('Failed to save transactions:', error);
    throw error;
  }
};

export const loadTransactions = async (options?: { since?: Date; limit?: number; userId?: string }): Promise<Transaction[]> => {
  try {
    const uid = options?.userId || (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return [];

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', uid)
      .order('date', { ascending: false });
    
    // Apply optional filters
    if (options?.since) {
      query = query.gte('date', options.since.toISOString());
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    
    const transactions = data.map(t => ({
      id: t.id,
      amount: parseFloat(String(t.amount)),
      type: t.type as 'expense' | 'income',
      category: t.category,
      note: t.note || '',
      date: new Date(t.date),
      createdAt: new Date(t.created_at),
      updatedAt: t.updated_at ? new Date(t.updated_at) : undefined,
    }));

    // Cache the fresh data
    cacheTransactions(transactions, uid);
    
    return transactions;
  } catch (error) {
    console.error('Failed to load transactions:', error);
    return [];
  }
};

export const loadHistoricalTransactions = async (
  beforeDate: Date, 
  userId?: string,
  afterDate?: Date  // NEW parameter for chunking
): Promise<Transaction[]> => {
  try {
    const uid = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return [];

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', uid)
      .lt('date', beforeDate.toISOString())
      .order('date', { ascending: false });
    
    // Add lower bound if provided (for chunking)
    if (afterDate) {
      query = query.gte('date', afterDate.toISOString());
    }

    const { data, error } = await query;
    
    if (error) throw error;
    
    return data.map(t => ({
      id: t.id,
      amount: parseFloat(String(t.amount)),
      type: t.type as 'expense' | 'income',
      category: t.category,
      note: t.note || '',
      date: new Date(t.date),
      createdAt: new Date(t.created_at),
      updatedAt: t.updated_at ? new Date(t.updated_at) : undefined,
    }));
  } catch (error) {
    console.error('Failed to load historical transactions:', error);
    return [];
  }
};

export const exportData = async (): Promise<string> => {
  const transactions = await loadTransactions();
  const settings = await loadSettings();
  
  const exportData = {
    transactions,
    settings,
    exportDate: new Date().toISOString(),
    version: '1.0',
  };
  
  return JSON.stringify(exportData, null, 2);
};


export const deleteTransaction = async (id: string, userId?: string): Promise<void> => {
  try {
    const uid = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!uid) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', uid);
    
    if (error) throw error;
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    throw error;
  }
};

