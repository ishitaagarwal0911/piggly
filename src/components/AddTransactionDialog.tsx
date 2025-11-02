import { useState, useEffect, useRef } from 'react';
import { Transaction, TransactionType } from '@/types/transaction';
import { categories, getCategoryInfo } from '@/lib/categories';
import { addCategory, loadSettings } from '@/lib/settings';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Plus, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onDelete?: (id: string) => void;
  editingTransaction?: Transaction | null;
  initialType?: 'income' | 'expense';
}

export const AddTransactionDialog = ({
  open,
  onOpenChange,
  onAdd,
  onDelete,
  editingTransaction,
  initialType = 'expense',
}: AddTransactionDialogProps) => {
  const allCategories = categories();
  const [type, setType] = useState<TransactionType>(editingTransaction?.type || initialType);
  const [amount, setAmount] = useState(editingTransaction?.amount.toString() || '');
  const [category, setCategory] = useState<string>(editingTransaction?.category || allCategories.find(c => c.type === 'expense')?.id || '');
  const [note, setNote] = useState(editingTransaction?.note || '');
  const [date, setDate] = useState<Date>(editingTransaction?.date || new Date());
  const [isFirstKeystroke, setIsFirstKeystroke] = useState(false);
  const [firstOperand, setFirstOperand] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForSecondOperand, setWaitingForSecondOperand] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const isProcessing = useRef(false);
  const quickAddRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Sync form state when editingTransaction changes
  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount.toString());
      setCategory(editingTransaction.category);
      setNote(editingTransaction.note);
      setDate(editingTransaction.date);
      setIsFirstKeystroke(true);
      setFirstOperand(null);
      setOperator(null);
      setWaitingForSecondOperand(false);
    }
  }, [editingTransaction]);

  // Reset form when dialog closes or sync type when opening
  useEffect(() => {
    if (!open) {
      setAmount('');
      setNote('');
      setDate(new Date());
      const defaultCategory = allCategories.find(c => c.type === initialType);
      setCategory(defaultCategory?.id || '');
      setType(initialType);
      setIsFirstKeystroke(false);
      setFirstOperand(null);
      setOperator(null);
      setWaitingForSecondOperand(false);
      setShowAddCategory(false);
      setNewCategoryName('');
      setNewCategoryIcon('');
    } else if (!editingTransaction) {
      // When opening without editing, use initialType
      setType(initialType);
      const defaultCategory = allCategories.find(c => c.type === initialType);
      setCategory(defaultCategory?.id || '');
    }
  }, [open, allCategories, initialType, editingTransaction]);

  // Auto-scroll to quick add form when it opens
  useEffect(() => {
    if (showAddCategory && quickAddRef.current) {
      setTimeout(() => {
        quickAddRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest' 
        });
      }, 100);
    }
  }, [showAddCategory]);

  // iOS keyboard detection with keyboard height calculation
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined' && window.visualViewport) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        
        // More sensitive threshold for iOS
        const threshold = windowHeight * 0.9;
        const keyboardOpen = viewportHeight < threshold;
        
        if (keyboardOpen) {
          // Calculate keyboard height + safe area
          const keyboardHeight = windowHeight - viewportHeight;
          // Add safe area bottom to ensure button sits above keyboard
          const safeAreaBottom = parseInt(
            getComputedStyle(document.documentElement)
              .getPropertyValue('--sab')
              .replace('px', '')
          ) || 20;
          
          const totalOffset = keyboardHeight + safeAreaBottom;
          document.documentElement.style.setProperty(
            '--keyboard-offset', 
            `${totalOffset}px`
          );
        } else {
          document.documentElement.style.setProperty('--keyboard-offset', '0px');
        }
        
        setIsKeyboardVisible(keyboardOpen);
      }
    };

    if (window.visualViewport) {
      handleResize();
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
      return () => {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
        document.documentElement.style.setProperty('--keyboard-offset', '0px');
      };
    }
  }, []);


  const performCalculation = (a: number, b: number, op: string): number => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '×': return a * b;
      default: return b;
    }
  };

  const handleNumberClick = (num: string) => {
    if (waitingForSecondOperand) {
      setAmount(num);
      setWaitingForSecondOperand(false);
    } else if (isFirstKeystroke) {
      setAmount(num);
      setIsFirstKeystroke(false);
    } else {
      setAmount(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    setAmount(prev => prev.slice(0, -1));
    setIsFirstKeystroke(false);
  };

  const handleDecimal = () => {
    if (waitingForSecondOperand) {
      setAmount('0.');
      setWaitingForSecondOperand(false);
    } else if (!amount.includes('.')) {
      setAmount(prev => (prev || '0') + '.');
    }
  };

  const handleOperatorClick = (op: string) => {
    const currentValue = parseFloat(amount) || 0;
    
    if (firstOperand === null) {
      setFirstOperand(currentValue);
      setOperator(op);
      setWaitingForSecondOperand(true);
    } else if (operator) {
      const result = performCalculation(firstOperand, currentValue, operator);
      setAmount(result.toString());
      setFirstOperand(result);
      setOperator(op);
      setWaitingForSecondOperand(true);
    }
    setIsFirstKeystroke(false);
  };

  const handleEquals = () => {
    if (firstOperand !== null && operator) {
      const currentValue = parseFloat(amount) || 0;
      const result = performCalculation(firstOperand, currentValue, operator);
      setAmount(result.toString());
      setFirstOperand(null);
      setOperator(null);
      setWaitingForSecondOperand(false);
    }
  };

  const handleSubmit = () => {
    if (!amount || parseFloat(amount) === 0 || !category) return;

    onAdd({
      type,
      amount: parseFloat(amount),
      category,
      note: note.trim(),
      date,
    });

    // Reset form
    setAmount('');
    setNote('');
    setDate(new Date());
    const defaultCategory = allCategories.find(c => c.type === 'expense');
    setCategory(defaultCategory?.id || '');
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (editingTransaction && onDelete) {
      onDelete(editingTransaction.id);
      onOpenChange(false);
    }
  };

  const handleAddCategory = async () => {
    // Prevent duplicate submissions (critical for iOS PWA)
    if (isProcessing.current || isAddingCategory) return;
    
    if (!newCategoryName.trim() || !newCategoryIcon.trim()) {
      toast.error('Please enter both name and icon');
      return;
    }

    isProcessing.current = true;
    setIsAddingCategory(true);
    
    try {
      await addCategory({ 
        name: newCategoryName.trim(), 
        icon: newCategoryIcon.trim(), 
        type 
      });
      await loadSettings(); // Reload to refresh cache
      toast.success('Category added');
      setShowAddCategory(false);
      setNewCategoryName('');
      setNewCategoryIcon('');
      // Select the newly added category
      const updatedCategories = categories();
      const newCat = updatedCategories.find(c => c.name === newCategoryName.trim());
      if (newCat) setCategory(newCat.id);
    } catch (error) {
      toast.error('Failed to add category');
    } finally {
      setIsAddingCategory(false);
      isProcessing.current = false;
    }
  };

  const displayCategories = allCategories.filter(cat => cat.type === type);

  return (
    <Drawer 
      open={open} 
      onOpenChange={onOpenChange}
      dismissible={!isInputFocused}
      snapPoints={null}
      modal={true}
      noBodyStyles={true}
      shouldScaleBackground={false}
    >
        <DrawerContent 
          className="flex flex-col"
          style={{
          height: 'calc(100dvh - env(safe-area-inset-top, 0px))',
          maxHeight: 'calc(100dvh - env(safe-area-inset-top, 0px))'
        }}
      >
        <DrawerHeader className="pt-4 px-4 sm:px-6 flex items-center justify-between">
          <DrawerTitle>
            {editingTransaction ? "Edit Transaction" : "Add Transaction"}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            Add or edit a transaction with amount, category, and notes
          </DrawerDescription>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-10 w-10 relative z-10"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-6 w-6" />
          </Button>
        </DrawerHeader>

        <div className="overflow-y-auto flex-1 min-h-0 pb-32" style={{ maxHeight: '100%' }}>
          <div className="px-4 sm:px-6 space-y-3 sm:space-y-4">
          {/* Type Selector */}
          <Tabs value={type} onValueChange={(v) => setType(v as TransactionType)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="expense">Expense</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Amount Display */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Amount</p>
            <div className="text-3xl sm:text-4xl font-semibold tracking-tight">
              {amount || '0'}
            </div>
          </div>

          {/* Numeric Keypad */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {['7', '8', '9', '⌫', '4', '5', '6', '×', '1', '2', '3', '+', '.', '0', '=', '-'].map((btn, idx) => {
              const isBackspace = btn === '⌫';
              const isDecimal = btn === '.';
              const isEquals = btn === '=';
              const isOperator = ['+', '-', '×'].includes(btn);
              const isNumber = !isNaN(Number(btn));
              
              return (
                <Button
                  key={idx}
                  variant={isOperator || isEquals ? "default" : "secondary"}
                  className="h-12 text-lg font-medium"
                  onClick={() => {
                    if (isBackspace) handleBackspace();
                    else if (isDecimal) handleDecimal();
                    else if (isEquals) handleEquals();
                    else if (isOperator) handleOperatorClick(btn);
                    else if (isNumber) handleNumberClick(btn);
                  }}
                >
                  {btn}
                </Button>
              );
            })}
          </div>

          {/* Category Selector */}
          <div>
            <p className="text-sm font-medium mb-2">Category</p>
            <div className="grid grid-cols-4 gap-2">
              {displayCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setCategory(cat.id);
                    setShowAddCategory(false);
                    setNewCategoryName('');
                    setNewCategoryIcon('');
                  }}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                    category === cat.id
                      ? 'ring-2'
                      : 'hover:bg-secondary'
                  }`}
                  style={{
                    borderColor: category === cat.id ? cat.color : undefined,
                  }}
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-xs">{cat.name.split(' ')[0]}</span>
                </button>
              ))}
              
              {/* Add Category Button */}
              <button
                onClick={() => setShowAddCategory(true)}
                className="p-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all hover:bg-secondary border-2 border-dashed border-muted-foreground/30"
              >
                <Plus className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Add</span>
              </button>
            </div>
          </div>

          {/* Quick Add Category Dialog */}
          {showAddCategory && (
            <div ref={quickAddRef} className="space-y-3 p-4 border rounded-lg bg-secondary/50">
              <p className="text-sm font-medium">Quick Add Category</p>
              <Input
                placeholder="Category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                maxLength={30}
              />
              <Input
                placeholder="Emoji"
                value={newCategoryIcon}
                onChange={(e) => setNewCategoryIcon(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                maxLength={5}
                className="text-center"
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  setShowAddCategory(false);
                  setNewCategoryName('');
                  setNewCategoryIcon('');
                }} className="flex-1">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddCategory} className="flex-1" disabled={isAddingCategory}>
                  {isAddingCategory ? 'Adding...' : 'Add'}
                </Button>
              </div>
            </div>
          )}

          {/* Note Input */}
          <div>
            <p className="text-sm font-medium mb-1">Note</p>
            <Input
              placeholder="What's this for?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={50}
            />
          </div>

          {/* Date Picker */}
          <div>
            <p className="text-sm font-medium mb-1">Date</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                />
              </PopoverContent>
          </Popover>
          </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div 
          className="bg-background border-t pt-3 space-y-2 px-4 sm:px-6"
          style={{ 
            position: 'fixed',
            left: '0',
            right: '0',
            bottom: isKeyboardVisible ? 'var(--keyboard-offset, 0px)' : '0',
            paddingBottom: isKeyboardVisible ? '1rem' : 'calc(1rem + env(safe-area-inset-bottom, 0px))',
            transition: 'bottom 0.3s ease-out',
            zIndex: 50
          }}
        >
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={!amount || parseFloat(amount) === 0}
          >
            {editingTransaction ? 'Save Changes' : 'Add Transaction'}
          </Button>
          
          {editingTransaction && onDelete && (
            <Button
              variant="destructive"
              className="w-full"
              size="lg"
              onClick={handleDelete}
            >
              Delete Transaction
            </Button>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default AddTransactionDialog;
