/**
 * Time Booking Suggestion Service
 * Identifies activity categories with insufficient allocated time and suggests available time slots
 * Requirements: 5a.8, 5a.9, 5a.10
 */

import { Event, ActivityCategoryName } from '../models/event';
import { IdealTimeAllocation } from '../models/ideal-time-allocation';
import { TimeAggregator } from './time-aggregator';

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  durationHours: number;
  dayOfWeek: string;
}

export interface BookingSuggestion {
  id: string;
  familyMemberId: string;
  category: ActivityCategoryName;
  categoryId: string;
  currentHours: number;
  targetHours: number;
  shortfallHours: number;
  suggestedSlots: TimeSlot[];
  createdAt: Date;
  status: 'pending' | 'accepted' | 'dismissed' | 'modified';
}

export interface BookingSuggestionRequest {
  familyMemberId: string;
  category: ActivityCategoryName;
  categoryId: string;
  currentHours: number;
  targetHours: number;
  suggestedSlots: TimeSlot[];
}

export class TimeBookingSuggestionService {
  private timeAggregator: TimeAggregator;

  constructor() {
    this.timeAggregator = new TimeAggregator();
  }

  /**
   * Identify activity categories with insufficient allocated time
   * @param events - Array of events for the week
   * @param familyMemberId - Family member to check
   * @param idealAllocations - User's ideal time allocations
   * @param weekStartDate - Start of the week
   * @param weekEndDate - End of the week
   * @returns Array of categories with insufficient time
   */
  identifyInsufficientCategories(
    events: Event[],
    familyMemberId: string,
    idealAllocations: IdealTimeAllocation[],
    weekStartDate: Date,
    weekEndDate: Date
  ): Array<{
    category: ActivityCategoryName;
    categoryId: string;
    currentHours: number;
    targetHours: number;
    shortfallHours: number;
  }> {
    // Get current time allocation for the family member
    const aggregation = this.timeAggregator.aggregateTimeByCategory(
      events,
      familyMemberId,
      weekStartDate,
      weekEndDate
    );

    const currentByCategory = new Map<ActivityCategoryName, number>();
    for (const allocation of aggregation.allocations) {
      currentByCategory.set(allocation.category, allocation.totalHours);
    }

    // Check each ideal allocation
    const insufficient = [];
    for (const ideal of idealAllocations) {
      if (ideal.familyMemberId !== familyMemberId) {
        continue;
      }

      const category = ideal.categoryName as ActivityCategoryName;
      const currentHours = currentByCategory.get(category) || 0;
      const targetHours = ideal.targetValue;

      // Only include if current is less than target (minimum threshold not met)
      if (currentHours < targetHours) {
        insufficient.push({
          category,
          categoryId: ideal.categoryId,
          currentHours,
          targetHours,
          shortfallHours: targetHours - currentHours,
        });
      }
    }

    // Sort by shortfall (largest first)
    insufficient.sort((a, b) => b.shortfallHours - a.shortfallHours);

    return insufficient;
  }

  /**
   * Find available time slots in the schedule
   * @param events - Array of events for the week
   * @param familyMemberId - Family member to find slots for
   * @param weekStartDate - Start of the week
   * @param weekEndDate - End of the week
   * @param minSlotDuration - Minimum duration for a slot in hours (default: 0.5)
   * @returns Array of available time slots
   */
  findAvailableTimeSlots(
    events: Event[],
    familyMemberId: string,
    weekStartDate: Date,
    weekEndDate: Date,
    minSlotDuration: number = 0.5
  ): TimeSlot[] {
    // Filter events for this family member
    const memberEvents = events.filter(
      (e) => e.familyMemberId === familyMemberId && !e.isDeleted
    );

    // Sort events by start time
    memberEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    const slots: TimeSlot[] = [];
    const dayOfWeekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Iterate through each day of the week
    let currentDate = new Date(weekStartDate);
    while (currentDate <= weekEndDate) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(6, 0, 0, 0); // Start from 6 AM

      const dayEnd = new Date(currentDate);
      dayEnd.setHours(22, 0, 0, 0); // End at 10 PM

      // Get events for this day
      const dayEvents = memberEvents.filter((e) => {
        const eventDate = new Date(e.startTime);
        eventDate.setHours(0, 0, 0, 0);
        const checkDate = new Date(currentDate);
        checkDate.setHours(0, 0, 0, 0);
        return eventDate.getTime() === checkDate.getTime();
      });

      // Sort day events by start time
      dayEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      // Find gaps between events
      let currentTime = dayStart;

      for (const event of dayEvents) {
        // Check if there's a gap before this event
        if (currentTime < event.startTime) {
          const gapDuration = (event.startTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
          if (gapDuration >= minSlotDuration) {
            slots.push({
              startTime: new Date(currentTime),
              endTime: new Date(event.startTime),
              durationHours: Math.round(gapDuration * 100) / 100,
              dayOfWeek: dayOfWeekNames[currentDate.getDay()],
            });
          }
        }
        // Move current time to end of event
        currentTime = new Date(Math.max(currentTime.getTime(), event.endTime.getTime()));
      }

      // Check for gap after last event
      if (currentTime < dayEnd) {
        const gapDuration = (dayEnd.getTime() - currentTime.getTime()) / (1000 * 60 * 60);
        if (gapDuration >= minSlotDuration) {
          slots.push({
            startTime: new Date(currentTime),
            endTime: new Date(dayEnd),
            durationHours: Math.round(gapDuration * 100) / 100,
            dayOfWeek: dayOfWeekNames[currentDate.getDay()],
          });
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  }

  /**
   * Generate booking suggestions for insufficient categories
   * @param events - Array of events for the week
   * @param familyMemberId - Family member to generate suggestions for
   * @param idealAllocations - User's ideal time allocations
   * @param weekStartDate - Start of the week
   * @param weekEndDate - End of the week
   * @returns Array of booking suggestions
   */
  generateBookingSuggestions(
    events: Event[],
    familyMemberId: string,
    idealAllocations: IdealTimeAllocation[],
    weekStartDate: Date,
    weekEndDate: Date
  ): BookingSuggestion[] {
    // Identify insufficient categories
    const insufficient = this.identifyInsufficientCategories(
      events,
      familyMemberId,
      idealAllocations,
      weekStartDate,
      weekEndDate
    );

    if (insufficient.length === 0) {
      return [];
    }

    // Find available time slots
    const availableSlots = this.findAvailableTimeSlots(
      events,
      familyMemberId,
      weekStartDate,
      weekEndDate
    );

    if (availableSlots.length === 0) {
      return [];
    }

    // Generate suggestions for each insufficient category
    const suggestions: BookingSuggestion[] = [];

    for (const insufficiency of insufficient) {
      // Find slots that can accommodate the shortfall
      const suitableSlots = this.selectSuitableSlots(
        availableSlots,
        insufficiency.shortfallHours
      );

      if (suitableSlots.length > 0) {
        suggestions.push({
          id: this.generateId(),
          familyMemberId,
          category: insufficiency.category,
          categoryId: insufficiency.categoryId,
          currentHours: insufficiency.currentHours,
          targetHours: insufficiency.targetHours,
          shortfallHours: insufficiency.shortfallHours,
          suggestedSlots: suitableSlots,
          createdAt: new Date(),
          status: 'pending',
        });
      }
    }

    return suggestions;
  }

  /**
   * Select suitable time slots to fill the required duration
   * @param availableSlots - Array of available time slots
   * @param requiredDuration - Required duration in hours
   * @returns Array of selected slots
   */
  private selectSuitableSlots(availableSlots: TimeSlot[], requiredDuration: number): TimeSlot[] {
    // Sort slots by duration (prefer longer slots first)
    const sortedSlots = [...availableSlots].sort((a, b) => b.durationHours - a.durationHours);

    const selected: TimeSlot[] = [];
    let totalDuration = 0;

    for (const slot of sortedSlots) {
      if (totalDuration >= requiredDuration) {
        break;
      }

      // If this slot is larger than needed, split it
      if (totalDuration + slot.durationHours > requiredDuration) {
        const remainingNeeded = requiredDuration - totalDuration;
        const partialSlot: TimeSlot = {
          startTime: new Date(slot.startTime),
          endTime: new Date(slot.startTime.getTime() + remainingNeeded * 60 * 60 * 1000),
          durationHours: Math.round(remainingNeeded * 100) / 100,
          dayOfWeek: slot.dayOfWeek,
        };
        selected.push(partialSlot);
        totalDuration = requiredDuration;
      } else {
        selected.push(slot);
        totalDuration += slot.durationHours;
      }
    }

    return selected;
  }

  /**
   * Generate a unique ID for suggestions
   */
  private generateId(): string {
    return `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format time slot for display
   * @param slot - Time slot to format
   * @returns Formatted string representation
   */
  formatTimeSlot(slot: TimeSlot): string {
    const startTime = slot.startTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const endTime = slot.endTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${slot.dayOfWeek} ${startTime} - ${endTime} (${slot.durationHours}h)`;
  }
}
