/**
 * Unit Tests for Conflicts API
 * Tests for conflict detection, listing, and resolution
 */

import { ConflictDetector } from '../services/conflict-detector';

describe('Conflicts API', () => {
  let detector: ConflictDetector;

  beforeEach(() => {
    detector = new ConflictDetector();
  });

  describe('Conflict Detection', () => {
    it('should detect overlapping events', () => {
      const event1 = {
        id: 'event-1',
        familyMemberId: 'member-1',
        title: 'Meeting 1',
        startTime: new Date('2024-01-15T09:00:00'),
        endTime: new Date('2024-01-15T10:00:00'),
        source: 'google',
      };

      const event2 = {
        id: 'event-2',
        familyMemberId: 'member-1',
        title: 'Meeting 2',
        startTime: new Date('2024-01-15T09:30:00'),
        endTime: new Date('2024-01-15T10:30:00'),
        source: 'outlook',
      };

      const result = detector.detectConflicts(event1, [event2]);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictingEvents).toHaveLength(1);
      expect(result.conflictType).toBe('overlap');
      expect(result.severity).toBe('medium');
    });

    it('should not detect conflicts for different family members', () => {
      const event1 = {
        id: 'event-1',
        familyMemberId: 'member-1',
        title: 'Meeting 1',
        startTime: new Date('2024-01-15T09:00:00'),
        endTime: new Date('2024-01-15T10:00:00'),
        source: 'google',
      };

      const event2 = {
        id: 'event-2',
        familyMemberId: 'member-2',
        title: 'Meeting 2',
        startTime: new Date('2024-01-15T09:30:00'),
        endTime: new Date('2024-01-15T10:30:00'),
        source: 'outlook',
      };

      const result = detector.detectConflicts(event1, [event2]);

      expect(result.hasConflict).toBe(false);
      expect(result.conflictingEvents).toHaveLength(0);
    });

    it('should detect adjacent events', () => {
      const event1 = {
        id: 'event-1',
        familyMemberId: 'member-1',
        title: 'Meeting 1',
        startTime: new Date('2024-01-15T09:00:00'),
        endTime: new Date('2024-01-15T10:00:00'),
        source: 'google',
      };

      const event2 = {
        id: 'event-2',
        familyMemberId: 'member-1',
        title: 'Meeting 2',
        startTime: new Date('2024-01-15T10:00:00'),
        endTime: new Date('2024-01-15T11:00:00'),
        source: 'outlook',
      };

      const result = detector.detectConflicts(event1, [event2]);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictType).toBe('adjacent');
      expect(result.severity).toBe('low');
    });

    it('should not detect conflicts for non-overlapping events', () => {
      const event1 = {
        id: 'event-1',
        familyMemberId: 'member-1',
        title: 'Meeting 1',
        startTime: new Date('2024-01-15T09:00:00'),
        endTime: new Date('2024-01-15T10:00:00'),
        source: 'google',
      };

      const event2 = {
        id: 'event-2',
        familyMemberId: 'member-1',
        title: 'Meeting 2',
        startTime: new Date('2024-01-15T11:00:00'),
        endTime: new Date('2024-01-15T12:00:00'),
        source: 'outlook',
      };

      const result = detector.detectConflicts(event1, [event2]);

      expect(result.hasConflict).toBe(false);
      expect(result.conflictingEvents).toHaveLength(0);
    });
  });

  describe('Detect All Conflicts', () => {
    it('should detect all conflicts in a set of events', () => {
      const events = [
        {
          id: 'event-1',
          familyMemberId: 'member-1',
          title: 'Meeting 1',
          startTime: new Date('2024-01-15T09:00:00'),
          endTime: new Date('2024-01-15T10:00:00'),
          source: 'google',
        },
        {
          id: 'event-2',
          familyMemberId: 'member-1',
          title: 'Meeting 2',
          startTime: new Date('2024-01-15T09:30:00'),
          endTime: new Date('2024-01-15T10:30:00'),
          source: 'outlook',
        },
        {
          id: 'event-3',
          familyMemberId: 'member-2',
          title: 'Meeting 3',
          startTime: new Date('2024-01-15T09:00:00'),
          endTime: new Date('2024-01-15T10:00:00'),
          source: 'google',
        },
      ];

      const warnings = detector.detectAllConflicts(events);

      expect(warnings).toHaveLength(1);
      expect(warnings[0].familyMemberId).toBe('member-1');
      expect(warnings[0].conflictType).toBe('overlap');
    });

    it('should not detect duplicate conflicts', () => {
      const events = [
        {
          id: 'event-1',
          familyMemberId: 'member-1',
          title: 'Meeting 1',
          startTime: new Date('2024-01-15T09:00:00'),
          endTime: new Date('2024-01-15T10:00:00'),
          source: 'google',
        },
        {
          id: 'event-2',
          familyMemberId: 'member-1',
          title: 'Meeting 2',
          startTime: new Date('2024-01-15T09:30:00'),
          endTime: new Date('2024-01-15T10:30:00'),
          source: 'outlook',
        },
      ];

      const warnings = detector.detectAllConflicts(events);

      expect(warnings).toHaveLength(1);
      expect(warnings[0].id).toBe('event-1-event-2');
    });
  });

  describe('Severity Calculation', () => {
    it('should calculate high severity for long overlaps', () => {
      const event1 = {
        id: 'event-1',
        familyMemberId: 'member-1',
        title: 'Meeting 1',
        startTime: new Date('2024-01-15T09:00:00'),
        endTime: new Date('2024-01-15T10:00:00'),
        source: 'google',
      };

      const event2 = {
        id: 'event-2',
        familyMemberId: 'member-1',
        title: 'Meeting 2',
        startTime: new Date('2024-01-15T09:15:00'),
        endTime: new Date('2024-01-15T10:15:00'),
        source: 'outlook',
      };

      const result = detector.detectConflicts(event1, [event2]);

      expect(result.severity).toBe('high');
    });

    it('should calculate medium severity for medium overlaps', () => {
      const event1 = {
        id: 'event-1',
        familyMemberId: 'member-1',
        title: 'Meeting 1',
        startTime: new Date('2024-01-15T09:00:00'),
        endTime: new Date('2024-01-15T09:30:00'),
        source: 'google',
      };

      const event2 = {
        id: 'event-2',
        familyMemberId: 'member-1',
        title: 'Meeting 2',
        startTime: new Date('2024-01-15T09:10:00'),
        endTime: new Date('2024-01-15T09:40:00'),
        source: 'outlook',
      };

      const result = detector.detectConflicts(event1, [event2]);

      expect(result.severity).toBe('medium');
    });

    it('should calculate low severity for small overlaps', () => {
      const event1 = {
        id: 'event-1',
        familyMemberId: 'member-1',
        title: 'Meeting 1',
        startTime: new Date('2024-01-15T09:00:00'),
        endTime: new Date('2024-01-15T09:10:00'),
        source: 'google',
      };

      const event2 = {
        id: 'event-2',
        familyMemberId: 'member-1',
        title: 'Meeting 2',
        startTime: new Date('2024-01-15T09:05:00'),
        endTime: new Date('2024-01-15T09:15:00'),
        source: 'outlook',
      };

      const result = detector.detectConflicts(event1, [event2]);

      expect(result.severity).toBe('low');
    });
  });

  describe('Conflict Filtering', () => {
    it('should get conflicts for specific family member', () => {
      const events = [
        {
          id: 'event-1',
          familyMemberId: 'member-1',
          title: 'Meeting 1',
          startTime: new Date('2024-01-15T09:00:00'),
          endTime: new Date('2024-01-15T10:00:00'),
          source: 'google',
        },
        {
          id: 'event-2',
          familyMemberId: 'member-1',
          title: 'Meeting 2',
          startTime: new Date('2024-01-15T09:30:00'),
          endTime: new Date('2024-01-15T10:30:00'),
          source: 'outlook',
        },
        {
          id: 'event-3',
          familyMemberId: 'member-2',
          title: 'Meeting 3',
          startTime: new Date('2024-01-15T09:00:00'),
          endTime: new Date('2024-01-15T10:00:00'),
          source: 'google',
        },
      ];

      const warnings = detector.getConflictsForMember('member-1', events);

      expect(warnings).toHaveLength(1);
      expect(warnings[0].familyMemberId).toBe('member-1');
    });

    it('should get high severity conflicts', () => {
      const warnings = [
        {
          id: 'conflict-1',
          familyMemberId: 'member-1',
          event1: {} as any,
          event2: {} as any,
          conflictType: 'overlap' as const,
          severity: 'high' as const,
          overlapDurationMs: 3600000,
          detectedAt: new Date(),
        },
        {
          id: 'conflict-2',
          familyMemberId: 'member-1',
          event1: {} as any,
          event2: {} as any,
          conflictType: 'overlap' as const,
          severity: 'low' as const,
          overlapDurationMs: 60000,
          detectedAt: new Date(),
        },
      ];

      const highSeverity = detector.getHighSeverityConflicts(warnings);

      expect(highSeverity).toHaveLength(1);
      expect(highSeverity[0].severity).toBe('high');
    });

    it('should get conflicts in time range', () => {
      const warnings = [
        {
          id: 'conflict-1',
          familyMemberId: 'member-1',
          event1: {
            id: 'event-1',
            familyMemberId: 'member-1',
            title: 'Meeting 1',
            startTime: new Date('2024-01-15T09:00:00'),
            endTime: new Date('2024-01-15T10:00:00'),
            source: 'google',
          },
          event2: {
            id: 'event-2',
            familyMemberId: 'member-1',
            title: 'Meeting 2',
            startTime: new Date('2024-01-15T09:30:00'),
            endTime: new Date('2024-01-15T10:30:00'),
            source: 'outlook',
          },
          conflictType: 'overlap' as const,
          severity: 'high' as const,
          overlapDurationMs: 1800000,
          detectedAt: new Date(),
        },
        {
          id: 'conflict-2',
          familyMemberId: 'member-1',
          event1: {
            id: 'event-3',
            familyMemberId: 'member-1',
            title: 'Meeting 3',
            startTime: new Date('2024-01-16T09:00:00'),
            endTime: new Date('2024-01-16T10:00:00'),
            source: 'google',
          },
          event2: {
            id: 'event-4',
            familyMemberId: 'member-1',
            title: 'Meeting 4',
            startTime: new Date('2024-01-16T09:30:00'),
            endTime: new Date('2024-01-16T10:30:00'),
            source: 'outlook',
          },
          conflictType: 'overlap' as const,
          severity: 'high' as const,
          overlapDurationMs: 1800000,
          detectedAt: new Date(),
        },
      ];

      const rangeStart = new Date('2024-01-15T08:00:00');
      const rangeEnd = new Date('2024-01-15T11:00:00');

      const inRange = detector.getConflictsInTimeRange(warnings, rangeStart, rangeEnd);

      expect(inRange).toHaveLength(1);
      expect(inRange[0].id).toBe('conflict-1');
    });
  });

  describe('Conflict Summary', () => {
    it('should generate conflict summary', () => {
      const warnings = [
        {
          id: 'conflict-1',
          familyMemberId: 'member-1',
          event1: {} as any,
          event2: {} as any,
          conflictType: 'overlap' as const,
          severity: 'high' as const,
          overlapDurationMs: 3600000,
          detectedAt: new Date(),
        },
        {
          id: 'conflict-2',
          familyMemberId: 'member-1',
          event1: {} as any,
          event2: {} as any,
          conflictType: 'overlap' as const,
          severity: 'medium' as const,
          overlapDurationMs: 600000,
          detectedAt: new Date(),
        },
        {
          id: 'conflict-3',
          familyMemberId: 'member-1',
          event1: {} as any,
          event2: {} as any,
          conflictType: 'adjacent' as const,
          severity: 'low' as const,
          overlapDurationMs: 0,
          detectedAt: new Date(),
        },
      ];

      const summary = detector.getSummary(warnings);

      expect(summary.totalConflicts).toBe(3);
      expect(summary.highSeverity).toBe(1);
      expect(summary.mediumSeverity).toBe(1);
      expect(summary.lowSeverity).toBe(1);
      expect(summary.overlapConflicts).toBe(2);
      expect(summary.adjacentConflicts).toBe(1);
    });
  });

  describe('Conflict Formatting', () => {
    it('should format overlap conflict warning', () => {
      const warning = {
        id: 'conflict-1',
        familyMemberId: 'member-1',
        event1: {
          id: 'event-1',
          familyMemberId: 'member-1',
          title: 'Meeting 1',
          startTime: new Date('2024-01-15T09:00:00'),
          endTime: new Date('2024-01-15T10:00:00'),
          source: 'google',
        },
        event2: {
          id: 'event-2',
          familyMemberId: 'member-1',
          title: 'Meeting 2',
          startTime: new Date('2024-01-15T09:30:00'),
          endTime: new Date('2024-01-15T10:30:00'),
          source: 'outlook',
        },
        conflictType: 'overlap' as const,
        severity: 'high' as const,
        overlapDurationMs: 1800000,
        detectedAt: new Date(),
      };

      const formatted = detector.formatWarning(warning);

      expect(formatted).toContain('[HIGH]');
      expect(formatted).toContain('Meeting 1');
      expect(formatted).toContain('Meeting 2');
      expect(formatted).toContain('30 minutes');
    });

    it('should format adjacent conflict warning', () => {
      const warning = {
        id: 'conflict-1',
        familyMemberId: 'member-1',
        event1: {
          id: 'event-1',
          familyMemberId: 'member-1',
          title: 'Meeting 1',
          startTime: new Date('2024-01-15T09:00:00'),
          endTime: new Date('2024-01-15T10:00:00'),
          source: 'google',
        },
        event2: {
          id: 'event-2',
          familyMemberId: 'member-1',
          title: 'Meeting 2',
          startTime: new Date('2024-01-15T10:00:00'),
          endTime: new Date('2024-01-15T11:00:00'),
          source: 'outlook',
        },
        conflictType: 'adjacent' as const,
        severity: 'low' as const,
        overlapDurationMs: 0,
        detectedAt: new Date(),
      };

      const formatted = detector.formatWarning(warning);

      expect(formatted).toContain('[LOW]');
      expect(formatted).toContain('immediately followed by');
    });
  });
});
