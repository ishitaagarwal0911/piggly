import { Transaction } from '@/types/transaction';
import { getCategoryInfo } from '@/lib/categories';
import { loadSettings } from '@/lib/settings';
import { useMemo } from 'react';

interface ExpenseChartProps {
  transactions: Transaction[];
  onCategoryClick?: (category: string) => void;
}

export const ExpenseChart = ({ transactions, onCategoryClick }: ExpenseChartProps) => {
  const settings = loadSettings();
  const currency = settings.currency.symbol;
  
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
      return {
        category,
        amount,
        percentage: (amount / total) * 100,
        info: info || { id: category, name: category, icon: '📦', color: '#6B7280', type: 'expense' as const, order: 999 },
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const total = expensesByCategory.reduce((sum, cat) => sum + cat.amount, 0);

  if (expensesByCategory.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-8 shadow-notion">
        <div className="text-center text-muted-foreground">
          <div className="w-48 h-48 mx-auto mb-4 rounded-full bg-secondary/50 flex items-center justify-center">
            <span className="text-5xl">📊</span>
          </div>
          <p className="text-sm">No expenses yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-6 shadow-notion">
      <h3 className="text-sm font-medium mb-6">Expenses by Category</h3>
      
      {/* Donut Chart */}
      <div className="relative w-48 h-48 mx-auto mb-6">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {expensesByCategory.reduce((acc, cat, idx) => {
            const startAngle = acc.offset;
            const angle = (cat.percentage / 100) * 360;
            const largeArcFlag = angle > 180 ? 1 : 0;
            
            const startX = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
            const startY = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
            const endX = 50 + 40 * Math.cos(((startAngle + angle) * Math.PI) / 180);
            const endY = 50 + 40 * Math.sin(((startAngle + angle) * Math.PI) / 180);
            
            acc.elements.push(
              <path
                key={cat.category}
                d={`M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArcFlag} 1 ${endX} ${endY} Z`}
                className="transition-all hover:opacity-80"
                style={{ fill: cat.info.color }}
              />
            );
            
            acc.offset += angle;
            return acc;
          }, { elements: [] as JSX.Element[], offset: 0 }).elements}
          
          {/* Center hole for donut effect */}
          <circle cx="50" cy="50" r="25" className="fill-background" />
        </svg>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-semibold">{currency}{total.toFixed(0)}</p>
        </div>
      </div>
      
      {/* Category List */}
      <div className="space-y-2">
        {expensesByCategory.map(cat => (
          <div key={cat.category} className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: cat.info.color }}
              />
              <span className="text-sm truncate">{cat.info.name}</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{currency}{cat.amount.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{cat.percentage.toFixed(0)}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
