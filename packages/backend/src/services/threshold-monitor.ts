/**
 * Threshold Monitor Service
 * Monitors time against configured thresholds and detects violations
 */

import { Event } from '../models/event';
import { ActivityThreshold } from '../models/activity-threshold';
import { TimeAggregator } from './time-aggregator';

export interface ThresholdViolation {
  type: 'max_exceeded' | 'min_not_met';
  thresholdId: string;
  categoryId: string;
  categoryName: string;
  familyMemberId: string;
  currentHours: number;
  thresholdHours: number;
  violationTime: Date;
}

export interface ThresholdCheckResult {
  maxViolations: ThresholdViolation[];
  minViolations: ThresholdViolation[];
  allViolations: ThresholdViolation[];
}

export class ThresholdMonitor {
  private timeAggregator: TimeAggregator;

  constructor() {
    this.timeAggregator = new TimeAggregator();
  }

  /**
   * Check for maximum threshold violations in real-time
   * @param events - Array of events to check
   * @param thresholds - Array of thresholds to check against
   * @param familyMemberId - Family member to check violations for
   * @param startDate - Start of time period to check
   * @param endDate - End of time period to check
   * @returns Array of max threshold violations
   */
  checkMaxThresholdViolations(
    events: Event[],
    thresholds: ActivityThreshold[],
    familyMemberId: string,
    startDate: Date,
    endDate: Date
  ): ThresholdViolation[] {
    const violations: ThresholdViolation[] = [];

    for (const threshold of thresholds) {
      // Skip if max threshold not set or threshold is disabled
      if (threshold.maxHours === undefined || !threshold.enabled) {
        continue;
      }

      // Calculate current hours for this category
      const currentHours = this.timeAggregator.calculateCategoryHours(
        events,
        threshold.categoryName as any,
        familyMemberId,
        startDate,
        endDate
      );

      // Check if violation occurred
      if (currentHours > threshold.maxHours) {
        violations.push({
          type: 'max_exceeded',
          thresholdId: threshold.id,
          categoryId: threshold.categoryId,
          categoryName: threshold.categoryName,
          familyMemberId,
          currentHours,
          thresholdHours: threshold.maxHours,
          violationTime: new Date(),
        });
      }
    }

    return violations;
  }

  /**
   * Check for minimum threshold violations at end of week
   * @param events - Array of events to check
   * @param thresholds - Array of thresholds to check against
   * @param familyMemberId - Family member to check violations for
   * @param weekStartDate - Start of the week (Monday)
   * @param weekEndDate - End of the week (Sunday)
   * @returns Array of min threshold violations
   */
  checkMinThresholdViolations(
    events: Event[],
    thresholds: ActivityThreshold[],
    familyMemberId: string,
    weekStartDate: Date,
    weekEndDate: Date
  ): ThresholdViolation[] {
    const violations: ThresholdViolation[] = [];

    for (const threshold of thresholds) {
      // Skip if min threshold not set or threshold is disabled
      if (threshold.minHours === undefined || !threshold.enabled) {
        continue;
      }

      // Calculate current hours for this category
      const currentHours = this.timeAggregator.calculateCategoryHours(
        events,
        threshold.categoryName as any,
        familyMemberId,
        weekStartDate,
        weekEndDate
      );

      // Check if violation occurred
      if (currentHours < threshold.minHours) {
        violations.push({
          type: 'min_not_met',
          thresholdId: threshold.id,
          categoryId: threshold.categoryId,
          categoryName: threshold.categoryName,
          familyMemberId,
          currentHours,
          thresholdHours: threshold.minHours,
          violationTime: new Date(),
        });
      }
    }

    return violations;
  }

  /**
   * Check all thresholds for a family member
   * @param events - Array of events to check
   * @param thresholds - Array of thresholds to check against
   * @param familyMemberId - Family member to check violations for
   * @param startDate - Start of time period to check
   * @param endDate - End of time period to check
   * @returns ThresholdCheckResult with all violations
   */
  checkAllThresholds(
    events: Event[],
    thresholds: ActivityThreshold[],
    familyMemberId: string,
    startDate: Date,
    endDate: Date
  ): ThresholdCheckResult {
    const maxViolations = this.checkMaxThresholdViolations(events, thresholds, familyMemberId, startDate, endDate);
    const minViolations = this.checkMinThresholdViolations(events, thresholds, familyMemberId, startDate, endDate);

    return {
      maxViolations,
      minViolations,
      allViolations: [...maxViolations, ...minViolations],
    };
  }

  /**
   * Check if a specific threshold is violated
   * @param events - Array of events to check
   * @param threshold - Threshold to check
   * @param familyMemberId - Family member to check
   * @param startDate - Start of time period
   * @param endDate - End of time period
   * @returns true if threshold is violated, false otherwise
   */
  isThresholdViolated(
    events: Event[],
    threshold: ActivityThreshold,
    familyMemberId: string,
    startDate: Date,
    endDate: Date
  ): boolean {
    if (!threshold.enabled) {
      return false;
    }

    const currentHours = this.timeAggregator.calculateCategoryHours(
      events,
      threshold.categoryName as any,
      familyMemberId,
      startDate,
      endDate
    );

    // Check max threshold
    if (threshold.maxHours !== undefined && currentHours > threshold.maxHours) {
      return true;
    }

    // Check min threshold
    if (threshold.minHours !== undefined && currentHours < threshold.minHours) {
      return true;
    }

    return false;
  }

  /**
   * Get current hours for a category
   * @param events - Array of events
   * @param categoryName - Category name
   * @param familyMemberId - Family member ID
   * @param startDate - Start of time period
   * @param endDate - End of time period
   * @returns Current hours for the category
   */
  getCurrentHours(
    events: Event[],
    categoryName: string,
    familyMemberId: string,
    startDate: Date,
    endDate: Date
  ): number {
    return this.timeAggregator.calculateCategoryHours(events, categoryName as any, familyMemberId, startDate, endDate);
  }

  /**
   * Get percentage of threshold used
   * @param currentHours - Current hours
   * @param thresholdHours - Threshold hours
   * @returns Percentage (0-100+)
   */
  getThresholdPercentage(currentHours: number, thresholdHours: number): number {
    if (thresholdHours === 0) {
      return currentHours > 0 ? 100 : 0;
    }
    return Math.round((currentHours / thresholdHours) * 10000) / 100;
  }
}
