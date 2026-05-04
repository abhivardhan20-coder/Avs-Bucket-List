/**
 * Debounce Utility
 * Prevents too many rapid function calls (e.g., API requests)
 */

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
};

/**
 * Throttle Utility
 * Prevents function from being called more than once per interval
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  interval: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCall >= interval) {
      lastCall = now;
      func(...args);
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        func(...args);
      }, interval - (now - lastCall));
    }
  };
};

/**
 * Debounce with immediate execution
 * Executes immediately, then debounces further calls
 */
export const debounceImmediate = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;
  let hasRun = false;

  return (...args: Parameters<T>) => {
    if (!hasRun) {
      func(...args);
      hasRun = true;
    }

    if (timeoutId) clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      hasRun = false;
      timeoutId = null;
    }, delay);
  };
};

/**
 * Example usage:
 * 
 * // Debounce (wait for inactivity):
 * const debouncedSearch = debounce((query: string) => {
 *   searchAPI(query);
 * }, 300);
 * 
 * // Throttle (regular intervals):
 * const throttledScroll = throttle(() => {
 *   updateScrollPosition();
 * }, 100);
 * 
 * // Listen to events:
 * input.addEventListener('input', (e) => debouncedSearch(e.target.value));
 * window.addEventListener('scroll', throttledScroll);
 */
