import { useState, useEffect } from 'react';
import { Transaction } from '@/types/transaction';
import { BalanceSummary } from '@/components/BalanceSummary';
import { ExpenseChart } from '@/components/ExpenseChart';
import { AddTransactionDialog } from '@/components/AddTransactionDialog';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SettingsSheet } from '@/components/SettingsSheet';
import { PeriodSelector } from '@/components/PeriodSelector';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { loadTransactions, saveTransactions } from '@/lib/storage';
import { loadSettings } from '@/lib/settings';
import { getFilteredTransactions, getPreviousPeriod, getNextPeriod, ViewType } from '@/lib/dateUtils';
import { toast } from 'sonner';

const Index = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('monthly');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loaded = loadTransactions();
    setTransactions(loaded);
    const settings = loadSettings();
    setViewType(settings.defaultView);
  }, [refreshKey]);

  const handleAddTransaction = (newTransaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    const transaction: Transaction = {
      ...newTransaction,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };

    const updated = [transaction, ...transactions];
    setTransactions(updated);
    saveTransactions(updated);
    
    toast.success('Transaction added', {
      description: `${newTransaction.type === 'income' ? '+' : '-'}$${newTransaction.amount.toFixed(2)} ${newTransaction.note}`,
    });
  };

  const handlePrevious = () => {
    setCurrentDate(getPreviousPeriod(currentDate, viewType));
  };

  const handleNext = () => {
    setCurrentDate(getNextPeriod(currentDate, viewType));
  };

  const handleSettingsChange = () => {
    setRefreshKey(prev => prev + 1);
  };

  const filteredTransactions = getFilteredTransactions(transactions, currentDate, viewType);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Expenses</h1>
          <div className="flex items-center gap-2">
            <SettingsSheet onSettingsChange={handleSettingsChange} />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <PeriodSelector
          currentDate={currentDate}
          viewType={viewType}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onDateSelect={setCurrentDate}
        />
        <BalanceSummary transactions={filteredTransactions} />
        <ExpenseChart transactions={filteredTransactions} />
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
