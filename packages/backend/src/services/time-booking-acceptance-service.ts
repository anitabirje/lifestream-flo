/**
 * Time Booking Acceptance Service
 * Handles accepting, modifying, and dismissing time booking suggestions
 * Creates calendar events when suggestions are accepted
 * Requirements: 5a.11, 5a.12
 */

import { BookingSuggestion, TimeSlot } from '../models/booking-suggestion';
import { Event } from '../models/event';
import { BookingSuggestionRepository } from './booking-suggestion-repository';
import { EventManagementService } from './event-management-service';

export interface AcceptSuggestionRequest {
  familyId: string;
  suggestionId: string;
  acceptedSlots: TimeSlot[];
  userId: string; // User accepting the suggestion
}

export interface ModifySuggestionRequest {
  familyId: string;
  suggestionId: string;
  modifiedSlots: TimeSlot[];
  userId: string;
}

export interface DismissSuggestionRequest {
  familyId: string;
  suggestionId: string;
  userId: string;
}

export interface AcceptanceResult {
  success: boolean;
  suggestion: BookingSuggestion;
  createdEvents?: Event[];
  error?: string;
}

export class TimeBookingAcceptanceService {
  constructor(
    private suggestionRepository: BookingSuggestionRepository,
    private eventManagementService: EventManagementService
  ) {}

  /**
   * Accept a booking suggestion and create calendar events
   * Requirements: 5a.11, 5a.12
   */
  async acceptSuggestion(request: AcceptSuggestionRequest): Promise<AcceptanceResult> {
    try {
      // Get the suggestion
      const suggestion = await this.suggestionRepository.getSuggestion(
        request.familyId,
        request.suggestionId
      );

      if (!suggestion) {
        return {
          success: false,
          suggestion: null as any,
          error: 'Booking suggestion not found',
        };
      }

      // Validate accepted slots
      if (!request.acceptedSlots || request.acceptedSlots.length === 0) {
        return {
          success: false,
          suggestion,
          error: 'At least one time slot must be accepted',
        };
      }

      // Update suggestion status to accepted
      const updatedSuggestion = await this.suggestionRepository.acceptSuggestion(
        request.familyId,
        request.suggestionId,
        request.acceptedSlots
      );

      if (!updatedSuggestion) {
        return {
          success: false,
          suggestion,
          error: 'Failed to update suggestion status',
        };
      }

      // Create calendar events for each accepted slot
      const createdEvents: Event[] = [];

      for (const slot of request.acceptedSlots) {
        try {
          const event = await this.eventManagementService.createEvent({
            familyId: request.familyId,
            familyMemberId: suggestion.familyMemberId,
            title: `${suggestion.category} - Booked Time`,
            description: `Proactive time booking for ${suggestion.category}. Target: ${suggestion.targetHours}h, Current: ${suggestion.currentHours}h`,
            startTime: slot.startTime,
            endTime: slot.endTime,
            location: undefined,
            category: suggestion.category,
            source: 'internal',
            createdBy: request.userId,
          });

          createdEvents.push(event);
        } catch (error) {
          console.error(`Failed to create event for slot ${slot.dayOfWeek}:`, error);
          // Continue creating other events even if one fails
        }
      }

      return {
        success: true,
        suggestion: updatedSuggestion,
        createdEvents,
      };
    } catch (error: any) {
      return {
        success: false,
        suggestion: null as any,
        error: error.message || 'Failed to accept booking suggestion',
      };
    }
  }

  /**
   * Modify a booking suggestion with different slots
   * Requirements: 5a.11
   */
  async modifySuggestion(request: ModifySuggestionRequest): Promise<AcceptanceResult> {
    try {
      // Get the suggestion
      const suggestion = await this.suggestionRepository.getSuggestion(
        request.familyId,
        request.suggestionId
      );

      if (!suggestion) {
        return {
          success: false,
          suggestion: null as any,
          error: 'Booking suggestion not found',
        };
      }

      // Validate modified slots
      if (!request.modifiedSlots || request.modifiedSlots.length === 0) {
        return {
          success: false,
          suggestion,
          error: 'At least one time slot must be provided',
        };
      }

      // Update the accepted slots first
      let updatedSuggestion = await this.suggestionRepository.acceptSuggestion(
        request.familyId,
        request.suggestionId,
        request.modifiedSlots
      );

      if (!updatedSuggestion) {
        return {
          success: false,
          suggestion,
          error: 'Failed to update accepted slots',
        };
      }

      // Then update status to 'modified'
      updatedSuggestion = await this.suggestionRepository.updateSuggestionStatus(
        request.familyId,
        request.suggestionId,
        'modified'
      );

      if (!updatedSuggestion) {
        return {
          success: false,
          suggestion,
          error: 'Failed to update suggestion status',
        };
      }

      return {
        success: true,
        suggestion: updatedSuggestion,
      };
    } catch (error: any) {
      return {
        success: false,
        suggestion: null as any,
        error: error.message || 'Failed to modify booking suggestion',
      };
    }
  }

  /**
   * Dismiss a booking suggestion
   * Requirements: 5a.11
   */
  async dismissSuggestion(request: DismissSuggestionRequest): Promise<AcceptanceResult> {
    try {
      // Get the suggestion
      const suggestion = await this.suggestionRepository.getSuggestion(
        request.familyId,
        request.suggestionId
      );

      if (!suggestion) {
        return {
          success: false,
          suggestion: null as any,
          error: 'Booking suggestion not found',
        };
      }

      // Update suggestion status to dismissed
      const updatedSuggestion = await this.suggestionRepository.dismissSuggestion(
        request.familyId,
        request.suggestionId
      );

      if (!updatedSuggestion) {
        return {
          success: false,
          suggestion,
          error: 'Failed to dismiss suggestion',
        };
      }

      return {
        success: true,
        suggestion: updatedSuggestion,
      };
    } catch (error: any) {
      return {
        success: false,
        suggestion: null as any,
        error: error.message || 'Failed to dismiss booking suggestion',
      };
    }
  }

  /**
   * Calculate total duration of accepted slots
   */
  calculateTotalDuration(slots: TimeSlot[]): number {
    return slots.reduce((total, slot) => total + slot.durationHours, 0);
  }

  /**
   * Validate that accepted slots match the shortfall
   */
  validateSlotsMatchShortfall(slots: TimeSlot[], shortfallHours: number, tolerance: number = 0.5): boolean {
    const totalDuration = this.calculateTotalDuration(slots);
    return Math.abs(totalDuration - shortfallHours) <= tolerance;
  }
}
