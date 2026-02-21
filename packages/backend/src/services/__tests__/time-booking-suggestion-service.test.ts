/**
 * Tests for Time Booking Suggestion Service
 * Property-based tests for proactive time booking suggestions
 * Requirements: 5a.8, 5a.9, 5a.10
 */

import fc from 'fast-check';
import { TimeBookingSuggestionService } from '../time-booking-suggestion-service';
import { Event, ActivityCategoryName } from '../../models/event';
import { IdealTimeAllocation } from '../../models/ideal-time-allocation';

describe('TimeBookingSuggestionService', () => {
  let service: TimeBookingSuggestionService;

  beforeEach(() => {
    service = new TimeBookingSuggestionService();
  });

  describe('identifyInsufficientCategories', () => {
    test('should identify categories with insufficient time', () => {
      const familyId = 'family-1';
      const familyMemberId = 'member-1';

      // Create events with 2 hours of Health/Fitness
      const events: Event[] = [
        {
          id: 'event-1',
          familyId,
          familyMemberId,
          title: 'Gym',
          startTime: new Date('2024-01-01T08:00:00'),
          endTime: new Date('2024-01-01T09:00:00'),
          category: 'Health/Fitness',
          source: 'internal',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
          isDeleted: false,
        },
        {
          id: 'event-2',
          familyId,
          familyMemberId,
          title: 'Yoga',
          startTime: new Date('2024-01-02T18:00:00'),
          endTime: new Date('2024-01-02T19:00:00'),
          category: 'Health/Fitness',
          source: 'internal',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
          isDeleted: false,
        },
      ];

      // Ideal allocation: 5 hours of Health/Fitness
      const idealAllocations: IdealTimeAllocation[] = [
        {
          id: 'ideal-1',
          familyId,
          familyMemberId,
          categoryId: 'cat-1',
          categoryName: 'Health/Fitness',
          allocationType: 'hours',
          targetValue: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const weekStart = new Date('2024-01-01');
      const weekEnd = new Date('2024-01-07');

      const insufficient = service.identifyInsufficientCategories(
        events,
        familyMemberId,
        idealAllocations,
        weekStart,
        weekEnd
      );

      expect(insufficient).toHaveLength(1);
      expect(insufficient[0].category).toBe('Health/Fitness');
      expect(insufficient[0].currentHours).toBe(2);
      expect(insufficient[0].targetHours).toBe(5);
      expect(insufficient[0].shortfallHours).toBe(3);
    });

    test('should not identify categories that meet target', () => {
      const familyId = 'family-1';
      const familyMemberId = 'member-1';

      // Create events with 5 hours of Health/Fitness
      const events: Event[] = [
        {
          id: 'event-1',
          familyId,
          familyMemberId,
          title: 'Gym',
          startTime: new Date('2024-01-01T08:00:00'),
          endTime: new Date('2024-01-01T13:00:00'),
          category: 'Health/Fitness',
          source: 'internal',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
          isDeleted: false,
        },
      ];

      // Ideal allocation: 5 hours of Health/Fitness
      const idealAllocations: IdealTimeAllocation[] = [
        {
          id: 'ideal-1',
          familyId,
          familyMemberId,
          categoryId: 'cat-1',
          categoryName: 'Health/Fitness',
          allocationType: 'hours',
          targetValue: 5,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const weekStart = new Date('2024-01-01');
      const weekEnd = new Date('2024-01-07');

      const insufficient = service.identifyInsufficientCategories(
        events,
        familyMemberId,
        idealAllocations,
        weekStart,
        weekEnd
      );

      expect(insufficient).toHaveLength(0);
    });
  });

  describe('findAvailableTimeSlots', () => {
    test('should find available time slots between events', () => {
      const familyId = 'family-1';
      const familyMemberId = 'member-1';

      // Create events with gaps
      const events: Event[] = [
        {
          id: 'event-1',
          familyId,
          familyMemberId,
          title: 'Meeting',
          startTime: new Date('2024-01-01T09:00:00'),
          endTime: new Date('2024-01-01T10:00:00'),
          source: 'internal',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
          isDeleted: false,
        },
        {
          id: 'event-2',
          familyId,
          familyMemberId,
          title: 'Lunch',
          startTime: new Date('2024-01-01T12:00:00'),
          endTime: new Date('2024-01-01T13:00:00'),
          source: 'internal',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
          isDeleted: false,
        },
      ];

      const weekStart = new Date('2024-01-01');
      const weekEnd = new Date('2024-01-01');

      const slots = service.findAvailableTimeSlots(events, familyMemberId, weekStart, weekEnd);

      // Should find slots: 6-9 AM, 10 AM-12 PM, 1-10 PM
      expect(slots.length).toBeGreaterThan(0);
      expect(slots.some((s) => s.durationHours >= 2)).toBe(true); // 10 AM - 12 PM gap
    });

    test('should respect minimum slot duration', () => {
      const familyId = 'family-1';
      const familyMemberId = 'member-1';

      // Create events with small gaps
      const events: Event[] = [
        {
          id: 'event-1',
          familyId,
          familyMemberId,
          title: 'Meeting 1',
          startTime: new Date('2024-01-01T09:00:00'),
          endTime: new Date('2024-01-01T09:15:00'),
          source: 'internal',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
          isDeleted: false,
        },
        {
          id: 'event-2',
          familyId,
          familyMemberId,
          title: 'Meeting 2',
          startTime: new Date('2024-01-01T09:30:00'),
          endTime: new Date('2024-01-01T10:00:00'),
          source: 'internal',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
          isDeleted: false,
        },
      ];

      const weekStart = new Date('2024-01-01');
      const weekEnd = new Date('2024-01-01');

      // With 1 hour minimum, should not include 15-minute gap
      const slots = service.findAvailableTimeSlots(events, familyMemberId, weekStart, weekEnd, 1);

      // Should only find slots that are at least 1 hour
      expect(slots.every((s) => s.durationHours >= 1)).toBe(true);
    });
  });

  describe('generateBookingSuggestions', () => {
    test('should generate suggestions for insufficient categories', () => {
      const familyId = 'family-1';
      const familyMemberId = 'member-1';

      // Create events with 1 hour of Health/Fitness
      const events: Event[] = [
        {
          id: 'event-1',
          familyId,
          familyMemberId,
          title: 'Gym',
          startTime: new Date('2024-01-01T08:00:00'),
          endTime: new Date('2024-01-01T09:00:00'),
          category: 'Health/Fitness',
          source: 'internal',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
          isDeleted: false,
        },
      ];

      // Ideal allocation: 3 hours of Health/Fitness
      const idealAllocations: IdealTimeAllocation[] = [
        {
          id: 'ideal-1',
          familyId,
          familyMemberId,
          categoryId: 'cat-1',
          categoryName: 'Health/Fitness',
          allocationType: 'hours',
          targetValue: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const weekStart = new Date('2024-01-01');
      const weekEnd = new Date('2024-01-07');

      const suggestions = service.generateBookingSuggestions(
        events,
        familyMemberId,
        idealAllocations,
        weekStart,
        weekEnd
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].category).toBe('Health/Fitness');
      expect(suggestions[0].shortfallHours).toBe(2);
      expect(suggestions[0].suggestedSlots.length).toBeGreaterThan(0);
      expect(suggestions[0].status).toBe('pending');
    });

    test('should not generate suggestions when no slots available', () => {
      const familyId = 'family-1';
      const familyMemberId = 'member-1';

      // Create events that fill the entire day
      const events: Event[] = [
        {
          id: 'event-1',
          familyId,
          familyMemberId,
          title: 'All day event',
          startTime: new Date('2024-01-01T06:00:00'),
          endTime: new Date('2024-01-01T22:00:00'),
          category: 'Work',
          source: 'internal',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
          isDeleted: false,
        },
      ];

      // Ideal allocation: 3 hours of Health/Fitness
      const idealAllocations: IdealTimeAllocation[] = [
        {
          id: 'ideal-1',
          familyId,
          familyMemberId,
          categoryId: 'cat-1',
          categoryName: 'Health/Fitness',
          allocationType: 'hours',
          targetValue: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const weekStart = new Date('2024-01-01');
      const weekEnd = new Date('2024-01-01');

      const suggestions = service.generateBookingSuggestions(
        events,
        familyMemberId,
        idealAllocations,
        weekStart,
        weekEnd
      );

      expect(suggestions).toHaveLength(0);
    });
  });

  describe('formatTimeSlot', () => {
    test('should format time slot correctly', () => {
      const slot = {
        startTime: new Date('2024-01-01T14:30:00'),
        endTime: new Date('2024-01-01T16:00:00'),
        durationHours: 1.5,
        dayOfWeek: 'Monday',
      };

      const formatted = service.formatTimeSlot(slot);

      expect(formatted).toContain('Monday');
      expect(formatted).toContain('1.5h');
    });
  });

  // Property-based tests
  describe('Property 55: Time Booking Suggestion Generation', () => {
    it(
      'should generate suggestions with total duration >= shortfall for all insufficient categories',
      () => {
        fc.assert(
          fc.property(
            fc.array(
              fc.record({
                currentHours: fc.float({ min: 0, max: 10 }),
                targetHours: fc.float({ min: 0.5, max: 20 }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            (categoryData: Array<{ currentHours: number; targetHours: number }>) => {
              const familyId = 'family-1';
              const familyMemberId = 'member-1';

              // Create events
              const events: Event[] = [];
              let eventId = 0;

              for (let i = 0; i < categoryData.length; i++) {
                const startHour = 8 + i * 2;
                events.push({
                  id: `event-${eventId++}`,
                  familyId,
                  familyMemberId,
                  title: `Event ${i}`,
                  startTime: new Date(`2024-01-01T${String(startHour).padStart(2, '0')}:00:00`),
                  endTime: new Date(
                    `2024-01-01T${String(startHour + Math.floor(categoryData[i].currentHours)).padStart(2, '0')}:00:00`
                  ),
                  category: ['Work', 'Family Time', 'Health/Fitness', 'Upskilling', 'Relaxation'][i % 5] as ActivityCategoryName,
                  source: 'internal',
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  createdBy: 'user-1',
                  isDeleted: false,
                });
              }

              // Create ideal allocations
              const idealAllocations: IdealTimeAllocation[] = categoryData.map((data, i) => ({
                id: `ideal-${i}`,
                familyId,
                familyMemberId,
                categoryId: `cat-${i}`,
                categoryName: ['Work', 'Family Time', 'Health/Fitness', 'Upskilling', 'Relaxation'][i % 5] as ActivityCategoryName,
                allocationType: 'hours',
                targetValue: data.targetHours,
                createdAt: new Date(),
                updatedAt: new Date(),
              }));

              const service = new TimeBookingSuggestionService();
              const weekStart = new Date('2024-01-01');
              const weekEnd = new Date('2024-01-07');

              const suggestions = service.generateBookingSuggestions(
                events,
                familyMemberId,
                idealAllocations,
                weekStart,
                weekEnd
              );

              // For each suggestion, verify total suggested duration >= shortfall
              for (const suggestion of suggestions) {
                const totalSuggestedDuration = suggestion.suggestedSlots.reduce((sum, slot) => sum + slot.durationHours, 0);
                expect(totalSuggestedDuration).toBeGreaterThanOrEqual(suggestion.shortfallHours - 0.01); // Allow small rounding error
              }
            }
          )
        );
      }
    );

    it(
      'should only suggest slots that do not overlap with existing events',
      () => {
        fc.assert(
          fc.property(fc.integer({ min: 1, max: 5 }), (numEvents: number) => {
            const familyId = 'family-1';
            const familyMemberId = 'member-1';

            // Create non-overlapping events
            const events: Event[] = [];
            for (let i = 0; i < numEvents; i++) {
              const startHour = 8 + i * 3;
              events.push({
                id: `event-${i}`,
                familyId,
                familyMemberId,
                title: `Event ${i}`,
                startTime: new Date(`2024-01-01T${String(startHour).padStart(2, '0')}:00:00`),
                endTime: new Date(`2024-01-01T${String(startHour + 1).padStart(2, '0')}:00:00`),
                source: 'internal',
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'user-1',
                isDeleted: false,
              });
            }

            const service = new TimeBookingSuggestionService();
            const weekStart = new Date('2024-01-01');
            const weekEnd = new Date('2024-01-01');

            const slots = service.findAvailableTimeSlots(events, familyMemberId, weekStart, weekEnd);

            // Verify no suggested slot overlaps with any event
            for (const slot of slots) {
              for (const event of events) {
                const slotStart = slot.startTime.getTime();
                const slotEnd = slot.endTime.getTime();
                const eventStart = event.startTime.getTime();
                const eventEnd = event.endTime.getTime();

                // Check for overlap
                const hasOverlap = slotStart < eventEnd && slotEnd > eventStart;
                expect(hasOverlap).toBe(false);
              }
            }
          })
        );
      }
    );
  });
});
