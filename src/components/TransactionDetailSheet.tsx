import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Transaction } from '@/types/transaction';
import { getCategoryById } from '@/lib/settings';
import { loadSettings } from '@/lib/settings';
import { format, isSameDay } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface TransactionDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: Transaction[];
  filterType?: 'expense' | 'income';
  filterCategory?: string;
  onEdit?: (transaction: Transaction) => void;
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
  defaultTab,
  defaultOpenCategory,
}: TransactionDetailSheetProps) => {
  const settings = loadSettings();
  const currency = settings.currency.symbol;

  // Filter transactions
  const filtered = transactions.filter(t => {
    if (filterType && t.type !== filterType) return false;
    if (filterCategory && t.category !== filterCategory) return false;
    return true;
  });
  
  // For "By Category" view, when a specific category is clicked,
  // show all categories of that type, not just the filtered one
  const byCategoryFiltered = transactions.filter(t => {
    if (filterType && t.type !== filterType) return false;
    return true;
  });

  // Group by date
  const byDate = filtered.reduce((acc, t) => {
    const dateKey = format(t.date, 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(t);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  // Group by category - use byCategoryFiltered to show all categories
  const byCategory = byCategoryFiltered.reduce((acc, t) => {
    if (!acc[t.category]) {
      acc[t.category] = [];
    }
    acc[t.category].push(t);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const sortedCategories = Object.entries(byCategory)
    .map(([category, txns]) => ({
      category,
      transactions: txns,
      total: txns.reduce((sum, t) => sum + t.amount, 0),
      count: txns.length,
    }))
    .sort((a, b) => b.total - a.total);

  const title = filterType === 'expense' ? 'Expenses' : filterType === 'income' ? 'Income' : 'Transactions';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>{title}</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
          </p>
        </SheetHeader>

        <Tabs defaultValue={defaultTab || "by-date"} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="by-date">By Date</TabsTrigger>
            <TabsTrigger value="by-category">By Category</TabsTrigger>
          </TabsList>

          <TabsContent value="by-date" className="space-y-4">
            {sortedDates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No transactions found</p>
            ) : (
              <Accordion type="multiple" defaultValue={[sortedDates[0]]} className="space-y-2">
                {sortedDates.map(dateKey => {
                  const txns = byDate[dateKey];
                  const total = txns.reduce((sum, t) => sum + t.amount, 0);
                  const date = new Date(dateKey);
                  const isToday = isSameDay(date, new Date());
                  const displayDate = isToday ? 'Today' : format(date, 'd MMMM yyyy');

                  return (
                    <AccordionItem key={dateKey} value={dateKey} className="border rounded-lg px-4 transition-smooth">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex justify-between items-center w-full pr-2">
                          <div>
                            <p className="text-sm font-medium">{displayDate}</p>
                            <p className="text-xs text-muted-foreground">
                              {txns.length} transaction{txns.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <p className="text-sm font-semibold">
                            {currency}{total.toFixed(2)}
                          </p>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-3">
                        <div className="space-y-2">
                          {txns.map(t => {
                            const category = getCategoryById(t.category);
                            return (
                              <div
                                key={t.id}
                                onClick={() => onEdit?.(t)}
                                className="flex justify-between items-start p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-smooth cursor-pointer"
                              >
                                <div className="flex items-start gap-2 flex-1">
                                  <span className="text-xl">{category?.icon || '📦'}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{category?.name || t.category}</p>
                                    {t.note && (
                                      <p className="text-xs text-muted-foreground truncate">{t.note}</p>
                                    )}
                                  </div>
                                </div>
                                <p className="text-sm font-semibold whitespace-nowrap ml-2">
                                  {currency}{t.amount.toFixed(2)}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </TabsContent>

          <TabsContent value="by-category" className="space-y-2">
            {sortedCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No transactions found</p>
            ) : (
              <Accordion 
                type="multiple" 
                defaultValue={defaultOpenCategory ? [defaultOpenCategory] : []}
                className="space-y-2"
              >
                {sortedCategories.map(({ category, transactions: txns, total, count }) => {
                  const categoryInfo = getCategoryById(category);
                  const isSelected = category === defaultOpenCategory;
                  
                  return (
                    <AccordionItem 
                      key={category} 
                      value={category} 
                      className={`border rounded-lg px-4 transition-smooth ${
                        isSelected ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex justify-between items-center w-full pr-2">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-xl">{categoryInfo?.icon || '📦'}</span>
                            <div className="text-left">
                              <p className="text-sm font-medium">{categoryInfo?.name || category}</p>
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-[10px] font-medium">
                                  {count}
                                </span>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm font-semibold">
                            {currency}{total.toFixed(2)}
                          </p>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-3">
                        <div className="space-y-2">
                          {txns.map(t => (
                            <div
                              key={t.id}
                              onClick={() => onEdit?.(t)}
                              className="flex justify-between items-start p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-smooth cursor-pointer"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  {format(t.date, 'd MMM yyyy')}
                                </p>
                                {t.note && (
                                  <p className="text-xs text-muted-foreground">{t.note}</p>
                                )}
                              </div>
                              <p className="text-sm font-semibold whitespace-nowrap ml-2">
                                {currency}{t.amount.toFixed(2)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
