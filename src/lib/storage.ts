import { Transaction, ExportData } from '@/types/transaction';
import { AppSettings } from '@/types/settings';
import { loadSettings } from './settings';

const STORAGE_KEY = 'expense_tracker_transactions';

export const saveTransactions = (transactions: Transaction[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.error('Failed to save transactions:', error);
  }
};

export const loadTransactions = (): Transaction[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    
    const parsed = JSON.parse(data);
    return parsed.map((t: any) => ({
      ...t,
      date: new Date(t.date),
      createdAt: t.createdAt ? new Date(t.createdAt) : new Date(t.date),
      updatedAt: t.updatedAt ? new Date(t.updatedAt) : undefined,
    }));
  } catch (error) {
    console.error('Failed to load transactions:', error);
    return [];
  }
};

export const exportData = (): string => {
  const transactions = loadTransactions();
  const settings = loadSettings();
  
  const exportData = {
    transactions,
    settings,
    exportDate: new Date().toISOString(),
    version: '1.0',
  };
  
  return JSON.stringify(exportData, null, 2);
};

export const importData = (jsonString: string): { success: boolean; transactions: number; error?: string } => {
  try {
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
    saveTransactions(transactions);
    
    // Import settings if available
    if (data.settings) {
      localStorage.setItem('expense_tracker_settings', JSON.stringify(data.settings));
    }
    
    return { success: true, transactions: transactions.length };
  } catch (error) {
    console.error('Failed to import data:', error);
    return { success: false, transactions: 0, error: 'Failed to parse data' };
  }
};

export const importCSV = (csvString: string): { success: boolean; transactions: number; error?: string } => {
  try {
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
    const existing = loadTransactions();
    saveTransactions([...existing, ...transactions]);
    
    return { success: true, transactions: transactions.length };
  } catch (error) {
    console.error('Failed to import CSV:', error);
    return { success: false, transactions: 0, error: 'Failed to parse CSV file' };
  }
};
