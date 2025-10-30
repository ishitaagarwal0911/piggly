import { useState, useEffect, useRef } from "react";
import { CustomCategory } from "@/types/settings";
import { categories, setCategoriesCache } from "@/lib/categories";
import { addCategory, updateCategory, deleteCategory, loadSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface CategoryManagerProps {
  onCategoriesChange: () => void;
}

export const CategoryManager = ({ onCategoriesChange }: CategoryManagerProps) => {
  const [categoryVersion, setCategoryVersion] = useState(0);
  const [allCategories, setAllCategories] = useState<CustomCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CustomCategory | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  
  const [draggedCategory, setDraggedCategory] = useState<CustomCategory | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isPointerDragging, setIsPointerDragging] = useState(false);
  const [hasReorderedDuringDrag, setHasReorderedDuringDrag] = useState(false);
  
  // Local state for optimistic rendering
  const [localExpenseCategories, setLocalExpenseCategories] = useState<CustomCategory[]>([]);
  const [localIncomeCategories, setLocalIncomeCategories] = useState<CustomCategory[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Refs to track latest state during drag operations
  const expenseRef = useRef<CustomCategory[]>([]);
  const incomeRef = useRef<CustomCategory[]>([]);
  const expenseListRef = useRef<HTMLDivElement>(null);
  const incomeListRef = useRef<HTMLDivElement>(null);
  
  // Load categories from cache immediately, then fetch fresh data
  useEffect(() => {
    if (isUpdating) return; // Prevent overwriting optimistic state during save
    
    // Try to get cached categories first for instant display
    const cached = categories();
    
    // Detect if cached looks like defaults (no user suffix in IDs)
    const looksLikeDefaults = cached.length > 0 && cached.every(c => !c.id.includes("_"));
    
    if (cached && cached.length > 0 && !looksLikeDefaults) {
      const expenses = cached.filter(c => c.type === 'expense');
      const incomes = cached.filter(c => c.type === 'income');
      setLocalExpenseCategories(expenses);
      setLocalIncomeCategories(incomes);
      expenseRef.current = expenses;
      incomeRef.current = incomes;
      setLoadingCategories(false);
    } else {
      // Show loading if we have no cached data or it looks like defaults
      setLoadingCategories(true);
    }

    // Fetch fresh data from backend
    if (!isUpdating) {
      loadSettings().then(settings => {
        setAllCategories(settings.categories);
        const expenses = settings.categories.filter(c => c.type === 'expense');
        const incomes = settings.categories.filter(c => c.type === 'income');
        setLocalExpenseCategories(expenses);
        setLocalIncomeCategories(incomes);
        expenseRef.current = expenses;
        incomeRef.current = incomes;
        setLoadingCategories(false);
      }).catch(error => {
        console.error('Failed to load categories:', error);
        setLoadingCategories(false);
      });
    }
  }, [categoryVersion, isUpdating]);
  
  // Sync refs with state changes
  useEffect(() => {
    expenseRef.current = localExpenseCategories;
  }, [localExpenseCategories]);
  
  useEffect(() => {
    incomeRef.current = localIncomeCategories;
  }, [localIncomeCategories]);

  // Global pointer events for drag operations
  useEffect(() => {
    if (!isPointerDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (!draggedCategory) return;
      e.preventDefault();

      // Determine active list based on dragged category type
      const listRef = draggedCategory.type === 'expense' ? expenseListRef : incomeListRef;
      const container = listRef.current;
      if (!container) return;

      // Get all category row elements
      const items = Array.from(container.querySelectorAll('[data-item="true"]')) as HTMLDivElement[];
      if (items.length === 0) return;

      // Find target index based on pointer Y position
      let targetIndex = -1;
      for (let i = 0; i < items.length; i++) {
        const rect = items[i].getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        if (e.clientY < midpoint) {
          targetIndex = i;
          break;
        }
      }
      if (targetIndex === -1) targetIndex = items.length - 1;

      // Get current categories array
      const categories = draggedCategory.type === 'expense' ? expenseRef.current : incomeRef.current;
      const currentIndex = categories.findIndex(cat => cat.id === draggedCategory.id);
      
      if (currentIndex === -1 || currentIndex === targetIndex) return;

      // Reorder categories
      const newCategories = [...categories];
      const [removed] = newCategories.splice(currentIndex, 1);
      newCategories.splice(targetIndex, 0, removed);

      // Update state
      if (draggedCategory.type === 'expense') {
        setLocalExpenseCategories(newCategories);
        expenseRef.current = newCategories;
      } else {
        setLocalIncomeCategories(newCategories);
        incomeRef.current = newCategories;
      }

      setHasReorderedDuringDrag(true);
      setDragOverIndex(targetIndex);
    };

    const end = () => onGripPointerUp();

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [isPointerDragging, draggedCategory]);

  const resetForm = () => {
    setName("");
    setIcon("");
    setType("expense");
    setEditingCategory(null);
    setIsAddingNew(false);
  };

  const handleEdit = (category: CustomCategory) => {
    setEditingCategory(category);
    setName(category.name);
    setIcon(category.icon);
    setType(category.type);
    setIsAddingNew(false);
  };

  const handleAdd = () => {
    setName("");
    setIcon("");
    setType("expense");
    setEditingCategory(null);
    setIsAddingNew(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !icon.trim()) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory({ ...editingCategory, name: name.trim(), icon: icon.trim(), type });
        toast.success("Category updated");
      } else {
        await addCategory({ name: name.trim(), icon: icon.trim(), type });
        toast.success("Category added");
      }

      resetForm();
      await loadSettings(); // Reload to refresh cache
      setCategoryVersion(prev => prev + 1);
      onCategoriesChange();
    } catch (error) {
      toast.error("Failed to save category");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  const handleDelete = async () => {
    if (deletingCategory) {
      try {
        const result = await deleteCategory(deletingCategory.id);
        if (result.deleted) {
          toast.success("Category deleted");
        } else {
          toast.info("Category deleted successfully");
        }
        setDeletingCategory(null);
        await loadSettings();
        setCategoryVersion(prev => prev + 1);
        onCategoriesChange();
      } catch (error) {
        toast.error("Failed to delete category");
        console.error("Delete error:", error);
      }
    }
  };

  const handleSaveOrder = async () => {
    setIsSaving(true);
    
    try {
      const latestExpense = expenseRef.current;
      const latestIncome = incomeRef.current;
      
      // Combine and update in database
      await updateCategoriesInDatabase(latestExpense, latestIncome);
      toast.success("Category order saved");
    } catch (error: any) {
      toast.error(error.message || "Failed to save category order");
      console.error("Save order error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateCategoriesInDatabase = async (expenseCategories: CustomCategory[], incomeCategories: CustomCategory[]) => {
    setIsUpdating(true);  // Prevent sync during update
    
    try {
      // Build combined array: expenses first, then incomes
      const combined = [...expenseCategories, ...incomeCategories];
      
      // Assign global order_index from 0 to N-1
      const updates = combined.map((cat, idx) => ({
        ...cat,
        order: idx
      }));
      
      // Update all categories in parallel with explicit Promise.all
      await Promise.all(updates.map(cat => updateCategory(cat)));
      
      // Update cache immediately with the final order to prevent flicker
      setCategoriesCache(updates);
      
      // Don't reload settings - local state already has the correct order
      // This prevents the flicker when saving
      setIsDirty(false);
      onCategoriesChange();
    } catch (error: any) {
      console.error("Failed to update category order:", error);
      throw error;
    } finally {
      setIsUpdating(false);  // Re-enable sync
    }
  };


  const onGripPointerDown = (e: React.PointerEvent, category: CustomCategory) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDraggedCategory(category);
    setIsPointerDragging(true);
    setHasReorderedDuringDrag(false);
  };

  const onGripPointerUp = () => {
    if (isPointerDragging) {
      if (hasReorderedDuringDrag) {
        setIsDirty(true);
      }
      setDraggedCategory(null);
      setDragOverIndex(null);
      setIsPointerDragging(false);
      setHasReorderedDuringDrag(false);
    }
  };


  return (
    <div className="space-y-6" style={{ touchAction: isPointerDragging ? 'none' : undefined }}>
      <div className="flex items-center justify-between mb-4 gap-4">
        {isDirty && (
          <Button
            onClick={handleSaveOrder}
            size="sm"
            variant="outline"
            disabled={isSaving}
          >
            Save
          </Button>
        )}
        <Button
          onClick={handleAdd}
          size="icon"
          variant="default"
          className={`rounded-full w-12 h-12 transition-smooth hover:scale-105 shadow-lg ${!isDirty ? 'ml-auto' : ''}`}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Expense Categories */}
      <div>
        <h4 className="text-sm font-medium mb-3 text-muted-foreground">Expense Categories</h4>
        <div className="space-y-2" ref={expenseListRef}>
          {loadingCategories ? (
            // Show skeleton placeholders while loading
            <>
              {[...Array(4)].map((_, idx) => (
                <div key={`expense-skeleton-${idx}`} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3 flex-1">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-3 rounded-full" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                </div>
              ))}
            </>
          ) : (
            localExpenseCategories.map((cat, index) => (
            <div
              key={cat.id}
              data-item="true"
              onClick={() => {
                if (isPointerDragging || hasReorderedDuringDrag) return;
                handleEdit(cat);
              }}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 cursor-pointer relative",
                "transition-all duration-200 ease-out",
                draggedCategory?.id === cat.id && "opacity-50 scale-[0.98]",
                dragOverIndex === index && draggedCategory?.type === 'expense' && "border-2 border-primary border-dashed"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl">
                  {cat.icon}
                </div>
                <div>
                  <p className="font-medium">{cat.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onPointerDown={(e) => onGripPointerDown(e, cat)}
                  onPointerUp={onGripPointerUp}
                  onPointerCancel={onGripPointerUp}
                  className="cursor-grab active:cursor-grabbing transition-smooth select-none"
                  style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingCategory(cat);
                  }}
                  className="transition-smooth"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
          )}
        </div>
      </div>

      {/* Income Categories */}
      <div>
        <h4 className="text-sm font-medium mb-3 text-muted-foreground">Income Categories</h4>
        <div className="space-y-2" ref={incomeListRef}>
          {loadingCategories ? (
            // Show skeleton placeholders while loading
            <>
              {[...Array(2)].map((_, idx) => (
                <div key={`income-skeleton-${idx}`} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3 flex-1">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-3 rounded-full" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-8 w-8 rounded" />
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                </div>
              ))}
            </>
          ) : (
            localIncomeCategories.map((cat, index) => (
            <div
              key={cat.id}
              data-item="true"
              onClick={() => {
                if (isPointerDragging || hasReorderedDuringDrag) return;
                handleEdit(cat);
              }}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 cursor-pointer relative",
                "transition-all duration-200 ease-out",
                draggedCategory?.id === cat.id && "opacity-50 scale-[0.98]",
                dragOverIndex === index && draggedCategory?.type === 'income' && "border-2 border-primary border-dashed"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl">
                  {cat.icon}
                </div>
                <div>
                  <p className="font-medium">{cat.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onPointerDown={(e) => onGripPointerDown(e, cat)}
                  onPointerUp={onGripPointerUp}
                  onPointerCancel={onGripPointerUp}
                  className="cursor-grab active:cursor-grabbing transition-smooth select-none"
                  style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingCategory(cat);
                  }}
                  className="transition-smooth"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddingNew || editingCategory !== null} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent centered={false}>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., Groceries"
                maxLength={30}
              />
            </div>

            <div>
              <Label>Icon (Emoji)</Label>
              <Input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="🛒"
                maxLength={5}
                inputMode="text"
                className="text-2xl text-center"
              />
              <p className="text-xs text-muted-foreground mt-1">Tap to enter emoji</p>
            </div>

            <div>
              <Label className="mb-3 block">Type</Label>
              <Tabs value={type} onValueChange={(v) => setType(v as "expense" | "income")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="expense">Expense</TabsTrigger>
                  <TabsTrigger value="income">Income</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{editingCategory ? "Save Changes" : "Add Category"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deletingCategory !== null} onOpenChange={(open) => !open && setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCategory?.name}"? This action cannot be undone. Existing
              transactions with this category will remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
