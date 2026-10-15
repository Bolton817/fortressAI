/**
 * Fortress AI — Sliding-Window Adaptive Rate Limiter (TDD §31.1, §34.1)
 * Protects authentication routes from brute-force credential stuffing and
 * AI generation / static export from resource exhaustion.
 */

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

interface WindowBucket {
  timestamps: number[];
}

export class RateLimiter {
  private buckets: Map<string, WindowBucket> = new Map();

  /**
   * Generic sliding-window rate limit checker
   */
  public check(
    key: string,
    limit: number,
    windowSeconds: number,
    referenceNow: number = Date.now()
  ): RateLimitResult {
    const windowMs = windowSeconds * 1000;
    const cutoff = referenceNow - windowMs;

    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { timestamps: [] };
      this.buckets.set(key, bucket);
    }

    // Filter out timestamps older than current sliding window
    bucket.timestamps = bucket.timestamps.filter((ts) => ts > cutoff);

    if (bucket.timestamps.length >= limit) {
      const oldestInWindow = bucket.timestamps[0];
      const resetMs = oldestInWindow + windowMs - referenceNow;
      const resetSeconds = Math.max(1, Math.ceil(resetMs / 1000));

      return {
        allowed: false,
        limit,
        remaining: 0,
        resetSeconds,
      };
    }

    // Allowed: record timestamp
    bucket.timestamps.push(referenceNow);
    const remaining = limit - bucket.timestamps.length;

    return {
      allowed: true,
      limit,
      remaining,
      resetSeconds: windowSeconds,
    };
  }

  /**
   * Auth endpoint limiter: 5 attempts / 60 seconds per IP (TDD §31.1, §34.1)
   */
  public checkAuth(ip: string, now?: number): RateLimitResult {
    return this.check(`auth:${ip}`, 5, 60, now);
  }

  /**
   * AI Generation limiter: 10 requests / 60 seconds per user/tenant (TDD §31.1)
   */
  public checkAiGeneration(userId: string, now?: number): RateLimitResult {
    return this.check(`ai:${userId}`, 10, 60, now);
  }

  /**
   * Static Export limiter: 3 requests / 15 minutes (900s) per user
   */
  public checkExport(userId: string, now?: number): RateLimitResult {
    return this.check(`export:${userId}`, 3, 900, now);
  }

  /**
   * Reset all buckets (for testing)
   */
  public clearAll(): void {
    this.buckets.clear();
  }
}

export const rateLimiter = new RateLimiter();
