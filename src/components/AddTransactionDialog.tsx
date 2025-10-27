import { useState } from 'react';
import { Transaction, TransactionType } from '@/types/transaction';
import { categories, getCategoryInfo } from '@/lib/categories';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
  editingTransaction?: Transaction | null;
}

export const AddTransactionDialog = ({
  open,
  onOpenChange,
  onAdd,
  editingTransaction,
}: AddTransactionDialogProps) => {
  const allCategories = categories();
  const [type, setType] = useState<TransactionType>(editingTransaction?.type || 'expense');
  const [amount, setAmount] = useState(editingTransaction?.amount.toString() || '');
  const [category, setCategory] = useState<string>(editingTransaction?.category || allCategories.find(c => c.type === 'expense')?.id || '');
  const [note, setNote] = useState(editingTransaction?.note || '');
  const [date, setDate] = useState<Date>(editingTransaction?.date || new Date());

  const handleNumberClick = (num: string) => {
    if (num === '.' && amount.includes('.')) return;
    if (amount.includes('.') && amount.split('.')[1].length >= 2) return;
    setAmount(prev => prev + num);
  };

  const handleBackspace = () => {
    setAmount(prev => prev.slice(0, -1));
  };

  const handleSubmit = () => {
    if (!amount || parseFloat(amount) === 0 || !note.trim() || !category) return;

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

  const displayCategories = allCategories.filter(cat => cat.type === type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Type Selector */}
          <Tabs value={type} onValueChange={(v) => setType(v as TransactionType)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="expense">Expense</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Amount Display */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Amount</p>
            <div className="text-4xl font-semibold tracking-tight">
              {amount || '0'}
            </div>
          </div>

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map(num => (
              <Button
                key={num}
                variant="secondary"
                className="h-12 text-lg font-medium"
                onClick={() => handleNumberClick(num)}
              >
                {num}
              </Button>
            ))}
            <Button
              variant="secondary"
              className="h-12"
              onClick={handleBackspace}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Category Selector */}
          <div>
            <p className="text-sm font-medium mb-3">Category</p>
            <div className="grid grid-cols-4 gap-2">
              {displayCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-all ${
                    category === cat.id
                      ? 'ring-2 ring-primary'
                      : 'hover:bg-secondary'
                  }`}
                  style={{
                    backgroundColor:
                      category === cat.id
                        ? `${cat.color}15`
                        : undefined,
                  }}
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-xs">{cat.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Note Input */}
          <div>
            <p className="text-sm font-medium mb-2">Note *</p>
            <Input
              placeholder="What's this for?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={50}
            />
          </div>

          {/* Date Picker */}
          <div>
            <p className="text-sm font-medium mb-2">Date</p>
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

          {/* Submit Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={!amount || parseFloat(amount) === 0 || !note.trim()}
          >
            {editingTransaction ? 'Save Changes' : 'Add Transaction'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
