const requests = new Map<string, Promise<any>>();

export function dedupe<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  const existing = requests.get(key);

  if (existing) {
    return existing;
  }

  const promise = fn().finally(() => {
    requests.delete(key);
  });

  requests.set(key, promise);

  return promise;
}

export function clearDedupCache() {
  requests.clear();
}
