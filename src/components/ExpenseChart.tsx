import { useMemo, useState, useEffect } from "react";
import { Transaction } from "@/types/transaction";
import { BudgetSummary } from "@/types/budget";
import { getCategoryInfo } from "@/lib/categories";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { formatIndianNumber } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import X from 'lucide-react/dist/esm/icons/x';

interface ExpenseChartProps {
  transactions: Transaction[];
  onCategoryClick?: (category: string) => void;
  currency?: string;
  budgetSummary?: BudgetSummary | null;
  onSetBudgetClick?: () => void;
  hasActiveSubscription?: boolean;
  budgetLoading?: boolean;
}

export const ExpenseChart = ({
  transactions,
  onCategoryClick,
  currency = "₹",
  budgetSummary,
  onSetBudgetClick,
  hasActiveSubscription = false,
  budgetLoading = false,
}: ExpenseChartProps) => {
  const [showTooltip, setShowTooltip] = useState(() => {
    // Only show if we're NOT loading AND have confirmed budget is 0
    if (budgetLoading) return false;
    if (!budgetSummary) return false; // Don't show if budget hasn't loaded yet
    return budgetSummary.totalBudget === 0 && !hasActiveSubscription;
  });

  // Show tooltip if no budget is set AND user is not a paid member
  useEffect(() => {
    // Don't show tooltip while budget is loading
    if (budgetLoading) {
      setShowTooltip(false);
      return;
    }
    // Don't show tooltip if budget hasn't been fetched yet (avoids flicker)
    if (!budgetSummary) {
      setShowTooltip(false);
      return;
    }
    // Only show if budget is explicitly 0 and user is not subscribed
    const shouldShow = budgetSummary.totalBudget === 0 && !hasActiveSubscription;
    setShowTooltip(shouldShow);
  }, [budgetSummary, hasActiveSubscription, budgetLoading]);
  const expensesByCategory = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === "expense");
    const total = expenses.reduce((sum, t) => sum + t.amount, 0);

    if (total === 0) return [];

    const grouped = expenses.reduce(
      (acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(grouped)
      .map(([category, amount]) => {
        const info = getCategoryInfo(category);
        // Handle deleted categories - check if ID looks like a UUID
        const isDeletedCategory =
          !info && category.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        return {
          category,
          name: info?.name || (isDeletedCategory ? "Deleted Category" : category),
          icon: info?.icon || "📦",
          color: info?.color || "#D4D4D4",
          amount,
          percentage: (amount / total) * 100,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  // Show skeleton loaders during initial budget load
  if (budgetLoading) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-notion">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Spending by Category</h3>
          <Skeleton className="h-4 w-24" />
        </div>
        
        {/* Chart skeleton */}
        <div className="relative mb-6">
          <div className="flex items-center justify-center h-[220px]">
            <Skeleton className="w-[180px] h-[180px] rounded-full" />
          </div>
        </div>
        
        {/* Category list skeleton */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-full" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (expensesByCategory.length === 0) {
    const hasCategoryBudgets = budgetSummary?.categories && budgetSummary.categories.length > 0;
    
    return (
      <div className="bg-card rounded-2xl p-6 shadow-notion">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Spending by Category</h3>
        {onSetBudgetClick && (
          <div className="relative">
            <button
              onClick={onSetBudgetClick}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {budgetSummary && budgetSummary.totalBudget > 0
                ? `${currency}${formatIndianNumber(budgetSummary.totalBudget)}`
                : budgetLoading 
                  ? `${currency}...`
                  : "Set Budget →"}
            </button>
            {showTooltip && (
              <div className="absolute top-[-85px] right-0 bg-popover border shadow-lg rounded-lg p-3 pr-8 text-xs animate-fade-in w-[150px] z-50">
                <span className="text-foreground leading-relaxed block">
                  Start with setting your monthly budget
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTooltip(false);
                  }}
                  className="absolute top-2 right-2 text-muted-foreground hover:text-foreground flex-shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="absolute bottom-[-6px] right-6 w-3 h-3 bg-popover border-r border-b transform rotate-45" />
              </div>
            )}
          </div>
        )}
        </div>
        <div className="relative mb-6">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={[{ name: "No Data", value: 1 }]}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={90}
                paddingAngle={0}
                dataKey="value"
                animationDuration={600}
                stroke="none"
              >
                <Cell fill="rgba(212, 212, 212, 0.15)" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="text-2xl font-semibold tracking-tight">{currency}0</p>
          </div>
        </div>
        
        {!budgetLoading && hasCategoryBudgets && (
          <div className="space-y-3">
            {budgetSummary.categories.map((categoryBudget) => (
              <button
                key={categoryBudget.categoryId}
                onClick={() => onCategoryClick?.(categoryBudget.categoryId)}
                className="w-full text-left transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] group"
              >
                <div className="flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-muted/30">
                  <div className="w-9 h-9 flex items-center justify-center text-xl flex-shrink-0 transition-transform group-hover:scale-105">
                    {categoryBudget.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-sm font-medium truncate">{categoryBudget.name}</span>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className="text-sm font-semibold tracking-tight">
                          {currency}0
                        </span>
                        <span className="text-xs text-muted-foreground">
                          / {currency}{formatIndianNumber(categoryBudget.budget)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: '0%',
                            backgroundColor: categoryBudget.color,
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                        0%
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const maxAmount = Math.max(...expensesByCategory.map((c) => c.amount));
  const totalExpenses = expensesByCategory.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="bg-card rounded-2xl p-6 shadow-notion">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">Spending by Category</h3>
        {onSetBudgetClick && (
          <button
            onClick={onSetBudgetClick}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {budgetSummary && budgetSummary.totalBudget > 0
              ? `Budget: ${currency}${formatIndianNumber(budgetSummary.totalBudget)}`
              : "Set Budget →"}
          </button>
        )}
      </div>

      {/* Ring Chart */}
      <div className="relative mb-6">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart key={`pie-${expensesByCategory.length}-${totalExpenses}`}>
            <Pie
              data={expensesByCategory}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={90}
              paddingAngle={3}
              dataKey="amount"
              animationDuration={800}
              animationBegin={0}
              animationEasing="ease-out"
              stroke="none"
              isAnimationActive={true}
            >
              {expensesByCategory.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  className="transition-all hover:opacity-80 cursor-pointer"
                  onClick={() => onCategoryClick?.(entry.category)}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-xs text-muted-foreground mb-1">Total</p>
          <p className="text-2xl font-semibold tracking-tight">
            {currency}
            {formatIndianNumber(Math.round(totalExpenses))}
          </p>
        </div>
      </div>

      {/* Category List */}
      <div className="space-y-3">
        {expensesByCategory.map(({ category, name, icon, color, amount, percentage }) => {
          // Find budget info for this category
          const categoryBudget = budgetSummary?.categories.find((c) => c.categoryId === category);

          return (
            <button
              key={category}
              onClick={() => onCategoryClick?.(category)}
              className="w-full text-left transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] group"
            >
              <div className="flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-muted/30">
                <div className="w-9 h-9 flex items-center justify-center text-xl flex-shrink-0 transition-transform group-hover:scale-105">
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-sm font-medium truncate">{name}</span>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span
                        className={`text-sm font-semibold tracking-tight ${
                          categoryBudget && categoryBudget.budget > 0 && amount > categoryBudget.budget
                            ? "text-destructive"
                            : ""
                        }`}
                      >
                        {currency}
                        {formatIndianNumber(amount)}
                      </span>
                      {categoryBudget && categoryBudget.budget > 0 && (
                        <span className="text-xs text-muted-foreground">
                          / {currency}
                          {formatIndianNumber(categoryBudget.budget)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${
                            categoryBudget && categoryBudget.budget > 0
                              ? Math.min((amount / categoryBudget.budget) * 100, 100)
                              : (amount / maxAmount) * 100
                          }%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                      {categoryBudget && categoryBudget.budget > 0
                        ? `${categoryBudget.percentage.toFixed(0)}%`
                        : `${percentage.toFixed(0)}%`}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
