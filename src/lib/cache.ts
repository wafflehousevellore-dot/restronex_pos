/**
 * High-performance, zero-cost in-memory LRU/TTL cache
 * Optimized for high-concurrency SaaS workloads (5,000 active users)
 * Prevents redundant database queries on read-heavy routes
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

class MemoryCache {
  private store = new Map<string, CacheEntry<any>>();
  private maxEntries: number;

  constructor(maxEntries = 5000) {
    this.maxEntries = maxEntries;
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds = 30): void {
    // Evict oldest if reaching capacity
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  del(key: string): void {
    this.store.delete(key);
  }

  delPrefix(prefix: string): void {
    for (const k of this.store.keys()) {
      if (k.startsWith(prefix)) {
        this.store.delete(k);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

// Global singleton to persist across hot-reloads and serverless instance reuse
const globalCache = globalThis as unknown as { appCache?: MemoryCache };
export const appCache = globalCache.appCache || new MemoryCache(10000);
globalCache.appCache = appCache;

// Global in-flight promise tracker to guarantee single-flight database requests
// Prevents Thundering Herd / Cache Stampedes under high concurrency (5,000 VUs)
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Cache helper for wrapped async database queries with Singleflight Promise Coalescing
 */
export async function getOrSetCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds = 30
): Promise<T> {
  const cached = appCache.get<T>(key);
  if (cached !== null && cached !== undefined) {
    return cached;
  }

  // If a database query is already in-flight for this key, coalesce onto it
  const existingPromise = inFlightRequests.get(key);
  if (existingPromise) {
    return existingPromise as Promise<T>;
  }

  const fetchPromise = (async () => {
    try {
      const fresh = await fetchFn();
      if (fresh !== null && fresh !== undefined) {
        appCache.set(key, fresh, ttlSeconds);
      }

      return fresh;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, fetchPromise);
  return fetchPromise;
}
