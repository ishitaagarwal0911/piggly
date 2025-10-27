import { CustomCategory } from '@/types/settings';
import { loadSettings } from './settings';
import { hexToRgba } from './utils';

let cachedCategories: CustomCategory[] | null = null;

export const getDefaultCategories = (): CustomCategory[] => [
  { id: 'food', name: 'Food & Drinks', icon: '🍽️', color: hexToRgba('#FFD4B2', 0.25), type: 'expense', order: 0 },
  { id: 'transport', name: 'Transport', icon: '🚗', color: hexToRgba('#A3C4F3', 0.25), type: 'expense', order: 1 },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: hexToRgba('#FFB3D9', 0.25), type: 'expense', order: 2 },
  { id: 'bills', name: 'Bills', icon: '💡', color: hexToRgba('#FFF5BA', 0.25), type: 'expense', order: 3 },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: hexToRgba('#D4BBFF', 0.25), type: 'expense', order: 4 },
  { id: 'health', name: 'Health', icon: '💊', color: hexToRgba('#D4F4DD', 0.25), type: 'expense', order: 5 },
  { id: 'income', name: 'Income', icon: '💰', color: hexToRgba('#B2EBB4', 0.25), type: 'income', order: 6 },
  { id: 'other', name: 'Other', icon: '📦', color: hexToRgba('#D4D4D4', 0.25), type: 'expense', order: 7 },
];

// Synchronous accessor for cached categories
export const categories = (): CustomCategory[] => {
  return cachedCategories || getDefaultCategories();
};

// Update cache when settings are loaded
export const setCategoriesCache = (cats: CustomCategory[]) => {
  cachedCategories = cats;
};

// Get category info by ID or name
export const getCategoryInfo = (categoryIdOrName: string): CustomCategory | undefined => {
  const allCategories = categories();
  return allCategories.find(c => c.id === categoryIdOrName || c.name === categoryIdOrName);
};
