import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Transaction } from '@/types/transaction';
import { BalanceSummary } from '@/components/BalanceSummary';
import { ExpenseChart } from '@/components/ExpenseChart';
import { SettingsSheet } from '@/components/SettingsSheet';
import { PeriodSelector } from '@/components/PeriodSelector';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { loadTransactions, saveTransactions, deleteTransaction } from '@/lib/storage';
import { loadSettings } from '@/lib/settings';
import { getFilteredTransactions, getPreviousPeriod, getNextPeriod, ViewType } from '@/lib/dateUtils';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { toast } from 'sonner';

// Lazy load heavy components for faster initial load
const AddTransactionDialog = lazy(() => import('@/components/AddTransactionDialog'));
const TransactionDetailSheet = lazy(() => import('@/components/TransactionDetailSheet'));

const Index = () => {
  const { user, loading, isInitialized } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('monthly');
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [detailFilter, setDetailFilter] = useState<{ type?: 'expense' | 'income'; category?: string }>({});
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [currency, setCurrency] = useState('₹');

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!loading && !user && isInitialized) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, isInitialized, navigate]);

  // Load initial data only once
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      setDataLoading(true);
      
      // Load transactions and settings in parallel for faster loading
      const [loaded, settings] = await Promise.all([
        loadTransactions(),
        loadSettings()
      ]);
      
      setTransactions(loaded);
      setViewType(settings.defaultView);
      setCurrency(settings.currency.symbol);
      setDataLoading(false);
    };
    loadData();
  }, [user]); // Only reload when user changes (auth state)

  // Real-time sync with proper data transformation
  useRealtimeSync(
    (payload) => {
      if (payload.eventType === 'INSERT') {
        const newTransaction: Transaction = {
          id: payload.new.id,
          amount: parseFloat(String(payload.new.amount)),
          type: payload.new.type,
          category: payload.new.category,
          note: payload.new.note || '',
          date: new Date(payload.new.date),
          createdAt: new Date(payload.new.created_at),
          updatedAt: payload.new.updated_at ? new Date(payload.new.updated_at) : undefined,
        };
        setTransactions(prev => [newTransaction, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        const updatedTransaction: Transaction = {
          id: payload.new.id,
          amount: parseFloat(String(payload.new.amount)),
          type: payload.new.type,
          category: payload.new.category,
          note: payload.new.note || '',
          date: new Date(payload.new.date),
          createdAt: new Date(payload.new.created_at),
          updatedAt: payload.new.updated_at ? new Date(payload.new.updated_at) : undefined,
        };
        setTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t));
      } else if (payload.eventType === 'DELETE') {
        setTransactions(prev => prev.filter(t => t.id !== payload.old.id));
      }
    },
    undefined, // No need to reload settings on sync
    undefined  // No need to reload settings on error
  );

  // App shell pattern - show skeleton while loading for better perceived performance
  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-background border-b border-border">
          <div className="max-w-2xl mx-auto px-4 py-3 h-14" />
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Balance summary skeleton */}
          <div className="bg-card rounded-lg p-4 space-y-3 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="flex gap-2">
              <div className="h-16 bg-muted rounded flex-1" />
              <div className="h-16 bg-muted rounded flex-1" />
            </div>
          </div>
          {/* Chart skeleton */}
          <div className="bg-card rounded-lg p-4 space-y-3 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </main>
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

  const handleSettingsChange = async (newView?: ViewType) => {
    if (newView) {
      setViewType(newView);
    }
    // Reload settings to update currency
    const settings = await loadSettings();
    setCurrency(settings.currency.symbol);
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
    try {
      await deleteTransaction(id);
      toast.success('Transaction deleted');
      setEditingTransaction(null);
    } catch (error) {
      toast.error('Failed to delete transaction');
      console.error('Delete error:', error);
    }
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
          className="rounded-full px-6 h-14 shadow-notion-hover pointer-events-auto transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Add</span>
        </Button>
      </div>

      {/* Add Transaction Dialog - Lazy loaded */}
      <Suspense fallback={null}>
        <AddTransactionDialog
          open={showAddDialog}
          onOpenChange={handleDialogClose}
          onAdd={handleAddTransaction}
          onDelete={handleDeleteTransaction}
          editingTransaction={editingTransaction}
          initialType={transactionType}
        />
      </Suspense>

      <Suspense fallback={null}>
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
      </Suspense>
    </div>
  );
};

export default Index;
