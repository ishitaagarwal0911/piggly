import { useState, useMemo, useEffect } from "react";
import { Transaction } from "@/types/transaction";
import { parseSearchQuery, filterTransactionsBySearch, SearchQuery } from "@/lib/searchUtils";
import { getCategoryInfo, categories } from "@/lib/categories";
import { formatIndianNumber } from "@/lib/utils";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Search from "lucide-react/dist/esm/icons/search";
import X from "lucide-react/dist/esm/icons/x";

interface TransactionSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: Transaction[];
  onTransactionSelect: (transaction: Transaction) => void;
}

export function TransactionSearch({
  open,
  onOpenChange,
  transactions,
  onTransactionSelect,
}: TransactionSearchProps) {
  const [searchInput, setSearchInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const searchQuery = useMemo<SearchQuery>(() => {
    const parsed = parseSearchQuery(searchInput);
    if (selectedCategory !== "all") {
      parsed.category = selectedCategory;
    }
    return parsed;
  }, [searchInput, selectedCategory]);

  const filteredResults = useMemo(() => {
    return filterTransactionsBySearch(transactions, searchQuery);
  }, [transactions, searchQuery]);

  const allCategories = categories();
  const expenseCategories = allCategories.filter(c => c.type === 'expense');

  // Reset search state when sheet closes
  useEffect(() => {
    if (!open) {
      setSearchInput("");
      setSelectedCategory("all");
    }
  }, [open]);

  const handleClearFilters = () => {
    setSearchInput("");
    setSelectedCategory("all");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent 
        side="bottom" 
        className="h-full flex flex-col p-0"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
        }}
      >
        <SheetHeader className="px-4 pt-4 pb-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Transactions
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search Controls */}
          <div className="px-4 py-3 space-y-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="transaction-search-input"
                inputMode="search"
                autoComplete="off"
                placeholder="Search by note, amount (e.g. >100)..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {expenseCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-hidden">
            <div className="px-4 py-2 border-b border-border">
              <p className="text-sm text-muted-foreground">
                {filteredResults.length} {filteredResults.length === 1 ? 'result' : 'results'}
              </p>
            </div>

            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                {filteredResults.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No transactions found</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Try adjusting your search filters
                    </p>
                  </div>
                ) : (
                  filteredResults.map((transaction) => {
                    const categoryInfo = getCategoryInfo(transaction.category);
                    return (
                      <button
                        key={transaction.id}
                        onClick={() => {
                          onTransactionSelect(transaction);
                          onOpenChange(false);
                        }}
                        className="w-full bg-card rounded-lg p-3 border border-border hover:bg-accent transition-colors text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="text-2xl flex-shrink-0">
                              {categoryInfo?.icon || '📦'}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {transaction.note || 'No note'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {categoryInfo?.name} · {format(transaction.date, 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                          <div className="flex-shrink-0 ml-3">
                            <p className={`font-semibold text-sm ${
                              transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.type === 'income' ? '+' : '-'}₹{formatIndianNumber(transaction.amount)}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
