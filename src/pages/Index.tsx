import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { toast } from 'sonner';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('monthly');
  const [refreshKey, setRefreshKey] = useState(0);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [detailFilter, setDetailFilter] = useState<{ type?: 'expense' | 'income'; category?: string }>({});
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [currency, setCurrency] = useState('₹');

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      const loaded = await loadTransactions();
      setTransactions(loaded);
      const settings = await loadSettings();
      setViewType(settings.defaultView);
      setCurrency(settings.currency.symbol);
    };
    loadData();
  }, [refreshKey, user]);

  // Real-time sync with immediate state updates
  useRealtimeSync(
    (payload) => {
      if (payload.eventType === 'INSERT') {
        setTransactions(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        setTransactions(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
      } else if (payload.eventType === 'DELETE') {
        setTransactions(prev => prev.filter(t => t.id !== payload.old.id));
      }
    },
    () => setRefreshKey(prev => prev + 1),
    () => setRefreshKey(prev => prev + 1)
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  const handleAddTransaction = async (newTransaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (editingTransaction) {
      // Update existing transaction
      const updated = transactions.map(t =>
        t.id === editingTransaction.id
          ? { ...editingTransaction, ...newTransaction }
          : t
      );
      await saveTransactions(updated);
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
      await saveTransactions(updated);
      
      toast.success('Transaction added', {
        description: `${newTransaction.type === 'income' ? '+' : '-'}${currency}${newTransaction.amount.toFixed(2)} ${newTransaction.note}`,
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

  const handleDeleteTransaction = async (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    await saveTransactions(updated);
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
