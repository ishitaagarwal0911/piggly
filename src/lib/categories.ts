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

// Common category name variations and aliases
const CATEGORY_ALIASES: Record<string, string[]> = {
  'Food & Drinks': ['food', 'drinks', 'eating', 'dining', 'restaurant', 'groceries'],
  'Transport': ['transportation', 'travel', 'commute', 'fuel', 'gas', 'uber', 'taxi'],
  'Shopping': ['shop', 'clothes', 'clothing', 'retail'],
  'Bills': ['bill', 'utilities', 'electricity', 'water', 'internet', 'phone', 'rent', 'mortgage'],
  'Entertainment': ['fun', 'movies', 'gaming', 'hobbies', 'leisure'],
  'Health': ['healthcare', 'medical', 'medicine', 'doctor', 'hospital', 'pharmacy'],
  'Income': ['salary', 'wage', 'earnings', 'revenue', 'payment'],
  'Other': ['miscellaneous', 'misc', 'general'],
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
  
  // Normalize the input for matching
  const normalizedInput = categoryNameOrId.trim().toLowerCase();
  
  // Try exact match first (case-insensitive)
  const exactMatch = allCategories.find(
    c => c.name.toLowerCase() === normalizedInput && c.type === type
  );
  
  if (exactMatch) {
    return exactMatch.id;
  }
  
  // Try alias matching
  for (const category of allCategories) {
    if (category.type !== type) continue;
    
    const aliases = CATEGORY_ALIASES[category.name] || [];
    if (aliases.some(alias => alias === normalizedInput)) {
      return category.id;
    }
  }
  
  // Try partial matching (if input contains category name or vice versa)
  const partialMatch = allCategories.find(
    c => c.type === type && (
      normalizedInput.includes(c.name.toLowerCase()) ||
      c.name.toLowerCase().includes(normalizedInput)
    )
  );
  
  if (partialMatch) {
    console.log(`Category fuzzy match: "${categoryNameOrId}" → "${partialMatch.name}"`);
    return partialMatch.id;
  }
  
  // Fallback to "Other" category
  const otherCategory = allCategories.find(
    c => c.name === 'Other' && c.type === type
  );
  
  if (otherCategory) {
    console.log(`Category not matched: "${categoryNameOrId}" → "Other"`);
    return otherCategory.id;
  }
  
  // This should never happen after the migration, but return the first category as ultimate fallback
  const fallback = allCategories.find(c => c.type === type);
  return fallback?.id || categoryNameOrId;
};
