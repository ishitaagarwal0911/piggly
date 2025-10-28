import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook that synchronizes state with browser history
 * Allows the back button to close modals instead of navigating away
 * Prevents tab closure on mobile by using pushState and checking history length
 * 
 * @param initialValue - Initial state value
 * @param modalKey - Unique identifier for this modal
 * @returns [value, setValue] tuple like useState
 */
export function useHistoryState<T>(initialValue: T, modalKey: string): [T, (value: T) => void] {
  const [value, setValueState] = useState<T>(initialValue);
  const isSettingFromPopState = useRef(false);
  const currentModalKey = useRef(modalKey);
  const hasAddedHistoryEntry = useRef(false);

  const setValue = useCallback((newValue: T) => {
    // When opening a modal (setting to truthy value)
    if (newValue && !value) {
      // Use pushState to create a proper history entry (so back button can close modal)
      try {
        window.history.pushState(
          { ...window.history.state, modal: modalKey, timestamp: Date.now() },
          '',
          window.location.href
        );
        hasAddedHistoryEntry.current = true;
      } catch (e) {
        console.warn('Failed to add history entry:', e);
      }
    }
    setValueState(newValue);
  }, [value, modalKey]);

  useEffect(() => {
    currentModalKey.current = modalKey;
  }, [modalKey]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Only close this modal if it's currently open
      if (value) {
        const state = event.state;
        
        // If we're navigating back and this modal is open, close it
        if (!state || state.modal !== currentModalKey.current) {
          isSettingFromPopState.current = true;
          setValueState(initialValue);
          isSettingFromPopState.current = false;
          hasAddedHistoryEntry.current = false;
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [value, initialValue]);

  // Clean up history entry when component unmounts with modal open
  useEffect(() => {
    return () => {
      if (value && !isSettingFromPopState.current && hasAddedHistoryEntry.current) {
        // Only call history.back() if we have more than 1 entry (prevents tab closure)
        try {
          const state = window.history.state;
          if (state && state.modal === currentModalKey.current && window.history.length > 1) {
            window.history.back();
          }
        } catch (e) {
          // Ignore errors during cleanup
          console.warn('History cleanup error:', e);
        }
      }
      hasAddedHistoryEntry.current = false;
    };
  }, [value]);

  return [value, setValue];
}
