import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Transaction } from '@/types/transaction';
import { getCategoryInfo } from '@/lib/categories';
import { loadSettings } from '@/lib/settings';
import { format, isSameDay } from 'date-fns';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';

interface TransactionDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: Transaction[];
  filterType?: 'expense' | 'income';
  filterCategory?: string;
  onEdit?: (transaction: Transaction) => void;
  onAddClick?: (type: 'income' | 'expense') => void;
  defaultTab?: string;
  defaultOpenCategory?: string;
}

export const TransactionDetailSheet = ({
  open,
  onOpenChange,
  transactions,
  filterType,
  filterCategory,
  onEdit,
  onAddClick,
  defaultTab,
  defaultOpenCategory,
}: TransactionDetailSheetProps) => {
  const [currency, setCurrency] = useState('₹');
  
  useEffect(() => {
    loadSettings().then(settings => {
      setCurrency(settings.currency.symbol);
    });
  }, []);

  // Filter transactions for "By Date" tab
  const filteredForDate = transactions.filter(t => {
    if (filterType && t.type !== filterType) return false;
    if (filterCategory && t.category !== filterCategory) return false;
    return true;
  });

  // For "By Category" tab, only filter by type (show all categories)
  const filteredForCategory = transactions.filter(t => {
    if (filterType && t.type !== filterType) return false;
    return true;
  });

  // Group by date
  const groupedByDate = filteredForDate.reduce((acc, t) => {
    const dateKey = format(t.date, 'yyyy-MM-dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(t);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  // Group by category
  const groupedByCategory = filteredForCategory.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const categoriesWithTotals = Object.entries(groupedByCategory).map(([category, txs]) => {
    const info = getCategoryInfo(category);
    const total = txs.reduce((sum, t) => sum + t.amount, 0);
    return {
      category,
      name: info?.name || category,
      icon: info?.icon || '📦',
      color: info?.color || '#D4D4D4',
      transactions: txs.sort((a, b) => b.date.getTime() - a.date.getTime()),
      total,
    };
  }).sort((a, b) => b.total - a.total);

  const total = filteredForDate.reduce((sum, t) => sum + t.amount, 0);

  const renderTransaction = (transaction: Transaction) => {
    const categoryInfo = getCategoryInfo(transaction.category);
    return (
      <button
        key={transaction.id}
        onClick={() => onEdit?.(transaction)}
        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
      >
        <div 
          className="w-10 h-10 flex items-center justify-center text-lg flex-shrink-0"
        >
          {categoryInfo?.icon || '📦'}
        </div>
        <div className="flex-1 min-w-0">
          {transaction.note && <p className="text-sm font-medium truncate">{transaction.note}</p>}
          <p className="text-xs text-muted-foreground">
            {transaction.note ? format(transaction.date, 'h:mm a') : format(transaction.date, 'MMM d, yyyy · h:mm a')}
          </p>
        </div>
        <span className={`text-sm font-semibold whitespace-nowrap ${
          transaction.type === 'income' ? 'text-success' : 'text-destructive'
        }`}>
          {transaction.type === 'income' ? '+' : '-'}{currency}{transaction.amount.toFixed(2)}
        </span>
      </button>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {filterCategory ? getCategoryInfo(filterCategory)?.name : 
             filterType === 'income' ? 'Income' : 'Expenses'}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-semibold">
              {currency}{total.toFixed(2)}
            </p>
          </div>
          {onAddClick && (
            <Button 
              size="sm" 
              onClick={() => onAddClick(filterType || 'expense')}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>
          )}
        </div>

        <Tabs defaultValue={defaultTab || "by-date"} className="mt-6">
          <TabsList className="w-full">
            <TabsTrigger value="by-date" className="flex-1">By Date</TabsTrigger>
            <TabsTrigger value="by-category" className="flex-1">By Category</TabsTrigger>
          </TabsList>

          <TabsContent value="by-date" className="mt-4">
            {sortedDates.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">No transactions</p>
              </div>
            ) : (
              <Accordion 
                type="multiple" 
                defaultValue={sortedDates.slice(0, 1)}
                className="space-y-2"
              >
                {sortedDates.map(dateKey => {
                  const date = new Date(dateKey);
                  const txs = groupedByDate[dateKey];
                  const dayTotal = txs.reduce((sum, t) => sum + t.amount, 0);

                  return (
                    <AccordionItem key={dateKey} value={dateKey} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center justify-between flex-1 pr-2">
                          <h3 className="text-sm font-medium">
                            {isSameDay(date, new Date()) ? 'Today' : format(date, 'MMM d, yyyy')}
                          </h3>
                          <span className="text-sm text-muted-foreground">
                            {currency}{dayTotal.toFixed(2)}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-3 space-y-1">
                        {txs.map(renderTransaction)}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </TabsContent>

          <TabsContent value="by-category" className="mt-4">
            {categoriesWithTotals.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">No transactions</p>
              </div>
            ) : (
              <Accordion 
                type="multiple" 
                defaultValue={defaultOpenCategory ? [defaultOpenCategory] : []}
                className="space-y-2"
              >
                {categoriesWithTotals.map(({ category, name, icon, color, transactions, total }) => (
                  <AccordionItem key={category} value={category} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div 
                          className="w-10 h-10 flex items-center justify-center text-lg flex-shrink-0"
                        >
                          {icon}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium">{name}</p>
                          <p className="text-xs text-muted-foreground">
                            {transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'}
                          </p>
                        </div>
                        <span className="text-sm font-semibold">
                          {currency}{total.toFixed(2)}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-3 space-y-1">
                      {transactions.map(renderTransaction)}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default TransactionDetailSheet;
