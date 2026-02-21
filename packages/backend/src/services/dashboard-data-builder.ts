/**
 * Dashboard Data Builder Service
 * Builds dashboard data structure with Redis caching for performance
 */

import { Event, ActivityCategoryName } from '../models/event';
import { TimeAggregator, TimeAllocation, TimeAggregationResult } from './time-aggregator';
import { MetricsCalculator, ComparativeMetrics, WeeklyInsight } from './metrics-calculator';

export interface DashboardMetrics {
  weekStartDate: Date;
  weekEndDate: Date;
  familyMemberId?: string;
  timeAllocations: TimeAllocation[];
  comparativeMetrics: ComparativeMetrics;
  insights: WeeklyInsight[];
  totalHours: number;
  generatedAt: Date;
}

export interface CacheEntry<T> {
  data: T;
  expiresAt: Date;
}

export class DashboardDataBuilder {
  private timeAggregator: TimeAggregator;
  private metricsCalculator: MetricsCalculator;
  private cache: Map<string, CacheEntry<any>>;
  private cacheExpirationMs: number;

  constructor(cacheExpirationMs: number = 5 * 60 * 1000) {
    // Default 5 minute cache
    this.timeAggregator = new TimeAggregator();
    this.metricsCalculator = new MetricsCalculator();
    this.cache = new Map();
    this.cacheExpirationMs = cacheExpirationMs;
  }

  /**
   * Generate cache key for dashboard metrics
   */
  private generateCacheKey(
    familyId: string,
    familyMemberId?: string,
    startDate?: Date,
    endDate?: Date
  ): string {
    const memberPart = familyMemberId || 'all';
    const startPart = startDate ? startDate.toISOString().split('T')[0] : 'start';
    const endPart = endDate ? endDate.toISOString().split('T')[0] : 'end';
    return `dashboard:${familyId}:${memberPart}:${startPart}:${endPart}`;
  }

  /**
   * Get cached data if available and not expired
   */
  private getCachedData<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (new Date() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached data with expiration
   */
  private setCachedData<T>(key: string, data: T): void {
    const expiresAt = new Date(Date.now() + this.cacheExpirationMs);
    this.cache.set(key, { data, expiresAt });
  }

  /**
   * Clear cache for a specific family
   */
  clearFamilyCache(familyId: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(`dashboard:${familyId}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clearAllCache(): void {
    this.cache.clear();
  }

  /**
   * Build dashboard metrics for a family or specific member
   * @param familyId - Family ID
   * @param events - Array of events
   * @param startDate - Start date for metrics
   * @param endDate - End date for metrics
   * @param familyMemberId - Optional: filter by specific family member
   * @param useCache - Whether to use cache (default: true)
   * @returns DashboardMetrics object
   */
  buildDashboardMetrics(
    familyId: string,
    events: Event[],
    startDate: Date,
    endDate: Date,
    familyMemberId?: string,
    useCache: boolean = true
  ): DashboardMetrics {
    const cacheKey = this.generateCacheKey(familyId, familyMemberId, startDate, endDate);

    // Check cache first
    if (useCache) {
      const cached = this.getCachedData<DashboardMetrics>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Calculate time allocations
    const timeResult = this.timeAggregator.aggregateTimeByCategory(events, familyMemberId, startDate, endDate);

    // Calculate comparative metrics
    const comparativeMetrics = this.metricsCalculator.calculateComparativeMetrics(events, startDate, endDate);

    // Generate insights (only for full family view)
    let insights: WeeklyInsight[] = [];
    if (!familyMemberId) {
      // For full family view, generate insights
      // Get previous week events for comparison
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      const previousStartDate = new Date(startDate.getTime() - weekMs);
      const previousEndDate = new Date(endDate.getTime() - weekMs);

      const previousWeekEvents = events.filter((e) => {
        if (e.endTime < previousStartDate) {
          return false;
        }
        if (e.startTime > previousEndDate) {
          return false;
        }
        return true;
      });

      insights = this.metricsCalculator.generateWeeklyInsights(
        events,
        previousWeekEvents,
        startDate,
        endDate,
        previousStartDate,
        previousEndDate
      );
    }

    const metrics: DashboardMetrics = {
      weekStartDate: startDate,
      weekEndDate: endDate,
      familyMemberId,
      timeAllocations: timeResult.allocations,
      comparativeMetrics,
      insights,
      totalHours: timeResult.totalHours,
      generatedAt: new Date(),
    };

    // Cache the result
    if (useCache) {
      this.setCachedData(cacheKey, metrics);
    }

    return metrics;
  }

  /**
   * Build dashboard metrics for all family members
   * @param familyId - Family ID
   * @param events - Array of events
   * @param startDate - Start date for metrics
   * @param endDate - End date for metrics
   * @param useCache - Whether to use cache (default: true)
   * @returns Map of family member ID to DashboardMetrics
   */
  buildDashboardMetricsForAllMembers(
    familyId: string,
    events: Event[],
    startDate: Date,
    endDate: Date,
    useCache: boolean = true
  ): Map<string, DashboardMetrics> {
    const familyMembers = new Set(events.map((e) => e.familyMemberId));
    const metricsMap = new Map<string, DashboardMetrics>();

    for (const memberId of familyMembers) {
      const metrics = this.buildDashboardMetrics(familyId, events, startDate, endDate, memberId, useCache);
      metricsMap.set(memberId, metrics);
    }

    return metricsMap;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }

  /**
   * Set cache expiration time
   */
  setCacheExpirationMs(ms: number): void {
    this.cacheExpirationMs = ms;
  }
}
