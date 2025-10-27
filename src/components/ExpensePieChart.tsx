import { useMemo, useState, useEffect } from 'react';
import { Transaction } from '@/types/transaction';
import { getCategoryInfo } from '@/lib/categories';
import { loadSettings } from '@/lib/settings';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ExpensePieChartProps {
  transactions: Transaction[];
}

export const ExpensePieChart = ({ transactions }: ExpensePieChartProps) => {
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

  const totalExpenses = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0);
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-6 shadow-notion relative">
        <h3 className="text-sm font-medium mb-4">Spending by Category</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={[{ name: 'No Data', value: 1 }]}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={90}
              paddingAngle={0}
              dataKey="value"
              animationDuration={600}
              stroke="none"
            >
              <Cell fill="rgba(212, 212, 212, 0.2)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginTop: '24px' }}>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="text-2xl font-semibold tracking-tight">{currency}0</p>
          </div>
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
            {currency}{payload[0].value.toFixed(2)}
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
      <h3 className="text-sm font-medium mb-4">Spending by Category</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
