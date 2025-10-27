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
