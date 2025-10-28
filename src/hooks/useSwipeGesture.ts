import { useEffect, useRef } from 'react';

interface SwipeGestureOptions {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  minSwipeDistance?: number;
  edgeThreshold?: number; // How far from left edge to start detecting (in pixels)
}

/**
 * Custom hook to detect swipe gestures on mobile
 * Specifically optimized for edge swipes (from left edge of screen)
 */
export function useSwipeGesture({
  onSwipeRight,
  onSwipeLeft,
  minSwipeDistance = 50,
  edgeThreshold = 50, // Start swipe must be within 50px of left edge
}: SwipeGestureOptions) {
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const touchEndY = useRef<number>(0);
  const isValidSwipe = useRef<boolean>(false);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      
      // Only detect swipes that start near the left edge
      isValidSwipe.current = touchStartX.current <= edgeThreshold;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isValidSwipe.current) return;
      
      touchEndX.current = e.touches[0].clientX;
      touchEndY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = () => {
      if (!isValidSwipe.current) return;

      const deltaX = touchEndX.current - touchStartX.current;
      const deltaY = touchEndY.current - touchStartY.current;
      
      // Ensure horizontal swipe (not vertical scroll)
      const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
      
      if (isHorizontalSwipe && Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0 && onSwipeRight) {
          // Swipe right (left to right)
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          // Swipe left (right to left)
          onSwipeLeft();
        }
      }

      // Reset
      isValidSwipe.current = false;
      touchStartX.current = 0;
      touchStartY.current = 0;
      touchEndX.current = 0;
      touchEndY.current = 0;
    };

    // Add event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeRight, onSwipeLeft, minSwipeDistance, edgeThreshold]);
}
