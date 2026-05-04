const inFlight = new Map<string, { promise: Promise<any>, timestamp: number }>();
const TTL_MS = 30000; // 30 seconds

/**
 * Deduplicates in-flight and recent asynchronous requests.
 * If a request with the same key is already running or completed within TTL, returns the existing result.
 */
export async function dedupedFetch<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const cached = inFlight.get(key);

  if (cached) {
    if (now - cached.timestamp < TTL_MS) {
      return cached.promise as Promise<T>;
    }
    inFlight.delete(key);
  }

  const promise = fetcher().catch(err => {
    inFlight.delete(key);
    throw err;
  });

  inFlight.set(key, { promise, timestamp: now });

  // Cleanup after TTL if it's still there
  setTimeout(() => {
    const current = inFlight.get(key);
    if (current && current.timestamp === now) {
      inFlight.delete(key);
    }
  }, TTL_MS);

  return promise;
}

export function clearDedupCache() {
  inFlight.clear();
}
