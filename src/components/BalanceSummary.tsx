import { Transaction } from '@/types/transaction';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import TrendingDown from 'lucide-react/dist/esm/icons/trending-down';
import { formatIndianNumber } from '@/lib/utils';

interface BalanceSummaryProps {
  transactions: Transaction[];
  onExpenseClick?: () => void;
  onIncomeClick?: () => void;
  currency?: string;
  totalBudget?: number;
  totalSpent?: number;
  safeToSpend?: number;
  onSetBudgetClick?: () => void;
}

export const BalanceSummary = ({ 
  transactions, 
  onExpenseClick, 
  onIncomeClick, 
  currency = '₹',
  totalBudget,
  totalSpent,
  safeToSpend,
  onSetBudgetClick
}: BalanceSummaryProps) => {
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
          {balance < 0 
            ? `-${currency}${formatIndianNumber(Math.abs(balance))}`
            : `${currency}${formatIndianNumber(balance)}`
          }
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
            +{currency}{formatIndianNumber(income)}
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
            -{currency}{formatIndianNumber(expenses)}
          </p>
        </button>
      </div>

      {/* Budget Section */}
      {onSetBudgetClick && (
        <>
          {totalBudget !== undefined && totalBudget > 0 ? (
            <button
              onClick={onSetBudgetClick}
              className="mt-4 pt-4 border-t border-border/50 w-full text-left transition-colors hover:bg-accent/30 rounded-lg -mx-2 px-2 py-2"
            >
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Spends</p>
                  <p className="text-sm font-semibold text-destructive">
                    {currency}{formatIndianNumber(totalSpent || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Budget</p>
                  <p className="text-sm font-semibold">
                    {currency}{formatIndianNumber(totalBudget)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">Safe to spend</p>
                  <p className="text-sm font-semibold text-primary">
                    {currency}{formatIndianNumber(safeToSpend || 0)}
                  </p>
                </div>
              </div>
            </button>
          ) : (
            <button
              onClick={onSetBudgetClick}
              className="mt-4 pt-4 border-t border-border/50 w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Set monthly budget →
            </button>
          )}
        </>
      )}
    </div>
  );
};
