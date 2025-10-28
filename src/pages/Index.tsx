import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
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
import { useHistoryState } from '@/hooks/useHistoryState';
import { usePageRestore } from '@/hooks/usePageRestore';
import { getCachedTransactions, isCacheFresh } from '@/lib/cache';
import { toast } from 'sonner';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import piggyTransparent from '@/assets/piggly_transparent.png';

// Lazy load heavy components for faster initial load
const AddTransactionDialog = lazy(() => import('@/components/AddTransactionDialog'));
const TransactionDetailSheet = lazy(() => import('@/components/TransactionDetailSheet'));

const Index = () => {
  const { user, loading, isInitialized } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAddDialog, setShowAddDialog] = useHistoryState(false, 'add-transaction');
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('monthly');
  const [detailSheetOpen, setDetailSheetOpen] = useHistoryState(false, 'detail-sheet');
  const [detailFilter, setDetailFilter] = useState<{ type?: 'expense' | 'income'; category?: string }>({});
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [currency, setCurrency] = useState('₹');
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Track user ID to prevent unnecessary reloads
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const userIdRef = useRef<string | null>(null);

  // Restore page state across cold starts
  usePageRestore(currentDate, viewType);

  // Swipe gesture to open settings menu (mobile)
  useSwipeGesture({
    onSwipeRight: () => {
      setSettingsOpen(true);
    },
    edgeThreshold: 50, // Start swipe within 50px from left edge
  });

  // Debug: Track component lifecycle
  useEffect(() => {
    console.log('[Index] Component mounted/updated', {
      userId: user?.id,
      transactionCount: transactions.length,
      timestamp: Date.now()
    });
  }, [user?.id, transactions.length]);

  // Debug: Track visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      console.log('[Index] Visibility changed:', document.hidden ? 'hidden' : 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!loading && !user && isInitialized) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, isInitialized, navigate]);

  // Load initial data with instant cache rendering
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      // Only load if user changed OR first load
      if (hasLoadedData && userIdRef.current === user.id) {
        console.log('[Index] Skipping data load - same user already loaded');
        return;
      }
      
      console.log('[Index] Loading data for user:', user.id);
      userIdRef.current = user.id;
      setCategoriesLoaded(false);
      
      // Try to load from cache first (synchronous, instant)
      const cached = getCachedTransactions(user.id);
      if (cached) {
        setTransactions(cached);
        
        // If cache is fresh, skip loading state entirely
        if (isCacheFresh(user.id)) {
          setDataLoading(false);
        }
      }
      
      // Always fetch fresh data in background
      setIsSyncing(true);
      
      // Load transactions and settings in parallel
      const [loaded, settings] = await Promise.all([
        loadTransactions(),
        loadSettings()
      ]);
      
      setTransactions(loaded);
      setViewType(settings.defaultView);
      setCurrency(settings.currency.symbol);
      setCategoriesLoaded(true);
      setDataLoading(false);
      setIsSyncing(false);
      setHasLoadedData(true);
    };
    loadData();
  }, [user?.id, hasLoadedData]); // Depend on user.id, not user object

  // Real-time sync with stable callback
  const handleRealtimeChange = useCallback((payload: any) => {
    console.log('[Index] Realtime event:', payload.eventType);
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
      setTransactions(prev => {
        const exists = prev.some(t => t.id === newTransaction.id);
        return exists ? prev : [newTransaction, ...prev];
      });
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
  }, []); // No dependencies - uses functional updates

  const handleCategoryChange = useCallback(async () => {
    console.log('[Index] Category changed via realtime');
    // Just reload settings in background - don't trigger loading state
    await loadSettings();
  }, []);
  
  useRealtimeSync(handleRealtimeChange, handleCategoryChange, undefined);

  // Only show skeleton on initial cold load without cache or when categories aren't loaded
  if (loading || (dataLoading && transactions.length === 0) || !categoriesLoaded) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-background border-b border-border">
          <div className="max-w-2xl mx-auto px-4 py-3 h-14 flex items-center justify-between">
            <div className="h-6 bg-muted/50 rounded w-32 animate-pulse" />
            <div className="h-8 w-8 bg-muted/50 rounded-full animate-pulse" style={{ animationDelay: '100ms' }} />
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Balance summary skeleton */}
          <div className="bg-card rounded-2xl shadow-notion p-6 space-y-6 animate-fade-in">
            {/* Current Balance label */}
            <div className="flex justify-center">
              <div className="h-4 bg-muted/50 rounded w-28 animate-pulse" />
            </div>
            {/* Large balance amount */}
            <div className="flex justify-center">
              <div className="h-12 bg-muted/60 rounded-lg w-48 animate-pulse" style={{ animationDelay: '100ms' }} />
            </div>
            {/* Income/Expense cards */}
            <div className="grid grid-cols-2 gap-4">
              {/* Income card */}
              <div className="bg-card border border-border rounded-xl p-4 space-y-3 animate-pulse" style={{ animationDelay: '200ms' }}>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-muted/50 rounded-full" />
                  <div className="h-3 bg-muted/50 rounded w-12" />
                </div>
                <div className="h-6 bg-muted/60 rounded w-20" />
              </div>
              {/* Expense card */}
              <div className="bg-card border border-border rounded-xl p-4 space-y-3 animate-pulse" style={{ animationDelay: '250ms' }}>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-muted/50 rounded-full" />
                  <div className="h-3 bg-muted/50 rounded w-14" />
                </div>
                <div className="h-6 bg-muted/60 rounded w-20" />
              </div>
            </div>
          </div>

          {/* Chart skeleton */}
          <div className="bg-card rounded-2xl shadow-notion p-6 space-y-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
            {/* Header */}
            <div className="h-5 bg-muted/50 rounded w-40 animate-pulse" />
            
            <div className="flex flex-col items-center gap-6">
              {/* Circular ring chart skeleton */}
              <div className="relative w-48 h-48 animate-pulse" style={{ animationDelay: '350ms' }}>
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="12"
                    opacity="0.3"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="12"
                    opacity="0.5"
                    strokeDasharray="60 251"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="h-3 bg-muted/50 rounded w-16 mb-2" />
                  <div className="h-6 bg-muted/60 rounded w-20" />
                </div>
              </div>

              {/* Category list skeleton */}
              <div className="w-full space-y-4">
                {[0, 1, 2].map((i) => (
                  <div 
                    key={i} 
                    className="space-y-2 animate-pulse" 
                    style={{ animationDelay: `${400 + i * 50}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-muted/50 rounded-full" />
                        <div className="h-4 bg-muted/50 rounded w-24" />
                      </div>
                      <div className="h-5 bg-muted/60 rounded w-16" />
                    </div>
                    <div className="h-2 bg-muted/40 rounded-full w-full" />
                  </div>
                ))}
              </div>
            </div>
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
      setTransactions(updated);
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
      setTransactions(updated);
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
    // Reload settings to update currency and categories in background
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
          <div className="absolute left-4">
            <img 
              src={piggyTransparent} 
              alt="Piggly" 
              className="h-10 w-10 object-contain"
            />
          </div>
          <PeriodSelector
            currentDate={currentDate}
            viewType={viewType}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onDateSelect={handleDateSelect}
          />
          <div className="absolute right-4">
            <SettingsSheet 
              onSettingsChange={handleSettingsChange}
              open={settingsOpen}
              onOpenChange={setSettingsOpen}
            />
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
