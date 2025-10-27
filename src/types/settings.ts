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
  defaultView: 'daily' | 'weekly' | 'monthly';
  theme: 'light' | 'dark' | 'system';
}

export const DEFAULT_COLORS = [
  '#FFC1CC', '#FFB3D9', '#FFE5EC',
  '#FFD4B2', '#FFE4CC', '#FFEAA7',
  '#FFF8DC', '#FFFACD', '#FFF5BA',
  '#D4F4DD', '#C8E6C9', '#B2EBB4',
  '#CCE5FF', '#B3D9FF', '#A3C4F3',
  '#E6D7FF', '#D4BBFF', '#C9B3FF',
  '#F4CCCC', '#E8C4C4', '#FFCCF9',
  '#E8E8E8', '#D4D4D4', '#C9C9C9'
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
