import { AppSettings, CustomCategory, CURRENCY_OPTIONS } from '@/types/settings';

const SETTINGS_KEY = 'expense_tracker_settings';

const DEFAULT_CATEGORIES: CustomCategory[] = [
  { id: 'food', name: 'Food & Drinks', icon: '🍽️', color: '#F97316', type: 'expense', order: 0 },
  { id: 'transport', name: 'Transport', icon: '🚗', color: '#3B82F6', type: 'expense', order: 1 },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#EC4899', type: 'expense', order: 2 },
  { id: 'bills', name: 'Bills', icon: '💡', color: '#EAB308', type: 'expense', order: 3 },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#8B5CF6', type: 'expense', order: 4 },
  { id: 'health', name: 'Health', icon: '💊', color: '#EF4444', type: 'expense', order: 5 },
  { id: 'income', name: 'Income', icon: '💰', color: '#10B981', type: 'income', order: 6 },
  { id: 'other', name: 'Other', icon: '📦', color: '#6B7280', type: 'expense', order: 7 },
];

const DEFAULT_SETTINGS: AppSettings = {
  categories: DEFAULT_CATEGORIES,
  currency: CURRENCY_OPTIONS[0], // USD
  defaultView: 'monthly',
  theme: 'system',
};

export const saveSettings = (settings: AppSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
};

export const loadSettings = (): AppSettings => {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (!data) return DEFAULT_SETTINGS;
    
    const parsed = JSON.parse(data);
    // Merge with defaults to ensure all fields exist
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      categories: parsed.categories || DEFAULT_CATEGORIES,
    };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
};

export const getCategories = (): CustomCategory[] => {
  const settings = loadSettings();
  return settings.categories;
};

export const getCategoryById = (id: string): CustomCategory | undefined => {
  const categories = getCategories();
  return categories.find(cat => cat.id === id);
};

export const addCategory = (category: Omit<CustomCategory, 'id' | 'order'>): void => {
  const settings = loadSettings();
  const newCategory: CustomCategory = {
    ...category,
    id: crypto.randomUUID(),
    order: settings.categories.length,
  };
  settings.categories.push(newCategory);
  saveSettings(settings);
};

export const updateCategory = (id: string, updates: Partial<CustomCategory>): void => {
  const settings = loadSettings();
  const index = settings.categories.findIndex(cat => cat.id === id);
  if (index !== -1) {
    settings.categories[index] = { ...settings.categories[index], ...updates };
    saveSettings(settings);
  }
};

export const deleteCategory = (id: string): void => {
  const settings = loadSettings();
  settings.categories = settings.categories.filter(cat => cat.id !== id);
  // Update order
  settings.categories.forEach((cat, idx) => {
    cat.order = idx;
  });
  saveSettings(settings);
};
