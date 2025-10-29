import { CustomCategory } from '@/types/settings';
import { loadSettings } from './settings';

let cachedCategories: CustomCategory[] | null = null;

// NOTE: These defaults are for reference only
// Actual categories are seeded in the database on user signup via seed_default_categories()
// All category operations (add, edit, delete) work directly with the database
export const getDefaultCategories = (): CustomCategory[] => [
  { id: 'food', name: 'Food & Drinks', icon: '🍽️', color: '#FFA344', type: 'expense', order: 0 },
  { id: 'transport', name: 'Transport', icon: '🚗', color: '#529CCA', type: 'expense', order: 1 },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#E255A1', type: 'expense', order: 2 },
  { id: 'bills', name: 'Bills', icon: '💡', color: '#FFDC49', type: 'expense', order: 3 },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#9D5BD2', type: 'expense', order: 4 },
  { id: 'health', name: 'Health', icon: '💊', color: '#4DAB9A', type: 'expense', order: 5 },
  { id: 'income', name: 'Income', icon: '💰', color: '#46B450', type: 'income', order: 6 },
  { id: 'other', name: 'Other', icon: '📦', color: '#9B9A97', type: 'expense', order: 7 },
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

// Resolve category name to ID, with fallback to "Other"
export const resolveCategoryId = async (categoryNameOrId: string, type: 'expense' | 'income'): Promise<string> => {
  // If it already looks like an ID (contains user_id pattern), return as-is
  if (categoryNameOrId.includes('_') && categoryNameOrId.length > 30) {
    return categoryNameOrId;
  }
  
  // Load current categories
  const settings = await loadSettings();
  const allCategories = settings.categories;
  
  // Try to find by name
  const matchingCategory = allCategories.find(
    c => c.name === categoryNameOrId && c.type === type
  );
  
  if (matchingCategory) {
    return matchingCategory.id;
  }
  
  // Fallback to "Other" category
  const otherCategory = allCategories.find(
    c => c.name === 'Other' && c.type === type
  );
  
  if (otherCategory) {
    return otherCategory.id;
  }
  
  // This should never happen after the migration, but return the first category as ultimate fallback
  const fallback = allCategories.find(c => c.type === type);
  return fallback?.id || categoryNameOrId;
};
