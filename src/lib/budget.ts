import { supabase } from '@/integrations/supabase/client';
import { Budget, BudgetSummary } from '@/types/budget';
import { Transaction } from '@/types/transaction';
import { startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

export const saveBudget = async (budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>): Promise<Budget | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const monthStart = startOfMonth(budget.month);
  
  const { data, error } = await supabase
    .from('budgets')
    .upsert({
      user_id: user.id,
      month: monthStart.toISOString().split('T')[0],
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

  return {
    id: data.id,
    userId: data.user_id,
    month: new Date(data.month),
    overallBudget: Number(data.overall_budget),
    categoryBudgets: data.category_budgets as Record<string, number>,
    createdAt: new Date(data.created_at),
    updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
  };
};

export const loadBudget = async (month: Date): Promise<Budget | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const monthStart = startOfMonth(month);
  
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', user.id)
    .eq('month', monthStart.toISOString().split('T')[0])
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    month: new Date(data.month),
    overallBudget: Number(data.overall_budget),
    categoryBudgets: data.category_budgets as Record<string, number>,
    createdAt: new Date(data.created_at),
    updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
  };
};

export const getCurrentMonthBudget = async (): Promise<Budget | null> => {
  return loadBudget(new Date());
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
