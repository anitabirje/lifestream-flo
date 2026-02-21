/**
 * Summary Generator Service
 * Generates consolidated weekly summaries with events by day and time tracking metrics
 */

import { Event, ActivityCategoryName } from '../models/event';
import { DashboardDataBuilder, DashboardMetrics } from './dashboard-data-builder';
import { MetricsCalculator, WeeklyInsight } from './metrics-calculator';

export interface EventsByDay {
  [date: string]: Event[]; // Format: YYYY-MM-DD
}

export interface ConsolidatedSummary {
  weekStartDate: Date;
  weekEndDate: Date;
  eventsByDay: EventsByDay;
  timeTrackingMetrics: DashboardMetrics;
  insights: WeeklyInsight[];
  generatedAt: Date;
}

export class SummaryGenerator {
  private dashboardDataBuilder: DashboardDataBuilder;
  private metricsCalculator: MetricsCalculator;

  constructor() {
    this.dashboardDataBuilder = new DashboardDataBuilder();
    this.metricsCalculator = new MetricsCalculator();
  }

  /**
   * Format date to YYYY-MM-DD string
   */
  private formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Organize events by day
   */
  private organizeEventsByDay(events: Event[]): EventsByDay {
    const eventsByDay: EventsByDay = {};

    for (const event of events) {
      const dateKey = this.formatDateKey(event.startTime);
      if (!eventsByDay[dateKey]) {
        eventsByDay[dateKey] = [];
      }
      eventsByDay[dateKey].push(event);
    }

    // Sort events within each day by start time
    for (const dateKey in eventsByDay) {
      eventsByDay[dateKey].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    }

    return eventsByDay;
  }

  /**
   * Generate consolidated summary for a week
   * @param familyId - Family ID
   * @param events - Array of events for the week
   * @param weekStartDate - Start date of the week (Monday)
   * @param weekEndDate - End date of the week (Sunday)
   * @returns ConsolidatedSummary object
   */
  generateWeeklySummary(
    familyId: string,
    events: Event[],
    weekStartDate: Date,
    weekEndDate: Date
  ): ConsolidatedSummary {
    // Filter events within the week range
    const weekEvents = events.filter((event) => {
      return event.startTime >= weekStartDate && event.endTime <= weekEndDate;
    });

    // Organize events by day
    const eventsByDay = this.organizeEventsByDay(weekEvents);

    // Build dashboard metrics for the week
    const timeTrackingMetrics = this.dashboardDataBuilder.buildDashboardMetrics(
      familyId,
      weekEvents,
      weekStartDate,
      weekEndDate,
      undefined, // No specific family member filter
      false // Don't use cache for summary generation
    );

    // Generate insights comparing to previous week
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const previousStartDate = new Date(weekStartDate.getTime() - weekMs);
    const previousEndDate = new Date(weekEndDate.getTime() - weekMs);

    const previousWeekEvents = events.filter((event) => {
      return event.startTime >= previousStartDate && event.endTime <= previousEndDate;
    });

    const insights = this.metricsCalculator.generateWeeklyInsights(
      weekEvents,
      previousWeekEvents,
      weekStartDate,
      weekEndDate,
      previousStartDate,
      previousEndDate
    );

    return {
      weekStartDate,
      weekEndDate,
      eventsByDay,
      timeTrackingMetrics,
      insights,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate summary for upcoming week (for Sunday 6 PM distribution)
   * @param familyId - Family ID
   * @param events - Array of all events
   * @returns ConsolidatedSummary for the upcoming week
   */
  generateUpcomingWeekSummary(familyId: string, events: Event[]): ConsolidatedSummary {
    // Calculate upcoming week (Monday to Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // 0 = Sunday, 1 = Monday

    const weekStartDate = new Date(today);
    weekStartDate.setDate(today.getDate() + daysUntilMonday);
    weekStartDate.setHours(0, 0, 0, 0);

    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);
    weekEndDate.setHours(23, 59, 59, 999);

    return this.generateWeeklySummary(familyId, events, weekStartDate, weekEndDate);
  }

  /**
   * Generate summary for past week (for analytics)
   * @param familyId - Family ID
   * @param events - Array of all events
   * @returns ConsolidatedSummary for the past week
   */
  generatePastWeekSummary(familyId: string, events: Event[]): ConsolidatedSummary {
    // Calculate past week (Monday to Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToLastMonday = dayOfWeek === 0 ? 7 : dayOfWeek;

    const weekEndDate = new Date(today);
    weekEndDate.setDate(today.getDate() - (daysToLastMonday - 6));
    weekEndDate.setHours(23, 59, 59, 999);

    const weekStartDate = new Date(weekEndDate);
    weekStartDate.setDate(weekEndDate.getDate() - 6);
    weekStartDate.setHours(0, 0, 0, 0);

    return this.generateWeeklySummary(familyId, events, weekStartDate, weekEndDate);
  }

  /**
   * Get summary data for notification
   * @param summary - ConsolidatedSummary object
   * @returns Object with summary data for notification
   */
  getSummaryDataForNotification(summary: ConsolidatedSummary): {
    totalEvents: number;
    categoriesTracked: string[];
    topCategory: { name: string; hours: number };
    insights: string[];
  } {
    const totalEvents = Object.values(summary.eventsByDay).reduce((sum, events) => sum + events.length, 0);

    // Get unique categories from time tracking metrics
    const categoriesTracked = summary.timeTrackingMetrics.timeAllocations
      .filter((allocation) => allocation.totalHours > 0)
      .map((allocation) => allocation.category);

    // Find top category
    let topCategory = { name: 'No activities', hours: 0 };
    if (summary.timeTrackingMetrics.timeAllocations.length > 0) {
      const sorted = [...summary.timeTrackingMetrics.timeAllocations].sort(
        (a, b) => b.totalHours - a.totalHours
      );
      topCategory = {
        name: sorted[0].category,
        hours: sorted[0].totalHours,
      };
    }

    // Format insights
    const insightStrings = summary.insights.map((insight) => insight.description);

    return {
      totalEvents,
      categoriesTracked,
      topCategory,
      insights: insightStrings,
    };
  }
}
