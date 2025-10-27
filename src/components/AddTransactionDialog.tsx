import { useState } from 'react';
import { Transaction, TransactionType, CategoryType } from '@/types/transaction';
import { categories, getCategoryInfo } from '@/lib/categories';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X } from 'lucide-react';

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
}

export const AddTransactionDialog = ({
  open,
  onOpenChange,
  onAdd,
}: AddTransactionDialogProps) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<CategoryType>('food');
  const [note, setNote] = useState('');

  const handleNumberClick = (num: string) => {
    if (num === '.' && amount.includes('.')) return;
    if (amount.includes('.') && amount.split('.')[1].length >= 2) return;
    setAmount(prev => prev + num);
  };

  const handleBackspace = () => {
    setAmount(prev => prev.slice(0, -1));
  };

  const handleSubmit = () => {
    if (!amount || parseFloat(amount) === 0 || !note.trim()) return;

    onAdd({
      type,
      amount: parseFloat(amount),
      category,
      note: note.trim(),
    });

    // Reset form
    setAmount('');
    setNote('');
    setCategory('food');
    onOpenChange(false);
  };

  const displayCategories = type === 'income' 
    ? categories.filter(cat => cat.id === 'income')
    : categories.filter(cat => cat.id !== 'income');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
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
              ${amount || '0'}
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
                        ? `hsl(var(--${cat.color}) / 0.15)`
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

          {/* Submit Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={!amount || parseFloat(amount) === 0 || !note.trim()}
          >
            Add Transaction
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
