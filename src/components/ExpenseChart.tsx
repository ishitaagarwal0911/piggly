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
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={expensesByCategory}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={90}
              paddingAngle={3}
              dataKey="amount"
              animationDuration={600}
              animationBegin={0}
              stroke="none"
            >
              {expensesByCategory.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  className="transition-all hover:opacity-80 cursor-pointer"
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-xs text-muted-foreground mb-1">Total</p>
          <p className="text-2xl font-semibold tracking-tight">{currency}{Math.round(totalExpenses)}</p>
        </div>
      </div>

      {/* Category List */}
      <div className="space-y-3">
        {expensesByCategory.map(({ category, name, icon, color, amount, percentage }) => (
          <button
            key={category}
            onClick={() => onCategoryClick?.(category)}
            className="w-full text-left transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] group"
          >
            <div className="flex items-center gap-3 p-2 rounded-lg transition-colors hover:bg-muted/30">
              <div 
                className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0 backdrop-blur-sm transition-transform group-hover:scale-105"
                style={{ backgroundColor: color }}
              >
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-sm font-medium truncate">{name}</span>
                  <span className="text-sm font-semibold whitespace-nowrap tracking-tight">
                    {currency}{amount.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${(amount / maxAmount) * 100}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
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
