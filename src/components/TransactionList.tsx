import { Transaction } from '@/types/transaction';
import { getCategoryInfo } from '@/lib/categories';
import { format } from 'date-fns';
import { formatIndianNumber } from '@/lib/utils';

interface TransactionListProps {
  transactions: Transaction[];
}

export const TransactionList = ({ transactions }: TransactionListProps) => {
  const sortedTransactions = [...transactions].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );

  if (sortedTransactions.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-8 shadow-notion text-center">
        <p className="text-muted-foreground text-sm">No transactions yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Tap the + button to add your first transaction
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-4 shadow-notion">
      <h3 className="text-sm font-medium mb-4 px-2">Recent Transactions</h3>
      <div className="space-y-1">
        {sortedTransactions.slice(0, 10).map(transaction => {
          const categoryInfo = getCategoryInfo(transaction.category);
          return (
            <div
              key={transaction.id}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
            >
              <div
                className="w-10 h-10 flex items-center justify-center flex-shrink-0"
              >
                <span className="text-lg">{categoryInfo.icon}</span>
              </div>
              
              <div className="flex-1 min-w-0">
                {transaction.note && <p className="text-sm font-medium truncate">{transaction.note}</p>}
                <p className="text-xs text-muted-foreground">
                  {categoryInfo.name} · {format(transaction.date, 'MMM d')}
                </p>
              </div>
              
              <p
                className={`text-sm font-semibold flex-shrink-0 ${
                  transaction.type === 'income'
                    ? 'text-category-income'
                    : 'text-foreground'
                }`}
              >
                {transaction.type === 'income' ? '+' : '-'}${formatIndianNumber(transaction.amount)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
