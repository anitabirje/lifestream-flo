/**
 * Cache Manager
 * Provides in-memory caching for data when DynamoDB is unavailable
 * Supports cache invalidation and TTL-based expiration
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  ttlMs: number;
  expiresAt: Date;
}

export interface CacheStats {
  totalEntries: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
}

export class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private hitCount: number = 0;
  private missCount: number = 0;
  private maxEntries: number = 10000;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(maxEntries: number = 10000) {
    this.maxEntries = maxEntries;
    this.startCleanupInterval();
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.missCount++;
      return null;
    }

    // Check if expired
    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    this.hitCount++;
    return entry.data as T;
  }

  /**
   * Set value in cache with TTL
   */
  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    // Check if we need to evict entries
    if (this.cache.size >= this.maxEntries) {
      this.evictOldestEntry();
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);

    this.cache.set(key, {
      data,
      timestamp: now,
      ttlMs,
      expiresAt
    });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get all keys matching a pattern
   */
  getKeysByPattern(pattern: string | RegExp): string[] {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const keys: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keys.push(key);
      }
    }

    return keys;
  }

  /**
   * Delete all entries matching a pattern
   */
  deleteByPattern(pattern: string | RegExp): number {
    const keys = this.getKeysByPattern(pattern);
    let deletedCount = 0;

    for (const key of keys) {
      if (this.cache.delete(key)) {
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;

    return {
      totalEntries: this.cache.size,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Get cache size in bytes (approximate)
   */
  getApproximateSize(): number {
    let size = 0;

    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2; // Rough estimate for string
      size += JSON.stringify(entry.data).length * 2; // Rough estimate for data
    }

    return size;
  }

  /**
   * Evict oldest entry
   */
  private evictOldestEntry(): void {
    let oldestKey: string | null = null;
    let oldestTime: Date | null = null;

    for (const [key, entry] of this.cache.entries()) {
      if (!oldestTime || entry.timestamp < oldestTime) {
        oldestKey = key;
        oldestTime = entry.timestamp;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Start cleanup interval to remove expired entries
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.removeExpiredEntries();
    }, 60000); // Run every minute
  }

  /**
   * Remove expired entries
   */
  private removeExpiredEntries(): void {
    const now = new Date();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`Cache cleanup: removed ${removedCount} expired entries`);
    }
  }

  /**
   * Stop cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  /**
   * Destroy cache manager
   */
  destroy(): void {
    this.stopCleanup();
    this.clear();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const cacheManager = new CacheManager();
