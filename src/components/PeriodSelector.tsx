import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { formatPeriod, ViewType } from '@/lib/dateUtils';

interface PeriodSelectorProps {
  currentDate: Date;
  viewType: ViewType;
  onPrevious: () => void;
  onNext: () => void;
  onDateSelect: (date: Date) => void;
}

export const PeriodSelector = ({
  currentDate,
  viewType,
  onPrevious,
  onNext,
  onDateSelect,
}: PeriodSelectorProps) => {
  return (
    <div className="flex items-center justify-center gap-2">
      <Button variant="ghost" size="sm" onClick={onPrevious}>
        <ChevronLeft className="w-5 h-5" />
      </Button>

      {viewType === 'monthly' ? (
        <div className="text-lg font-semibold">
          {formatPeriod(currentDate, viewType)}
        </div>
      ) : (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="text-lg font-semibold">
              {formatPeriod(currentDate, viewType)}
              <CalendarIcon className="ml-2 w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={(date) => date && onDateSelect(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      )}

      <Button variant="ghost" size="sm" onClick={onNext}>
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  );
};
