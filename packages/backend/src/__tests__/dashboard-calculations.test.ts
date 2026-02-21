/**
 * Property-Based Tests for Dashboard Calculations
 * 
 * Feature: flo-family-calendar
 * Property 11: Dashboard Time Calculation
 * Property 12: Dashboard Filtering by Family Member
 * Property 13: Dashboard Date Range Filtering
 * Property 14: Comparative Metrics Accuracy
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5
 * 
 * These tests verify that dashboard calculations correctly aggregate time,
 * filter by family member and date range, and compute comparative metrics.
 */

import * as fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';
import { Event, ActivityCategoryName } from '../models/event';
import { TimeAggregator } from '../services/time-aggregator';
import { MetricsCalculator } from '../services/metrics-calculator';
import { DashboardDataBuilder } from '../services/dashboard-data-builder';

describe('Property 11: Dashboard Time Calculation', () => {
  let timeAggregator: TimeAggregator;

  beforeAll(() => {
    timeAggregator = new TimeAggregator();
  });

  // Arbitrary for activity categories
  const categoryArb = fc.oneof(
    fc.constant('Work' as ActivityCategoryName),
    fc.constant('Family Time' as ActivityCategoryName),
    fc.constant('Health/Fitness' as ActivityCategoryName),
    fc.constant('Upskilling' as ActivityCategoryName),
    fc.constant('Relaxation' as ActivityCategoryName)
  );

  // Arbitrary for event duration in hours (0.5 to 8 hours)
  const durationHoursArb = fc.float({ min: 0.5, max: 8, noNaN: true });

  // Helper to create test event
  const createTestEvent = (
    category: ActivityCategoryName,
    durationHours: number,
    familyMemberId: string = 'member-1',
    startDate: Date = new Date()
  ): Event => {
    const startTime = new Date(startDate);
    const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

    return {
      id: uuidv4(),
      familyId: 'test-family',
      familyMemberId,
      title: `Test Event - ${category}`,
      startTime,
      endTime,
      category,
      source: 'internal',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user',
      isDeleted: false,
    };
  };

  it('should correctly calculate total hours per category', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            category: categoryArb,
            duration: durationHoursArb,
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (eventSpecs) => {
          const events = eventSpecs.map((spec) => createTestEvent(spec.category, spec.duration));

          const result = timeAggregator.aggregateTimeByCategory(events);

          // Verify total hours is sum of all durations
          let expectedTotal = 0;
          for (const spec of eventSpecs) {
            expectedTotal += spec.duration;
          }

          expect(result.totalHours).toBeCloseTo(expectedTotal, 1);

          // Verify each category has correct hours
          for (const allocation of result.allocations) {
            const categoryEvents = eventSpecs.filter((s) => s.category === allocation.category);
            const expectedHours = categoryEvents.reduce((sum, e) => sum + e.duration, 0);
            expect(allocation.totalHours).toBeCloseTo(expectedHours, 1);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should correctly calculate percentages for each category', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            category: categoryArb,
            duration: durationHoursArb,
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (eventSpecs) => {
          fc.pre(eventSpecs.length > 0); // Ensure we have events
          
          const events = eventSpecs.map((spec) => createTestEvent(spec.category, spec.duration));

          const result = timeAggregator.aggregateTimeByCategory(events);

          // Skip if no allocations
          if (result.allocations.length === 0) {
            return;
          }

          // Verify percentages sum to 100 (or close to it)
          const totalPercentage = result.allocations.reduce((sum, a) => sum + a.percentage, 0);
          expect(totalPercentage).toBeCloseTo(100, 1);

          // Verify each percentage is correct (with tolerance for rounding)
          for (const allocation of result.allocations) {
            const expectedPercentage = (allocation.totalHours / result.totalHours) * 100;
            expect(allocation.percentage).toBeCloseTo(expectedPercentage, 0);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should correctly count events per category', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            category: categoryArb,
            duration: durationHoursArb,
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (eventSpecs) => {
          const events = eventSpecs.map((spec) => createTestEvent(spec.category, spec.duration));

          const result = timeAggregator.aggregateTimeByCategory(events);

          // Verify event counts
          for (const allocation of result.allocations) {
            const expectedCount = eventSpecs.filter((s) => s.category === allocation.category).length;
            expect(allocation.eventCount).toBe(expectedCount);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle events without categories', async () => {
    const events: Event[] = [
      createTestEvent('Work', 2),
      {
        ...createTestEvent('Family Time', 1),
        category: undefined,
      },
      createTestEvent('Health/Fitness', 1.5),
    ];

    const result = timeAggregator.aggregateTimeByCategory(events);

    // Should only count events with categories
    expect(result.totalHours).toBeCloseTo(3.5, 1);
    expect(result.allocations.length).toBe(2);
  });
});

describe('Property 12: Dashboard Filtering by Family Member', () => {
  let timeAggregator: TimeAggregator;

  beforeAll(() => {
    timeAggregator = new TimeAggregator();
  });

  const categoryArb = fc.oneof(
    fc.constant('Work' as ActivityCategoryName),
    fc.constant('Family Time' as ActivityCategoryName),
    fc.constant('Health/Fitness' as ActivityCategoryName),
    fc.constant('Upskilling' as ActivityCategoryName),
    fc.constant('Relaxation' as ActivityCategoryName)
  );

  const durationHoursArb = fc.float({ min: 0.5, max: 8, noNaN: true });

  const createTestEvent = (
    category: ActivityCategoryName,
    durationHours: number,
    familyMemberId: string,
    startDate: Date = new Date()
  ): Event => {
    const startTime = new Date(startDate);
    const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

    return {
      id: uuidv4(),
      familyId: 'test-family',
      familyMemberId,
      title: `Test Event - ${category}`,
      startTime,
      endTime,
      category,
      source: 'internal',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user',
      isDeleted: false,
    };
  };

  it('should filter events by family member correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            memberId: fc.oneof(fc.constant('member-1'), fc.constant('member-2'), fc.constant('member-3')),
            category: categoryArb,
            duration: durationHoursArb,
          }),
          { minLength: 1, maxLength: 15 }
        ),
        async (eventSpecs) => {
          const events = eventSpecs.map((spec) => createTestEvent(spec.category, spec.duration, spec.memberId));

          // Get unique member IDs
          const memberIds = new Set(eventSpecs.map((s) => s.memberId));

          for (const memberId of memberIds) {
            const result = timeAggregator.aggregateTimeByCategory(events, memberId);

            // Calculate expected total for this member
            const memberEvents = eventSpecs.filter((s) => s.memberId === memberId);
            const expectedTotal = memberEvents.reduce((sum, e) => sum + e.duration, 0);

            expect(result.totalHours).toBeCloseTo(expectedTotal, 1);
            expect(result.familyMemberId).toBe(memberId);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should return empty result when filtering for member with no events', async () => {
    const events = [
      createTestEvent('Work', 2, 'member-1'),
      createTestEvent('Family Time', 1, 'member-1'),
    ];

    const result = timeAggregator.aggregateTimeByCategory(events, 'member-2');

    expect(result.totalHours).toBe(0);
    expect(result.allocations.length).toBe(0);
  });
});

describe('Property 13: Dashboard Date Range Filtering', () => {
  let timeAggregator: TimeAggregator;

  beforeAll(() => {
    timeAggregator = new TimeAggregator();
  });

  const categoryArb = fc.oneof(
    fc.constant('Work' as ActivityCategoryName),
    fc.constant('Family Time' as ActivityCategoryName),
    fc.constant('Health/Fitness' as ActivityCategoryName),
    fc.constant('Upskilling' as ActivityCategoryName),
    fc.constant('Relaxation' as ActivityCategoryName)
  );

  const durationHoursArb = fc.float({ min: 0.5, max: 8, noNaN: true });

  const createTestEvent = (
    category: ActivityCategoryName,
    durationHours: number,
    startDate: Date
  ): Event => {
    const startTime = new Date(startDate);
    const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

    return {
      id: uuidv4(),
      familyId: 'test-family',
      familyMemberId: 'member-1',
      title: `Test Event - ${category}`,
      startTime,
      endTime,
      category,
      source: 'internal',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user',
      isDeleted: false,
    };
  };

  it('should filter events by date range correctly', async () => {
    const baseDate = new Date('2024-01-01');
    const events: Event[] = [];

    // Create events across multiple days
    for (let day = 0; day < 10; day++) {
      const eventDate = new Date(baseDate);
      eventDate.setDate(eventDate.getDate() + day);
      events.push(createTestEvent('Work', 2, eventDate));
    }

    // Filter for first 5 days
    const startDate = new Date(baseDate);
    const endDate = new Date(baseDate);
    endDate.setDate(endDate.getDate() + 4);
    endDate.setHours(23, 59, 59, 999);

    const result = timeAggregator.aggregateTimeByCategory(events, undefined, startDate, endDate);

    // Should include events from days 0-4 (5 events)
    expect(result.allocations[0]?.eventCount).toBe(5);
    expect(result.totalHours).toBeCloseTo(10, 1); // 5 events * 2 hours each
  });

  it('should exclude events outside date range', async () => {
    const baseDate = new Date('2024-01-01');
    const events: Event[] = [];

    // Create events across multiple days
    for (let day = 0; day < 10; day++) {
      const eventDate = new Date(baseDate);
      eventDate.setDate(eventDate.getDate() + day);
      events.push(createTestEvent('Work', 2, eventDate));
    }

    // Filter for days 5-7
    const startDate = new Date(baseDate);
    startDate.setDate(startDate.getDate() + 5);
    const endDate = new Date(baseDate);
    endDate.setDate(endDate.getDate() + 7);
    endDate.setHours(23, 59, 59, 999);

    const result = timeAggregator.aggregateTimeByCategory(events, undefined, startDate, endDate);

    // Should include events from days 5-7 (3 events)
    expect(result.allocations[0]?.eventCount).toBe(3);
    expect(result.totalHours).toBeCloseTo(6, 1); // 3 events * 2 hours each
  });
});

describe('Property 14: Comparative Metrics Accuracy', () => {
  let metricsCalculator: MetricsCalculator;

  beforeAll(() => {
    metricsCalculator = new MetricsCalculator();
  });

  const categoryArb = fc.oneof(
    fc.constant('Work' as ActivityCategoryName),
    fc.constant('Family Time' as ActivityCategoryName),
    fc.constant('Health/Fitness' as ActivityCategoryName),
    fc.constant('Upskilling' as ActivityCategoryName),
    fc.constant('Relaxation' as ActivityCategoryName)
  );

  const durationHoursArb = fc.float({ min: 0.5, max: 8, noNaN: true });

  const createTestEvent = (
    category: ActivityCategoryName,
    durationHours: number,
    memberId: string,
    startDate: Date = new Date()
  ): Event => {
    const startTime = new Date(startDate);
    const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

    return {
      id: uuidv4(),
      familyId: 'test-family',
      familyMemberId: memberId,
      title: `Test Event - ${category}`,
      startTime,
      endTime,
      category,
      source: 'internal',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user',
      isDeleted: false,
    };
  };

  it('should calculate average time per category across family members', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            memberId: fc.oneof(fc.constant('member-1'), fc.constant('member-2')),
            category: categoryArb,
            duration: durationHoursArb,
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (eventSpecs) => {
          const events = eventSpecs.map((spec) => createTestEvent(spec.category, spec.duration, spec.memberId));

          const startDate = new Date();
          const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

          const averages = metricsCalculator.calculateAverageTimePerCategory(events, startDate, endDate);

          // Verify averages are calculated correctly
          for (const [category, average] of Object.entries(averages)) {
            const categoryEvents = eventSpecs.filter((s) => s.category === category);
            if (categoryEvents.length > 0) {
              const totalHours = categoryEvents.reduce((sum, e) => sum + e.duration, 0);
              const memberCount = new Set(categoryEvents.map((e) => e.memberId)).size;
              const expectedAverage = totalHours / memberCount;

              expect(average).toBeCloseTo(expectedAverage, 1);
            }
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should calculate family member comparison correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            memberId: fc.oneof(fc.constant('member-1'), fc.constant('member-2'), fc.constant('member-3')),
            category: categoryArb,
            duration: durationHoursArb,
          }),
          { minLength: 3, maxLength: 15 }
        ),
        async (eventSpecs) => {
          const events = eventSpecs.map((spec) => createTestEvent(spec.category, spec.duration, spec.memberId));

          const startDate = new Date();
          const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

          const comparison = metricsCalculator.calculateFamilyMemberComparison(events, startDate, endDate);

          // Verify each member has correct allocations
          for (const [memberId, allocations] of Object.entries(comparison)) {
            const memberEvents = eventSpecs.filter((s) => s.memberId === memberId);

            for (const [category, hours] of Object.entries(allocations)) {
              const categoryEvents = memberEvents.filter((e) => e.category === category);
              const expectedHours = categoryEvents.reduce((sum, e) => sum + e.duration, 0);

              expect(hours).toBeCloseTo(expectedHours, 1);
            }
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});

describe('Dashboard Data Builder Integration', () => {
  let dashboardBuilder: DashboardDataBuilder;

  beforeAll(() => {
    dashboardBuilder = new DashboardDataBuilder(1000); // 1 second cache for testing
  });

  const categoryArb = fc.oneof(
    fc.constant('Work' as ActivityCategoryName),
    fc.constant('Family Time' as ActivityCategoryName),
    fc.constant('Health/Fitness' as ActivityCategoryName),
    fc.constant('Upskilling' as ActivityCategoryName),
    fc.constant('Relaxation' as ActivityCategoryName)
  );

  const durationHoursArb = fc.float({ min: 0.5, max: 8, noNaN: true });

  const createTestEvent = (
    category: ActivityCategoryName,
    durationHours: number,
    memberId: string = 'member-1',
    startDate: Date = new Date()
  ): Event => {
    const startTime = new Date(startDate);
    const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

    return {
      id: uuidv4(),
      familyId: 'test-family',
      familyMemberId: memberId,
      title: `Test Event - ${category}`,
      startTime,
      endTime,
      category,
      source: 'internal',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user',
      isDeleted: false,
    };
  };

  it('should build dashboard metrics with caching', async () => {
    const events = [
      createTestEvent('Work', 2),
      createTestEvent('Family Time', 1),
      createTestEvent('Health/Fitness', 1.5),
    ];

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    // First call - should compute
    const metrics1 = dashboardBuilder.buildDashboardMetrics('test-family', events, startDate, endDate);

    // Second call - should use cache
    const metrics2 = dashboardBuilder.buildDashboardMetrics('test-family', events, startDate, endDate);

    expect(metrics1.totalHours).toBeCloseTo(4.5, 1);
    expect(metrics2.totalHours).toBeCloseTo(4.5, 1);
    expect(metrics1.generatedAt.getTime()).toBe(metrics2.generatedAt.getTime());
  });

  it('should clear cache correctly', async () => {
    const events = [createTestEvent('Work', 2)];

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    dashboardBuilder.buildDashboardMetrics('test-family', events, startDate, endDate);

    const statsBefore = dashboardBuilder.getCacheStats();
    expect(statsBefore.size).toBeGreaterThan(0);

    dashboardBuilder.clearFamilyCache('test-family');

    const statsAfter = dashboardBuilder.getCacheStats();
    expect(statsAfter.size).toBe(0);
  });
});
