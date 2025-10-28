import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook that synchronizes state with browser history
 * Allows the back button to close modals instead of navigating away
 * 
 * @param initialValue - Initial state value
 * @param modalKey - Unique identifier for this modal
 * @returns [value, setValue] tuple like useState
 */
export function useHistoryState<T>(initialValue: T, modalKey: string): [T, (value: T) => void] {
  const [value, setValueState] = useState<T>(initialValue);
  const isSettingFromPopState = useRef(false);
  const currentModalKey = useRef(modalKey);

  const setValue = useCallback((newValue: T) => {
    // When opening a modal (setting to truthy value)
    if (newValue && !value) {
      // Use replaceState instead of pushState to improve bfcache compatibility
      window.history.replaceState(
        { ...window.history.state, modal: modalKey, timestamp: Date.now() },
        '',
        window.location.href
      );
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
      if (value && !isSettingFromPopState.current) {
        // If modal is open when unmounting, try to clean up history
        try {
          const state = window.history.state;
          if (state && state.modal === currentModalKey.current) {
            window.history.back();
          }
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    };
  }, [value]);

  return [value, setValue];
}
