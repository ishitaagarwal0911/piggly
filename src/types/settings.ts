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
  '#EF4444', '#DC2626', '#F87171',
  '#F97316', '#FB923C', '#FDBA74',
  '#EAB308', '#FACC15', '#FDE047',
  '#10B981', '#34D399', '#6EE7B7',
  '#3B82F6', '#60A5FA', '#93C5FD',
  '#8B5CF6', '#A78BFA', '#C4B5FD',
  '#EC4899', '#F472B6', '#F9A8D4',
  '#6B7280', '#9CA3AF'
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
