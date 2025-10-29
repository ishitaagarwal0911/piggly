import { useState } from "react";
import { CustomCategory } from "@/types/settings";
import { categories } from "@/lib/categories";
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

interface CategoryManagerProps {
  onCategoriesChange: () => void;
}

export const CategoryManager = ({ onCategoriesChange }: CategoryManagerProps) => {
  const [categoryVersion, setCategoryVersion] = useState(0);
  const allCategories = categories();
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CustomCategory | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  
  const [draggedCategory, setDraggedCategory] = useState<CustomCategory | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

  const handleDragStart = (e: React.DragEvent, category: CustomCategory) => {
    setDraggedCategory(category);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, targetCategory: CustomCategory, targetIndex: number) => {
    e.preventDefault();
    
    if (!draggedCategory || draggedCategory.id === targetCategory.id) {
      setDraggedCategory(null);
      setDragOverIndex(null);
      return;
    }

    const categoriesList = draggedCategory.type === 'expense' ? expenseCategories : incomeCategories;
    const currentIndex = categoriesList.findIndex(c => c.id === draggedCategory.id);
    
    if (currentIndex === -1 || currentIndex === targetIndex) {
      setDraggedCategory(null);
      setDragOverIndex(null);
      return;
    }

    try {
      const reordered = [...categoriesList];
      const [removed] = reordered.splice(currentIndex, 1);
      reordered.splice(targetIndex, 0, removed);

      const updates = reordered.map((cat, idx) => ({
        ...cat,
        order: idx
      }));

      await Promise.all(updates.map(cat => updateCategory(cat)));
      await loadSettings();
      setCategoryVersion(prev => prev + 1);
      onCategoriesChange();
      
      toast.success("Category order updated");
    } catch (error) {
      toast.error("Failed to reorder category");
      console.error("Reorder error:", error);
    }

    setDraggedCategory(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedCategory(null);
    setDragOverIndex(null);
  };

  const expenseCategories = allCategories.filter((c) => c.type === "expense");
  const incomeCategories = allCategories.filter((c) => c.type === "income");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end mb-4">
        <Button
          onClick={handleAdd}
          size="icon"
          variant="default"
          className="rounded-full w-12 h-12 transition-smooth hover:scale-105 shadow-lg"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Expense Categories */}
      <div>
        <h4 className="text-sm font-medium mb-3 text-muted-foreground">Expense Categories</h4>
        <div className="space-y-2">
          {expenseCategories.map((cat, index) => (
            <div
              key={cat.id}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, cat)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, cat, index)}
              onDragEnd={handleDragEnd}
              onClick={() => handleEdit(cat)}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-smooth cursor-pointer relative",
                draggedCategory?.id === cat.id && "opacity-50",
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
                  className="cursor-grab active:cursor-grabbing transition-smooth"
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
          ))}
        </div>
      </div>

      {/* Income Categories */}
      <div>
        <h4 className="text-sm font-medium mb-3 text-muted-foreground">Income Categories</h4>
        <div className="space-y-2">
          {incomeCategories.map((cat, index) => (
            <div
              key={cat.id}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, cat)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, cat, index)}
              onDragEnd={handleDragEnd}
              onClick={() => handleEdit(cat)}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-smooth cursor-pointer relative",
                draggedCategory?.id === cat.id && "opacity-50",
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
                  className="cursor-grab active:cursor-grabbing transition-smooth"
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
          ))}
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
