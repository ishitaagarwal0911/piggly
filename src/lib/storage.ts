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

export const importData = async (jsonString: string, userId?: string): Promise<{ success: boolean; transactions: number; error?: string }> => {
  try {
    const uid = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!uid) throw new Error('Not authenticated');

    const parsed = JSON.parse(jsonString);
    
    // Accept both array format and object with transactions property
    const txsRaw = Array.isArray(parsed) ? parsed : parsed?.transactions;
    
    // Validate structure
    if (!Array.isArray(txsRaw)) {
      return { success: false, transactions: 0, error: 'Invalid data format' };
    }
    
    // Preload settings once to populate category cache
    await loadSettings();
    
    // Import resolveCategoryId helper
    const { resolveCategoryId } = await import('./categories');
    
    // Process in chunks for large imports (keeps UI responsive)
    const chunkSize = 500;
    const transactions: Transaction[] = [];
    
    for (let i = 0; i < txsRaw.length; i += chunkSize) {
      const chunk = txsRaw.slice(i, i + chunkSize);
      const processed = await Promise.all(
        chunk.map(async (t: any) => ({
          id: t.id || crypto.randomUUID(),
          amount: parseFloat(String(t.amount)),
          type: t.type as 'expense' | 'income',
          category: await resolveCategoryId(t.category, t.type),
          note: t.note || '',
          date: new Date(t.date),
          createdAt: t.createdAt ? new Date(t.createdAt) : new Date(t.date),
          updatedAt: t.updatedAt ? new Date(t.updatedAt) : undefined,
        }))
      );
      transactions.push(...processed);
      
      // Yield control for large imports
      if (i + chunkSize < txsRaw.length) {
        await Promise.resolve();
      }
    }
    
    // Save transactions
    await saveTransactions(transactions);
    
    // Import settings if available (only for object format)
    if (!Array.isArray(parsed) && parsed.settings) {
      const { error: settingsError } = await supabase
        .from('user_settings')
        .upsert({
          user_id: uid,
          currency_code: parsed.settings.currency?.code || 'INR',
          currency_symbol: parsed.settings.currency?.symbol || '₹',
          currency_name: parsed.settings.currency?.name || 'Indian Rupee',
          default_view: parsed.settings.defaultView || 'monthly',
          theme: parsed.settings.theme || 'system',
        });
      
      if (settingsError) console.error('Failed to import settings:', settingsError);
    }
    
    return { success: true, transactions: transactions.length };
  } catch (error) {
    console.error('Failed to import data:', error);
    return { success: false, transactions: 0, error: 'Failed to parse data' };
  }
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

export const importCSV = async (csvString: string, userId?: string): Promise<{ success: boolean; transactions: number; error?: string }> => {
  try {
    const uid = userId || (await supabase.auth.getUser()).data.user?.id;
    if (!uid) throw new Error('Not authenticated');

    const lines = csvString.trim().split(/\r?\n/);
    if (lines.length < 2) {
      return { success: false, transactions: 0, error: 'CSV file is empty or invalid' };
    }
    
    // Preload settings once to populate category cache
    await loadSettings();
    
    // Import resolveCategoryId helper
    const { resolveCategoryId } = await import('./categories');
    
    const transactions: Transaction[] = [];
    
    // Skip header row, process data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',');
      if (parts.length < 3) continue;
      
      const [dateStr, amountStr, type, category = 'Other', note = ''] = parts;
      
      const date = new Date(dateStr.trim());
      const amount = parseFloat(amountStr.trim());
      
      if (isNaN(date.getTime()) || isNaN(amount)) continue;
      if (type.trim() !== 'expense' && type.trim() !== 'income') continue;
      
      // Resolve category name to ID
      const categoryId = await resolveCategoryId(category.trim(), type.trim() as 'expense' | 'income');
      
      transactions.push({
        id: crypto.randomUUID(),
        date,
        amount,
        type: type.trim() as 'expense' | 'income',
        category: categoryId,
        note: note.trim(),
        createdAt: new Date(),
      });
    }
    
    if (transactions.length === 0) {
      return { success: false, transactions: 0, error: 'No valid transactions found in CSV' };
    }
    
    // Merge with existing transactions
    const existing = await loadTransactions();
    await saveTransactions([...existing, ...transactions]);
    
    return { success: true, transactions: transactions.length };
  } catch (error) {
    console.error('Failed to import CSV:', error);
    return { success: false, transactions: 0, error: 'Failed to parse CSV file' };
  }
};
