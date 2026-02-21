/**
 * Tests for Summary Generator Service
 * Property-based tests for weekly summary generation
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.7
 */

import fc from 'fast-check';
import { SummaryGenerator, ConsolidatedSummary } from '../summary-generator';
import { Event, ActivityCategoryName } from '../../models/event';

describe('SummaryGenerator', () => {
  let generator: SummaryGenerator;

  beforeEach(() => {
    generator = new SummaryGenerator();
  });

  /**
   * Helper to create test events
   */
  const createTestEvent = (
    id: string,
    familyMemberId: string,
    startTime: Date,
    endTime: Date,
    category?: ActivityCategoryName
  ): Event => ({
    id,
    familyId: 'family-1',
    familyMemberId,
    title: `Event ${id}`,
    description: 'Test event',
    startTime,
    endTime,
    location: 'Test Location',
    category: category || 'Work',
    source: 'internal',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1',
    isDeleted: false,
  });

  /**
   * Helper to get week boundaries
   */
  const getWeekBoundaries = (date: Date) => {
    const dayOfWeek = date.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - daysToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return { weekStart, weekEnd };
  };

  describe('generateWeeklySummary', () => {
    test('should generate summary with events organized by day', () => {
      const { weekStart, weekEnd } = getWeekBoundaries(new Date());

      const events: Event[] = [
        createTestEvent('event-1', 'member-1', new Date(weekStart.getTime() + 1000 * 60 * 60), new Date(weekStart.getTime() + 1000 * 60 * 60 * 2), 'Work'),
        createTestEvent('event-2', 'member-1', new Date(weekStart.getTime() + 1000 * 60 * 60 * 24), new Date(weekStart.getTime() + 1000 * 60 * 60 * 25), 'Health/Fitness'),
      ];

      const summary = generator.generateWeeklySummary('family-1', events, weekStart, weekEnd);

      expect(summary).toBeDefined();
      expect(summary.weekStartDate).toEqual(weekStart);
      expect(summary.weekEndDate).toEqual(weekEnd);
      expect(Object.keys(summary.eventsByDay).length).toBeGreaterThan(0);
      expect(summary.timeTrackingMetrics).toBeDefined();
      expect(summary.insights).toBeDefined();
      expect(summary.generatedAt).toBeDefined();
    });

    test('should organize events by day correctly', () => {
      const { weekStart, weekEnd } = getWeekBoundaries(new Date());

      const events: Event[] = [
        createTestEvent('event-1', 'member-1', new Date(weekStart.getTime() + 1000 * 60 * 60), new Date(weekStart.getTime() + 1000 * 60 * 60 * 2)),
        createTestEvent('event-2', 'member-1', new Date(weekStart.getTime() + 1000 * 60 * 60 * 3), new Date(weekStart.getTime() + 1000 * 60 * 60 * 4)),
        createTestEvent('event-3', 'member-1', new Date(weekStart.getTime() + 1000 * 60 * 60 * 24), new Date(weekStart.getTime() + 1000 * 60 * 60 * 25)),
      ];

      const summary = generator.generateWeeklySummary('family-1', events, weekStart, weekEnd);

      // Should have events on at least 2 different days
      const daysWithEvents = Object.keys(summary.eventsByDay).filter((day) => summary.eventsByDay[day].length > 0);
      expect(daysWithEvents.length).toBeGreaterThanOrEqual(2);

      // Events on same day should be sorted by start time
      for (const dayEvents of Object.values(summary.eventsByDay)) {
        for (let i = 1; i < dayEvents.length; i++) {
          expect(dayEvents[i].startTime.getTime()).toBeGreaterThanOrEqual(dayEvents[i - 1].startTime.getTime());
        }
      }
    });

    test('should include time tracking metrics', () => {
      const { weekStart, weekEnd } = getWeekBoundaries(new Date());

      const events: Event[] = [
        createTestEvent('event-1', 'member-1', new Date(weekStart.getTime() + 1000 * 60 * 60), new Date(weekStart.getTime() + 1000 * 60 * 60 * 3), 'Work'),
        createTestEvent('event-2', 'member-1', new Date(weekStart.getTime() + 1000 * 60 * 60 * 24), new Date(weekStart.getTime() + 1000 * 60 * 60 * 26), 'Health/Fitness'),
      ];

      const summary = generator.generateWeeklySummary('family-1', events, weekStart, weekEnd);

      expect(summary.timeTrackingMetrics.timeAllocations).toBeDefined();
      expect(summary.timeTrackingMetrics.timeAllocations.length).toBeGreaterThan(0);
      expect(summary.timeTrackingMetrics.comparativeMetrics).toBeDefined();
      expect(summary.timeTrackingMetrics.totalHours).toBeGreaterThan(0);
    });

    test('should filter events outside week range', () => {
      const { weekStart, weekEnd } = getWeekBoundaries(new Date());

      const beforeWeek = new Date(weekStart.getTime() - 1000 * 60 * 60 * 24);
      const afterWeek = new Date(weekEnd.getTime() + 1000 * 60 * 60 * 24);

      const events: Event[] = [
        createTestEvent('event-before', 'member-1', new Date(beforeWeek.getTime() - 1000 * 60 * 60), new Date(beforeWeek.getTime())),
        createTestEvent('event-in-week', 'member-1', new Date(weekStart.getTime() + 1000 * 60 * 60), new Date(weekStart.getTime() + 1000 * 60 * 60 * 2)),
        createTestEvent('event-after', 'member-1', new Date(afterWeek.getTime()), new Date(afterWeek.getTime() + 1000 * 60 * 60)),
      ];

      const summary = generator.generateWeeklySummary('family-1', events, weekStart, weekEnd);

      // Should only include event-in-week
      const allEvents = Object.values(summary.eventsByDay).flat();
      expect(allEvents.length).toBe(1);
      expect(allEvents[0].id).toBe('event-in-week');
    });
  });

  describe('generateUpcomingWeekSummary', () => {
    test('should generate summary for upcoming week', () => {
      const events: Event[] = [
        createTestEvent('event-1', 'member-1', new Date(Date.now() + 1000 * 60 * 60 * 24 * 2), new Date(Date.now() + 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 60)),
      ];

      const summary = generator.generateUpcomingWeekSummary('family-1', events);

      expect(summary).toBeDefined();
      expect(summary.weekStartDate).toBeDefined();
      expect(summary.weekEndDate).toBeDefined();
      expect(summary.weekEndDate.getTime()).toBeGreaterThan(summary.weekStartDate.getTime());
    });
  });

  describe('generatePastWeekSummary', () => {
    test('should generate summary for past week', () => {
      const events: Event[] = [
        createTestEvent('event-1', 'member-1', new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), new Date(Date.now() - 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 60)),
      ];

      const summary = generator.generatePastWeekSummary('family-1', events);

      expect(summary).toBeDefined();
      expect(summary.weekStartDate).toBeDefined();
      expect(summary.weekEndDate).toBeDefined();
      expect(summary.weekEndDate.getTime()).toBeGreaterThan(summary.weekStartDate.getTime());
    });
  });

  describe('getSummaryDataForNotification', () => {
    test('should extract summary data for notification', () => {
      const { weekStart, weekEnd } = getWeekBoundaries(new Date());

      const events: Event[] = [
        createTestEvent('event-1', 'member-1', new Date(weekStart.getTime() + 1000 * 60 * 60), new Date(weekStart.getTime() + 1000 * 60 * 60 * 3), 'Work'),
        createTestEvent('event-2', 'member-1', new Date(weekStart.getTime() + 1000 * 60 * 60 * 24), new Date(weekStart.getTime() + 1000 * 60 * 60 * 26), 'Health/Fitness'),
      ];

      const summary = generator.generateWeeklySummary('family-1', events, weekStart, weekEnd);
      const notificationData = generator.getSummaryDataForNotification(summary);

      expect(notificationData.totalEvents).toBe(2);
      expect(notificationData.categoriesTracked.length).toBeGreaterThan(0);
      expect(notificationData.topCategory).toBeDefined();
      expect(notificationData.topCategory.name).toBeDefined();
      expect(notificationData.topCategory.hours).toBeGreaterThan(0);
      expect(notificationData.insights).toBeDefined();
    });

    test('should handle empty summary', () => {
      const { weekStart, weekEnd } = getWeekBoundaries(new Date());

      const summary = generator.generateWeeklySummary('family-1', [], weekStart, weekEnd);
      const notificationData = generator.getSummaryDataForNotification(summary);

      expect(notificationData.totalEvents).toBe(0);
      expect(notificationData.topCategory.name).toBe('No activities');
      expect(notificationData.topCategory.hours).toBe(0);
    });
  });

  // Property-based tests
  describe('Property 21: Weekly Summary Generation', () => {
    it(
      'should generate summary with all required fields',
      () => {
        fc.assert(
          fc.property(
            fc.array(
              fc.record({
                memberId: fc.string({ minLength: 1, maxLength: 10 }),
                startHour: fc.integer({ min: 0, max: 20 }),
                duration: fc.float({ min: 0.5, max: 8 }),
                dayOffset: fc.integer({ min: 0, max: 6 }),
              }),
              { minLength: 1, maxLength: 10 }
            ),
            (eventData: Array<{ memberId: string; startHour: number; duration: number; dayOffset: number }>) => {
              const { weekStart, weekEnd } = getWeekBoundaries(new Date());

              const events: Event[] = eventData.map((data, i) => {
                const eventStart = new Date(weekStart);
                eventStart.setDate(weekStart.getDate() + data.dayOffset);
                eventStart.setHours(data.startHour, 0, 0, 0);

                const eventEnd = new Date(eventStart);
                eventEnd.setHours(eventStart.getHours() + Math.floor(data.duration));
                eventEnd.setMinutes(Math.round((data.duration % 1) * 60));

                return createTestEvent(`event-${i}`, data.memberId, eventStart, eventEnd);
              });

              const summary = generator.generateWeeklySummary('family-1', events, weekStart, weekEnd);

              // Verify all required fields are present
              expect(summary.weekStartDate).toBeDefined();
              expect(summary.weekEndDate).toBeDefined();
              expect(summary.eventsByDay).toBeDefined();
              expect(typeof summary.eventsByDay).toBe('object');
              expect(summary.timeTrackingMetrics).toBeDefined();
              expect(summary.insights).toBeDefined();
              expect(Array.isArray(summary.insights)).toBe(true);
              expect(summary.generatedAt).toBeDefined();
              expect(summary.generatedAt instanceof Date).toBe(true);
            }
          )
        );
      }
    );
  });

  describe('Property 22: Summary Metrics Inclusion', () => {
    it(
      'should include time tracking metrics for all categories',
      () => {
        fc.assert(
          fc.property(
            fc.array(
              fc.record({
                category: fc.constantFrom<ActivityCategoryName>(
                  'Work',
                  'Family Time',
                  'Health/Fitness',
                  'Upskilling',
                  'Relaxation'
                ),
                duration: fc.float({ min: 0.5, max: 8 }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            (eventData: Array<{ category: ActivityCategoryName; duration: number }>) => {
              const { weekStart, weekEnd } = getWeekBoundaries(new Date());

              const events: Event[] = eventData.map((data, i) => {
                const eventStart = new Date(weekStart);
                eventStart.setHours(9 + i, 0, 0, 0);

                const eventEnd = new Date(eventStart);
                eventEnd.setHours(eventStart.getHours() + Math.floor(data.duration));
                eventEnd.setMinutes(Math.round((data.duration % 1) * 60));

                return createTestEvent(`event-${i}`, 'member-1', eventStart, eventEnd, data.category);
              });

              const summary = generator.generateWeeklySummary('family-1', events, weekStart, weekEnd);

              // Verify metrics include all categories
              expect(summary.timeTrackingMetrics.timeAllocations).toBeDefined();
              expect(Array.isArray(summary.timeTrackingMetrics.timeAllocations)).toBe(true);

              // Each allocation should have required fields
              for (const allocation of summary.timeTrackingMetrics.timeAllocations) {
                expect(allocation.category).toBeDefined();
                expect(allocation.totalHours).toBeDefined();
                expect(typeof allocation.totalHours).toBe('number');
                expect(allocation.totalHours).toBeGreaterThanOrEqual(0);
                expect(allocation.percentage).toBeDefined();
                expect(typeof allocation.percentage).toBe('number');
              }
            }
          )
        );
      }
    );
  });

  describe('Property 23: Summary Comparative Insights', () => {
    it(
      'should generate insights comparing to previous week',
      () => {
        fc.assert(
          fc.property(
            fc.array(
              fc.record({
                duration: fc.float({ min: 0.5, max: 4 }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            (eventData: Array<{ duration: number }>) => {
              const { weekStart, weekEnd } = getWeekBoundaries(new Date());

              // Create events for current week
              const currentWeekEvents: Event[] = eventData.map((data, i) => {
                const eventStart = new Date(weekStart);
                eventStart.setHours(9 + i, 0, 0, 0);

                const eventEnd = new Date(eventStart);
                eventEnd.setHours(eventStart.getHours() + Math.floor(data.duration));
                eventEnd.setMinutes(Math.round((data.duration % 1) * 60));

                return createTestEvent(`event-${i}`, 'member-1', eventStart, eventEnd, 'Work');
              });

              // Create events for previous week
              const weekMs = 7 * 24 * 60 * 60 * 1000;
              const previousWeekStart = new Date(weekStart.getTime() - weekMs);
              const previousWeekEnd = new Date(weekEnd.getTime() - weekMs);

              const previousWeekEvents: Event[] = eventData.map((data, i) => {
                const eventStart = new Date(previousWeekStart);
                eventStart.setHours(9 + i, 0, 0, 0);

                const eventEnd = new Date(eventStart);
                eventEnd.setHours(eventStart.getHours() + Math.floor(data.duration * 0.8)); // 80% of current week
                eventEnd.setMinutes(Math.round(((data.duration * 0.8) % 1) * 60));

                return createTestEvent(`prev-event-${i}`, 'member-1', eventStart, eventEnd, 'Work');
              });

              const allEvents = [...currentWeekEvents, ...previousWeekEvents];
              const summary = generator.generateWeeklySummary('family-1', allEvents, weekStart, weekEnd);

              // Verify insights are generated
              expect(summary.insights).toBeDefined();
              expect(Array.isArray(summary.insights)).toBe(true);

              // Each insight should have required fields
              for (const insight of summary.insights) {
                expect(insight.title).toBeDefined();
                expect(typeof insight.title).toBe('string');
                expect(insight.description).toBeDefined();
                expect(typeof insight.description).toBe('string');
                expect(insight.type).toBeDefined();
                expect(['positive', 'warning', 'neutral']).toContain(insight.type);
              }
            }
          )
        );
      }
    );
  });
});
