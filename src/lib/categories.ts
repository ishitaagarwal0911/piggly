import { CategoryInfo, CategoryType } from '@/types/transaction';

export const categories: CategoryInfo[] = [
  { id: 'food', name: 'Food & Drinks', icon: '🍽️', color: 'category-food' },
  { id: 'transport', name: 'Transport', icon: '🚗', color: 'category-transport' },
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: 'category-shopping' },
  { id: 'bills', name: 'Bills', icon: '💡', color: 'category-bills' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: 'category-entertainment' },
  { id: 'health', name: 'Health', icon: '💊', color: 'category-health' },
  { id: 'income', name: 'Income', icon: '💰', color: 'category-income' },
  { id: 'other', name: 'Other', icon: '📦', color: 'category-other' },
];

export const getCategoryInfo = (id: CategoryType): CategoryInfo => {
  return categories.find(cat => cat.id === id) || categories[categories.length - 1];
};
