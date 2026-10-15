/**
 * Fortress AI — Cache Manager for Edge and Public Route Serving (TDD §20.4)
 * Invariant: Keyed by canonical site ID and release ID; invalidation on publish or rollback.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class CacheManager {
  private store: Map<string, CacheEntry<unknown>> = new Map();

  public get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  public set<T>(key: string, value: T, ttlSeconds: number = 300): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Invalidate all cached entries for a given site (TDD §20.4)
   */
  public invalidateSite(siteId: string): void {
    const prefix = `site:${siteId}:`;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  public clearAll(): void {
    this.store.clear();
  }
}

export const cacheManager = new CacheManager();
