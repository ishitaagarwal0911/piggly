import { useMemo, useState, useEffect } from 'react';
import { Transaction } from '@/types/transaction';
import { BudgetSummary } from '@/types/budget';
import { getCategoryInfo } from '@/lib/categories';
import { loadSettings } from '@/lib/settings';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { formatIndianNumber } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import Plus from 'lucide-react/dist/esm/icons/plus';

interface ExpensePieChartProps {
  transactions: Transaction[];
  budgetSummary?: BudgetSummary | null;
  onSetBudgetClick?: () => void;
}

export const ExpensePieChart = ({ transactions, budgetSummary, onSetBudgetClick }: ExpensePieChartProps) => {
  const [currency, setCurrency] = useState('₹');

  useEffect(() => {
    loadSettings().then(settings => {
      setCurrency(settings.currency.symbol);
    });
  }, []);

  const chartData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const byCategory = expenses.reduce((acc, t) => {
      if (!acc[t.category]) {
        const categoryInfo = getCategoryInfo(t.category);
        acc[t.category] = {
          name: categoryInfo?.name || t.category,
          value: 0,
          color: categoryInfo?.color || '#D4D4D4',
          icon: categoryInfo?.icon || '📦',
        };
      }
      acc[t.category].value += t.amount;
      return acc;
    }, {} as Record<string, { name: string; value: number; color: string; icon: string }>);

    return Object.values(byCategory)
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  if (chartData.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-notion">
        <h3 className="text-sm font-medium mb-4">Spending by Category</h3>
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">No expenses yet</p>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm">{payload[0].payload.icon} {payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            {currency}{formatIndianNumber(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-muted-foreground">
              {entry.payload.icon} {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-card rounded-2xl p-6 shadow-notion">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">Spending by Category</h3>
        {budgetSummary && budgetSummary.totalBudget > 0 ? (
          <span className="text-sm text-muted-foreground">
            Budget: {currency}{formatIndianNumber(budgetSummary.totalBudget)}
          </span>
        ) : onSetBudgetClick && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onSetBudgetClick}
            className="h-7 text-xs gap-1"
          >
            <Plus className="h-3 w-3" />
            Set budget
          </Button>
        )}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart key={`pie-${chartData.length}`}>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
            animationDuration={800}
            animationBegin={0}
            animationEasing="ease-out"
            isAnimationActive={true}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Budget vs Spending Section */}
      {budgetSummary && budgetSummary.categories.length > 0 && (
        <div className="mt-6 pt-6 border-t border-border/50">
          <h4 className="text-sm font-medium mb-4">Budget vs Spending</h4>
          <div className="space-y-4">
            {budgetSummary.categories.map((cat) => (
              <div key={cat.categoryId} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span className="font-medium">{cat.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground">
                      {currency}{formatIndianNumber(cat.spent)}
                    </span>
                    <span className="text-muted-foreground mx-1">/</span>
                    <span className="font-medium">
                      {currency}{formatIndianNumber(cat.budget)}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      {cat.percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <Progress 
                  value={Math.min(cat.percentage, 100)} 
                  className="h-2"
                  style={{
                    // @ts-ignore
                    '--progress-background': cat.color
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
