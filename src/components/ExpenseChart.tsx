import { useState, useEffect, useMemo } from 'react';
import { Transaction } from '@/types/transaction';
import { getCategoryInfo } from '@/lib/categories';
import { loadSettings } from '@/lib/settings';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ExpenseChartProps {
  transactions: Transaction[];
  onCategoryClick?: (category: string) => void;
}

export const ExpenseChart = ({ transactions, onCategoryClick }: ExpenseChartProps) => {
  const [currency, setCurrency] = useState('₹');
  
  useEffect(() => {
    loadSettings().then(settings => {
      setCurrency(settings.currency.symbol);
    });
  }, []);
  
  const expensesByCategory = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const total = expenses.reduce((sum, t) => sum + t.amount, 0);
    
    if (total === 0) return [];
    
    const grouped = expenses.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(grouped).map(([category, amount]) => {
      const info = getCategoryInfo(category);
      // Handle deleted categories - check if ID looks like a UUID
      const isDeletedCategory = !info && category.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      return {
        category,
        name: info?.name || (isDeletedCategory ? 'Deleted Category' : category),
        icon: info?.icon || '📦',
        color: info?.color || '#D4D4D4',
        amount,
        percentage: (amount / total) * 100,
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  if (expensesByCategory.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-notion">
        <h3 className="text-sm font-medium mb-4">Spending by Category</h3>
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">No expenses yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Start tracking your expenses to see the breakdown
          </p>
        </div>
      </div>
    );
  }

  const maxAmount = Math.max(...expensesByCategory.map(c => c.amount));
  const totalExpenses = expensesByCategory.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="bg-card rounded-2xl p-6 shadow-notion">
      <h3 className="text-sm font-medium mb-4">Spending by Category</h3>
      
      {/* Ring Chart */}
      <div className="relative mb-6">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={expensesByCategory}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="amount"
            >
              {expensesByCategory.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-semibold">{currency}{totalExpenses.toFixed(2)}</p>
        </div>
      </div>

      {/* Category List */}
      <div className="space-y-4">
        {expensesByCategory.map(({ category, name, icon, color, amount, percentage }) => (
          <button
            key={category}
            onClick={() => onCategoryClick?.(category)}
            className="w-full text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm flex-shrink-0"
                style={{ backgroundColor: color }}
              >
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium truncate">{name}</span>
                  <span className="text-sm font-semibold whitespace-nowrap">
                    {currency}{amount.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${(amount / maxAmount) * 100}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
