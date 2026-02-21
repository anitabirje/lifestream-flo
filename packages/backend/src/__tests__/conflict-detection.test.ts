/**
 * Property-based tests for conflict detection
 * Property 29: Conflict Detection and Warning
 * Validates: Requirements 7.5
 */

import * as fc from 'fast-check';
import { ConflictDetector, Event as ConflictEvent, ConflictWarning } from '../services/conflict-detector';

describe('Property 29: Conflict Detection and Warning', () => {
  it('should detect all conflicts in a set of events', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            title: fc.string({ minLength: 1, maxLength: 50 }),
            startMinutes: fc.integer({ min: 0, max: 1440 }), // 0-1440 minutes in a day
            durationMinutes: fc.integer({ min: 15, max: 480 }) // 15 min to 8 hours
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (eventConfigs) => {
          const detector = new ConflictDetector();

          const now = new Date();
          const events: ConflictEvent[] = eventConfigs.map((config, index) => ({
            id: `event-${index}`,
            familyMemberId: 'member-1',
            title: config.title,
            startTime: new Date(now.getTime() + config.startMinutes * 60 * 1000),
            endTime: new Date(now.getTime() + (config.startMinutes + config.durationMinutes) * 60 * 1000),
            source: 'google'
          }));

          const warnings = detector.detectAllConflicts(events);

          // Verify all warnings have valid data
          for (const warning of warnings) {
            expect(warning.event1.familyMemberId).toBe(warning.event2.familyMemberId);
            expect(warning.severity).toMatch(/high|medium|low/);
            expect(warning.conflictType).toMatch(/overlap|adjacent/);
            expect(warning.overlapDurationMs).toBeGreaterThanOrEqual(0);
          }

          // Verify no duplicate warnings
          const warningIds = new Set(warnings.map(w => w.id));
          expect(warningIds.size).toBe(warnings.length);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should correctly identify conflict severity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 120 }),
        async (overlapMinutes) => {
          const detector = new ConflictDetector();

          const now = new Date();
          const event1: ConflictEvent = {
            id: 'event-1',
            familyMemberId: 'member-1',
            title: 'Event 1',
            startTime: now,
            endTime: new Date(now.getTime() + 120 * 60 * 1000), // 2 hours
            source: 'google'
          };

          const event2: ConflictEvent = {
            id: 'event-2',
            familyMemberId: 'member-1',
            title: 'Event 2',
            startTime: new Date(now.getTime() + (120 - overlapMinutes) * 60 * 1000),
            endTime: new Date(now.getTime() + 180 * 60 * 1000), // 3 hours
            source: 'google'
          };

          const result = detector.detectConflicts(event1, [event2]);

          expect(result.hasConflict).toBe(true);
          expect(result.conflictingEvents.length).toBe(1);

          // Verify severity is correctly assigned based on overlap
          if (overlapMinutes > 30) {
            expect(result.severity).toBe('high');
          } else if (overlapMinutes > 5) {
            expect(result.severity).toBe('medium');
          } else {
            expect(result.severity).toBe('low');
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should not detect conflicts for different family members', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            memberId: fc.string({ minLength: 1, maxLength: 10 }),
            title: fc.string({ minLength: 1, maxLength: 50 })
          }),
          { minLength: 2, maxLength: 5 }
        ),
        async (eventConfigs) => {
          fc.pre(eventConfigs.length >= 2);

          const detector = new ConflictDetector();

          const now = new Date();
          const events: ConflictEvent[] = eventConfigs.map((config, index) => ({
            id: `event-${index}`,
            familyMemberId: config.memberId,
            title: config.title,
            startTime: now,
            endTime: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour
            source: 'google'
          }));

          const warnings = detector.detectAllConflicts(events);

          // All events have different family members, so no conflicts
          expect(warnings.length).toBe(0);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should detect adjacent events as conflicts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 1440 }),
        async (startMinutes) => {
          const detector = new ConflictDetector();

          const now = new Date();
          const event1: ConflictEvent = {
            id: 'event-1',
            familyMemberId: 'member-1',
            title: 'Event 1',
            startTime: new Date(now.getTime() + startMinutes * 60 * 1000),
            endTime: new Date(now.getTime() + (startMinutes + 60) * 60 * 1000), // 1 hour
            source: 'google'
          };

          const event2: ConflictEvent = {
            id: 'event-2',
            familyMemberId: 'member-1',
            title: 'Event 2',
            startTime: new Date(now.getTime() + (startMinutes + 60) * 60 * 1000), // Starts when event1 ends
            endTime: new Date(now.getTime() + (startMinutes + 120) * 60 * 1000), // 1 hour
            source: 'google'
          };

          const result = detector.detectConflicts(event1, [event2]);

          expect(result.hasConflict).toBe(true);
          expect(result.conflictType).toBe('adjacent');
          expect(result.severity).toBe('low');
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should format conflict warnings correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title1: fc.string({ minLength: 1, maxLength: 30 }),
          title2: fc.string({ minLength: 1, maxLength: 30 })
        }),
        async (config) => {
          const detector = new ConflictDetector();

          const now = new Date();
          const event1: ConflictEvent = {
            id: 'event-1',
            familyMemberId: 'member-1',
            title: config.title1,
            startTime: now,
            endTime: new Date(now.getTime() + 60 * 60 * 1000),
            source: 'google'
          };

          const event2: ConflictEvent = {
            id: 'event-2',
            familyMemberId: 'member-1',
            title: config.title2,
            startTime: new Date(now.getTime() + 30 * 60 * 1000),
            endTime: new Date(now.getTime() + 90 * 60 * 1000),
            source: 'google'
          };

          const warnings = detector.detectAllConflicts([event1, event2]);

          expect(warnings.length).toBeGreaterThan(0);

          for (const warning of warnings) {
            const formatted = detector.formatWarning(warning);
            expect(formatted).toContain(warning.event1.title);
            expect(formatted).toContain(warning.event2.title);
            expect(formatted).toContain(warning.severity.toUpperCase());
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should get conflicts within time range', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 1440 }),
        fc.integer({ min: 60, max: 480 }),
        async (rangeStartMinutes, rangeDurationMinutes) => {
          const detector = new ConflictDetector();

          const now = new Date();
          const rangeStart = new Date(now.getTime() + rangeStartMinutes * 60 * 1000);
          const rangeEnd = new Date(now.getTime() + (rangeStartMinutes + rangeDurationMinutes) * 60 * 1000);

          // Create events both inside and outside the range
          const events: ConflictEvent[] = [
            {
              id: 'event-1',
              familyMemberId: 'member-1',
              title: 'Event 1',
              startTime: new Date(now.getTime() + (rangeStartMinutes - 60) * 60 * 1000),
              endTime: new Date(now.getTime() + (rangeStartMinutes + 30) * 60 * 1000),
              source: 'google'
            },
            {
              id: 'event-2',
              familyMemberId: 'member-1',
              title: 'Event 2',
              startTime: new Date(now.getTime() + (rangeStartMinutes + 10) * 60 * 1000),
              endTime: new Date(now.getTime() + (rangeStartMinutes + 40) * 60 * 1000),
              source: 'google'
            },
            {
              id: 'event-3',
              familyMemberId: 'member-1',
              title: 'Event 3',
              startTime: new Date(now.getTime() + (rangeStartMinutes + 500) * 60 * 1000),
              endTime: new Date(now.getTime() + (rangeStartMinutes + 530) * 60 * 1000),
              source: 'google'
            }
          ];

          const allWarnings = detector.detectAllConflicts(events);
          const rangeWarnings = detector.getConflictsInTimeRange(allWarnings, rangeStart, rangeEnd);

          // Verify all returned warnings are within the range
          for (const warning of rangeWarnings) {
            const eventStart = Math.min(warning.event1.startTime.getTime(), warning.event2.startTime.getTime());
            const eventEnd = Math.max(warning.event1.endTime.getTime(), warning.event2.endTime.getTime());

            expect(eventStart).toBeLessThan(rangeEnd.getTime());
            expect(eventEnd).toBeGreaterThan(rangeStart.getTime());
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should get summary of conflicts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            title: fc.string({ minLength: 1, maxLength: 50 }),
            startMinutes: fc.integer({ min: 0, max: 1440 }),
            durationMinutes: fc.integer({ min: 15, max: 480 })
          }),
          { minLength: 2, maxLength: 8 }
        ),
        async (eventConfigs) => {
          const detector = new ConflictDetector();

          const now = new Date();
          const events: ConflictEvent[] = eventConfigs.map((config, index) => ({
            id: `event-${index}`,
            familyMemberId: 'member-1',
            title: config.title,
            startTime: new Date(now.getTime() + config.startMinutes * 60 * 1000),
            endTime: new Date(now.getTime() + (config.startMinutes + config.durationMinutes) * 60 * 1000),
            source: 'google'
          }));

          const warnings = detector.detectAllConflicts(events);
          const summary = detector.getSummary(warnings);

          // Verify summary counts
          expect(summary.totalConflicts).toBe(warnings.length);
          expect(summary.highSeverity + summary.mediumSeverity + summary.lowSeverity).toBe(warnings.length);
          expect(summary.overlapConflicts + summary.adjacentConflicts).toBe(warnings.length);

          // Verify high severity conflicts are a subset of total
          expect(summary.highSeverity).toBeLessThanOrEqual(summary.totalConflicts);
          expect(summary.mediumSeverity).toBeLessThanOrEqual(summary.totalConflicts);
          expect(summary.lowSeverity).toBeLessThanOrEqual(summary.totalConflicts);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should get high-severity conflicts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            title: fc.string({ minLength: 1, maxLength: 50 }),
            startMinutes: fc.integer({ min: 0, max: 1440 }),
            durationMinutes: fc.integer({ min: 15, max: 480 })
          }),
          { minLength: 2, maxLength: 8 }
        ),
        async (eventConfigs) => {
          const detector = new ConflictDetector();

          const now = new Date();
          const events: ConflictEvent[] = eventConfigs.map((config, index) => ({
            id: `event-${index}`,
            familyMemberId: 'member-1',
            title: config.title,
            startTime: new Date(now.getTime() + config.startMinutes * 60 * 1000),
            endTime: new Date(now.getTime() + (config.startMinutes + config.durationMinutes) * 60 * 1000),
            source: 'google'
          }));

          const warnings = detector.detectAllConflicts(events);
          const highSeverity = detector.getHighSeverityConflicts(warnings);

          // Verify all returned warnings are high severity
          for (const warning of highSeverity) {
            expect(warning.severity).toBe('high');
          }

          // Verify high severity is a subset of all warnings
          expect(highSeverity.length).toBeLessThanOrEqual(warnings.length);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should detect conflicts for specific family member', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            memberId: fc.string({ minLength: 1, maxLength: 10 }),
            title: fc.string({ minLength: 1, maxLength: 50 }),
            startMinutes: fc.integer({ min: 0, max: 1440 }),
            durationMinutes: fc.integer({ min: 15, max: 480 })
          }),
          { minLength: 2, maxLength: 8 }
        ),
        async (eventConfigs) => {
          const detector = new ConflictDetector();

          const now = new Date();
          const events: ConflictEvent[] = eventConfigs.map((config, index) => ({
            id: `event-${index}`,
            familyMemberId: config.memberId,
            title: config.title,
            startTime: new Date(now.getTime() + config.startMinutes * 60 * 1000),
            endTime: new Date(now.getTime() + (config.startMinutes + config.durationMinutes) * 60 * 1000),
            source: 'google'
          }));

          // Get first member ID
          const targetMemberId = events[0].familyMemberId;

          const warnings = detector.getConflictsForMember(targetMemberId, events);

          // Verify all warnings are for the target member
          for (const warning of warnings) {
            expect(warning.event1.familyMemberId).toBe(targetMemberId);
            expect(warning.event2.familyMemberId).toBe(targetMemberId);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
