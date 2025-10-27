import { CustomCategory } from '@/types/settings';
import { getCategories, getCategoryById } from './settings';

export const categories = (): CustomCategory[] => {
  return getCategories();
};

export const getCategoryInfo = (id: string): CustomCategory | undefined => {
  return getCategoryById(id);
};
