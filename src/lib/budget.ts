import { supabase } from '@/integrations/supabase/client';
import { Budget, BudgetSummary } from '@/types/budget';
import { Transaction } from '@/types/transaction';
import { endOfMonth } from 'date-fns/endOfMonth';
import { differenceInDays } from 'date-fns/differenceInDays';

// Budget cache for instant loading
const BUDGET_CACHE_KEY = 'piggly_cache_budget_v1.0';

interface BudgetCache {
  budget: Budget;
  userId: string;
  timestamp: number;
}

const cacheBudget = (budget: Budget, userId: string): void => {
  try {
    const cacheData: BudgetCache = {
      budget,
      userId,
      timestamp: Date.now(),
    };
    localStorage.setItem(BUDGET_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to cache budget:', error);
  }
};

const getCachedBudget = (userId: string): Budget | null => {
  try {
    const cached = localStorage.getItem(BUDGET_CACHE_KEY);
    if (!cached) return null;

    const { budget, userId: cachedUserId } = JSON.parse(cached) as BudgetCache;
    if (cachedUserId !== userId) return null;

    // Reconstruct Date objects
    return {
      ...budget,
      month: new Date(budget.month),
      createdAt: new Date(budget.createdAt),
      updatedAt: budget.updatedAt ? new Date(budget.updatedAt) : undefined,
    };
  } catch (error) {
    console.warn('Failed to read cached budget:', error);
    return null;
  }
};

const clearBudgetCache = (): void => {
  try {
    localStorage.removeItem(BUDGET_CACHE_KEY);
  } catch (error) {
    console.warn('Failed to clear budget cache:', error);
  }
};

// Fixed month value for single global budget (unique constraint workaround)
const GLOBAL_BUDGET_MONTH = '1970-01-01';

const formatBudget = (data: any): Budget => ({
  id: data.id,
  userId: data.user_id,
  month: new Date(data.month),
  overallBudget: Number(data.overall_budget),
  categoryBudgets: data.category_budgets as Record<string, number>,
  createdAt: new Date(data.created_at),
  updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
});

/**
 * Save the user's single global budget
 */
export const saveBudget = async (
  budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>,
  userId?: string
): Promise<Budget | null> => {
  const uid = userId || budget.userId || (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return null;

  const { data, error } = await supabase
    .from('budgets')
    .upsert({
      user_id: uid,
      month: GLOBAL_BUDGET_MONTH, // Fixed value for single global budget
      overall_budget: budget.overallBudget,
      category_budgets: budget.categoryBudgets,
    }, {
      onConflict: 'user_id,month'
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving budget:', error);
    return null;
  }

  const savedBudget = formatBudget(data);
  cacheBudget(savedBudget, uid);
  return savedBudget;
};

/**
 * Load the user's single global budget
 */
export const loadBudget = async (userId?: string): Promise<Budget | null> => {
  const uid = userId || (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return null;

  // Check cache first for instant loading
  const cached = getCachedBudget(uid);
  if (cached) return cached;

  // Get the user's single budget (no month filter needed - just get latest)
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const budget = formatBudget(data);
  cacheBudget(budget, uid);
  return budget;
};

/**
 * @deprecated Use loadBudget() instead - budget is now global, not per-month
 */
export const getCurrentMonthBudget = async (userId?: string): Promise<Budget | null> => {
  return loadBudget(userId);
};

/**
 * Delete the user's budget
 */
export const deleteBudget = async (userId?: string): Promise<boolean> => {
  const uid = userId || (await supabase.auth.getUser()).data.user?.id;
  if (!uid) return false;

  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('user_id', uid);

  if (!error) {
    clearBudgetCache();
  }

  return !error;
};

export const calculateSafeToSpend = (totalBudget: number, totalSpent: number): number => {
  const today = new Date();
  const lastDay = endOfMonth(today);
  const remainingDays = Math.max(1, differenceInDays(lastDay, today) + 1);
  
  const remaining = totalBudget - totalSpent;
  return remaining > 0 ? remaining / remainingDays : 0;
};

export const calculateBudgetSummary = (
  budget: Budget,
  transactions: Transaction[],
  categories: Array<{ id: string; name: string; icon: string; color: string; type: string }>
): BudgetSummary => {
  const today = new Date();
  const lastDay = endOfMonth(today);
  const remainingDays = Math.max(1, differenceInDays(lastDay, today) + 1);

  // Calculate total spent from expense transactions
  const totalSpent = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate per-category spending
  const categorySpending: Record<string, number> = {};
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
    });

  // Build category summaries
  const categorySummaries = Object.entries(budget.categoryBudgets).map(([categoryId, budgetAmount]) => {
    const category = categories.find(c => c.id === categoryId);
    const spent = categorySpending[categoryId] || 0;
    const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

    return {
      categoryId,
      name: category?.name || 'Unknown',
      icon: category?.icon || '📦',
      color: category?.color || '#9D9A97',
      budget: budgetAmount,
      spent,
      percentage,
    };
  });

  return {
    totalBudget: budget.overallBudget,
    totalSpent,
    safeToSpend: calculateSafeToSpend(budget.overallBudget, totalSpent),
    remainingDays,
    categories: categorySummaries,
  };
};
