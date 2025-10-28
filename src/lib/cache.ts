import { Transaction } from '@/types/transaction';

const CACHE_VERSION = '1.0';
const CACHE_KEY_PREFIX = 'piggly_cache_';
const TRANSACTIONS_KEY = `${CACHE_KEY_PREFIX}transactions_v${CACHE_VERSION}`;
const LAST_SYNC_KEY = `${CACHE_KEY_PREFIX}last_sync`;

export interface CacheMetadata {
  lastSync: number;
  version: string;
  userId: string;
}

/**
 * Cache transactions to localStorage for instant app restoration
 */
export const cacheTransactions = (transactions: Transaction[], userId: string): void => {
  try {
    const cacheData = {
      transactions,
      metadata: {
        lastSync: Date.now(),
        version: CACHE_VERSION,
        userId,
      } as CacheMetadata,
    };
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to cache transactions:', error);
  }
};

/**
 * Get cached transactions synchronously (instant)
 */
export const getCachedTransactions = (userId: string): Transaction[] | null => {
  try {
    const cached = localStorage.getItem(TRANSACTIONS_KEY);
    if (!cached) return null;

    const { transactions, metadata } = JSON.parse(cached);
    
    // Validate cache
    if (metadata.version !== CACHE_VERSION || metadata.userId !== userId) {
      clearTransactionCache();
      return null;
    }

    // Reconstruct Date objects
    return transactions.map((t: any) => ({
      ...t,
      date: new Date(t.date),
      createdAt: new Date(t.createdAt),
      updatedAt: t.updatedAt ? new Date(t.updatedAt) : undefined,
    }));
  } catch (error) {
    console.warn('Failed to read cached transactions:', error);
    return null;
  }
};

/**
 * Clear transaction cache
 */
export const clearTransactionCache = (): void => {
  try {
    localStorage.removeItem(TRANSACTIONS_KEY);
    localStorage.removeItem(LAST_SYNC_KEY);
  } catch (error) {
    console.warn('Failed to clear cache:', error);
  }
};

/**
 * Check if cache is fresh (less than 5 minutes old)
 */
export const isCacheFresh = (userId: string): boolean => {
  try {
    const cached = localStorage.getItem(TRANSACTIONS_KEY);
    if (!cached) return false;

    const { metadata } = JSON.parse(cached);
    if (metadata.userId !== userId) return false;

    const age = Date.now() - metadata.lastSync;
    return age < 5 * 60 * 1000; // 5 minutes
  } catch {
    return false;
  }
};
