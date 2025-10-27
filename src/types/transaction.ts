export type TransactionType = 'expense' | 'income';

export type CategoryType = 
  | 'food' 
  | 'transport' 
  | 'shopping' 
  | 'bills' 
  | 'entertainment' 
  | 'health' 
  | 'income' 
  | 'other';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: CategoryType;
  note: string;
  date: Date;
}

export interface CategoryInfo {
  id: CategoryType;
  name: string;
  icon: string;
  color: string;
}
