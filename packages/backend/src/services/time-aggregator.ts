/**
 * Time Aggregator Service
 * Calculates total hours per activity category with filtering by family member and date range
 */

import { Event, ActivityCategoryName } from '../models/event';

export interface TimeAllocation {
  category: ActivityCategoryName;
  totalHours: number;
  percentage: number;
  eventCount: number;
}

export interface TimeAggregationResult {
  familyMemberId?: string;
  startDate: Date;
  endDate: Date;
  allocations: TimeAllocation[];
  totalHours: number;
  generatedAt: Date;
}

export class TimeAggregator {
  /**
   * Calculate total hours per activity category for events
   * @param events - Array of events to aggregate
   * @param familyMemberId - Optional: filter by specific family member
   * @param startDate - Optional: filter events starting from this date
   * @param endDate - Optional: filter events ending before this date
   * @returns TimeAggregationResult with allocations per category
   */
  aggregateTimeByCategory(
    events: Event[],
    familyMemberId?: string,
    startDate?: Date,
    endDate?: Date
  ): TimeAggregationResult {
    // Filter events by family member if specified
    let filteredEvents = events;
    if (familyMemberId) {
      filteredEvents = filteredEvents.filter((e) => e.familyMemberId === familyMemberId);
    }

    // Filter events by date range if specified
    if (startDate || endDate) {
      filteredEvents = filteredEvents.filter((e) => {
        if (startDate && e.endTime < startDate) {
          return false;
        }
        if (endDate && e.startTime > endDate) {
          return false;
        }
        return true;
      });
    }

    // Calculate hours per category
    const categoryMap = new Map<ActivityCategoryName, { hours: number; count: number }>();

    for (const event of filteredEvents) {
      // Skip events without a category
      if (!event.category) {
        continue;
      }

      const durationMs = event.endTime.getTime() - event.startTime.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);

      const existing = categoryMap.get(event.category) || { hours: 0, count: 0 };
      categoryMap.set(event.category, {
        hours: existing.hours + durationHours,
        count: existing.count + 1,
      });
    }

    // Calculate total hours
    let totalHours = 0;
    for (const { hours } of categoryMap.values()) {
      totalHours += hours;
    }

    // Build allocations array with percentages
    const allocations: TimeAllocation[] = Array.from(categoryMap.entries()).map(([category, { hours, count }]) => ({
      category,
      totalHours: Math.round(hours * 100) / 100, // Round to 2 decimal places
      percentage: totalHours > 0 ? Math.round((hours / totalHours) * 10000) / 100 : 0, // Round to 2 decimal places
      eventCount: count,
    }));

    // Sort by total hours descending
    allocations.sort((a, b) => b.totalHours - a.totalHours);

    return {
      familyMemberId,
      startDate: startDate || new Date(0),
      endDate: endDate || new Date(),
      allocations,
      totalHours: Math.round(totalHours * 100) / 100,
      generatedAt: new Date(),
    };
  }

  /**
   * Calculate hours for a specific category
   * @param events - Array of events to search
   * @param category - Category to calculate hours for
   * @param familyMemberId - Optional: filter by specific family member
   * @param startDate - Optional: filter events starting from this date
   * @param endDate - Optional: filter events ending before this date
   * @returns Total hours for the category
   */
  calculateCategoryHours(
    events: Event[],
    category: ActivityCategoryName,
    familyMemberId?: string,
    startDate?: Date,
    endDate?: Date
  ): number {
    let filteredEvents = events.filter((e) => e.category === category);

    if (familyMemberId) {
      filteredEvents = filteredEvents.filter((e) => e.familyMemberId === familyMemberId);
    }

    if (startDate || endDate) {
      filteredEvents = filteredEvents.filter((e) => {
        if (startDate && e.endTime < startDate) {
          return false;
        }
        if (endDate && e.startTime > endDate) {
          return false;
        }
        return true;
      });
    }

    let totalHours = 0;
    for (const event of filteredEvents) {
      const durationMs = event.endTime.getTime() - event.startTime.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      totalHours += durationHours;
    }

    return Math.round(totalHours * 100) / 100;
  }

  /**
   * Get event count per category
   * @param events - Array of events to count
   * @param familyMemberId - Optional: filter by specific family member
   * @param startDate - Optional: filter events starting from this date
   * @param endDate - Optional: filter events ending before this date
   * @returns Map of category to event count
   */
  getEventCountPerCategory(
    events: Event[],
    familyMemberId?: string,
    startDate?: Date,
    endDate?: Date
  ): Map<ActivityCategoryName, number> {
    let filteredEvents = events;

    if (familyMemberId) {
      filteredEvents = filteredEvents.filter((e) => e.familyMemberId === familyMemberId);
    }

    if (startDate || endDate) {
      filteredEvents = filteredEvents.filter((e) => {
        if (startDate && e.endTime < startDate) {
          return false;
        }
        if (endDate && e.startTime > endDate) {
          return false;
        }
        return true;
      });
    }

    const countMap = new Map<ActivityCategoryName, number>();

    for (const event of filteredEvents) {
      if (!event.category) {
        continue;
      }

      const existing = countMap.get(event.category) || 0;
      countMap.set(event.category, existing + 1);
    }

    return countMap;
  }
}
