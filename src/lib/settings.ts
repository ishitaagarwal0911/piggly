import { AppSettings, CustomCategory, CURRENCY_OPTIONS, DEFAULT_COLORS } from '@/types/settings';

const SETTINGS_KEY = 'expense_tracker_settings';

// Convert hex color to HSL
const hexToHSL = (hex: string): [number, number, number] => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return [h * 360, s * 100, l * 100];
};

// Calculate color distance in HSL space
const colorDistance = (color1: string, color2: string): number => {
  const [h1, s1, l1] = hexToHSL(color1);
  const [h2, s2, l2] = hexToHSL(color2);
  
  // Normalize hue difference (circular)
  let hueDiff = Math.abs(h1 - h2);
  if (hueDiff > 180) hueDiff = 360 - hueDiff;
  
  return Math.sqrt(
    Math.pow(hueDiff / 2, 2) + 
    Math.pow(s1 - s2, 2) + 
    Math.pow(l1 - l2, 2)
  );
};

// Get available color that's not too similar to existing ones
const getAvailableColor = (emoji: string, existingColors: string[]): string => {
  const MIN_DISTANCE = 30;
  let suggestedColor = getColorFromEmoji(emoji);
  
  // If no existing colors, return suggested color
  if (existingColors.length === 0) {
    return suggestedColor;
  }
  
  // Check if suggested color is too similar to existing ones
  const isTooSimilar = existingColors.some(
    existing => colorDistance(suggestedColor, existing) < MIN_DISTANCE
  );
  
  if (isTooSimilar) {
    // Find the color with maximum minimum distance from all existing colors
    let bestColor = suggestedColor;
    let maxMinDistance = 0;
    
    for (const color of DEFAULT_COLORS) {
      // Skip if this color is already used
      if (existingColors.includes(color)) continue;
      
      // Calculate minimum distance to any existing color
      const minDistance = Math.min(
        ...existingColors.map(existing => colorDistance(color, existing))
      );
      
      if (minDistance > maxMinDistance) {
        maxMinDistance = minDistance;
        bestColor = color;
      }
    }
    
    // Only use the best color if it meets the minimum distance threshold
    if (maxMinDistance >= MIN_DISTANCE) {
      return bestColor;
    }
  }
  
  return suggestedColor;
};

// Emoji to color mapping for auto-assignment
export const getColorFromEmoji = (emoji: string): string => {
  const emojiMaps: Record<string, string> = {
    // Greens (vibrant)
    '✅': '#4CAF50', '✔️': '#66BB6A', '☑️': '#81C784',
    '🌿': '#4CAF50', '🌳': '#388E3C', '🌲': '#2E7D32', '🌱': '#66BB6A',
    '💚': '#4CAF50', '🍀': '#66BB6A', '🥗': '#81C784',
    '💪': '#66BB6A', '🏋️': '#4CAF50', '🤸': '#66BB6A', '🧘': '#81C784',
    
    // Reds & Pinks (vibrant)
    '❤️': '#F44336', '💖': '#FF1493', '💕': '#FF69B4', '💗': '#FF4081',
    '💓': '#E91E63', '🛍️': '#EC407A', '🌹': '#C62828', '🎀': '#FF80AB',
    '👠': '#FF1493', '💄': '#E91E63', '👗': '#FF4081', '🎁': '#EC407A',
    '❌': '#F44336', '💉': '#E91E63', '🩺': '#FF80AB',
    
    // Blues (vibrant)
    '💙': '#2196F3', '🔵': '#1976D2', '💎': '#0288D1',
    '🌊': '#0277BD', '☁️': '#64B5F6', '🚗': '#42A5F5', '✈️': '#1E88E5',
    '🚕': '#2196F3', '🚌': '#1976D2', '🚇': '#0288D1', '🚂': '#1565C0',
    '💧': '#2196F3', '🚿': '#42A5F5', '📡': '#64B5F6',
    '💼': '#607D8B', '🖥️': '#546E7A', '📧': '#78909C',
    
    // Yellows & Golds (vibrant)
    '⭐': '#FFC107', '🌟': '#FFD54F', '✨': '#FFEB3B', '💫': '#FDD835',
    '☀️': '#FFA000', '🔑': '#FFB300', '💡': '#FFC107', '📱': '#FFCA28',
    '✏️': '#FFD54F', '🍰': '#FFEB3B', '🥐': '#FFD54F', '🍺': '#FFC107',
    '🚖': '#FFC107', '🎺': '#FFB300', '📁': '#FFCA28',
    
    // Oranges (vibrant)
    '🔥': '#FF5722', '🍊': '#FF9800', '🎃': '#F57C00',
    '🍕': '#FF7043', '🍔': '#FF8A65', '🍜': '#FF6E40', '🥘': '#FF7043',
    '🍣': '#FFAB91', '🍱': '#FF8A65', '⛽': '#FF9800', '🔨': '#FF7043',
    '🎯': '#FF6F00',
    
    // Purples (vibrant)
    '💜': '#9C27B0', '🎬': '#7B1FA2', '🎮': '#8E24AA', '🎵': '#AB47BC',
    '🎨': '#BA68C8', '🎭': '#9C27B0', '🎤': '#8E24AA', '🎧': '#AB47BC',
    '🎸': '#BA68C8', '🦜': '#9C27B0', '🧩': '#8E24AA', '📖': '#7B1FA2',
    '🎓': '#9C27B0', '🧋': '#AB47BC',
    
    // Teals & Cyans (vibrant)
    '🚲': '#009688', '💰': '#4CAF50', '💵': '#66BB6A', '💸': '#81C784',
    '🤝': '#4CAF50', '📈': '#66BB6A', '🏦': '#81C784', '💲': '#4CAF50',
    '💴': '#66BB6A', '💶': '#81C784', '💷': '#4CAF50', '💹': '#66BB6A',
    '🏥': '#4DB6AC', '⚕️': '#4CAF50',
    
    // Browns & Warm (vibrant)
    '🍫': '#795548', '☕': '#6D4C41', '🐻': '#8D6E63',
    '🐕': '#A1887F', '🏠': '#BCAAA4', '🏡': '#D7CCC8',
    
    // Grays & Neutrals
    '📦': '#9E9E9E', '🔧': '#757575', '⚙️': '#616161',
    '❓': '#BDBDBD', '🎲': '#9E9E9E', '📐': '#757575',
    '🧥': '#9E9E9E', '👟': '#BDBDBD', '🏪': '#E91E63',
    '🛒': '#FF4081', '👜': '#EC407A', '👔': '#2196F3',
    '🖊️': '#2196F3', '📎': '#9E9E9E', '🖨️': '#757575',
    '⌨️': '#616161', '🖱️': '#9E9E9E', '🎹': '#757575',
    '💳': '#FFC107', '🔌': '#FFD54F', '💊': '#66BB6A',
    '🦷': '#FFEB3B', '🏫': '#2196F3', '👨‍🎓': '#1976D2',
    '🐈': '#9E9E9E', '🐠': '#2196F3', '🛫': '#1E88E5', '🚘': '#42A5F5',
    '🏍️': '#616161', '📊': '#2196F3', '📝': '#FFD54F',
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
  const existingColors = settings.categories.map(c => c.color);
  
  const newCategory: CustomCategory = {
    ...category,
    id: crypto.randomUUID(),
    order: settings.categories.length,
    color: getAvailableColor(category.icon, existingColors),
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
