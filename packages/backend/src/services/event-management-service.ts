/**
 * Event Management Service
 * Handles event creation, updates, deletions, and synchronization with external calendars
 */

import { v4 as uuidv4 } from 'uuid';
import { DynamoDBDataAccess } from '../data-access/dynamodb-client';
import {
  Event,
  EventData,
  EventDynamoDBItem,
  EventSource,
  ActivityCategoryName,
  eventToDynamoDB,
  eventFromDynamoDB,
  validateEventForCreation,
  validateEventData,
} from '../models/event';
import { AgentTaskDispatcher } from './agent-task-dispatcher';
import { AuditLogger } from '../services/audit-logger';

export interface CreateEventRequest {
  familyId: string;
  familyMemberId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  category?: ActivityCategoryName;
  attendees?: string[];
  source?: EventSource;
  externalId?: string;
  sourceId?: string;
  createdBy: string;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  location?: string;
  category?: ActivityCategoryName;
  attendees?: string[];
}

export interface SyncResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

export class EventManagementService {
  constructor(
    private dataAccess: DynamoDBDataAccess,
    private agentDispatcher: AgentTaskDispatcher,
    private auditLogger: AuditLogger
  ) {}

  /**
   * Create a new event
   */
  async createEvent(request: CreateEventRequest): Promise<Event> {
    // Validate input
    const validation = validateEventForCreation(
      {
        title: request.title,
        description: request.description,
        startTime: request.startTime,
        endTime: request.endTime,
        location: request.location,
        category: request.category,
        attendees: request.attendees,
      },
      request.familyId,
      request.familyMemberId,
      request.createdBy
    );

    if (!validation.valid) {
      throw new Error(`Event validation failed: ${validation.errors.join(', ')}`);
    }

    const eventId = uuidv4();
    const now = new Date();

    const event: Event = {
      id: eventId,
      familyId: request.familyId,
      familyMemberId: request.familyMemberId,
      title: request.title,
      description: request.description,
      startTime: request.startTime,
      endTime: request.endTime,
      location: request.location,
      category: request.category as any,
      attendees: request.attendees,
      source: request.source || 'internal',
      externalId: request.externalId,
      sourceId: request.sourceId,
      createdAt: now,
      updatedAt: now,
      createdBy: request.createdBy,
      isDeleted: false,
    };

    // Store in database
    const dbItem = eventToDynamoDB(event);
    await this.dataAccess.putItem(dbItem as any);

    // Log audit entry
    await this.auditLogger.logEventChange(
      request.familyId,
      eventId,
      'created',
      request.createdBy,
      undefined,
      event
    );

    // Sync to external calendar if source is specified
    if (request.source && request.source !== 'internal') {
      try {
        await this.syncEventToExternalCalendar(event, 'create');
      } catch (error) {
        console.error('Failed to sync event to external calendar:', error);
        // Don't fail the operation if sync fails - event is already created locally
      }
    }

    return event;
  }

  /**
   * Update an existing event
   */
  async updateEvent(
    familyId: string,
    eventId: string,
    updates: UpdateEventRequest,
    updatedBy: string
  ): Promise<Event | null> {
    // Get existing event
    const existingItem = await this.dataAccess.getItem(
      `FAMILY#${familyId}`,
      `EVENT#${eventId}`
    );

    if (!existingItem) {
      return null;
    }

    const existingEvent = eventFromDynamoDB(existingItem as EventDynamoDBItem);

    // Validate update data
    const validation = validateEventData(updates);
    if (!validation.valid) {
      throw new Error(`Event validation failed: ${validation.errors.join(', ')}`);
    }

    // Create updated event
    const updatedEvent: Event = {
      ...existingEvent,
      title: updates.title ?? existingEvent.title,
      description: updates.description ?? existingEvent.description,
      startTime: updates.startTime ?? existingEvent.startTime,
      endTime: updates.endTime ?? existingEvent.endTime,
      location: updates.location ?? existingEvent.location,
      category: updates.category ?? existingEvent.category,
      attendees: updates.attendees ?? existingEvent.attendees,
      updatedAt: new Date(),
    };

    // Store updated event
    const dbItem = eventToDynamoDB(updatedEvent);
    await this.dataAccess.putItem(dbItem as any);

    // Log audit entry
    await this.auditLogger.logEventChange(
      familyId,
      eventId,
      'updated',
      updatedBy,
      existingEvent,
      updatedEvent
    );

    // Sync to external calendar if applicable
    if (existingEvent.source && existingEvent.source !== 'internal') {
      try {
        await this.syncEventToExternalCalendar(updatedEvent, 'update');
      } catch (error) {
        console.error('Failed to sync event update to external calendar:', error);
      }
    }

    return updatedEvent;
  }

  /**
   * Delete an event
   */
  async deleteEvent(
    familyId: string,
    eventId: string,
    deletedBy: string
  ): Promise<boolean> {
    // Get existing event
    const existingItem = await this.dataAccess.getItem(
      `FAMILY#${familyId}`,
      `EVENT#${eventId}`
    );

    if (!existingItem) {
      return false;
    }

    const existingEvent = eventFromDynamoDB(existingItem as EventDynamoDBItem);

    // Mark as deleted instead of hard delete
    const deletedEvent: Event = {
      ...existingEvent,
      isDeleted: true,
      updatedAt: new Date(),
    };

    const dbItem = eventToDynamoDB(deletedEvent);
    await this.dataAccess.putItem(dbItem as any);

    // Log audit entry
    await this.auditLogger.logEventChange(
      familyId,
      eventId,
      'deleted',
      deletedBy,
      existingEvent,
      undefined
    );

    // Sync deletion to external calendar if applicable
    if (existingEvent.source && existingEvent.source !== 'internal') {
      try {
        await this.syncEventToExternalCalendar(existingEvent, 'delete');
      } catch (error) {
        console.error('Failed to sync event deletion to external calendar:', error);
      }
    }

    return true;
  }

  /**
   * Get a single event
   */
  async getEvent(familyId: string, eventId: string): Promise<Event | null> {
    const item = await this.dataAccess.getItem(
      `FAMILY#${familyId}`,
      `EVENT#${eventId}`
    );

    if (!item) {
      return null;
    }

    return eventFromDynamoDB(item as EventDynamoDBItem);
  }

  /**
   * List events for a family with optional filters
   */
  async listEvents(
    familyId: string,
    options?: {
      familyMemberId?: string;
      startDate?: Date;
      endDate?: Date;
      includeDeleted?: boolean;
    }
  ): Promise<Event[]> {
    // Query all events for the family
    const items = await this.dataAccess.query(
      `FAMILY#${familyId}`,
      'EVENT#'
    );

    let events = items.map((item) => eventFromDynamoDB(item as EventDynamoDBItem));

    // Filter by family member if specified
    if (options?.familyMemberId) {
      events = events.filter((e) => e.familyMemberId === options.familyMemberId);
    }

    // Filter by date range if specified
    if (options?.startDate || options?.endDate) {
      events = events.filter((e) => {
        if (options.startDate && e.endTime < options.startDate) {
          return false;
        }
        if (options.endDate && e.startTime > options.endDate) {
          return false;
        }
        return true;
      });
    }

    // Filter out deleted events unless explicitly requested
    if (!options?.includeDeleted) {
      events = events.filter((e) => !e.isDeleted);
    }

    return events;
  }

  /**
   * List events for a specific family member
   */
  async listEventsByMember(
    familyId: string,
    familyMemberId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<Event[]> {
    return this.listEvents(familyId, {
      familyMemberId,
      startDate: options?.startDate,
      endDate: options?.endDate,
    });
  }

  /**
   * Sync event to external calendar via agent
   */
  private async syncEventToExternalCalendar(
    event: Event,
    operation: 'create' | 'update' | 'delete'
  ): Promise<SyncResult> {
    try {
      // Dispatch sync task to appropriate agent based on operation
      let result;
      
      if (operation === 'create') {
        result = await this.agentDispatcher.dispatchCreateEventOperation(
          event.sourceId || event.familyId,
          {
            title: event.title,
            description: event.description,
            startTime: event.startTime,
            endTime: event.endTime,
            location: event.location,
            attendees: event.attendees,
          },
          event.familyId
        );
      } else if (operation === 'update') {
        result = await this.agentDispatcher.dispatchUpdateEventOperation(
          event.sourceId || event.familyId,
          event.externalId || event.id,
          {
            title: event.title,
            description: event.description,
            startTime: event.startTime,
            endTime: event.endTime,
            location: event.location,
            attendees: event.attendees,
          },
          event.familyId
        );
      } else if (operation === 'delete') {
        result = await this.agentDispatcher.dispatchDeleteEventOperation(
          event.sourceId || event.familyId,
          event.externalId || event.id,
          event.familyId
        );
      }

      if (result && result.status === 'dispatched') {
        return {
          success: true,
          externalId: event.externalId || event.id,
        };
      } else {
        return {
          success: false,
          error: result?.error || 'Unknown error',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
