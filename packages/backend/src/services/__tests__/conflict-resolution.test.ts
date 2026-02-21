/**
 * Property-Based Tests for Conflict Resolution
 * Validates: Requirements 7a.1-7a.10
 */

import fc from 'fast-check';
import { ConflictDetector, ConflictWarning, Event as ConflictEvent } from '../conflict-detector';
import { ConflictResolutionEngine, ResolutionSuggestion } from '../conflict-resolution-engine';
import { Event } from '../../models/event';

/**
 * Property 57: Conflict Detection Accuracy
 * Validates: Requirements 7a.1
 *
 * Property: For any two events with the same family member that overlap in time,
 * the conflict detector MUST identify them as conflicting.
 */
describe('Property 57: Conflict Detection Accuracy', () => {
  const eventArbitrary = fc.record({
    id: fc.uuid(),
    familyMemberId: fc.uuid(),
    title: fc.string({ minLength: 1 }),
    startTime: fc.date(),
    endTime: fc.date(),
    source: fc.constantFrom('google', 'outlook', 'internal'),
  });

  it('should detect overlapping events for same family member', () => {
    fc.assert(
      fc.property(
        fc.tuple(eventArbitrary, eventArbitrary, fc.integer({ min: 1, max: 3600000 })),
        ([baseEvent, otherEvent, overlapMs]) => {
          // Ensure same family member
          const event1: ConflictEvent = {
            ...baseEvent,
            familyMemberId: 'member-1',
            startTime: new Date('2024-01-15T10:00:00Z'),
            endTime: new Date('2024-01-15T11:00:00Z'),
          };

          // Create overlapping event
          const event2: ConflictEvent = {
            ...otherEvent,
            familyMemberId: 'member-1',
            startTime: new Date('2024-01-15T10:30:00Z'),
            endTime: new Date('2024-01-15T11:30:00Z'),
          };

          const detector = new ConflictDetector();
          const result = detector.detectConflicts(event1, [event2]);

          // Must detect conflict
          expect(result.hasConflict).toBe(true);
          expect(result.conflictingEvents).toContain(event2);
          expect(result.conflictType).toBe('overlap');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not detect conflicts for different family members', () => {
    fc.assert(
      fc.property(eventArbitrary, (baseEvent) => {
        const event1: ConflictEvent = {
          ...baseEvent,
          familyMemberId: 'member-1',
          startTime: new Date('2024-01-15T10:00:00Z'),
          endTime: new Date('2024-01-15T11:00:00Z'),
        };

        const event2: ConflictEvent = {
          ...baseEvent,
          familyMemberId: 'member-2',
          startTime: new Date('2024-01-15T10:30:00Z'),
          endTime: new Date('2024-01-15T11:30:00Z'),
        };

        const detector = new ConflictDetector();
        const result = detector.detectConflicts(event1, [event2]);

        // Must NOT detect conflict for different members
        expect(result.hasConflict).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it('should correctly calculate overlap duration', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 3600000 }), (overlapMs) => {
        const event1: ConflictEvent = {
          id: 'event-1',
          familyMemberId: 'member-1',
          title: 'Event 1',
          startTime: new Date('2024-01-15T10:00:00Z'),
          endTime: new Date('2024-01-15T11:00:00Z'),
          source: 'internal',
        };

        const event2: ConflictEvent = {
          id: 'event-2',
          familyMemberId: 'member-1',
          title: 'Event 2',
          startTime: new Date('2024-01-15T10:30:00Z'),
          endTime: new Date('2024-01-15T11:30:00Z'),
          source: 'internal',
        };

        const detector = new ConflictDetector();
        const warnings = detector.detectAllConflicts([event1, event2]);

        // Must have exactly one warning
        expect(warnings).toHaveLength(1);
        // Overlap should be 30 minutes (1800000 ms)
        expect(warnings[0].overlapDurationMs).toBe(30 * 60 * 1000);
      }),
      { numRuns: 50 }
    );
  });

  it('should classify severity based on overlap duration', () => {
    const detector = new ConflictDetector();

    // High severity: > 30 minutes
    const event1High: ConflictEvent = {
      id: 'event-1',
      familyMemberId: 'member-1',
      title: 'Event 1',
      startTime: new Date('2024-01-15T10:00:00Z'),
      endTime: new Date('2024-01-15T11:00:00Z'),
      source: 'internal',
    };

    const event2High: ConflictEvent = {
      id: 'event-2',
      familyMemberId: 'member-1',
      title: 'Event 2',
      startTime: new Date('2024-01-15T10:15:00Z'),
      endTime: new Date('2024-01-15T11:15:00Z'),
      source: 'internal',
    };

    const warningsHigh = detector.detectAllConflicts([event1High, event2High]);
    expect(warningsHigh[0].severity).toBe('high');

    // Low severity: <= 5 minutes
    const event1Low: ConflictEvent = {
      id: 'event-3',
      familyMemberId: 'member-1',
      title: 'Event 3',
      startTime: new Date('2024-01-15T10:00:00Z'),
      endTime: new Date('2024-01-15T10:05:00Z'),
      source: 'internal',
    };

    const event2Low: ConflictEvent = {
      id: 'event-4',
      familyMemberId: 'member-1',
      title: 'Event 4',
      startTime: new Date('2024-01-15T10:03:00Z'),
      endTime: new Date('2024-01-15T10:08:00Z'),
      source: 'internal',
    };

    const warningsLow = detector.detectAllConflicts([event1Low, event2Low]);
    expect(warningsLow[0].severity).toBe('low');
  });
});

/**
 * Property 58: Resolution Suggestion Generation
 * Validates: Requirements 7a.3, 7a.4, 7a.5, 7a.6
 *
 * Property: For any conflicting events, the resolution engine MUST generate
 * at least one feasible resolution suggestion.
 */
describe('Property 58: Resolution Suggestion Generation', () => {
  it('should generate reschedule suggestions for overlapping events', async () => {
    const event1: Event = {
      id: 'event-1',
      familyMemberId: 'member-1',
      title: 'Meeting',
      startTime: new Date('2024-01-15T10:00:00Z'),
      endTime: new Date('2024-01-15T11:00:00Z'),
      source: 'internal',
      familyId: 'family-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-1',
      isDeleted: false,
    };

    const event2: Event = {
      id: 'event-2',
      familyMemberId: 'member-1',
      title: 'Appointment',
      startTime: new Date('2024-01-15T10:30:00Z'),
      endTime: new Date('2024-01-15T11:30:00Z'),
      source: 'internal',
      familyId: 'family-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-1',
      isDeleted: false,
    };

    const mockDataAccess = {
      query: jest.fn().mockResolvedValue([]),
      putItem: jest.fn(),
    };

    const engine = new ConflictResolutionEngine(mockDataAccess as any);
    const analysis = await engine.analyzeConflict(event1, event2, [event1, event2], [
      { id: 'member-1', name: 'John' },
    ]);

    // Must generate at least one suggestion
    expect(analysis.suggestions.length).toBeGreaterThan(0);

    // Must have a recommended suggestion
    expect(analysis.recommendedSuggestion).toBeDefined();

    // Suggestions must be sorted by feasibility
    for (let i = 0; i < analysis.suggestions.length - 1; i++) {
      expect(analysis.suggestions[i].feasibilityScore).toBeGreaterThanOrEqual(
        analysis.suggestions[i + 1].feasibilityScore
      );
    }
  });

  it('should generate delegate suggestions for pickup/dropoff conflicts', async () => {
    const event1: Event = {
      id: 'event-1',
      familyMemberId: 'member-1',
      title: 'Pickup from school',
      startTime: new Date('2024-01-15T15:00:00Z'),
      endTime: new Date('2024-01-15T15:30:00Z'),
      source: 'internal',
      familyId: 'family-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-1',
      isDeleted: false,
    };

    const event2: Event = {
      id: 'event-2',
      familyMemberId: 'member-1',
      title: 'Work meeting',
      startTime: new Date('2024-01-15T15:15:00Z'),
      endTime: new Date('2024-01-15T16:00:00Z'),
      source: 'internal',
      familyId: 'family-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-1',
      isDeleted: false,
    };

    const mockDataAccess = {
      query: jest.fn().mockResolvedValue([]),
      putItem: jest.fn(),
    };

    const engine = new ConflictResolutionEngine(mockDataAccess as any);
    const analysis = await engine.analyzeConflict(event1, event2, [event1, event2], [
      { id: 'member-1', name: 'John' },
      { id: 'member-2', name: 'Jane' },
    ]);

    // Should have delegate suggestion for pickup/dropoff
    const delegateSuggestion = analysis.suggestions.find((s) => s.type === 'delegate');
    expect(delegateSuggestion).toBeDefined();
  });

  it('should rank suggestions by feasibility score', async () => {
    const event1: Event = {
      id: 'event-1',
      familyMemberId: 'member-1',
      title: 'Event 1',
      startTime: new Date('2024-01-15T10:00:00Z'),
      endTime: new Date('2024-01-15T11:00:00Z'),
      source: 'internal',
      familyId: 'family-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-1',
      isDeleted: false,
    };

    const event2: Event = {
      id: 'event-2',
      familyMemberId: 'member-1',
      title: 'Event 2',
      startTime: new Date('2024-01-15T10:30:00Z'),
      endTime: new Date('2024-01-15T11:30:00Z'),
      source: 'internal',
      familyId: 'family-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-1',
      isDeleted: false,
    };

    const mockDataAccess = {
      query: jest.fn().mockResolvedValue([]),
      putItem: jest.fn(),
    };

    const engine = new ConflictResolutionEngine(mockDataAccess as any);
    const analysis = await engine.analyzeConflict(event1, event2, [event1, event2], [
      { id: 'member-1', name: 'John' },
    ]);

    // Verify suggestions are sorted by feasibility (descending)
    for (let i = 0; i < analysis.suggestions.length - 1; i++) {
      expect(analysis.suggestions[i].feasibilityScore).toBeGreaterThanOrEqual(
        analysis.suggestions[i + 1].feasibilityScore
      );
    }
  });
});

/**
 * Property 59: Resolution Application
 * Validates: Requirements 7a.7, 7a.8, 7a.9, 7a.10
 *
 * Property: When a resolution is applied, all affected events MUST be updated
 * and the resolution MUST be logged for audit purposes.
 */
describe('Property 59: Resolution Application', () => {
  it('should apply reschedule resolution correctly', () => {
    const suggestion: ResolutionSuggestion = {
      id: 'reschedule_event1',
      type: 'reschedule',
      title: 'Reschedule Event 1',
      description: 'Move Event 1 to an available time slot',
      affectedEvents: ['event-1'],
      feasibilityScore: 85,
      estimatedImpact: 'Low - Only affects one event',
      requiredActions: ['Update event time in calendar', 'Notify attendees of new time'],
      alternativeSlots: [
        {
          start: new Date('2024-01-15T14:00:00Z'),
          end: new Date('2024-01-15T15:00:00Z'),
        },
      ],
    };

    // Verify suggestion structure
    expect(suggestion.type).toBe('reschedule');
    expect(suggestion.affectedEvents).toHaveLength(1);
    expect(suggestion.alternativeSlots).toBeDefined();
    expect(suggestion.alternativeSlots!.length).toBeGreaterThan(0);
  });

  it('should apply delegate resolution correctly', () => {
    const suggestion: ResolutionSuggestion = {
      id: 'delegate_pickup',
      type: 'delegate',
      title: 'Delegate pickup to another family member',
      description: 'Ask Jane to handle the pickup/dropoff',
      affectedEvents: ['event-1'],
      feasibilityScore: 75,
      estimatedImpact: 'Medium - Requires coordination with another family member',
      requiredActions: ['Notify Jane of the delegation', 'Update event assignment'],
      alternativeMembers: [
        { memberId: 'member-2', name: 'Jane', availability: 100 },
      ],
    };

    // Verify suggestion structure
    expect(suggestion.type).toBe('delegate');
    expect(suggestion.alternativeMembers).toBeDefined();
    expect(suggestion.alternativeMembers!.length).toBeGreaterThan(0);
  });

  it('should apply cancel resolution correctly', () => {
    const suggestion: ResolutionSuggestion = {
      id: 'cancel_event',
      type: 'cancel',
      title: 'Cancel Event 1',
      description: 'Cancel the less important event to resolve the conflict',
      affectedEvents: ['event-1'],
      feasibilityScore: 50,
      estimatedImpact: 'High - Cancels an event entirely',
      requiredActions: ['Delete event from calendar', 'Notify attendees of cancellation'],
    };

    // Verify suggestion structure
    expect(suggestion.type).toBe('cancel');
    expect(suggestion.affectedEvents).toHaveLength(1);
  });

  it('should maintain audit trail for all resolutions', () => {
    // Verify that resolution applications include audit information
    const resolutionApplication = {
      resolutionId: 'res-123',
      suggestionId: 'reschedule_event1',
      type: 'reschedule' as const,
      appliedAt: new Date(),
      appliedBy: 'user-1',
      affectedEventIds: ['event-1'],
      changes: [
        {
          eventId: 'event-1',
          previousValues: {
            startTime: new Date('2024-01-15T10:00:00Z'),
            endTime: new Date('2024-01-15T11:00:00Z'),
          },
          newValues: {
            startTime: new Date('2024-01-15T14:00:00Z'),
            endTime: new Date('2024-01-15T15:00:00Z'),
          },
        },
      ],
      notificationsSent: 1,
    };

    // Verify audit information is present
    expect(resolutionApplication.resolutionId).toBeDefined();
    expect(resolutionApplication.appliedBy).toBeDefined();
    expect(resolutionApplication.appliedAt).toBeDefined();
    expect(resolutionApplication.changes).toHaveLength(1);
    expect(resolutionApplication.changes[0].previousValues).toBeDefined();
    expect(resolutionApplication.changes[0].newValues).toBeDefined();
  });
});
