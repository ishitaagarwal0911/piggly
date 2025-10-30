export interface CustomCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
  order: number;
}

export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

export interface AppSettings {
  categories: CustomCategory[];
  currency: CurrencyOption;
  defaultView: 'daily' | 'weekly' | 'monthly' | 'yearly';
  theme: 'light' | 'dark' | 'system';
}

export const DEFAULT_COLORS = [
  '#FDB022', '#F5A962', '#E87B7B',
  '#E87BA0', '#B08AD8', '#B899D8',
  '#6B9FE8', '#57C4C4', '#5FB05F',
  '#7BC879', '#9D9A97', '#D4D4D4'
];

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
];
