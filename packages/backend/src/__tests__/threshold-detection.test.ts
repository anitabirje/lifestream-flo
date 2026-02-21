/**
 * Property-Based Tests for Threshold Detection
 * 
 * Feature: flo-family-calendar
 * Property 16: Maximum Threshold Violation Detection
 * Property 17: Minimum Threshold Violation Detection
 * Validates: Requirements 5.1, 5.2, 5.3, 5a.1, 5a.2, 5a.3
 * 
 * These tests verify that the system correctly detects when time spent
 * on activities exceeds maximum thresholds or falls below minimum thresholds.
 */

import * as fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';
import { ThresholdMonitor } from '../services/threshold-monitor';
import { Event } from '../models/event';
import { ActivityThreshold } from '../models/activity-threshold';

describe('Property 16: Maximum Threshold Violation Detection', () => {
  let thresholdMonitor: ThresholdMonitor;

  beforeAll(() => {
    thresholdMonitor = new ThresholdMonitor();
  });

  // Arbitrary for category names
  const categoryNameArb = fc.oneof(
    fc.constant('Work'),
    fc.constant('Family Time'),
    fc.constant('Health/Fitness'),
    fc.constant('Upskilling'),
    fc.constant('Relaxation')
  );

  // Arbitrary for hours (0-168 per week)
  const hoursArb = fc.float({ min: 0, max: 168 });

  // Helper to create a test event
  const createEvent = (
    categoryName: string,
    durationHours: number,
    familyMemberId: string,
    startDate: Date
  ): Event => {
    const startTime = new Date(startDate);
    const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

    return {
      id: uuidv4(),
      familyId: 'test-family',
      familyMemberId,
      title: `Test Event - ${categoryName}`,
      description: 'Test event for threshold detection',
      startTime,
      endTime,
      location: 'Test Location',
      category: categoryName as any,
      source: 'internal',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user',
      isDeleted: false,
    };
  };

  // Helper to create a test threshold
  const createThreshold = (
    categoryName: string,
    maxHours?: number,
    minHours?: number
  ): ActivityThreshold => {
    return {
      id: uuidv4(),
      familyId: 'test-family',
      categoryId: `cat-${categoryName}`,
      categoryName,
      maxHours,
      minHours,
      notificationRecipients: ['member-1'],
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };

  it('should detect when time exceeds maximum threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryNameArb,
        hoursArb,
        async (categoryName, maxHours) => {
          fc.pre(maxHours > 0); // Ensure max threshold is positive

          const familyMemberId = 'test-member';
          const startDate = new Date('2024-01-01');
          const endDate = new Date('2024-01-07');

          // Create event that exceeds threshold
          const excessHours = maxHours + 5;
          const event = createEvent(categoryName, excessHours, familyMemberId, startDate);

          // Create threshold
          const threshold = createThreshold(categoryName, maxHours);

          // Check for violations
          const violations = thresholdMonitor.checkMaxThresholdViolations(
            [event],
            [threshold],
            familyMemberId,
            startDate,
            endDate
          );

          // Verify violation was detected
          expect(violations.length).toBe(1);
          expect(violations[0].type).toBe('max_exceeded');
          expect(violations[0].currentHours).toBeCloseTo(excessHours, 1);
          expect(violations[0].thresholdHours).toBe(maxHours);
          expect(violations[0].categoryName).toBe(categoryName);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should not detect violation when time is within maximum threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryNameArb,
        hoursArb,
        async (categoryName, maxHours) => {
          fc.pre(maxHours > 1); // Ensure max threshold is at least 1

          const familyMemberId = 'test-member';
          const startDate = new Date('2024-01-01');
          const endDate = new Date('2024-01-07');

          // Create event within threshold
          const eventHours = maxHours * 0.8; // 80% of threshold
          const event = createEvent(categoryName, eventHours, familyMemberId, startDate);

          // Create threshold
          const threshold = createThreshold(categoryName, maxHours);

          // Check for violations
          const violations = thresholdMonitor.checkMaxThresholdViolations(
            [event],
            [threshold],
            familyMemberId,
            startDate,
            endDate
          );

          // Verify no violation
          expect(violations.length).toBe(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should detect violation when time exactly equals maximum threshold plus 1 hour', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryNameArb,
        hoursArb,
        async (categoryName, maxHours) => {
          fc.pre(maxHours > 0 && maxHours < 167); // Ensure room for +1 hour

          const familyMemberId = 'test-member';
          const startDate = new Date('2024-01-01');
          const endDate = new Date('2024-01-07');

          // Create event that exceeds threshold by exactly 1 hour
          const eventHours = maxHours + 1;
          const event = createEvent(categoryName, eventHours, familyMemberId, startDate);

          // Create threshold
          const threshold = createThreshold(categoryName, maxHours);

          // Check for violations
          const violations = thresholdMonitor.checkMaxThresholdViolations(
            [event],
            [threshold],
            familyMemberId,
            startDate,
            endDate
          );

          // Verify violation was detected
          expect(violations.length).toBe(1);
          expect(violations[0].type).toBe('max_exceeded');
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should not detect violation when threshold is disabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryNameArb,
        hoursArb,
        async (categoryName, maxHours) => {
          fc.pre(maxHours > 0);

          const familyMemberId = 'test-member';
          const startDate = new Date('2024-01-01');
          const endDate = new Date('2024-01-07');

          // Create event that exceeds threshold
          const excessHours = maxHours + 5;
          const event = createEvent(categoryName, excessHours, familyMemberId, startDate);

          // Create disabled threshold
          const threshold = createThreshold(categoryName, maxHours);
          threshold.enabled = false;

          // Check for violations
          const violations = thresholdMonitor.checkMaxThresholdViolations(
            [event],
            [threshold],
            familyMemberId,
            startDate,
            endDate
          );

          // Verify no violation detected (threshold is disabled)
          expect(violations.length).toBe(0);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should handle multiple events for same category', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryNameArb,
        hoursArb,
        fc.integer({ min: 1, max: 5 }),
        async (categoryName, maxHours, eventCount) => {
          fc.pre(maxHours > 0);

          const familyMemberId = 'test-member';
          const startDate = new Date('2024-01-01');
          const endDate = new Date('2024-01-07');

          // Create multiple events that together exceed threshold
          const hoursPerEvent = (maxHours + 10) / eventCount;
          const events: Event[] = [];
          for (let i = 0; i < eventCount; i++) {
            const eventStartDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
            events.push(createEvent(categoryName, hoursPerEvent, familyMemberId, eventStartDate));
          }

          // Create threshold
          const threshold = createThreshold(categoryName, maxHours);

          // Check for violations
          const violations = thresholdMonitor.checkMaxThresholdViolations(
            events,
            [threshold],
            familyMemberId,
            startDate,
            endDate
          );

          // Verify violation was detected
          expect(violations.length).toBe(1);
          expect(violations[0].type).toBe('max_exceeded');
        }
      ),
      { numRuns: 30 }
    );
  });
});

describe('Property 17: Minimum Threshold Violation Detection', () => {
  let thresholdMonitor: ThresholdMonitor;

  beforeAll(() => {
    thresholdMonitor = new ThresholdMonitor();
  });

  // Arbitrary for category names
  const categoryNameArb = fc.oneof(
    fc.constant('Work'),
    fc.constant('Family Time'),
    fc.constant('Health/Fitness'),
    fc.constant('Upskilling'),
    fc.constant('Relaxation')
  );

  // Arbitrary for hours (0-168 per week)
  const hoursArb = fc.float({ min: 0, max: 168 });

  // Helper to create a test event
  const createEvent = (
    categoryName: string,
    durationHours: number,
    familyMemberId: string,
    startDate: Date
  ): Event => {
    const startTime = new Date(startDate);
    const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

    return {
      id: uuidv4(),
      familyId: 'test-family',
      familyMemberId,
      title: `Test Event - ${categoryName}`,
      description: 'Test event for threshold detection',
      startTime,
      endTime,
      location: 'Test Location',
      category: categoryName as any,
      source: 'internal',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'test-user',
      isDeleted: false,
    };
  };

  // Helper to create a test threshold
  const createThreshold = (
    categoryName: string,
    maxHours?: number,
    minHours?: number
  ): ActivityThreshold => {
    return {
      id: uuidv4(),
      familyId: 'test-family',
      categoryId: `cat-${categoryName}`,
      categoryName,
      maxHours,
      minHours,
      notificationRecipients: ['member-1'],
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  };

  it('should detect when time falls below minimum threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryNameArb,
        hoursArb,
        async (categoryName, minHours) => {
          fc.pre(minHours > 1); // Ensure min threshold is at least 1

          const familyMemberId = 'test-member';
          const weekStartDate = new Date('2024-01-01'); // Monday
          const weekEndDate = new Date('2024-01-07'); // Sunday

          // Create event below threshold
          const eventHours = minHours * 0.5; // 50% of minimum
          const event = createEvent(categoryName, eventHours, familyMemberId, weekStartDate);

          // Create threshold
          const threshold = createThreshold(categoryName, undefined, minHours);

          // Check for violations
          const violations = thresholdMonitor.checkMinThresholdViolations(
            [event],
            [threshold],
            familyMemberId,
            weekStartDate,
            weekEndDate
          );

          // Verify violation was detected
          expect(violations.length).toBe(1);
          expect(violations[0].type).toBe('min_not_met');
          expect(violations[0].currentHours).toBeCloseTo(eventHours, 1);
          expect(violations[0].thresholdHours).toBe(minHours);
          expect(violations[0].categoryName).toBe(categoryName);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should not detect violation when time meets minimum threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryNameArb,
        hoursArb,
        async (categoryName, minHours) => {
          fc.pre(minHours > 0.1); // Ensure min threshold is at least 0.1 to avoid floating point issues

          const familyMemberId = 'test-member';
          const weekStartDate = new Date('2024-01-01');
          const weekEndDate = new Date('2024-01-07');

          // Create event that meets threshold
          const eventHours = minHours * 1.2; // 120% of minimum
          const event = createEvent(categoryName, eventHours, familyMemberId, weekStartDate);

          // Create threshold
          const threshold = createThreshold(categoryName, undefined, minHours);

          // Check for violations
          const violations = thresholdMonitor.checkMinThresholdViolations(
            [event],
            [threshold],
            familyMemberId,
            weekStartDate,
            weekEndDate
          );

          // Verify no violation
          expect(violations.length).toBe(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should detect violation when time is exactly 1 hour below minimum threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryNameArb,
        hoursArb,
        async (categoryName, minHours) => {
          fc.pre(minHours > 1 && minHours < 167);

          const familyMemberId = 'test-member';
          const weekStartDate = new Date('2024-01-01');
          const weekEndDate = new Date('2024-01-07');

          // Create event that is exactly 1 hour below threshold
          const eventHours = minHours - 1;
          const event = createEvent(categoryName, eventHours, familyMemberId, weekStartDate);

          // Create threshold
          const threshold = createThreshold(categoryName, undefined, minHours);

          // Check for violations
          const violations = thresholdMonitor.checkMinThresholdViolations(
            [event],
            [threshold],
            familyMemberId,
            weekStartDate,
            weekEndDate
          );

          // Verify violation was detected
          expect(violations.length).toBe(1);
          expect(violations[0].type).toBe('min_not_met');
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should not detect violation when threshold is disabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryNameArb,
        hoursArb,
        async (categoryName, minHours) => {
          fc.pre(minHours > 1);

          const familyMemberId = 'test-member';
          const weekStartDate = new Date('2024-01-01');
          const weekEndDate = new Date('2024-01-07');

          // Create event below threshold
          const eventHours = minHours * 0.5;
          const event = createEvent(categoryName, eventHours, familyMemberId, weekStartDate);

          // Create disabled threshold
          const threshold = createThreshold(categoryName, undefined, minHours);
          threshold.enabled = false;

          // Check for violations
          const violations = thresholdMonitor.checkMinThresholdViolations(
            [event],
            [threshold],
            familyMemberId,
            weekStartDate,
            weekEndDate
          );

          // Verify no violation detected (threshold is disabled)
          expect(violations.length).toBe(0);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should handle multiple events for same category', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryNameArb,
        hoursArb,
        fc.integer({ min: 1, max: 5 }),
        async (categoryName, minHours, eventCount) => {
          fc.pre(minHours > 1);

          const familyMemberId = 'test-member';
          const weekStartDate = new Date('2024-01-01');
          const weekEndDate = new Date('2024-01-07');

          // Create multiple events that together fall below threshold
          const hoursPerEvent = (minHours - 2) / eventCount;
          const events: Event[] = [];
          for (let i = 0; i < eventCount; i++) {
            const eventStartDate = new Date(weekStartDate.getTime() + i * 24 * 60 * 60 * 1000);
            events.push(createEvent(categoryName, hoursPerEvent, familyMemberId, eventStartDate));
          }

          // Create threshold
          const threshold = createThreshold(categoryName, undefined, minHours);

          // Check for violations
          const violations = thresholdMonitor.checkMinThresholdViolations(
            events,
            [threshold],
            familyMemberId,
            weekStartDate,
            weekEndDate
          );

          // Verify violation was detected
          expect(violations.length).toBe(1);
          expect(violations[0].type).toBe('min_not_met');
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should detect zero hours as violation when minimum is set', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryNameArb,
        hoursArb,
        async (categoryName, minHours) => {
          fc.pre(minHours > 0);

          const familyMemberId = 'test-member';
          const weekStartDate = new Date('2024-01-01');
          const weekEndDate = new Date('2024-01-07');

          // Create threshold
          const threshold = createThreshold(categoryName, undefined, minHours);

          // Check for violations with no events
          const violations = thresholdMonitor.checkMinThresholdViolations(
            [],
            [threshold],
            familyMemberId,
            weekStartDate,
            weekEndDate
          );

          // Verify violation was detected (0 hours < minHours)
          expect(violations.length).toBe(1);
          expect(violations[0].type).toBe('min_not_met');
          expect(violations[0].currentHours).toBe(0);
        }
      ),
      { numRuns: 30 }
    );
  });
});
