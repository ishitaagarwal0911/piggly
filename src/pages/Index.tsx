import { useState, useEffect } from 'react';
import { Transaction } from '@/types/transaction';
import { BalanceSummary } from '@/components/BalanceSummary';
import { ExpenseChart } from '@/components/ExpenseChart';
import { AddTransactionDialog } from '@/components/AddTransactionDialog';
import { SettingsSheet } from '@/components/SettingsSheet';
import { PeriodSelector } from '@/components/PeriodSelector';
import { TransactionDetailSheet } from '@/components/TransactionDetailSheet';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { loadTransactions, saveTransactions } from '@/lib/storage';
import { loadSettings } from '@/lib/settings';
import { getFilteredTransactions, getPreviousPeriod, getNextPeriod, ViewType } from '@/lib/dateUtils';
import { toast } from 'sonner';

const Index = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('monthly');
  const [refreshKey, setRefreshKey] = useState(0);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [detailFilter, setDetailFilter] = useState<{ type?: 'expense' | 'income'; category?: string }>({});
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    const loaded = loadTransactions();
    setTransactions(loaded);
    const settings = loadSettings();
    setViewType(settings.defaultView);
  }, [refreshKey]);

  const handleAddTransaction = (newTransaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (editingTransaction) {
      // Update existing transaction
      const updated = transactions.map(t =>
        t.id === editingTransaction.id
          ? { ...editingTransaction, ...newTransaction }
          : t
      );
      setTransactions(updated);
      saveTransactions(updated);
      toast.success('Transaction updated');
      setEditingTransaction(null);
    } else {
      // Add new transaction
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
    }
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

  const handleCategoryClick = (category: string) => {
    setDetailFilter({ type: 'expense', category });
    setDetailSheetOpen(true);
  };

  const handleExpenseClick = () => {
    setDetailFilter({ type: 'expense' });
    setDetailSheetOpen(true);
  };

  const handleIncomeClick = () => {
    setDetailFilter({ type: 'income' });
    setDetailSheetOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setShowAddDialog(true);
    setDetailSheetOpen(false);
  };

  const handleDialogClose = (open: boolean) => {
    setShowAddDialog(open);
    if (!open) {
      setEditingTransaction(null);
    }
  };

  const handleDeleteTransaction = (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    saveTransactions(updated);
    toast.success('Transaction deleted');
    setEditingTransaction(null);
  };

  const handleDetailSheetAddClick = (type: 'income' | 'expense') => {
    setDetailSheetOpen(false);
    setTransactionType(type);
    setShowAddDialog(true);
  };

  const handleDateSelect = (date: Date) => {
    setCurrentDate(date);
  };

  const filteredTransactions = getFilteredTransactions(transactions, currentDate, viewType);

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-center relative">
          <PeriodSelector
            currentDate={currentDate}
            viewType={viewType}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onDateSelect={handleDateSelect}
          />
          <div className="absolute right-4">
            <SettingsSheet onSettingsChange={handleSettingsChange} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <BalanceSummary 
          transactions={filteredTransactions}
          onExpenseClick={handleExpenseClick}
          onIncomeClick={handleIncomeClick}
        />
        <ExpenseChart 
          transactions={filteredTransactions}
          onCategoryClick={handleCategoryClick}
        />
      </main>

      {/* Floating Add Button */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center pointer-events-none z-50">
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
        onOpenChange={handleDialogClose}
        onAdd={handleAddTransaction}
        onDelete={handleDeleteTransaction}
        editingTransaction={editingTransaction}
        initialType={transactionType}
      />

      <TransactionDetailSheet
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        transactions={filteredTransactions}
        filterType={detailFilter.type}
        filterCategory={detailFilter.category}
        onEdit={handleEditTransaction}
        onAddClick={handleDetailSheetAddClick}
        defaultTab={detailFilter.category ? "by-category" : undefined}
        defaultOpenCategory={detailFilter.category}
      />
    </div>
  );
};

export default Index;
