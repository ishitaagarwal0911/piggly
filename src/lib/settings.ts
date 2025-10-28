import { AppSettings, CustomCategory, CurrencyOption, CURRENCY_OPTIONS, DEFAULT_COLORS } from '@/types/settings';
import { getDefaultCategories, setCategoriesCache } from './categories';
import { supabase } from '@/integrations/supabase/client';


// Deterministic emoji-to-color mapping based on emoji unicode and visual characteristics
const getColorForEmoji = (emoji: string): string => {
  const codePoint = emoji.codePointAt(0) || 0;
  
  // Specific emoji mappings for common categories
  const emojiColorMap: { [key: number]: string } = {
    // Transportation - Red/Orange
    0x1F697: '#E87B7B', // 🚗 car - red
    0x1F68C: '#E87B7B', // 🚌 bus - red
    0x1F6B2: '#F5A962', // 🚲 bicycle - orange
    0x2708: '#6B9FE8',  // ✈️ airplane - blue
    
    // Money/Income - Green
    0x1F4B0: '#5FB05F', // 💰 money bag - green
    0x1F4B5: '#5FB05F', // 💵 dollar - green
    0x1F4B8: '#7BC879', // 💸 money wings - green
    0x1F4B3: '#5FB05F', // 💳 credit card - green
    
    // Checkmarks - Green
    0x2705: '#5FB05F',  // ✅ checkmark - green
    0x2714: '#5FB05F',  // ✔️ check - green
    
    // Food & Drinks - Orange/Yellow
    0x1F37D: '#FDB022', // 🍽️ fork and knife - yellow/orange
    0x1F354: '#F5A962', // 🍔 hamburger - orange
    0x1F355: '#F5A962', // 🍕 pizza - orange
    0x1F32E: '#FDB022', // 🌮 taco - yellow
    0x1F35C: '#FDB022', // 🍜 ramen - yellow
    
    // Bills/Utilities - Yellow
    0x1F4A1: '#FDB022', // 💡 lightbulb - yellow
    0x26A1: '#FDB022',  // ⚡ lightning - yellow
    
    // Shopping - Pink
    0x1F6CD: '#E87BA0', // 🛍️ shopping bags - pink
    0x1F45C: '#E87BA0', // 👜 handbag - pink
    0x1F381: '#E87BA0', // 🎁 gift - pink
    
    // Entertainment - Purple
    0x1F3AC: '#B08AD8', // 🎬 movie - purple
    0x1F3AE: '#B08AD8', // 🎮 game - purple
    0x1F3B5: '#B899D8', // 🎵 music - purple
    
    // Health/Medical - Teal/Green
    0x1F48A: '#57C4C4', // 💊 pill - teal
    0x1F3E5: '#57C4C4', // 🏥 hospital - teal
    0x1FA7A: '#57C4C4', // 🩺 stethoscope - teal
    
    // Other/Neutral - Gray
    0x1F4E6: '#9D9A97', // 📦 package - gray
    0x1F3E2: '#9D9A97', // 🏢 office - gray
  };
  
  // Check for exact emoji match
  if (emojiColorMap[codePoint]) {
    return emojiColorMap[codePoint];
  }
  
  // Fallback to category-based colors (deterministic, no randomization)
  // Yellow/Gold emojis
  if ([0x1F31F, 0x2B50, 0x1F34B, 0x1F49B].includes(codePoint)) {
    return '#FDB022';
  }
  // Red/Pink emojis
  else if ([0x2764, 0x1F49D, 0x1F353, 0x1F496, 0x1F9E1].includes(codePoint)) {
    return '#E87B7B';
  }
  // Blue emojis
  else if ([0x1F499, 0x1F30A, 0x1F48E, 0x1F535].includes(codePoint)) {
    return '#6B9FE8';
  }
  // Green emojis
  else if ([0x1F49A, 0x1F331, 0x1F343, 0x267B].includes(codePoint)) {
    return '#5FB05F';
  }
  // Purple emojis
  else if ([0x1F49C, 0x1F52E, 0x1F47E, 0x1F347].includes(codePoint)) {
    return '#B08AD8';
  }
  // Orange emojis
  else if ([0x1F34A, 0x1F383, 0x1F98A, 0x1F4D9].includes(codePoint)) {
    return '#F5A962';
  }
  // Food emojis - warm colors
  else if (codePoint >= 0x1F32D && codePoint <= 0x1F37F) {
    return '#F5A962';
  }
  // Entertainment emojis
  else if (codePoint >= 0x1F3AC && codePoint <= 0x1F3AF) {
    return '#B08AD8';
  }
  // Default: use deterministic hash of codepoint to select color
  else {
    const index = codePoint % DEFAULT_COLORS.length;
    return DEFAULT_COLORS[index];
  }
};

const getDefaultSettings = (): AppSettings => ({
  categories: getDefaultCategories(),
  currency: CURRENCY_OPTIONS.find(c => c.code === 'INR') || CURRENCY_OPTIONS[0],
  defaultView: 'monthly',
  theme: 'system',
});

export const loadSettings = async (): Promise<AppSettings> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return getDefaultSettings();

    const { data: settingsData } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: categoriesData } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('order_index', { ascending: true });

    const categories: CustomCategory[] = (categoriesData || []).map(c => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      type: c.type as 'expense' | 'income',
      order: c.order_index,
    }));

    // Database-first: All categories come from database only
    // Default categories are seeded on signup via seed_default_categories()
    const finalCategories = categories.sort((a, b) => a.order - b.order);
    
    // Update categories cache for synchronous access
    setCategoriesCache(finalCategories);

    const currency: CurrencyOption = {
      code: settingsData?.currency_code || 'INR',
      symbol: settingsData?.currency_symbol || '₹',
      name: settingsData?.currency_name || 'Indian Rupee',
    };

    return {
      categories: finalCategories,
      currency,
      defaultView: (settingsData?.default_view as 'daily' | 'weekly' | 'monthly') || 'monthly',
      theme: (settingsData?.theme as 'light' | 'dark' | 'system') || 'system',
    };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return getDefaultSettings();
  }
};

export const getCategoryById = (id: string): CustomCategory | undefined => {
  const settings = getDefaultSettings();
  return settings.categories.find(c => c.id === id);
};

export const saveSettings = async (settings: AppSettings): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      currency_code: settings.currency.code,
      currency_symbol: settings.currency.symbol,
      currency_name: settings.currency.name,
      default_view: settings.defaultView,
      theme: settings.theme,
    });
};

export const addCategory = async (category: Omit<CustomCategory, 'id' | 'order' | 'color'>): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get existing categories to determine order
  const { data: existingCategories } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id);

  const order = existingCategories?.length || 0;
  const color = getColorForEmoji(category.icon);

  // Generate string ID instead of UUID for consistency
  const id = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await supabase.from('categories').insert({
    id: id,
    user_id: user.id,
    name: category.name,
    icon: category.icon,
    color,
    type: category.type,
    order_index: order,
  });
};

export const updateCategory = async (category: CustomCategory): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // First, try to update existing category
  const { error: updateError, count } = await supabase
    .from('categories')
    .update({
      name: category.name,
      icon: category.icon,
      color: category.color,
      type: category.type,
      order_index: category.order,
    })
    .eq('id', category.id)
    .eq('user_id', user.id);

  // If no rows updated, insert new category (for default categories being edited first time)
  if (count === 0) {
    const { error: insertError } = await supabase
      .from('categories')
      .insert({
        id: category.id, // Keep original string ID to maintain transaction relationships
        user_id: user.id,
        name: category.name,
        icon: category.icon,
        color: category.color,
        type: category.type,
        order_index: category.order,
      });
    
    if (insertError) throw insertError;
  } else if (updateError) {
    throw updateError;
  }
};

export const deleteCategory = async (categoryId: string): Promise<{ deleted: boolean }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error, count } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)
    .eq('user_id', user.id);

  if (error) throw error;
  
  return { deleted: (count || 0) > 0 };
};
