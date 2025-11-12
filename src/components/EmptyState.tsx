import Wallet from 'lucide-react/dist/esm/icons/wallet';

interface EmptyStateProps {
  type: 'expenses' | 'income';
}

export const EmptyState = ({ type }: EmptyStateProps) => {
  return (
    <div className="text-center py-12">
      <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-secondary/30 flex items-center justify-center">
        <Wallet className="w-12 h-12 text-muted-foreground/40" strokeWidth={1.5} />
      </div>
      <p className="text-sm font-medium text-muted-foreground mb-1">
        {type === 'expenses' ? 'No expenses yet' : 'No income yet'}
      </p>
      <p className="text-xs text-muted-foreground/60">
        Tap the + button to add your first transaction
      </p>
    </div>
  );
};
