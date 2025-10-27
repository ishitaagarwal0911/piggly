import { Transaction } from '@/types/transaction';

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
    }));
  } catch (error) {
    console.error('Failed to load transactions:', error);
    return [];
  }
};
