import { Transaction } from '@/types/transaction';
import { startOfMonth } from 'date-fns/startOfMonth';
import { endOfMonth } from 'date-fns/endOfMonth';
import { startOfWeek } from 'date-fns/startOfWeek';
import { endOfWeek } from 'date-fns/endOfWeek';
import { startOfDay } from 'date-fns/startOfDay';
import { endOfDay } from 'date-fns/endOfDay';
import { addMonths } from 'date-fns/addMonths';
import { addWeeks } from 'date-fns/addWeeks';
import { addDays } from 'date-fns/addDays';
import { subMonths } from 'date-fns/subMonths';
import { subWeeks } from 'date-fns/subWeeks';
import { subDays } from 'date-fns/subDays';
import { format } from 'date-fns/format';
import { getWeek } from 'date-fns/getWeek';
import { getYear } from 'date-fns/getYear';

export type ViewType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export const getMonthTransactions = (transactions: Transaction[], year: number, month: number): Transaction[] => {
  const start = startOfMonth(new Date(year, month));
  const end = endOfMonth(new Date(year, month));
  
  return transactions.filter(t => {
    const date = new Date(t.date);
    return date >= start && date <= end;
  });
};

export const getWeekTransactions = (transactions: Transaction[], date: Date): Transaction[] => {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  
  return transactions.filter(t => {
    const txDate = new Date(t.date);
    return txDate >= start && txDate <= end;
  });
};

export const getDayTransactions = (transactions: Transaction[], date: Date): Transaction[] => {
  const start = startOfDay(date);
  const end = endOfDay(date);
  
  return transactions.filter(t => {
    const txDate = new Date(t.date);
    return txDate >= start && txDate <= end;
  });
};

export const getYearTransactions = (transactions: Transaction[], year: number): Transaction[] => {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31, 23, 59, 59);
  
  return transactions.filter(t => {
    const txDate = new Date(t.date);
    return txDate >= start && txDate <= end;
  });
};

export const getPreviousPeriod = (currentDate: Date, viewType: ViewType): Date => {
  switch (viewType) {
    case 'daily':
      return subDays(currentDate, 1);
    case 'weekly':
      return subWeeks(currentDate, 1);
    case 'monthly':
      return subMonths(currentDate, 1);
    case 'yearly':
      return new Date(currentDate.getFullYear() - 1, 0, 1);
  }
};

export const getNextPeriod = (currentDate: Date, viewType: ViewType): Date => {
  switch (viewType) {
    case 'daily':
      return addDays(currentDate, 1);
    case 'weekly':
      return addWeeks(currentDate, 1);
    case 'monthly':
      return addMonths(currentDate, 1);
    case 'yearly':
      return new Date(currentDate.getFullYear() + 1, 0, 1);
  }
};

export const formatPeriod = (date: Date, viewType: ViewType): string => {
  switch (viewType) {
    case 'daily':
      return format(date, 'MMMM d, yyyy');
    case 'weekly':
      return `Week ${getWeek(date, { weekStartsOn: 1 })}, ${getYear(date)}`;
    case 'monthly':
      return format(date, 'MMMM yyyy');
    case 'yearly':
      return format(date, 'yyyy');
  }
};

export const getFilteredTransactions = (transactions: Transaction[], date: Date, viewType: ViewType): Transaction[] => {
  switch (viewType) {
    case 'daily':
      return getDayTransactions(transactions, date);
    case 'weekly':
      return getWeekTransactions(transactions, date);
    case 'monthly':
      return getMonthTransactions(transactions, date.getFullYear(), date.getMonth());
    case 'yearly':
      return getYearTransactions(transactions, date.getFullYear());
  }
};
