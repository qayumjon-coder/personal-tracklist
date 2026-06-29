import { useEffect } from 'react';

// Global state to track multiple simultaneous locks
let lockCount = 0;
let originalStyle = '';
let originalPaddingRight = '';

export function useScrollLock(lock: boolean) {
  useEffect(() => {
    if (lock) {
      if (lockCount === 0) {
        // Save original styles only on the first lock
        originalStyle = window.getComputedStyle(document.body).overflow;
        originalPaddingRight = window.getComputedStyle(document.body).paddingRight;

        // Calculate scrollbar width to prevent layout shift
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

        if (scrollbarWidth > 0) {
          document.body.style.paddingRight = `calc(${originalPaddingRight || '0px'} + ${scrollbarWidth}px)`;
        }
        document.body.style.overflow = 'hidden';
      }
      
      lockCount++;

      return () => {
        lockCount--;
        if (lockCount === 0) {
          document.body.style.overflow = originalStyle;
          document.body.style.paddingRight = originalPaddingRight;
        }
      };
    }
  }, [lock]);
}
