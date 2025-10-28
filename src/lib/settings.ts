import { AppSettings, CustomCategory, CurrencyOption, CURRENCY_OPTIONS, DEFAULT_COLORS } from '@/types/settings';
import { getDefaultCategories, setCategoriesCache } from './categories';
import { supabase } from '@/integrations/supabase/client';


// Smart emoji-to-color mapping based on emoji unicode and visual characteristics
const getColorForEmoji = (emoji: string): string => {
  const codePoint = emoji.codePointAt(0) || 0;
  let baseColor: string;
  
  // Yellow/Gold emojis (💡, 🌟, ⭐, 🍋, 💛)
  if ([0x1F4A1, 0x1F31F, 0x2B50, 0x1F34B, 0x1F49B].includes(codePoint)) {
    baseColor = DEFAULT_COLORS[Math.floor(Math.random() * 3) + 6]; // Yellow range
  }
  // Red/Pink emojis (❤️, 💝, 🍓, 💖, 🧡)
  else if ([0x2764, 0x1F49D, 0x1F353, 0x1F496, 0x1F9E1].includes(codePoint)) {
    baseColor = DEFAULT_COLORS[Math.floor(Math.random() * 3)]; // Red/Pink range
  }
  // Blue emojis (💙, 🌊, 🚗, 💎, 🔵)
  else if ([0x1F499, 0x1F30A, 0x1F697, 0x1F48E, 0x1F535].includes(codePoint)) {
    baseColor = DEFAULT_COLORS[Math.floor(Math.random() * 3) + 12]; // Blue range
  }
  // Green emojis (💚, 🌱, 🍃, 💰, ♻️)
  else if ([0x1F49A, 0x1F331, 0x1F343, 0x1F4B0, 0x267B].includes(codePoint)) {
    baseColor = DEFAULT_COLORS[Math.floor(Math.random() * 3) + 9]; // Green range
  }
  // Purple emojis (💜, 🔮, 👾, 🍇)
  else if ([0x1F49C, 0x1F52E, 0x1F47E, 0x1F347].includes(codePoint)) {
    baseColor = DEFAULT_COLORS[Math.floor(Math.random() * 3) + 15]; // Purple range
  }
  // Orange emojis (🍊, 🎃, 🦊, 📙)
  else if ([0x1F34A, 0x1F383, 0x1F98A, 0x1F4D9].includes(codePoint)) {
    baseColor = DEFAULT_COLORS[Math.floor(Math.random() * 2) + 3]; // Orange range
  }
  // Food emojis - warm colors
  else if (codePoint >= 0x1F32D && codePoint <= 0x1F37F) {
    baseColor = DEFAULT_COLORS[Math.floor(Math.random() * 3) + 3]; // Orange/Yellow range
  }
  // Entertainment emojis (🎬, 🎮, 🎯) - purple/pink
  else if (codePoint >= 0x1F3AC && codePoint <= 0x1F3AF) {
    baseColor = DEFAULT_COLORS[Math.floor(Math.random() * 3) + 15]; // Purple range
  }
  // Shopping/bags (🛍️, 👜, 🎁) - pink
  else if ([0x1F6CD, 0x1F45C, 0x1F381].includes(codePoint)) {
    baseColor = DEFAULT_COLORS[Math.floor(Math.random() * 3)]; // Pink range
  }
  // Medical/health (💊, 🏥, 🩺) - green
  else if ([0x1F48A, 0x1F3E5, 0x1FA7A].includes(codePoint)) {
    baseColor = DEFAULT_COLORS[Math.floor(Math.random() * 3) + 9]; // Green range
  }
  // Neutral/gray emojis (📦, 🏢, ⚙️, 📊)
  else if ([0x1F4E6, 0x1F3E2, 0x2699, 0x1F4CA].includes(codePoint)) {
    baseColor = DEFAULT_COLORS[Math.floor(Math.random() * 3) + 21]; // Gray range
  }
  // Default to random color from palette
  else {
    baseColor = DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];
  }
  
  // Return solid color at 100% opacity
  return baseColor;
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
