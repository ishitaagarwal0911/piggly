import { useEffect, useRef } from 'react';

interface PageState {
  scrollY: number;
  currentDate?: string;
  viewType?: string;
  timestamp: number;
}

const PAGE_STATE_KEY = 'piggly_page_state';
const STATE_MAX_AGE = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to preserve and restore page state across cold starts
 * Saves scroll position and app state to sessionStorage
 */
export function usePageRestore(
  currentDate?: Date,
  viewType?: string
): void {
  const hasRestored = useRef(false);

  // Restore state on mount (only once)
  useEffect(() => {
    if (hasRestored.current) return;
    hasRestored.current = true;

    try {
      const saved = sessionStorage.getItem(PAGE_STATE_KEY);
      if (!saved) return;

      const state: PageState = JSON.parse(saved);
      
      // Check if state is fresh
      const age = Date.now() - state.timestamp;
      if (age > STATE_MAX_AGE) {
        sessionStorage.removeItem(PAGE_STATE_KEY);
        return;
      }

      // Restore scroll position
      if (state.scrollY) {
        requestAnimationFrame(() => {
          window.scrollTo({ top: state.scrollY, behavior: 'instant' as ScrollBehavior });
        });
      }
    } catch (error) {
      console.warn('Failed to restore page state:', error);
    }
  }, []);

  // Save state on scroll and when key props change
  useEffect(() => {
    const saveState = () => {
      try {
        const state: PageState = {
          scrollY: window.scrollY,
          currentDate: currentDate?.toISOString(),
          viewType,
          timestamp: Date.now(),
        };
        sessionStorage.setItem(PAGE_STATE_KEY, JSON.stringify(state));
      } catch (error) {
        console.warn('Failed to save page state:', error);
      }
    };

    // Save on scroll (debounced)
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(saveState, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Save on visibility change (app backgrounded)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveState();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Save on key prop changes
    saveState();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(scrollTimeout);
    };
  }, [currentDate, viewType]);
}
