export type TransactionType = 'expense' | 'income';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  note: string;
  date: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ExportData {
  transactions: Transaction[];
  exportDate: string;
  version: string;
}
