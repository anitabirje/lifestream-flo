/**
 * Conflict Resolution Applier
 * Applies conflict resolutions and updates affected events
 * Notifies relevant family members of changes
 */

import { Event } from '../models/event';
import { DynamoDBDataAccess } from '../data-access/dynamodb-client';
import { ConflictNotificationService } from './conflict-notification-service';
import { AuditLogger } from './audit-logger';
import { ResolutionSuggestion } from './conflict-resolution-engine';
import { v4 as uuidv4 } from 'uuid';

export interface ResolutionApplication {
  resolutionId: string;
  suggestionId: string;
  type: 'reschedule' | 'delegate' | 'cancel' | 'split';
  appliedAt: Date;
  appliedBy: string;
  affectedEventIds: string[];
  changes: Array<{
    eventId: string;
    previousValues: Record<string, any>;
    newValues: Record<string, any>;
  }>;
  notificationsSent: number;
}

export class ConflictResolutionApplier {
  constructor(
    private dataAccess: DynamoDBDataAccess,
    private notificationService: ConflictNotificationService,
    private auditLogger: AuditLogger
  ) {}

  /**
   * Apply a resolution suggestion
   */
  async applySuggestion(
    suggestion: ResolutionSuggestion,
    event1: Event,
    event2: Event,
    appliedBy: string,
    newEventData?: Partial<Event>
  ): Promise<ResolutionApplication> {
    const resolutionId = uuidv4();
    const now = new Date();
    const changes: ResolutionApplication['changes'] = [];

    try {
      switch (suggestion.type) {
        case 'reschedule':
          return await this.applyReschedule(
            suggestion,
            event1,
            event2,
            appliedBy,
            newEventData,
            resolutionId,
            now
          );

        case 'delegate':
          return await this.applyDelegate(
            suggestion,
            event1,
            event2,
            appliedBy,
            newEventData,
            resolutionId,
            now
          );

        case 'cancel':
          return await this.applyCancel(
            suggestion,
            event1,
            event2,
            appliedBy,
            resolutionId,
            now
          );

        default:
          throw new Error(`Unknown resolution type: ${suggestion.type}`);
      }
    } catch (error) {
      console.error(`Failed to apply resolution ${resolutionId}:`, error);
      throw error;
    }
  }

  /**
   * Apply reschedule resolution
   */
  private async applyReschedule(
    suggestion: ResolutionSuggestion,
    event1: Event,
    event2: Event,
    appliedBy: string,
    newEventData: Partial<Event> | undefined,
    resolutionId: string,
    now: Date
  ): Promise<ResolutionApplication> {
    if (!newEventData || !newEventData.startTime || !newEventData.endTime) {
      throw new Error('New event time is required for reschedule resolution');
    }

    // Determine which event to reschedule
    const eventToReschedule = suggestion.affectedEvents[0] === event1.id ? event1 : event2;
    const previousValues = {
      startTime: eventToReschedule.startTime,
      endTime: eventToReschedule.endTime,
    };

    // Update event
    const updatedEvent: Event = {
      ...eventToReschedule,
      startTime: newEventData.startTime,
      endTime: newEventData.endTime,
      updatedAt: now,
    };

    await this.dataAccess.putItem(this.eventToDynamoDB(updatedEvent));

    // Log audit entry
    await this.auditLogger.logEventChange(
      eventToReschedule.familyId,
      eventToReschedule.id,
      'updated',
      appliedBy,
      eventToReschedule,
      updatedEvent
    );

    // Notify affected members
    const affectedMembers = [eventToReschedule.familyMemberId];
    await this.notificationService.notifyConflictResolution(
      eventToReschedule.familyId,
      event1.id,
      event2.id,
      `Rescheduled "${eventToReschedule.title}" to ${newEventData.startTime.toLocaleString()}`,
      affectedMembers
    );

    return {
      resolutionId,
      suggestionId: suggestion.id,
      type: 'reschedule',
      appliedAt: now,
      appliedBy,
      affectedEventIds: [eventToReschedule.id],
      changes: [
        {
          eventId: eventToReschedule.id,
          previousValues,
          newValues: {
            startTime: updatedEvent.startTime,
            endTime: updatedEvent.endTime,
          },
        },
      ],
      notificationsSent: affectedMembers.length,
    };
  }

  /**
   * Apply delegate resolution
   */
  private async applyDelegate(
    suggestion: ResolutionSuggestion,
    event1: Event,
    event2: Event,
    appliedBy: string,
    newEventData: Partial<Event> | undefined,
    resolutionId: string,
    now: Date
  ): Promise<ResolutionApplication> {
    if (!newEventData || !newEventData.familyMemberId) {
      throw new Error('New family member ID is required for delegate resolution');
    }

    // Determine which event to delegate
    const eventToDelegate = suggestion.affectedEvents[0] === event1.id ? event1 : event2;
    const previousValues = {
      familyMemberId: eventToDelegate.familyMemberId,
    };

    // Update event
    const updatedEvent: Event = {
      ...eventToDelegate,
      familyMemberId: newEventData.familyMemberId,
      updatedAt: now,
    };

    await this.dataAccess.putItem(this.eventToDynamoDB(updatedEvent));

    // Log audit entry
    await this.auditLogger.logEventChange(
      eventToDelegate.familyId,
      eventToDelegate.id,
      'updated',
      appliedBy,
      eventToDelegate,
      updatedEvent
    );

    // Notify affected members
    const affectedMembers = [eventToDelegate.familyMemberId, newEventData.familyMemberId];
    await this.notificationService.notifyConflictResolution(
      eventToDelegate.familyId,
      event1.id,
      event2.id,
      `Delegated "${eventToDelegate.title}" to another family member`,
      affectedMembers
    );

    return {
      resolutionId,
      suggestionId: suggestion.id,
      type: 'delegate',
      appliedAt: now,
      appliedBy,
      affectedEventIds: [eventToDelegate.id],
      changes: [
        {
          eventId: eventToDelegate.id,
          previousValues,
          newValues: {
            familyMemberId: updatedEvent.familyMemberId,
          },
        },
      ],
      notificationsSent: affectedMembers.length,
    };
  }

  /**
   * Apply cancel resolution
   */
  private async applyCancel(
    suggestion: ResolutionSuggestion,
    event1: Event,
    event2: Event,
    appliedBy: string,
    resolutionId: string,
    now: Date
  ): Promise<ResolutionApplication> {
    // Determine which event to cancel
    const eventToCancel = suggestion.affectedEvents[0] === event1.id ? event1 : event2;
    const previousValues = {
      isDeleted: eventToCancel.isDeleted,
    };

    // Mark event as deleted
    const updatedEvent: Event = {
      ...eventToCancel,
      isDeleted: true,
      updatedAt: now,
    };

    await this.dataAccess.putItem(this.eventToDynamoDB(updatedEvent));

    // Log audit entry
    await this.auditLogger.logEventChange(
      eventToCancel.familyId,
      eventToCancel.id,
      'deleted',
      appliedBy,
      eventToCancel,
      updatedEvent
    );

    // Notify affected members
    const affectedMembers = [eventToCancel.familyMemberId];
    await this.notificationService.notifyConflictResolution(
      eventToCancel.familyId,
      event1.id,
      event2.id,
      `Cancelled "${eventToCancel.title}"`,
      affectedMembers
    );

    return {
      resolutionId,
      suggestionId: suggestion.id,
      type: 'cancel',
      appliedAt: now,
      appliedBy,
      affectedEventIds: [eventToCancel.id],
      changes: [
        {
          eventId: eventToCancel.id,
          previousValues,
          newValues: {
            isDeleted: true,
          },
        },
      ],
      notificationsSent: affectedMembers.length,
    };
  }

  /**
   * Convert Event to DynamoDB format
   */
  private eventToDynamoDB(event: Event): any {
    const date = event.startTime.toISOString().split('T')[0];
    return {
      PK: `FAMILY#${event.familyId}`,
      SK: `EVENT#${event.id}`,
      GSI1PK: `FAMILY#${event.familyId}#EVENTS`,
      GSI1SK: `${date}#${event.id}`,
      EntityType: 'EVENT',
      id: event.id,
      familyId: event.familyId,
      familyMemberId: event.familyMemberId,
      title: event.title,
      description: event.description,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      location: event.location,
      category: event.category,
      attendees: event.attendees,
      source: event.source,
      externalId: event.externalId,
      sourceId: event.sourceId,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      createdBy: event.createdBy,
      isDeleted: event.isDeleted,
      classifiedByAgentId: event.classifiedByAgentId,
      classificationConfidence: event.classificationConfidence,
    };
  }
}
