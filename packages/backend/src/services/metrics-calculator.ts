/**
 * Metrics Calculator Service
 * Calculates comparative metrics (averages, percentages) and generates insights comparing weeks
 */

import { Event, ActivityCategoryName } from '../models/event';
import { TimeAggregator, TimeAllocation } from './time-aggregator';

export interface ComparativeMetrics {
  averageTimePerCategory: Record<ActivityCategoryName, number>;
  familyMemberComparison: Record<string, Record<ActivityCategoryName, number>>;
  categoryTrends: Record<ActivityCategoryName, { current: number; previous: number; percentageChange: number }>;
}

export interface WeeklyInsight {
  title: string;
  description: string;
  type: 'positive' | 'warning' | 'neutral';
  metric: string;
  value: number;
}

export class MetricsCalculator {
  private timeAggregator: TimeAggregator;

  constructor() {
    this.timeAggregator = new TimeAggregator();
  }

  /**
   * Calculate average time per category across all family members
   * @param events - Array of events
   * @param startDate - Start date for calculation
   * @param endDate - End date for calculation
   * @returns Map of category to average hours
   */
  calculateAverageTimePerCategory(events: Event[], startDate: Date, endDate: Date): Record<ActivityCategoryName, number> {
    // Get unique family members
    const familyMembers = new Set(events.map((e) => e.familyMemberId));

    const categoryTotals = new Map<ActivityCategoryName, number>();
    const categoryMembers = new Map<ActivityCategoryName, number>();

    for (const memberId of familyMembers) {
      const memberResult = this.timeAggregator.aggregateTimeByCategory(events, memberId, startDate, endDate);

      for (const allocation of memberResult.allocations) {
        const existing = categoryTotals.get(allocation.category) || 0;
        const memberCount = categoryMembers.get(allocation.category) || 0;

        categoryTotals.set(allocation.category, existing + allocation.totalHours);
        categoryMembers.set(allocation.category, memberCount + 1);
      }
    }

    const averages: Record<ActivityCategoryName, number> = {} as Record<ActivityCategoryName, number>;

    for (const [category, total] of categoryTotals.entries()) {
      const memberCount = categoryMembers.get(category) || 1;
      averages[category] = Math.round((total / memberCount) * 100) / 100;
    }

    return averages;
  }

  /**
   * Calculate time allocation for each family member
   * @param events - Array of events
   * @param startDate - Start date for calculation
   * @param endDate - End date for calculation
   * @returns Map of family member ID to category allocations
   */
  calculateFamilyMemberComparison(
    events: Event[],
    startDate: Date,
    endDate: Date
  ): Record<string, Record<ActivityCategoryName, number>> {
    const familyMembers = new Set(events.map((e) => e.familyMemberId));
    const comparison: Record<string, Record<ActivityCategoryName, number>> = {};

    for (const memberId of familyMembers) {
      const memberResult = this.timeAggregator.aggregateTimeByCategory(events, memberId, startDate, endDate);
      const memberAllocations: Record<ActivityCategoryName, number> = {} as Record<ActivityCategoryName, number>;

      for (const allocation of memberResult.allocations) {
        memberAllocations[allocation.category] = allocation.totalHours;
      }

      comparison[memberId] = memberAllocations;
    }

    return comparison;
  }

  /**
   * Calculate category trends comparing current week to previous week
   * @param currentWeekEvents - Events from current week
   * @param previousWeekEvents - Events from previous week
   * @param currentStartDate - Current week start date
   * @param currentEndDate - Current week end date
   * @param previousStartDate - Previous week start date
   * @param previousEndDate - Previous week end date
   * @returns Trends for each category
   */
  calculateCategoryTrends(
    currentWeekEvents: Event[],
    previousWeekEvents: Event[],
    currentStartDate: Date,
    currentEndDate: Date,
    previousStartDate: Date,
    previousEndDate: Date
  ): Record<ActivityCategoryName, { current: number; previous: number; percentageChange: number }> {
    const currentResult = this.timeAggregator.aggregateTimeByCategory(
      currentWeekEvents,
      undefined,
      currentStartDate,
      currentEndDate
    );

    const previousResult = this.timeAggregator.aggregateTimeByCategory(
      previousWeekEvents,
      undefined,
      previousStartDate,
      previousEndDate
    );

    const trends: Record<ActivityCategoryName, { current: number; previous: number; percentageChange: number }> = {} as Record<
      ActivityCategoryName,
      { current: number; previous: number; percentageChange: number }
    >;

    // Get all categories from both weeks
    const allCategories = new Set<ActivityCategoryName>();
    currentResult.allocations.forEach((a) => allCategories.add(a.category));
    previousResult.allocations.forEach((a) => allCategories.add(a.category));

    for (const category of allCategories) {
      const currentAllocation = currentResult.allocations.find((a) => a.category === category);
      const previousAllocation = previousResult.allocations.find((a) => a.category === category);

      const currentHours = currentAllocation?.totalHours || 0;
      const previousHours = previousAllocation?.totalHours || 0;

      let percentageChange = 0;
      if (previousHours > 0) {
        percentageChange = Math.round(((currentHours - previousHours) / previousHours) * 10000) / 100;
      } else if (currentHours > 0) {
        percentageChange = 100; // Went from 0 to something
      }

      trends[category] = {
        current: currentHours,
        previous: previousHours,
        percentageChange,
      };
    }

    return trends;
  }

  /**
   * Generate insights comparing current week to previous week
   * @param currentWeekEvents - Events from current week
   * @param previousWeekEvents - Events from previous week
   * @param currentStartDate - Current week start date
   * @param currentEndDate - Current week end date
   * @param previousStartDate - Previous week start date
   * @param previousEndDate - Previous week end date
   * @returns Array of insights
   */
  generateWeeklyInsights(
    currentWeekEvents: Event[],
    previousWeekEvents: Event[],
    currentStartDate: Date,
    currentEndDate: Date,
    previousStartDate: Date,
    previousEndDate: Date
  ): WeeklyInsight[] {
    const insights: WeeklyInsight[] = [];

    const trends = this.calculateCategoryTrends(
      currentWeekEvents,
      previousWeekEvents,
      currentStartDate,
      currentEndDate,
      previousStartDate,
      previousEndDate
    );

    // Analyze trends and generate insights
    for (const [category, trend] of Object.entries(trends)) {
      if (trend.percentageChange > 20) {
        insights.push({
          title: `${category} increased`,
          description: `Time spent on ${category} increased by ${trend.percentageChange}% compared to last week`,
          type: 'positive',
          metric: category,
          value: trend.percentageChange,
        });
      } else if (trend.percentageChange < -20) {
        insights.push({
          title: `${category} decreased`,
          description: `Time spent on ${category} decreased by ${Math.abs(trend.percentageChange)}% compared to last week`,
          type: 'warning',
          metric: category,
          value: trend.percentageChange,
        });
      }
    }

    // Calculate total hours comparison
    const currentTotal = Object.values(trends).reduce((sum, t) => sum + t.current, 0);
    const previousTotal = Object.values(trends).reduce((sum, t) => sum + t.previous, 0);

    if (previousTotal > 0) {
      const totalChange = Math.round(((currentTotal - previousTotal) / previousTotal) * 10000) / 100;
      if (Math.abs(totalChange) > 5) {
        insights.push({
          title: totalChange > 0 ? 'More active week' : 'Less active week',
          description: `Total scheduled time ${totalChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(totalChange)}% compared to last week`,
          type: totalChange > 0 ? 'positive' : 'neutral',
          metric: 'total_hours',
          value: totalChange,
        });
      }
    }

    return insights;
  }

  /**
   * Calculate comparative metrics for dashboard
   * @param events - Array of events
   * @param startDate - Start date for calculation
   * @param endDate - End date for calculation
   * @returns ComparativeMetrics object
   */
  calculateComparativeMetrics(events: Event[], startDate: Date, endDate: Date): ComparativeMetrics {
    const averageTimePerCategory = this.calculateAverageTimePerCategory(events, startDate, endDate);
    const familyMemberComparison = this.calculateFamilyMemberComparison(events, startDate, endDate);

    // For trends, we need previous week data - for now return empty trends
    const categoryTrends: Record<ActivityCategoryName, { current: number; previous: number; percentageChange: number }> = {} as Record<
      ActivityCategoryName,
      { current: number; previous: number; percentageChange: number }
    >;

    return {
      averageTimePerCategory,
      familyMemberComparison,
      categoryTrends,
    };
  }
}
