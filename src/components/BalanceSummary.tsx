import { Transaction } from '@/types/transaction';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { loadSettings } from '@/lib/settings';

interface BalanceSummaryProps {
  transactions: Transaction[];
  onExpenseClick?: () => void;
  onIncomeClick?: () => void;
}

export const BalanceSummary = ({ transactions, onExpenseClick, onIncomeClick }: BalanceSummaryProps) => {
  const settings = loadSettings();
  const currency = settings.currency.symbol;
  
  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const expenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const balance = income - expenses;

  return (
    <div className="bg-card rounded-2xl p-6 shadow-notion">
      <div className="text-center mb-6">
        <p className="text-sm text-muted-foreground mb-2">Current Balance</p>
        <h2 className="text-4xl font-semibold tracking-tight">
          {currency}{balance.toFixed(2)}
        </h2>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div onClick={onIncomeClick} className="bg-secondary/50 rounded-xl p-4 transition-smooth cursor-pointer hover:bg-secondary/70">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-category-income" />
            <span className="text-xs text-muted-foreground">Income</span>
          </div>
          <p className="text-xl font-medium text-category-income">
            {currency}{income.toFixed(2)}
          </p>
        </div>
        
        <div onClick={onExpenseClick} className="bg-secondary/50 rounded-xl p-4 transition-smooth cursor-pointer hover:bg-secondary/70">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <span className="text-xs text-muted-foreground">Expenses</span>
          </div>
          <p className="text-xl font-medium text-destructive">
            {currency}{expenses.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
};
