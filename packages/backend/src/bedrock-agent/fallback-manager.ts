/**
 * Fallback mechanisms for graceful degradation
 * Validates: Requirements 11.1, 11.5
 */

import { getLogger } from './logger';
import { ToolOutput } from './types';

const logger = getLogger();

/**
 * Cache entry for fallback responses
 */
interface CacheEntry {
  data: Record<string, unknown>;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

/**
 * Fallback cache for storing successful responses
 */
class FallbackCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly maxSize = 1000;

  /**
   * Get a cached response
   */
  get(key: string): Record<string, unknown> | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Store a response in cache
   */
  set(key: string, data: Record<string, unknown>, ttl: number = 3600000): void {
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

/**
 * Global fallback cache instance
 */
const fallbackCache = new FallbackCache();

/**
 * Generate a cache key for a tool invocation
 */
export function generateCacheKey(
  toolName: string,
  input: Record<string, unknown>
): string {
  const inputStr = JSON.stringify(input);
  return `${toolName}:${inputStr}`;
}

/**
 * Get a cached tool response
 */
export function getCachedResponse(
  toolName: string,
  input: Record<string, unknown>
): Record<string, unknown> | null {
  const key = generateCacheKey(toolName, input);
  return fallbackCache.get(key);
}

/**
 * Cache a successful tool response
 */
export function cacheResponse(
  toolName: string,
  input: Record<string, unknown>,
  output: ToolOutput,
  ttl?: number
): void {
  if (output.success && output.data) {
    const key = generateCacheKey(toolName, input);
    fallbackCache.set(key, output.data, ttl);

    logger.info('Tool response cached', {
      toolName,
      cacheKey: key,
      ttl: ttl || 3600000,
    });
  }
}

/**
 * Create a fallback response from cached data
 */
export function createFallbackFromCache(
  toolName: string,
  input: Record<string, unknown>
): ToolOutput | null {
  const cachedData = getCachedResponse(toolName, input);
  if (!cachedData) {
    return null;
  }

  logger.info('Using cached response as fallback', {
    toolName,
  });

  return {
    success: true,
    data: {
      ...cachedData,
      _fallback: true,
      _cachedAt: new Date().toISOString(),
    },
  };
}

/**
 * Create a degraded response when service is unavailable
 */
export function createDegradedResponse(
  toolName: string,
  reason: string
): ToolOutput {
  logger.warn('Creating degraded response', {
    toolName,
    reason,
  });

  return {
    success: false,
    error: `${toolName} is temporarily unavailable: ${reason}. Please try again later.`,
  };
}

/**
 * Audit trail entry for fallback usage
 */
interface AuditEntry {
  timestamp: string;
  toolName: string;
  reason: string;
  fallbackType: 'cached' | 'degraded';
  executionId: string;
}

/**
 * Audit trail for fallback usage
 */
class AuditTrail {
  private entries: AuditEntry[] = [];
  private readonly maxEntries = 10000;

  /**
   * Record a fallback usage
   */
  record(entry: AuditEntry): void {
    this.entries.push(entry);

    // Keep only recent entries
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }
  }

  /**
   * Get audit trail entries
   */
  getEntries(limit: number = 100): AuditEntry[] {
    return this.entries.slice(-limit);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalEntries: number;
    cachedFallbacks: number;
    degradedFallbacks: number;
  } {
    return {
      totalEntries: this.entries.length,
      cachedFallbacks: this.entries.filter((e) => e.fallbackType === 'cached').length,
      degradedFallbacks: this.entries.filter((e) => e.fallbackType === 'degraded').length,
    };
  }

  /**
   * Clear the audit trail
   */
  clear(): void {
    this.entries = [];
  }
}

/**
 * Global audit trail instance
 */
const auditTrail = new AuditTrail();

/**
 * Record fallback usage in audit trail
 */
export function recordFallbackUsage(
  toolName: string,
  reason: string,
  fallbackType: 'cached' | 'degraded',
  executionId: string
): void {
  auditTrail.record({
    timestamp: new Date().toISOString(),
    toolName,
    reason,
    fallbackType,
    executionId,
  });

  logger.info('Fallback usage recorded', {
    toolName,
    fallbackType,
    reason,
    executionId,
  });
}

/**
 * Get fallback audit trail
 */
export function getFallbackAuditTrail(limit?: number): AuditEntry[] {
  return auditTrail.getEntries(limit);
}

/**
 * Get fallback statistics
 */
export function getFallbackStats(): {
  cache: { size: number; maxSize: number };
  audit: {
    totalEntries: number;
    cachedFallbacks: number;
    degradedFallbacks: number;
  };
} {
  return {
    cache: fallbackCache.getStats(),
    audit: auditTrail.getStats(),
  };
}

/**
 * Clear all fallback data
 */
export function clearFallbackData(): void {
  fallbackCache.clear();
  auditTrail.clear();
  logger.info('Fallback data cleared');
}
