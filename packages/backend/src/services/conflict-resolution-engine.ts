/**
 * Conflict Resolution Engine
 * Analyzes conflicting events and generates resolution suggestions
 * Supports different resolution strategies based on event types
 */

import { Event } from '../models/event';
import { DynamoDBDataAccess } from '../data-access/dynamodb-client';

export interface ResolutionSuggestion {
  id: string;
  type: 'reschedule' | 'delegate' | 'cancel' | 'split';
  title: string;
  description: string;
  affectedEvents: string[]; // Event IDs
  feasibilityScore: number; // 0-100, higher is more feasible
  estimatedImpact: string;
  requiredActions: string[];
  alternativeSlots?: Array<{ start: Date; end: Date }>;
  alternativeMembers?: Array<{ memberId: string; name: string; availability: number }>;
}

export interface ConflictAnalysis {
  event1: Event;
  event2: Event;
  conflictType: 'overlap' | 'adjacent';
  overlapDurationMs: number;
  eventTypes: { event1Type: string; event2Type: string };
  suggestions: ResolutionSuggestion[];
  recommendedSuggestion?: ResolutionSuggestion;
}

export class ConflictResolutionEngine {
  constructor(private dataAccess: DynamoDBDataAccess) {}

  /**
   * Analyze conflicting events and generate resolution suggestions
   */
  async analyzeConflict(
    event1: Event,
    event2: Event,
    allFamilyEvents: Event[],
    familyMembers: Array<{ id: string; name: string }>
  ): Promise<ConflictAnalysis> {
    const conflictType = this.determineConflictType(event1, event2);
    const overlapDurationMs = this.calculateOverlapDuration(event1, event2);
    const eventTypes = this.classifyEventTypes(event1, event2);

    // Generate suggestions based on event types
    const suggestions = await this.generateSuggestions(
      event1,
      event2,
      eventTypes,
      allFamilyEvents,
      familyMembers
    );

    // Rank suggestions by feasibility
    suggestions.sort((a, b) => b.feasibilityScore - a.feasibilityScore);

    return {
      event1,
      event2,
      conflictType,
      overlapDurationMs,
      eventTypes,
      suggestions,
      recommendedSuggestion: suggestions.length > 0 ? suggestions[0] : undefined,
    };
  }

  /**
   * Determine conflict type (overlap or adjacent)
   */
  private determineConflictType(event1: Event, event2: Event): 'overlap' | 'adjacent' {
    const start1 = event1.startTime.getTime();
    const end1 = event1.endTime.getTime();
    const start2 = event2.startTime.getTime();
    const end2 = event2.endTime.getTime();

    // Check for overlap
    if (start1 < end2 && start2 < end1) {
      return 'overlap';
    }

    // Adjacent events
    return 'adjacent';
  }

  /**
   * Calculate overlap duration in milliseconds
   */
  private calculateOverlapDuration(event1: Event, event2: Event): number {
    const start1 = event1.startTime.getTime();
    const end1 = event1.endTime.getTime();
    const start2 = event2.startTime.getTime();
    const end2 = event2.endTime.getTime();

    if (start1 < end2 && start2 < end1) {
      const overlapStart = Math.max(start1, start2);
      const overlapEnd = Math.min(end1, end2);
      return overlapEnd - overlapStart;
    }

    return 0;
  }

  /**
   * Classify event types for better resolution suggestions
   */
  private classifyEventTypes(event1: Event, event2: Event): { event1Type: string; event2Type: string } {
    const classifyEvent = (event: Event): string => {
      const title = event.title.toLowerCase();
      const description = (event.description || '').toLowerCase();
      const combined = `${title} ${description}`;

      if (combined.includes('pickup') || combined.includes('dropoff') || combined.includes('drop off')) {
        return 'pickup_dropoff';
      }
      if (combined.includes('meeting') || combined.includes('call') || combined.includes('conference')) {
        return 'meeting';
      }
      if (combined.includes('appointment') || combined.includes('doctor') || combined.includes('dentist')) {
        return 'appointment';
      }
      if (combined.includes('class') || combined.includes('lesson') || combined.includes('training')) {
        return 'class';
      }
      if (combined.includes('work') || combined.includes('project') || combined.includes('deadline')) {
        return 'work';
      }
      if (combined.includes('personal') || combined.includes('break') || combined.includes('lunch')) {
        return 'personal';
      }

      return 'other';
    };

    return {
      event1Type: classifyEvent(event1),
      event2Type: classifyEvent(event2),
    };
  }

  /**
   * Generate resolution suggestions based on event types
   */
  private async generateSuggestions(
    event1: Event,
    event2: Event,
    eventTypes: { event1Type: string; event2Type: string },
    allFamilyEvents: Event[],
    familyMembers: Array<{ id: string; name: string }>
  ): Promise<ResolutionSuggestion[]> {
    const suggestions: ResolutionSuggestion[] = [];

    // Suggestion 1: Reschedule event1
    const rescheduleEvent1 = await this.createRescheduleOption(
      event1,
      event2,
      allFamilyEvents,
      'event1'
    );
    if (rescheduleEvent1) {
      suggestions.push(rescheduleEvent1);
    }

    // Suggestion 2: Reschedule event2
    const rescheduleEvent2 = await this.createRescheduleOption(
      event2,
      event1,
      allFamilyEvents,
      'event2'
    );
    if (rescheduleEvent2) {
      suggestions.push(rescheduleEvent2);
    }

    // Suggestion 3: Delegate to another family member (for pickup/dropoff)
    if (eventTypes.event1Type === 'pickup_dropoff' || eventTypes.event2Type === 'pickup_dropoff') {
      const delegateSuggestion = this.createDelegateOption(
        event1,
        event2,
        eventTypes,
        familyMembers,
        allFamilyEvents
      );
      if (delegateSuggestion) {
        suggestions.push(delegateSuggestion);
      }
    }

    // Suggestion 4: Cancel less important event
    const cancelSuggestion = this.createCancelOption(event1, event2, eventTypes);
    if (cancelSuggestion) {
      suggestions.push(cancelSuggestion);
    }

    return suggestions;
  }

  /**
   * Create reschedule suggestion
   */
  private async createRescheduleOption(
    eventToReschedule: Event,
    conflictingEvent: Event,
    allFamilyEvents: Event[],
    eventLabel: string
  ): Promise<ResolutionSuggestion | null> {
    // Find available time slots
    const alternativeSlots = this.findAvailableTimeSlots(
      eventToReschedule,
      conflictingEvent,
      allFamilyEvents
    );

    if (alternativeSlots.length === 0) {
      return null;
    }

    return {
      id: `reschedule_${eventLabel}`,
      type: 'reschedule',
      title: `Reschedule "${eventToReschedule.title}"`,
      description: `Move "${eventToReschedule.title}" to an available time slot`,
      affectedEvents: [eventToReschedule.id],
      feasibilityScore: 85,
      estimatedImpact: 'Low - Only affects one event',
      requiredActions: [
        `Update event time in calendar`,
        `Notify attendees of new time`,
      ],
      alternativeSlots: alternativeSlots.slice(0, 3), // Top 3 suggestions
    };
  }

  /**
   * Create delegate suggestion (for pickup/dropoff)
   */
  private createDelegateOption(
    event1: Event,
    event2: Event,
    eventTypes: { event1Type: string; event2Type: string },
    familyMembers: Array<{ id: string; name: string }>,
    allFamilyEvents: Event[]
  ): ResolutionSuggestion | null {
    // Determine which event is pickup/dropoff
    const pickupEvent = eventTypes.event1Type === 'pickup_dropoff' ? event1 : event2;
    const otherEvent = eventTypes.event1Type === 'pickup_dropoff' ? event2 : event1;

    // Find available family members
    const availableMembers = familyMembers
      .filter((member) => member.id !== pickupEvent.familyMemberId)
      .map((member) => {
        const availability = this.calculateMemberAvailability(
          member.id,
          pickupEvent.startTime,
          pickupEvent.endTime,
          allFamilyEvents
        );
        return { memberId: member.id, name: member.name, availability };
      })
      .filter((member) => member.availability > 0)
      .sort((a, b) => b.availability - a.availability);

    if (availableMembers.length === 0) {
      return null;
    }

    return {
      id: 'delegate_pickup',
      type: 'delegate',
      title: `Delegate "${pickupEvent.title}" to another family member`,
      description: `Ask ${availableMembers[0].name} to handle the pickup/dropoff`,
      affectedEvents: [pickupEvent.id],
      feasibilityScore: 75,
      estimatedImpact: 'Medium - Requires coordination with another family member',
      requiredActions: [
        `Notify ${availableMembers[0].name} of the delegation`,
        `Update event assignment`,
      ],
      alternativeMembers: availableMembers.slice(0, 3),
    };
  }

  /**
   * Create cancel suggestion
   */
  private createCancelOption(
    event1: Event,
    event2: Event,
    eventTypes: { event1Type: string; event2Type: string }
  ): ResolutionSuggestion | null {
    // Determine which event is less important
    const priorityScores: Record<string, number> = {
      pickup_dropoff: 100,
      appointment: 90,
      meeting: 80,
      class: 85,
      work: 75,
      personal: 40,
      other: 50,
    };

    const score1 = priorityScores[eventTypes.event1Type] || 50;
    const score2 = priorityScores[eventTypes.event2Type] || 50;

    const lessImportantEvent = score1 < score2 ? event1 : event2;
    const moreImportantEvent = score1 < score2 ? event2 : event1;

    // Only suggest cancellation if the difference is significant
    if (Math.abs(score1 - score2) < 20) {
      return null;
    }

    return {
      id: 'cancel_event',
      type: 'cancel',
      title: `Cancel "${lessImportantEvent.title}"`,
      description: `Cancel the less important event to resolve the conflict`,
      affectedEvents: [lessImportantEvent.id],
      feasibilityScore: 50,
      estimatedImpact: 'High - Cancels an event entirely',
      requiredActions: [
        `Delete event from calendar`,
        `Notify attendees of cancellation`,
      ],
    };
  }

  /**
   * Find available time slots for rescheduling
   */
  private findAvailableTimeSlots(
    eventToReschedule: Event,
    conflictingEvent: Event,
    allFamilyEvents: Event[]
  ): Array<{ start: Date; end: Date }> {
    const slots: Array<{ start: Date; end: Date }> = [];
    const eventDuration = eventToReschedule.endTime.getTime() - eventToReschedule.startTime.getTime();

    // Get the day of the conflicting event
    const conflictDay = new Date(conflictingEvent.startTime);
    conflictDay.setHours(0, 0, 0, 0);

    // Search for available slots in the next 7 days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const searchDay = new Date(conflictDay);
      searchDay.setDate(searchDay.getDate() + dayOffset);

      // Search for slots between 8 AM and 8 PM
      for (let hour = 8; hour < 20; hour++) {
        const slotStart = new Date(searchDay);
        slotStart.setHours(hour, 0, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + eventDuration);

        // Check if slot is available
        const isAvailable = this.isTimeSlotAvailable(
          slotStart,
          slotEnd,
          eventToReschedule.familyMemberId,
          allFamilyEvents
        );

        if (isAvailable) {
          slots.push({ start: slotStart, end: slotEnd });
          if (slots.length >= 5) {
            return slots; // Return top 5 slots
          }
        }
      }
    }

    return slots;
  }

  /**
   * Check if a time slot is available for a family member
   */
  private isTimeSlotAvailable(
    startTime: Date,
    endTime: Date,
    familyMemberId: string,
    allFamilyEvents: Event[]
  ): boolean {
    const memberEvents = allFamilyEvents.filter((e) => e.familyMemberId === familyMemberId);

    for (const event of memberEvents) {
      const eventStart = event.startTime.getTime();
      const eventEnd = event.endTime.getTime();
      const slotStart = startTime.getTime();
      const slotEnd = endTime.getTime();

      // Check for overlap
      if (slotStart < eventEnd && eventStart < slotEnd) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate member availability (0-100)
   */
  private calculateMemberAvailability(
    memberId: string,
    startTime: Date,
    endTime: Date,
    allFamilyEvents: Event[]
  ): number {
    const memberEvents = allFamilyEvents.filter((e) => e.familyMemberId === memberId);

    // Check for conflicts
    for (const event of memberEvents) {
      const eventStart = event.startTime.getTime();
      const eventEnd = event.endTime.getTime();
      const slotStart = startTime.getTime();
      const slotEnd = endTime.getTime();

      if (slotStart < eventEnd && eventStart < slotEnd) {
        return 0; // Not available
      }
    }

    return 100; // Fully available
  }
}
