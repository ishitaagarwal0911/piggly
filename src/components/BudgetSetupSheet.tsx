import { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
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
import X from 'lucide-react/dist/esm/icons/x';
import Plus from 'lucide-react/dist/esm/icons/plus';
import { Budget } from '@/types/budget';
import { loadSettings, addCategory } from '@/lib/settings';
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
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showQuickAddCategory, setShowQuickAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('📦');

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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex flex-col h-[100vh] pb-0">
        <DrawerHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-base">Budget planner</DrawerTitle>
            <DrawerClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
              >
                <X className="h-6 w-6" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6">
          <div className="py-6 space-y-6">
            {/* Overall Budget */}
            <div className="space-y-3">
          <Label htmlFor="overall-budget" className="mb-2">
            Monthly overall budget
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

              {/* Add Category Section - Always visible */}
              {categoriesWithoutBudget.length > 0 && (
                <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Available categories</p>
                  <div className="space-y-1">
                    {categoriesWithoutBudget.map((category) => (
                      <Button
                        key={category.id}
                        variant="ghost"
                        onClick={() => handleAddCategoryBudget(category.id)}
                        className="w-full justify-start gap-3 h-auto py-2"
                      >
                        <div className="w-8 h-8 flex items-center justify-center text-lg">
                          {category.icon}
                        </div>
                        <span className="text-sm">{category.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Create New Category Button */}
              {!showQuickAddCategory && (
                <Button
                  variant="ghost"
                  onClick={() => setShowQuickAddCategory(true)}
                  className="w-full justify-center gap-2 text-xs text-muted-foreground hover:text-foreground mt-2"
                >
                  <Plus className="h-3 w-3" />
                  Create new category
                </Button>
              )}

              {/* Quick Add Category Form */}
              {showQuickAddCategory && (
                <div className="space-y-3 p-4 border rounded-lg bg-secondary/50 mt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Quick Add Category</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowQuickAddCategory(false);
                        setNewCategoryName('');
                        setNewCategoryIcon('📦');
                      }}
                      className="h-8 px-2"
                    >
                      Cancel
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="Category name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      maxLength={30}
                    />
                    <Input
                      placeholder="Icon (emoji)"
                      value={newCategoryIcon}
                      onChange={(e) => setNewCategoryIcon(e.target.value)}
                      maxLength={2}
                    />
                  </div>
                  <Button
                    onClick={async () => {
                      if (!newCategoryName.trim()) {
                        toast.error('Please enter a category name');
                        return;
                      }
                      try {
                        await addCategory(
                          {
                            name: newCategoryName.trim(),
                            icon: newCategoryIcon || '📦',
                            type: 'expense',
                          }
                        );
                        toast.success('Category created');
                        const settings = await loadSettings();
                        const expenseCategories = settings.categories.filter(c => c.type === 'expense');
                        setCategories(expenseCategories);
                        setShowQuickAddCategory(false);
                        setNewCategoryName('');
                        setNewCategoryIcon('📦');
                      } catch (error) {
                        toast.error('Failed to create category');
                      }
                    }}
                    className="w-full"
                  >
                    Add Category
                  </Button>
                </div>
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
      </DrawerContent>

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
    </Drawer>
  );
};
