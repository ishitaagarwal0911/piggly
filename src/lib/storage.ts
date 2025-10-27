import { Transaction, ExportData } from '@/types/transaction';
import { supabase } from '@/integrations/supabase/client';
import { loadSettings } from './settings';

export const saveTransactions = async (transactions: Transaction[]): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

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

export const importData = async (jsonString: string): Promise<{ success: boolean; transactions: number; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const data = JSON.parse(jsonString);
    
    // Validate structure
    if (!data.transactions || !Array.isArray(data.transactions)) {
      return { success: false, transactions: 0, error: 'Invalid data format' };
    }
    
    // Parse transactions
    const transactions: Transaction[] = data.transactions.map((t: any) => ({
      ...t,
      date: new Date(t.date),
      createdAt: t.createdAt ? new Date(t.createdAt) : new Date(t.date),
      updatedAt: t.updatedAt ? new Date(t.updatedAt) : undefined,
    }));
    
    // Save transactions
    await saveTransactions(transactions);
    
    // Import settings if available
    if (data.settings) {
      const { error: settingsError } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          currency_code: data.settings.currency?.code || 'INR',
          currency_symbol: data.settings.currency?.symbol || '₹',
          currency_name: data.settings.currency?.name || 'Indian Rupee',
          default_view: data.settings.defaultView || 'monthly',
          theme: data.settings.theme || 'system',
        });
      
      if (settingsError) console.error('Failed to import settings:', settingsError);
    }
    
    return { success: true, transactions: transactions.length };
  } catch (error) {
    console.error('Failed to import data:', error);
    return { success: false, transactions: 0, error: 'Failed to parse data' };
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
