import { Transaction, ExportData } from '@/types/transaction';
import { supabase } from '@/integrations/supabase/client';
import { loadSettings } from './settings';
import { cacheTransactions, getCachedTransactions } from './cache';

export const saveTransactions = async (transactions: Transaction[]): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Cache immediately for instant feedback
    cacheTransactions(transactions, user.id);

    // Upsert transactions
    const { error } = await supabase
      .from('transactions')
      .upsert(
        transactions.map(t => ({
          id: t.id,
          user_id: user.id,
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

export const loadTransactions = async (): Promise<Transaction[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    
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
    cacheTransactions(transactions, user.id);
    
    return transactions;
  } catch (error) {
    console.error('Failed to load transactions:', error);
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

export const importData = async (jsonString: string): Promise<{ success: boolean; transactions: number; skipped?: number; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let parsed: any;
    try {
      parsed = JSON.parse(jsonString);
    } catch (parseError: any) {
      return { success: false, transactions: 0, error: `Invalid JSON: ${parseError.message}` };
    }
    
    // Determine input shape: array or object with transactions
    let rawTransactions: any[];
    if (Array.isArray(parsed)) {
      rawTransactions = parsed;
    } else if (parsed.transactions && Array.isArray(parsed.transactions)) {
      rawTransactions = parsed.transactions;
    } else {
      return { success: false, transactions: 0, error: 'Invalid data format: expected an array of transactions or { transactions: [...] }' };
    }
    
    // Validate and normalize each transaction
    const validTransactions: Transaction[] = [];
    let skippedCount = 0;
    
    for (const t of rawTransactions) {
      try {
        // Parse and validate amount
        const amount = typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount;
        if (!Number.isFinite(amount) || amount < 0) {
          skippedCount++;
          continue;
        }
        
        // Validate and normalize type
        const typeStr = String(t.type || 'expense').toLowerCase().trim();
        const type: 'expense' | 'income' = typeStr === 'income' ? 'income' : 'expense';
        
        // Validate date
        const date = t.date ? new Date(t.date) : new Date();
        if (isNaN(date.getTime())) {
          skippedCount++;
          continue;
        }
        
        // Generate ID if missing
        const id = t.id && typeof t.id === 'string' && t.id.trim() ? t.id.trim() : crypto.randomUUID();
        
        // Normalize other fields
        const category = t.category && typeof t.category === 'string' && t.category.trim() ? t.category.trim() : 'Other';
        const note = t.note && typeof t.note === 'string' ? t.note.trim() : '';
        const createdAt = t.createdAt ? new Date(t.createdAt) : date;
        const updatedAt = t.updatedAt ? new Date(t.updatedAt) : undefined;
        
        validTransactions.push({
          id,
          amount,
          type,
          category,
          note,
          date,
          createdAt,
          updatedAt,
        });
      } catch (err) {
        skippedCount++;
        continue;
      }
    }
    
    if (validTransactions.length === 0) {
      return { 
        success: false, 
        transactions: 0, 
        error: `No valid transactions found. Skipped ${skippedCount} invalid rows.` 
      };
    }
    
    // Save transactions
    await saveTransactions(validTransactions);
    
    // Import settings if available
    if (parsed.settings) {
      try {
        const { error: settingsError } = await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            currency_code: parsed.settings.currency?.code || 'INR',
            currency_symbol: parsed.settings.currency?.symbol || '₹',
            currency_name: parsed.settings.currency?.name || 'Indian Rupee',
            default_view: parsed.settings.defaultView || 'monthly',
            theme: parsed.settings.theme || 'system',
          });
        
        if (settingsError) console.error('Failed to import settings:', settingsError);
      } catch (err) {
        console.error('Failed to import settings:', err);
      }
    }
    
    return { 
      success: true, 
      transactions: validTransactions.length,
      skipped: skippedCount > 0 ? skippedCount : undefined
    };
  } catch (error: any) {
    console.error('Failed to import data:', error);
    return { success: false, transactions: 0, error: error.message || 'Failed to import data' };
  }
};

export const deleteTransaction = async (id: string): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    throw error;
  }
};

export const importCSV = async (csvString: string): Promise<{ success: boolean; transactions: number; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const lines = csvString.trim().split('\n');
    if (lines.length < 2) {
      return { success: false, transactions: 0, error: 'CSV file is empty or invalid' };
    }
    
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
      
      transactions.push({
        id: crypto.randomUUID(),
        date,
        amount,
        type: type.trim() as 'expense' | 'income',
        category: category.trim(),
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
