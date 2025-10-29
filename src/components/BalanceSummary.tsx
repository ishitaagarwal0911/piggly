import { Transaction } from '@/types/transaction';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatAmount } from '@/lib/utils';

interface BalanceSummaryProps {
  transactions: Transaction[];
  onExpenseClick?: () => void;
  onIncomeClick?: () => void;
  currency?: string;
}

export const BalanceSummary = ({ transactions, onExpenseClick, onIncomeClick, currency = '₹' }: BalanceSummaryProps) => {
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
          {currency}{formatAmount(balance)}
        </h2>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={onIncomeClick}
          className="bg-success/10 rounded-xl p-4 text-left transition-all duration-200 hover:bg-success/15 hover:scale-[1.01] active:scale-[0.99] border border-success/10"
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-success" />
            <p className="text-xs text-muted-foreground">Income</p>
          </div>
          <p className="text-lg font-semibold text-success tracking-tight break-words leading-tight">
            +{currency}{income.toFixed(0)}
          </p>
        </button>
        
        <button
          onClick={onExpenseClick}
          className="bg-destructive/10 rounded-xl p-4 text-left transition-all duration-200 hover:bg-destructive/15 hover:scale-[1.01] active:scale-[0.99] border border-destructive/10"
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <p className="text-xs text-muted-foreground">Expenses</p>
          </div>
          <p className="text-lg font-semibold text-destructive tracking-tight break-words leading-tight">
            -{currency}{expenses.toFixed(0)}
          </p>
        </button>
      </div>
    </div>
  );
};
