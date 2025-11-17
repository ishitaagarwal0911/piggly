import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import Gauge from 'lucide-react/dist/esm/icons/gauge';
import Ruler from 'lucide-react/dist/esm/icons/ruler';
import X from 'lucide-react/dist/esm/icons/x';
import Plus from 'lucide-react/dist/esm/icons/plus';
import { Budget } from '@/types/budget';
import { loadSettings } from '@/lib/settings';
import { saveBudget, deleteBudget } from '@/lib/budget';
import { toast } from 'sonner';
import { startOfMonth } from 'date-fns';

interface BudgetSetupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialBudget?: Budget | null;
  onSave: (budget: Budget) => void;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: string;
}

export const BudgetSetupSheet = ({
  open,
  onOpenChange,
  initialBudget,
  onSave,
}: BudgetSetupSheetProps) => {
  const [overallBudget, setOverallBudget] = useState('');
  const [categoryBudgets, setCategoryBudgets] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      loadSettings().then(settings => {
        const expenseCategories = settings.categories.filter(c => c.type === 'expense');
        setCategories(expenseCategories);
      });

      if (initialBudget) {
        setOverallBudget(initialBudget.overallBudget.toString());
        const budgets: Record<string, string> = {};
        Object.entries(initialBudget.categoryBudgets).forEach(([id, amount]) => {
          budgets[id] = amount.toString();
        });
        setCategoryBudgets(budgets);
      } else {
        setOverallBudget('');
        setCategoryBudgets({});
      }
    }
  }, [open, initialBudget]);

  const totalCategoryBudget = Object.values(categoryBudgets).reduce(
    (sum, val) => sum + (parseFloat(val) || 0),
    0
  );

  const overallBudgetNum = parseFloat(overallBudget) || 0;
  const budgetUsagePercent = overallBudgetNum > 0 
    ? Math.min((totalCategoryBudget / overallBudgetNum) * 100, 100)
    : 0;

  const categoriesWithBudget = categories.filter(c => c.id in categoryBudgets);
  const categoriesWithoutBudget = categories.filter(c => !(c.id in categoryBudgets));

  const handleSave = async () => {
    const budgetValue = parseFloat(overallBudget || '0');
    
    // Show confirmation dialog when setting budget to 0
    if (budgetValue === 0) {
      setShowDeleteConfirm(true);
      return;
    }
    
    // Validate budget is positive
    if (!overallBudget || budgetValue < 0) {
      toast.error('Please enter a valid budget amount');
      return;
    }

    setSaving(true);
    const budgetData: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: '', // Will be set by saveBudget
      month: startOfMonth(new Date()),
      overallBudget: budgetValue,
      categoryBudgets: Object.entries(categoryBudgets).reduce(
        (acc, [id, amount]) => {
          const num = parseFloat(amount);
          if (num > 0) acc[id] = num;
          return acc;
        },
        {} as Record<string, number>
      ),
    };

    const saved = await saveBudget(budgetData);
    setSaving(false);

    if (saved) {
      toast.success('Budget saved successfully');
      onSave(saved);
      onOpenChange(false);
    } else {
      toast.error('Failed to save budget');
    }
  };

  const handleConfirmDelete = async () => {
    setSaving(true);
    const deleted = await deleteBudget(startOfMonth(new Date()));
    setSaving(false);
    setShowDeleteConfirm(false);
    
    if (deleted) {
      toast.success('Budget deleted successfully');
      onSave(null as any);
      onOpenChange(false);
    } else {
      toast.error('Failed to delete budget');
    }
  };

  const handleRemoveCategoryBudget = (categoryId: string) => {
    const newBudgets = { ...categoryBudgets };
    delete newBudgets[categoryId];
    setCategoryBudgets(newBudgets);
  };

  const handleAddCategoryBudget = (categoryId: string) => {
    setCategoryBudgets({ ...categoryBudgets, [categoryId]: '' });
    setShowAddCategory(false);
    
    // Scroll to the newly added category after a brief delay for DOM update
    setTimeout(() => {
      const element = document.getElementById(`category-budget-${categoryId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        const input = element.querySelector('input');
        if (input) input.focus();
      }
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full h-full max-w-none flex flex-col p-0 gap-0 max-h-[calc(100vh-env(safe-area-inset-bottom))] pb-0" hideClose>
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base">Budget planner</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-10 w-10"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 space-y-6">
            {/* Overall Budget */}
            <div className="space-y-3">
              <Label htmlFor="overall-budget" className="flex items-center gap-2 mb-2">
                <Ruler className="w-4 h-4 text-muted-foreground" />
                <span>Overall budget</span>
              </Label>
              <div className="px-1">
                <Input
                  id="overall-budget"
                  type="number"
                  placeholder="Enter amount"
                  value={overallBudget}
                  onChange={(e) => setOverallBudget(e.target.value)}
                />
              </div>
            </div>

            {/* Category-wise Budget */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Category wise budget</h3>
                <div className="text-sm">
                  <span className="text-muted-foreground">Total: </span>
                  <span className={totalCategoryBudget > overallBudgetNum ? 'text-destructive font-medium' : ''}>
                    ₹{totalCategoryBudget.toFixed(0)}
                  </span>
                  <span className="text-muted-foreground"> / ₹{overallBudgetNum.toFixed(0)}</span>
                </div>
              </div>

              <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden flex">
                {categoriesWithBudget
                  .filter(c => parseFloat(categoryBudgets[c.id] || '0') > 0)
                  .map((category) => {
                    const budget = parseFloat(categoryBudgets[category.id] || '0');
                    const widthPercent = overallBudgetNum > 0 ? (budget / overallBudgetNum) * 100 : 0;
                    return (
                      <div
                        key={category.id}
                        style={{
                          width: `${widthPercent}%`,
                          backgroundColor: category.color,
                        }}
                        className="h-full transition-all duration-300"
                        title={`${category.name}: ₹${budget}`}
                      />
                    );
                  })}
              </div>

              {/* Categories with Budget */}
              <div className="space-y-2 pt-2">
                {categoriesWithBudget.map((category) => (
                  <div
                    key={category.id}
                    id={`category-budget-${category.id}`}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg border bg-card"
                  >
                    <div className="w-8 h-8 flex items-center justify-center text-xl">
                      {category.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{category.name}</p>
                    </div>
                    <div className="px-1">
                      <Input
                        type="number"
                        placeholder="0"
                        value={categoryBudgets[category.id] || ''}
                        onChange={(e) =>
                          setCategoryBudgets({
                            ...categoryBudgets,
                            [category.id]: e.target.value,
                          })
                        }
                        className="w-24 text-right"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveCategoryBudget(category.id)}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Add Category Button */}
              {categoriesWithoutBudget.length > 0 && (
                <>
                  {!showAddCategory ? (
                    <Button
                      variant="outline"
                      onClick={() => setShowAddCategory(true)}
                      className="w-full justify-start gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add category
                    </Button>
                  ) : (
                    <div className="space-y-2 p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">Select category</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAddCategory(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {categoriesWithoutBudget.map((category) => (
                          <Button
                            key={category.id}
                            variant="ghost"
                            onClick={() => handleAddCategoryBudget(category.id)}
                            className="w-full justify-start gap-3"
                          >
                            <div className="w-8 h-8 flex items-center justify-center text-lg">
                              {category.icon}
                            </div>
                            <span>{category.name}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div 
          className="bg-background border-t pt-3 px-6 mt-auto"
          style={{ 
            paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))'
          }}
        >
          <Button
            onClick={handleSave}
            disabled={saving || (!overallBudget && parseFloat(overallBudget || '0') < 0)}
            className="w-full"
            size="lg"
          >
            {saving ? 'Saving...' : 'Set budget'}
          </Button>
        </div>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete budget?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete your budget? This will remove all budget tracking for this month.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Budget
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
