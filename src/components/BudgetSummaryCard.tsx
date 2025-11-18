import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Gauge from 'lucide-react/dist/esm/icons/gauge';
import { formatIndianNumber } from '@/lib/utils';

interface BudgetSummaryCardProps {
  totalBudget?: number;
  totalSpent?: number;
  safeToSpend?: number;
  currency: string;
  onSetBudgetClick: () => void;
  budgetLoading?: boolean;
}

export const BudgetSummaryCard = ({
  totalBudget,
  totalSpent,
  safeToSpend,
  currency,
  onSetBudgetClick,
  budgetLoading = false,
}: BudgetSummaryCardProps) => {
  // Show skeleton during initial load
  if (budgetLoading) {
    return (
      <Card className="p-6 mb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <Skeleton className="h-3 w-12 mx-auto mb-2" />
            <Skeleton className="h-6 w-20 mx-auto" />
          </div>
          <div>
            <Skeleton className="h-3 w-12 mx-auto mb-2" />
            <Skeleton className="h-6 w-20 mx-auto" />
          </div>
          <div>
            <Skeleton className="h-3 w-16 mx-auto mb-2" />
            <Skeleton className="h-6 w-20 mx-auto" />
          </div>
        </div>
      </Card>
    );
  }

  const hasBudget = totalBudget !== undefined && totalBudget > 0;

  if (!hasBudget) {
    return (
      <Card className="p-6 mb-6">
        <Button
          onClick={onSetBudgetClick}
          variant="outline"
          className="w-full justify-start gap-3 h-auto py-4"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
            <Gauge className="w-5 h-5 text-primary" />
          </div>
          <span className="text-base font-medium">Set monthly budget</span>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6 mb-6 cursor-pointer hover:bg-accent/50 transition-colors" onClick={onSetBudgetClick}>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Spends</p>
          <p className="text-lg font-semibold text-destructive">
            {currency}{formatIndianNumber(totalSpent || 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Budget</p>
          <p className="text-lg font-semibold">
            {currency}{formatIndianNumber(totalBudget)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Safe to spend</p>
          <p className="text-lg font-semibold text-primary">
            {currency}{formatIndianNumber(safeToSpend || 0)}
          </p>
        </div>
      </div>
    </Card>
  );
};
