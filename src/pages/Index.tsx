import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Transaction } from "@/types/transaction";
import { BalanceSummary } from "@/components/BalanceSummary";
import { SettingsSheet } from "@/components/SettingsSheet";
import { PeriodSelector } from "@/components/PeriodSelector";
import { Button } from "@/components/ui/button";
import Plus from 'lucide-react/dist/esm/icons/plus';
import Search from 'lucide-react/dist/esm/icons/search';
import { loadTransactions, saveTransaction, deleteTransaction, loadHistoricalTransactions } from "@/lib/storage";
import { loadSettings } from "@/lib/settings";
import { getFilteredTransactions, getPreviousPeriod, getNextPeriod, ViewType } from "@/lib/dateUtils";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { useHistoryState } from "@/hooks/useHistoryState";
import { usePageRestore } from "@/hooks/usePageRestore";
import { getCachedTransactions, isCacheFresh } from "@/lib/cache";
import { toast } from "sonner";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import piggyTransparent from "@/assets/piggly_header_icon.png";
import { Budget, BudgetSummary } from "@/types/budget";
import { getCurrentMonthBudget, calculateBudgetSummary } from "@/lib/budget";
import { categories } from "@/lib/categories";
import { startOfMonth, endOfMonth } from "date-fns";
import { BudgetSetupSheet } from "@/components/BudgetSetupSheet";

// Import components directly for better stability
import { AddTransactionDialog } from "@/components/AddTransactionDialog";
import TransactionDetailSheet from "@/components/TransactionDetailSheet";
import { TransactionSearch } from "@/components/TransactionSearch";
import { ExpenseChart } from "@/components/ExpenseChart";

const Index = () => {
  const { user, loading, isInitialized } = useAuth();
  const { hasActiveSubscription, loading: subscriptionLoading } = useSubscription();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAddDialog, setShowAddDialog] = useHistoryState(false, "add-transaction");
  const [transactionType, setTransactionType] = useState<"income" | "expense">("expense");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>("monthly");
  const [detailSheetOpen, setDetailSheetOpen] = useHistoryState(false, "detail-sheet");
  const [detailFilter, setDetailFilter] = useState<{ type?: "expense" | "income"; category?: string }>({});
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [currency, setCurrency] = useState("₹");
  const [settingsOpen, setSettingsOpen] = useHistoryState(false, "settings");
  const [searchOpen, setSearchOpen] = useHistoryState(false, "search");
  const [budgetSheetOpen, setBudgetSheetOpen] = useHistoryState(false, "budget-sheet");
  const [currentBudget, setCurrentBudget] = useState<Budget | null>(null);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);

  // Track user ID to prevent unnecessary reloads
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const userIdRef = useRef<string | null>(null);
  const categoryChangeTimeoutRef = useRef<NodeJS.Timeout>();

  // Handle PWA shortcuts (add-expense, add-income)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");

    if (action === "add-expense") {
      setTransactionType("expense");
      setShowAddDialog(true);
    } else if (action === "add-income") {
      setTransactionType("income");
      setShowAddDialog(true);
    }
  }, []);

  // Restore page state across cold starts
  usePageRestore(currentDate, viewType);

  // Disabled to prevent conflict with iOS back gesture
  // useSwipeGesture({
  //   onSwipeRight: () => {
  //     setSettingsOpen(true);
  //   },
  //   edgeThreshold: 50,
  // });

  // Debug: Track component lifecycle
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("[Index] Component mounted/updated", {
        userId: user?.id,
        transactionCount: transactions.length,
        timestamp: Date.now(),
      });
    }
  }, [user?.id, transactions.length]);

  // Debug: Track visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (import.meta.env.DEV) {
        console.log("[Index] Visibility changed:", document.hidden ? "hidden" : "visible");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!loading && !user && isInitialized) {
      navigate("/auth", { replace: true });
    }
  }, [user, loading, isInitialized, navigate]);

  // Load initial data with instant cache rendering
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      // Only load if user changed OR first load
      if (hasLoadedData && userIdRef.current === user.id) {
        if (import.meta.env.DEV) {
          console.log("[Index] Skipping data load - same user already loaded");
        }
        return;
      }

      if (import.meta.env.DEV) {
        console.log("[Index] Loading data for user:", user.id);
      }
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

      // Load only 2 months for ultra-fast initial load
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      const [loaded, settings] = await Promise.all([loadTransactions({ since: twoMonthsAgo }), loadSettings()]);

      setTransactions(loaded);
      setViewType(settings.defaultView);
      setCurrency(settings.currency.symbol);
      setCategoriesLoaded(true);
      setDataLoading(false);
      setIsSyncing(false);
      setHasLoadedData(true);

      // Load budget in background with error handling
      getCurrentMonthBudget()
        .then(budget => {
          setCurrentBudget(budget);
        })
        .catch(error => {
          console.error('Failed to load budget:', error);
          // Continue without budget - non-critical feature
        });
    };
    loadData();
  }, [user?.id, hasLoadedData]); // Depend on user.id, not user object

  // Real-time sync with stable callback
  const handleRealtimeChange = useCallback((payload: any) => {
    console.log("[Index] Realtime event:", payload.eventType);
    if (payload.eventType === "INSERT") {
      const newTransaction: Transaction = {
        id: payload.new.id,
        amount: parseFloat(String(payload.new.amount)),
        type: payload.new.type,
        category: payload.new.category,
        note: payload.new.note || "",
        date: new Date(payload.new.date),
        createdAt: new Date(payload.new.created_at),
        updatedAt: payload.new.updated_at ? new Date(payload.new.updated_at) : undefined,
      };
      setTransactions((prev) => {
        const exists = prev.some((t) => t.id === newTransaction.id);
        return exists ? prev : [newTransaction, ...prev];
      });
    } else if (payload.eventType === "UPDATE") {
      const updatedTransaction: Transaction = {
        id: payload.new.id,
        amount: parseFloat(String(payload.new.amount)),
        type: payload.new.type,
        category: payload.new.category,
        note: payload.new.note || "",
        date: new Date(payload.new.date),
        createdAt: new Date(payload.new.created_at),
        updatedAt: payload.new.updated_at ? new Date(payload.new.updated_at) : undefined,
      };
      setTransactions((prev) => prev.map((t) => (t.id === updatedTransaction.id ? updatedTransaction : t)));
    } else if (payload.eventType === "DELETE") {
      setTransactions((prev) => prev.filter((t) => t.id !== payload.old.id));
    }
  }, []); // No dependencies - uses functional updates

  const handleCategoryChange = useCallback(async () => {
    console.log("[Index] Category changed via realtime");

    // Clear any pending reload
    if (categoryChangeTimeoutRef.current) {
      clearTimeout(categoryChangeTimeoutRef.current);
    }

    // Debounce for 300ms to allow batch updates to complete
    categoryChangeTimeoutRef.current = setTimeout(async () => {
      await loadSettings();
      // Force a re-render without triggering loading state
      setTransactions((prev) => [...prev]);
    }, 300);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (categoryChangeTimeoutRef.current) {
        clearTimeout(categoryChangeTimeoutRef.current);
      }
    };
  }, []);

  useRealtimeSync(handleRealtimeChange, handleCategoryChange, undefined);

  // Background load of historical data (older than 2 months) in chunks
  useEffect(() => {
    if (!hasLoadedData || !user) return;

    const loadHistorical = async () => {
      try {
        // Wait for UI to be interactive
        await new Promise((resolve) => setTimeout(resolve, 500));

        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

        // Load in chunks of 6 months at a time (oldest to newest)
        let currentDate = new Date(twoMonthsAgo);
        let hasMore = true;

        while (hasMore) {
          const sixMonthsEarlier = new Date(currentDate);
          sixMonthsEarlier.setMonth(sixMonthsEarlier.getMonth() - 6);

          const chunk = await loadHistoricalTransactions(currentDate, user.id, sixMonthsEarlier);

          if (chunk.length === 0) {
            hasMore = false;
            break;
          }

          // Merge chunk without triggering re-renders
          setTransactions((prev) => {
            const combined = [...prev, ...chunk];
            const unique = Array.from(new Map(combined.map((t) => [t.id, t])).values()).sort(
              (a, b) => b.date.getTime() - a.date.getTime(),
            );
            return unique;
          });

          currentDate = sixMonthsEarlier;

          // Small delay between chunks to avoid blocking UI
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error("Failed to load historical data:", error);
      }
    };

    loadHistorical();
  }, [hasLoadedData, user?.id]);

  // Calculate budget summary when transactions or budget changes
  useEffect(() => {
    if (currentBudget && viewType === 'monthly') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      
      // Filter transactions for current month only
      const monthTransactions = transactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate >= monthStart && txDate <= monthEnd;
      });

      const summary = calculateBudgetSummary(currentBudget, monthTransactions, categories());
      setBudgetSummary(summary);
    } else {
      setBudgetSummary(null);
    }
  }, [currentBudget, transactions, currentDate, viewType]);

  // Only show skeleton on initial cold load without cache or when categories aren't loaded
  if (loading || (dataLoading && transactions.length === 0) || !categoriesLoaded) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-background border-b border-border">
          <div className="max-w-2xl mx-auto px-4 py-3 h-14 flex items-center justify-between">
            <div className="h-6 bg-muted/50 rounded w-32 animate-pulse" />
            <div className="h-8 w-8 bg-muted/50 rounded-full animate-pulse" style={{ animationDelay: "100ms" }} />
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
              <div className="h-12 bg-muted/60 rounded-lg w-48 animate-pulse" style={{ animationDelay: "100ms" }} />
            </div>
            {/* Income/Expense cards */}
            <div className="grid grid-cols-2 gap-4">
              {/* Income card */}
              <div
                className="bg-card border border-border rounded-xl p-4 space-y-3 animate-pulse"
                style={{ animationDelay: "200ms" }}
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-muted/50 rounded-full" />
                  <div className="h-3 bg-muted/50 rounded w-12" />
                </div>
                <div className="h-6 bg-muted/60 rounded w-20" />
              </div>
              {/* Expense card */}
              <div
                className="bg-card border border-border rounded-xl p-4 space-y-3 animate-pulse"
                style={{ animationDelay: "250ms" }}
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-muted/50 rounded-full" />
                  <div className="h-3 bg-muted/50 rounded w-14" />
                </div>
                <div className="h-6 bg-muted/60 rounded w-20" />
              </div>
            </div>
          </div>

          {/* Chart skeleton */}
          <div
            className="bg-card rounded-2xl shadow-notion p-6 space-y-6 animate-fade-in"
            style={{ animationDelay: "300ms" }}
          >
            {/* Header */}
            <div className="h-5 bg-muted/50 rounded w-40 animate-pulse" />

            <div className="flex flex-col items-center gap-6">
              {/* Circular ring chart skeleton */}
              <div className="relative w-48 h-48 animate-pulse" style={{ animationDelay: "350ms" }}>
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
                  <div key={i} className="space-y-2 animate-pulse" style={{ animationDelay: `${400 + i * 50}ms` }}>
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

  const handleAddTransaction = async (newTransaction: Omit<Transaction, "id" | "createdAt">) => {
    try {
      if (editingTransaction) {
        // Update existing transaction
        const updatedTransaction: Transaction = {
          ...editingTransaction,
          ...newTransaction,
          updatedAt: new Date(),
        };
        
        // Optimistic update
        const updated = transactions.map((t) =>
          t.id === editingTransaction.id ? updatedTransaction : t,
        );
        setTransactions(updated);
        
        // Save single transaction
        await saveTransaction(updatedTransaction);
        
        toast.success("Transaction updated");
        setEditingTransaction(null);
      } else {
        // Add new transaction
        const transaction: Transaction = {
          ...newTransaction,
          id: crypto.randomUUID(),
          createdAt: new Date(),
        };

        // Optimistic update
        const updated = [transaction, ...transactions];
        setTransactions(updated);
        
        // Save single transaction
        await saveTransaction(transaction);

        toast.success("Transaction added", {
          description: `${newTransaction.type === "income" ? "+" : "-"}${currency}${newTransaction.amount.toFixed(2)} ${newTransaction.note}`,
        });
      }
    } catch (error) {
      // Revert optimistic update on error
      console.error('Failed to save transaction:', error);
      toast.error('Failed to save transaction. Please try again.');
      
      // Reload transactions from database to revert optimistic update
      const freshTransactions = await loadTransactions();
      setTransactions(freshTransactions);
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
      // Immediate view change - no reload needed
      setViewType(newView);
      return; // Exit early - transactions already loaded
    }

    // Only reload data when needed (e.g., after import, currency change, category changes)
    const [settings, loadedTxs] = await Promise.all([loadSettings(), loadTransactions()]);
    setCurrency(settings.currency.symbol);
    setTransactions(loadedTxs);
  };

  const handleBudgetSave = (budget: Budget) => {
    setCurrentBudget(budget);
    setBudgetSheetOpen(false);
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setDetailFilter({ type: "expense" });
    setDetailSheetOpen(true);
  };

  const handleExpenseClick = () => {
    setDetailFilter({ type: "expense" });
    setDetailSheetOpen(true);
  };

  const handleIncomeClick = () => {
    setDetailFilter({ type: "income" });
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

  const handleAddClick = () => {
    setShowAddDialog(true);
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteTransaction(id);
      toast.success("Transaction deleted");
      setEditingTransaction(null);
    } catch (error) {
      toast.error("Failed to delete transaction");
      console.error("Delete error:", error);
    }
  };

  const handleDetailSheetAddClick = (type: "income" | "expense") => {
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
            <img src={piggyTransparent} alt="Piggly" className="h-10 w-10 object-contain" loading="lazy" />
          </div>
          <PeriodSelector
            currentDate={currentDate}
            viewType={viewType}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onDateSelect={handleDateSelect}
          />
          <div className="absolute right-4 flex items-center gap-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              className="h-10 w-10 -mr-1"
            >
              <Search className="h-5 w-5" />
            </Button>
            <SettingsSheet 
              onSettingsChange={handleSettingsChange} 
              open={settingsOpen} 
              onOpenChange={setSettingsOpen}
              onBudgetClick={() => setBudgetSheetOpen(true)}
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
          currency={currency}
          totalBudget={viewType === 'monthly' ? budgetSummary?.totalBudget : undefined}
          totalSpent={viewType === 'monthly' ? budgetSummary?.totalSpent : undefined}
          safeToSpend={viewType === 'monthly' ? budgetSummary?.safeToSpend : undefined}
        />
        
        <ExpenseChart 
          transactions={filteredTransactions} 
          onCategoryClick={handleCategoryClick} 
          currency={currency}
          budgetSummary={viewType === 'monthly' ? budgetSummary : null}
          onSetBudgetClick={viewType === 'monthly' ? () => setBudgetSheetOpen(true) : undefined}
          hasActiveSubscription={hasActiveSubscription}
        />
      </main>

      {/* Floating Add Button */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none z-50">
        <Button
          size="lg"
          className="rounded-full px-6 h-14 shadow-notion-hover pointer-events-auto transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
          onClick={handleAddClick}
          disabled={subscriptionLoading}
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">Add</span>
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
        onOpenChange={(open) => {
          setDetailSheetOpen(open);
          if (!open) setSelectedCategory(undefined);
        }}
        transactions={filteredTransactions}
        filterType={detailFilter.type}
        filterCategory={detailFilter.category}
        onEdit={handleEditTransaction}
        onAddClick={handleDetailSheetAddClick}
        defaultTab={selectedCategory ? "by-category" : undefined}
        defaultOpenCategory={selectedCategory}
        currentBudget={currentBudget}
        onSetBudgetClick={() => {
          setDetailSheetOpen(false);
          setBudgetSheetOpen(true);
        }}
      />

      {/* Budget Setup Sheet */}
      <BudgetSetupSheet
        open={budgetSheetOpen}
        onOpenChange={setBudgetSheetOpen}
        initialBudget={currentBudget}
        onSave={handleBudgetSave}
      />

      <TransactionSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        transactions={transactions}
        onTransactionSelect={handleEditTransaction}
      />
    </div>
  );
};

export default Index;
