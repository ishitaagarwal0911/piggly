import { AppSettings, CustomCategory, CurrencyOption, CURRENCY_OPTIONS } from '@/types/settings';
import { getDefaultCategories } from './categories';
import { supabase } from '@/integrations/supabase/client';

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

    const currency: CurrencyOption = {
      code: settingsData?.currency_code || 'INR',
      symbol: settingsData?.currency_symbol || '₹',
      name: settingsData?.currency_name || 'Indian Rupee',
    };

    return {
      categories: categories.length > 0 ? categories : getDefaultCategories(),
      currency,
      defaultView: (settingsData?.default_view as 'daily' | 'weekly' | 'monthly') || 'monthly',
      theme: (settingsData?.theme as 'light' | 'dark' | 'system') || 'system',
    };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return getDefaultSettings();
  }
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

export const addCategory = async (category: CustomCategory): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await supabase.from('categories').insert({
    id: category.id,
    user_id: user.id,
    name: category.name,
    icon: category.icon,
    color: category.color,
    type: category.type,
    order_index: category.order,
  });
};

export const updateCategory = async (category: CustomCategory): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await supabase
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
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)
    .eq('user_id', user.id);
};
