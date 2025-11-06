import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hexToRgba(hex: string, alpha: number = 1): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function isPWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function formatAmount(amount: number): string {
  // Round to 2 decimal places
  const rounded = Math.round(amount * 100) / 100;
  // Format with up to 2 decimals, removing trailing zeros after decimal point
  return rounded.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

export function formatIndianNumber(num: number): string {
  const rounded = Math.round(num);
  const numStr = Math.abs(rounded).toString();
  
  if (numStr.length <= 3) return numStr;
  
  const lastThree = numStr.slice(-3);
  const remaining = numStr.slice(0, -3);
  
  const formatted = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  
  return rounded < 0 ? '-' + formatted : formatted;
}
