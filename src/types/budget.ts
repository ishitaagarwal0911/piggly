export interface CategoryBudget {
  categoryId: string;
  amount: number;
}

export interface Budget {
  id: string;
  userId: string;
  month: Date;
  overallBudget: number;
  categoryBudgets: Record<string, number>; // categoryId -> amount
  createdAt: Date;
  updatedAt?: Date;
}

export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  safeToSpend: number;
  remainingDays: number;
  categories: {
    categoryId: string;
    name: string;
    icon: string;
    color: string;
    budget: number;
    spent: number;
    percentage: number;
  }[];
}
