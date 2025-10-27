import { useState, useEffect } from 'react';
import { Transaction } from '@/types/transaction';
import { BalanceSummary } from '@/components/BalanceSummary';
import { ExpenseChart } from '@/components/ExpenseChart';
import { TransactionList } from '@/components/TransactionList';
import { AddTransactionDialog } from '@/components/AddTransactionDialog';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { loadTransactions, saveTransactions } from '@/lib/storage';
import { toast } from 'sonner';

const Index = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    const loaded = loadTransactions();
    setTransactions(loaded);
  }, []);

  const handleAddTransaction = (newTransaction: Omit<Transaction, 'id' | 'date'>) => {
    const transaction: Transaction = {
      ...newTransaction,
      id: crypto.randomUUID(),
      date: new Date(),
    };

    const updated = [transaction, ...transactions];
    setTransactions(updated);
    saveTransactions(updated);
    
    toast.success('Transaction added', {
      description: `${newTransaction.type === 'income' ? '+' : '-'}$${newTransaction.amount.toFixed(2)} ${newTransaction.note}`,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Expenses</h1>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <BalanceSummary transactions={transactions} />
        <ExpenseChart transactions={transactions} />
        <TransactionList transactions={transactions} />
      </main>

      {/* Floating Add Button */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none">
        <Button
          size="lg"
          className="rounded-full w-14 h-14 shadow-notion-hover pointer-events-auto transition-transform hover:scale-105 active:scale-95"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Add Transaction Dialog */}
      <AddTransactionDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={handleAddTransaction}
      />
    </div>
  );
};

export default Index;
