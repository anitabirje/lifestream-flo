/**
 * Tests for Time Booking Acceptance Service
 * Property-based tests for accepting, modifying, and dismissing time booking suggestions
 * Requirements: 5a.11, 5a.12
 */

import fc from 'fast-check';
import { TimeBookingAcceptanceService } from '../time-booking-acceptance-service';
import { BookingSuggestionRepository } from '../booking-suggestion-repository';
import { EventManagementService } from '../event-management-service';
import { BookingSuggestion, TimeSlot } from '../../models/booking-suggestion';
import { Event } from '../../models/event';

// Mock implementations
class MockBookingSuggestionRepository implements Partial<BookingSuggestionRepository> {
  private suggestions: Map<string, BookingSuggestion> = new Map();

  async getSuggestion(familyId: string, suggestionId: string): Promise<BookingSuggestion | null> {
    return this.suggestions.get(suggestionId) || null;
  }

  async acceptSuggestion(
    familyId: string,
    suggestionId: string,
    acceptedSlots: TimeSlot[]
  ): Promise<BookingSuggestion | null> {
    const suggestion = this.suggestions.get(suggestionId);
    if (!suggestion) return null;

    const updated = {
      ...suggestion,
      status: 'accepted' as const,
      acceptedSlots,
      updatedAt: new Date(),
    };
    this.suggestions.set(suggestionId, updated);
    return updated;
  }

  async updateSuggestionStatus(
    familyId: string,
    suggestionId: string,
    status: 'pending' | 'accepted' | 'dismissed' | 'modified'
  ): Promise<BookingSuggestion | null> {
    const suggestion = this.suggestions.get(suggestionId);
    if (!suggestion) return null;

    const updated = {
      ...suggestion,
      status,
      updatedAt: new Date(),
    };
    this.suggestions.set(suggestionId, updated);
    return updated;
  }

  async dismissSuggestion(familyId: string, suggestionId: string): Promise<BookingSuggestion | null> {
    const suggestion = this.suggestions.get(suggestionId);
    if (!suggestion) return null;

    const updated = {
      ...suggestion,
      status: 'dismissed' as const,
      dismissedAt: new Date(),
      updatedAt: new Date(),
    };
    this.suggestions.set(suggestionId, updated);
    return updated;
  }

  setSuggestion(suggestion: BookingSuggestion): void {
    this.suggestions.set(suggestion.id, suggestion);
  }
}

class MockEventManagementService implements Partial<EventManagementService> {
  private events: Event[] = [];

  async createEvent(request: any): Promise<Event> {
    const event: Event = {
      id: `event-${Date.now()}`,
      familyId: request.familyId,
      familyMemberId: request.familyMemberId,
      title: request.title,
      description: request.description,
      startTime: request.startTime,
      endTime: request.endTime,
      location: request.location,
      category: request.category,
      source: request.source || 'internal',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: request.createdBy,
      isDeleted: false,
    };
    this.events.push(event);
    return event;
  }

  getCreatedEvents(): Event[] {
    return this.events;
  }
}

describe('TimeBookingAcceptanceService', () => {
  let service: TimeBookingAcceptanceService;
  let mockSuggestionRepository: MockBookingSuggestionRepository;
  let mockEventManagementService: MockEventManagementService;

  beforeEach(() => {
    mockSuggestionRepository = new MockBookingSuggestionRepository();
    mockEventManagementService = new MockEventManagementService();
    service = new TimeBookingAcceptanceService(
      mockSuggestionRepository as any,
      mockEventManagementService as any
    );
  });

  describe('acceptSuggestion', () => {
    test('should accept suggestion and create calendar events', async () => {
      const familyId = 'family-1';
      const suggestionId = 'suggestion-1';
      const familyMemberId = 'member-1';

      // Create a suggestion
      const suggestion: BookingSuggestion = {
        id: suggestionId,
        familyId,
        familyMemberId,
        category: 'Health/Fitness',
        categoryId: 'cat-1',
        currentHours: 1,
        targetHours: 3,
        shortfallHours: 2,
        suggestedSlots: [
          {
            startTime: new Date('2024-01-01T18:00:00'),
            endTime: new Date('2024-01-01T20:00:00'),
            durationHours: 2,
            dayOfWeek: 'Monday',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'pending',
      };

      mockSuggestionRepository.setSuggestion(suggestion);

      const result = await service.acceptSuggestion({
        familyId,
        suggestionId,
        acceptedSlots: suggestion.suggestedSlots,
        userId: 'user-1',
      });

      expect(result.success).toBe(true);
      expect(result.suggestion.status).toBe('accepted');
      expect(result.createdEvents).toHaveLength(1);
      expect(result.createdEvents![0].title).toContain('Health/Fitness');
      expect(result.createdEvents![0].startTime).toEqual(suggestion.suggestedSlots[0].startTime);
    });

    test('should fail if suggestion not found', async () => {
      const result = await service.acceptSuggestion({
        familyId: 'family-1',
        suggestionId: 'nonexistent',
        acceptedSlots: [],
        userId: 'user-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    test('should fail if no accepted slots provided', async () => {
      const familyId = 'family-1';
      const suggestionId = 'suggestion-1';

      const suggestion: BookingSuggestion = {
        id: suggestionId,
        familyId,
        familyMemberId: 'member-1',
        category: 'Health/Fitness',
        categoryId: 'cat-1',
        currentHours: 1,
        targetHours: 3,
        shortfallHours: 2,
        suggestedSlots: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'pending',
      };

      mockSuggestionRepository.setSuggestion(suggestion);

      const result = await service.acceptSuggestion({
        familyId,
        suggestionId,
        acceptedSlots: [],
        userId: 'user-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('At least one time slot');
    });

    test('should create multiple events for multiple accepted slots', async () => {
      const familyId = 'family-1';
      const suggestionId = 'suggestion-1';
      const familyMemberId = 'member-1';

      const slots: TimeSlot[] = [
        {
          startTime: new Date('2024-01-01T18:00:00'),
          endTime: new Date('2024-01-01T19:00:00'),
          durationHours: 1,
          dayOfWeek: 'Monday',
        },
        {
          startTime: new Date('2024-01-02T18:00:00'),
          endTime: new Date('2024-01-02T19:00:00'),
          durationHours: 1,
          dayOfWeek: 'Tuesday',
        },
      ];

      const suggestion: BookingSuggestion = {
        id: suggestionId,
        familyId,
        familyMemberId,
        category: 'Health/Fitness',
        categoryId: 'cat-1',
        currentHours: 1,
        targetHours: 3,
        shortfallHours: 2,
        suggestedSlots: slots,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'pending',
      };

      mockSuggestionRepository.setSuggestion(suggestion);

      const result = await service.acceptSuggestion({
        familyId,
        suggestionId,
        acceptedSlots: slots,
        userId: 'user-1',
      });

      expect(result.success).toBe(true);
      expect(result.createdEvents).toHaveLength(2);
    });
  });

  describe('modifySuggestion', () => {
    test('should modify suggestion with different slots', async () => {
      const familyId = 'family-1';
      const suggestionId = 'suggestion-1';
      const familyMemberId = 'member-1';

      const suggestion: BookingSuggestion = {
        id: suggestionId,
        familyId,
        familyMemberId,
        category: 'Health/Fitness',
        categoryId: 'cat-1',
        currentHours: 1,
        targetHours: 3,
        shortfallHours: 2,
        suggestedSlots: [
          {
            startTime: new Date('2024-01-01T18:00:00'),
            endTime: new Date('2024-01-01T20:00:00'),
            durationHours: 2,
            dayOfWeek: 'Monday',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'pending',
      };

      mockSuggestionRepository.setSuggestion(suggestion);

      const modifiedSlots: TimeSlot[] = [
        {
          startTime: new Date('2024-01-01T19:00:00'),
          endTime: new Date('2024-01-01T21:00:00'),
          durationHours: 2,
          dayOfWeek: 'Monday',
        },
      ];

      const result = await service.modifySuggestion({
        familyId,
        suggestionId,
        modifiedSlots,
        userId: 'user-1',
      });

      expect(result.success).toBe(true);
      expect(result.suggestion.status).toBe('modified');
      expect(result.suggestion.acceptedSlots).toEqual(modifiedSlots);
    });

    test('should fail if suggestion not found', async () => {
      const result = await service.modifySuggestion({
        familyId: 'family-1',
        suggestionId: 'nonexistent',
        modifiedSlots: [],
        userId: 'user-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('dismissSuggestion', () => {
    test('should dismiss suggestion', async () => {
      const familyId = 'family-1';
      const suggestionId = 'suggestion-1';

      const suggestion: BookingSuggestion = {
        id: suggestionId,
        familyId,
        familyMemberId: 'member-1',
        category: 'Health/Fitness',
        categoryId: 'cat-1',
        currentHours: 1,
        targetHours: 3,
        shortfallHours: 2,
        suggestedSlots: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'pending',
      };

      mockSuggestionRepository.setSuggestion(suggestion);

      const result = await service.dismissSuggestion({
        familyId,
        suggestionId,
        userId: 'user-1',
      });

      expect(result.success).toBe(true);
      expect(result.suggestion.status).toBe('dismissed');
      expect(result.suggestion.dismissedAt).toBeDefined();
    });

    test('should fail if suggestion not found', async () => {
      const result = await service.dismissSuggestion({
        familyId: 'family-1',
        suggestionId: 'nonexistent',
        userId: 'user-1',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('calculateTotalDuration', () => {
    test('should calculate total duration of slots', () => {
      const slots: TimeSlot[] = [
        {
          startTime: new Date('2024-01-01T18:00:00'),
          endTime: new Date('2024-01-01T19:00:00'),
          durationHours: 1,
          dayOfWeek: 'Monday',
        },
        {
          startTime: new Date('2024-01-02T18:00:00'),
          endTime: new Date('2024-01-02T20:00:00'),
          durationHours: 2,
          dayOfWeek: 'Tuesday',
        },
      ];

      const total = service.calculateTotalDuration(slots);

      expect(total).toBe(3);
    });
  });

  describe('validateSlotsMatchShortfall', () => {
    test('should validate slots match shortfall', () => {
      const slots: TimeSlot[] = [
        {
          startTime: new Date('2024-01-01T18:00:00'),
          endTime: new Date('2024-01-01T20:00:00'),
          durationHours: 2,
          dayOfWeek: 'Monday',
        },
      ];

      const isValid = service.validateSlotsMatchShortfall(slots, 2);

      expect(isValid).toBe(true);
    });

    test('should fail if slots do not match shortfall', () => {
      const slots: TimeSlot[] = [
        {
          startTime: new Date('2024-01-01T18:00:00'),
          endTime: new Date('2024-01-01T19:00:00'),
          durationHours: 1,
          dayOfWeek: 'Monday',
        },
      ];

      const isValid = service.validateSlotsMatchShortfall(slots, 3);

      expect(isValid).toBe(false);
    });

    test('should allow tolerance in slot matching', () => {
      const slots: TimeSlot[] = [
        {
          startTime: new Date('2024-01-01T18:00:00'),
          endTime: new Date('2024-01-01T19:30:00'),
          durationHours: 1.5,
          dayOfWeek: 'Monday',
        },
      ];

      const isValid = service.validateSlotsMatchShortfall(slots, 2, 1);

      expect(isValid).toBe(true);
    });
  });

  // Property-based tests
  describe('Property 56: Time Booking Acceptance', () => {
    it(
      'should create events for all accepted slots',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.array(
              fc.record({
                startHour: fc.integer({ min: 6, max: 20 }),
                duration: fc.float({ min: 0.5, max: 4 }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            async (slotData: Array<{ startHour: number; duration: number }>) => {
              const familyId = 'family-1';
              const suggestionId = 'suggestion-1';
              const familyMemberId = 'member-1';

              const slots: TimeSlot[] = slotData.map((data, i) => ({
                startTime: new Date(`2024-01-0${i + 1}T${String(data.startHour).padStart(2, '0')}:00:00`),
                endTime: new Date(
                  `2024-01-0${i + 1}T${String(data.startHour + Math.floor(data.duration)).padStart(2, '0')}:${String(Math.round((data.duration % 1) * 60)).padStart(2, '0')}:00`
                ),
                durationHours: data.duration,
                dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][i % 5],
              }));

              const suggestion: BookingSuggestion = {
                id: suggestionId,
                familyId,
                familyMemberId,
                category: 'Health/Fitness',
                categoryId: 'cat-1',
                currentHours: 1,
                targetHours: 3,
                shortfallHours: 2,
                suggestedSlots: slots,
                createdAt: new Date(),
                updatedAt: new Date(),
                status: 'pending',
              };

              mockSuggestionRepository.setSuggestion(suggestion);

              const result = await service.acceptSuggestion({
                familyId,
                suggestionId,
                acceptedSlots: slots,
                userId: 'user-1',
              });

              // Verify success
              expect(result.success).toBe(true);

              // Verify events created for each slot
              expect(result.createdEvents).toHaveLength(slots.length);

              // Verify each event has correct time range
              for (let i = 0; i < result.createdEvents!.length; i++) {
                const event = result.createdEvents![i];
                const slot = slots[i];
                expect(event.startTime).toEqual(slot.startTime);
                expect(event.endTime).toEqual(slot.endTime);
              }
            }
          )
        );
      }
    );

    it(
      'should update suggestion status to accepted',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.record({
              currentHours: fc.float({ min: 0, max: 5 }),
              targetHours: fc.float({ min: 1, max: 10 }),
            }),
            async (data: { currentHours: number; targetHours: number }) => {
              const familyId = 'family-1';
              const suggestionId = 'suggestion-1';
              const familyMemberId = 'member-1';

              const slots: TimeSlot[] = [
                {
                  startTime: new Date('2024-01-01T18:00:00'),
                  endTime: new Date('2024-01-01T20:00:00'),
                  durationHours: 2,
                  dayOfWeek: 'Monday',
                },
              ];

              const suggestion: BookingSuggestion = {
                id: suggestionId,
                familyId,
                familyMemberId,
                category: 'Health/Fitness',
                categoryId: 'cat-1',
                currentHours: data.currentHours,
                targetHours: data.targetHours,
                shortfallHours: Math.max(0, data.targetHours - data.currentHours),
                suggestedSlots: slots,
                createdAt: new Date(),
                updatedAt: new Date(),
                status: 'pending',
              };

              mockSuggestionRepository.setSuggestion(suggestion);

              const result = await service.acceptSuggestion({
                familyId,
                suggestionId,
                acceptedSlots: slots,
                userId: 'user-1',
              });

              expect(result.success).toBe(true);
              expect(result.suggestion.status).toBe('accepted');
              expect(result.suggestion.acceptedSlots).toEqual(slots);
            }
          )
        );
      }
    );
  });
});
