import { AppSettings, CustomCategory, CURRENCY_OPTIONS, DEFAULT_COLORS } from '@/types/settings';

const SETTINGS_KEY = 'expense_tracker_settings';

// Emoji to color mapping for auto-assignment
export const getColorFromEmoji = (emoji: string): string => {
  const emojiMaps: Record<string, string> = {
    // Food & Drinks
    '🍽️': '#FFD4B2', '🍕': '#FFD4B2', '🍔': '#FFD4B2', '🥗': '#FFD4B2', '🍜': '#FFD4B2', 
    '☕': '#FFE4CC', '🍰': '#FFEAA7', '🍺': '#FFF5BA', '🥘': '#FFD4B2',
    
    // Transport & Travel
    '🚗': '#A3C4F3', '✈️': '#B3D9FF', '🚕': '#CCE5FF', '🚌': '#A3C4F3', 
    '🚇': '#B3D9FF', '🚲': '#CCE5FF', '🛫': '#A3C4F3',
    
    // Shopping & Clothes
    '🛍️': '#FFB3D9', '👕': '#FFC1CC', '👠': '#FFE5EC', '💄': '#FFB3D9', 
    '🎁': '#FFC1CC', '👗': '#FFE5EC', '🏪': '#FFB3D9',
    
    // Bills & Utilities
    '💡': '#FFF5BA', '🏠': '#FFFACD', '📱': '#FFF8DC', '💳': '#FFF5BA',
    '🔌': '#FFFACD', '💧': '#FFF8DC',
    
    // Entertainment & Fun
    '🎬': '#D4BBFF', '🎮': '#E6D7FF', '🎵': '#C9B3FF', '🎪': '#D4BBFF',
    '🎨': '#E6D7FF', '📚': '#C9B3FF',
    
    // Health & Fitness
    '💊': '#D4F4DD', '🏥': '#C8E6C9', '💪': '#D4F4DD', '🧘': '#C8E6C9',
    '⚕️': '#D4F4DD',
    
    // Money & Income
    '💰': '#B2EBB4', '💵': '#C8E6C9', '💸': '#D4F4DD', '🤝': '#B2EBB4',
    '📈': '#C8E6C9', '🏦': '#D4F4DD',
    
    // Business & Work
    '💼': '#E8E8E8', '📊': '#D4D4D4', '🖥️': '#C9C9C9', '📧': '#E8E8E8',
    
    // Miscellaneous
    '📦': '#D4D4D4', '⭐': '#FFEAA7', '❓': '#E8E8E8', '🔧': '#C9C9C9',
  };
  
  if (emojiMaps[emoji]) {
    return emojiMaps[emoji];
  }
  
  // Fallback: use emoji unicode to pick a pastel color
  const code = emoji.codePointAt(0) || 0;
  const pastelColors = DEFAULT_COLORS;
  return pastelColors[code % pastelColors.length];
};

const DEFAULT_CATEGORIES: CustomCategory[] = [
  { id: 'food', name: 'Food & Drinks', icon: '🍽️', color: '#FFD4B2', type: 'expense', order: 0 },
  { id: 'transport', name: 'Transport', icon: '🚗', color: '#A3C4F3', type: 'expense', order: 1 },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#FFB3D9', type: 'expense', order: 2 },
  { id: 'bills', name: 'Bills', icon: '💡', color: '#FFF5BA', type: 'expense', order: 3 },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#D4BBFF', type: 'expense', order: 4 },
  { id: 'health', name: 'Health', icon: '💊', color: '#D4F4DD', type: 'expense', order: 5 },
  { id: 'income', name: 'Income', icon: '💰', color: '#B2EBB4', type: 'income', order: 6 },
  { id: 'other', name: 'Other', icon: '📦', color: '#D4D4D4', type: 'expense', order: 7 },
];

const DEFAULT_SETTINGS: AppSettings = {
  categories: DEFAULT_CATEGORIES,
  currency: CURRENCY_OPTIONS.find(c => c.code === 'INR') || CURRENCY_OPTIONS[0], // INR
  defaultView: 'monthly',
  theme: 'light',
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

export const addCategory = (category: Omit<CustomCategory, 'id' | 'order' | 'color'>): void => {
  const settings = loadSettings();
  const newCategory: CustomCategory = {
    ...category,
    id: crypto.randomUUID(),
    order: settings.categories.length,
    color: getColorFromEmoji(category.icon),
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
