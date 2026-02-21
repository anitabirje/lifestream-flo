/**
 * Extracurricular Activity Service
 * Handles CRUD operations for extracurricular activities
 */

import { DynamoDBDataAccess } from '../data-access/dynamodb-client';
import {
  ExtracurricularActivity,
  activityToDynamoDB,
  activityFromDynamoDB,
  ActivityType,
} from '../models/extracurricular-activity';
import { ExtracurricularCalendarIntegration } from './extracurricular-calendar-integration';
import { v4 as uuidv4 } from 'uuid';

export interface CreateActivityInput {
  familyId: string;
  familyMemberId: string;
  activityType: ActivityType;
  name: string;
  schedule: string;
  location: string;
}

export interface UpdateActivityInput {
  activityType?: ActivityType;
  name?: string;
  schedule?: string;
  location?: string;
}

export class ExtracurricularActivityService {
  private calendarIntegration: ExtracurricularCalendarIntegration;

  constructor(private dataAccess: DynamoDBDataAccess) {
    this.calendarIntegration = new ExtracurricularCalendarIntegration();
  }

  /**
   * Create a new extracurricular activity
   * Also generates calendar events for the activity
   */
  async createActivity(input: CreateActivityInput): Promise<ExtracurricularActivity> {
    const now = new Date();
    const activity: ExtracurricularActivity = {
      id: uuidv4(),
      familyId: input.familyId,
      familyMemberId: input.familyMemberId,
      activityType: input.activityType,
      name: input.name,
      schedule: input.schedule,
      location: input.location,
      createdAt: now,
      updatedAt: now,
    };

    const dynamoItem = activityToDynamoDB(activity);
    await this.dataAccess.putItem(dynamoItem);

    // Generate and store calendar events for this activity
    await this.syncActivityToCalendar(activity);

    return activity;
  }

  /**
   * Sync activity to calendar by generating events
   */
  private async syncActivityToCalendar(activity: ExtracurricularActivity): Promise<void> {
    const events = this.calendarIntegration.generateEventsForActivity(activity, 12);
    
    // Store all generated events in DynamoDB
    for (const event of events) {
      const eventEntity = this.calendarIntegration.eventToDynamoDB(event);
      await this.dataAccess.putItem(eventEntity);
    }
  }

  /**
   * Get an activity by ID
   */
  async getActivity(familyId: string, activityId: string): Promise<ExtracurricularActivity | null> {
    const item = await this.dataAccess.getItem(
      `FAMILY#${familyId}`,
      `EXTRACURRICULAR#${activityId}`
    );

    if (!item) {
      return null;
    }

    return activityFromDynamoDB(item as any);
  }

  /**
   * Update an existing activity
   * Also updates associated calendar events
   */
  async updateActivity(
    familyId: string,
    activityId: string,
    updates: UpdateActivityInput
  ): Promise<ExtracurricularActivity | null> {
    const existing = await this.getActivity(familyId, activityId);
    if (!existing) {
      return null;
    }

    const updated: ExtracurricularActivity = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    const dynamoItem = activityToDynamoDB(updated);
    await this.dataAccess.putItem(dynamoItem);

    // If schedule changed, regenerate calendar events
    if (updates.schedule || updates.name || updates.location) {
      await this.deleteActivityEvents(familyId, activityId);
      await this.syncActivityToCalendar(updated);
    }

    return updated;
  }

  /**
   * Delete calendar events associated with an activity
   */
  private async deleteActivityEvents(familyId: string, activityId: string): Promise<void> {
    // Query all events with this sourceId
    const allEvents = await this.dataAccess.query(
      `FAMILY#${familyId}`,
      'EVENT#'
    );

    // Filter events that belong to this activity
    const activityEvents = allEvents.filter(
      (event: any) => event.source === 'extracurricular' && event.sourceId === activityId
    );

    // Delete each event
    for (const event of activityEvents) {
      await this.dataAccess.deleteItem(event.PK, event.SK);
    }
  }

  /**
   * Delete an activity
   * Also deletes associated calendar events
   */
  async deleteActivity(familyId: string, activityId: string): Promise<boolean> {
    const existing = await this.getActivity(familyId, activityId);
    if (!existing) {
      return false;
    }

    // Delete associated calendar events first
    await this.deleteActivityEvents(familyId, activityId);

    // Delete the activity itself
    await this.dataAccess.deleteItem(
      `FAMILY#${familyId}`,
      `EXTRACURRICULAR#${activityId}`
    );

    return true;
  }

  /**
   * List all activities for a family
   */
  async listActivities(familyId: string): Promise<ExtracurricularActivity[]> {
    const items = await this.dataAccess.query(
      `FAMILY#${familyId}`,
      'EXTRACURRICULAR#'
    );

    return items.map((item) => activityFromDynamoDB(item as any));
  }

  /**
   * List activities for a specific family member
   */
  async listActivitiesByMember(
    familyId: string,
    familyMemberId: string
  ): Promise<ExtracurricularActivity[]> {
    const allActivities = await this.listActivities(familyId);
    return allActivities.filter((activity) => activity.familyMemberId === familyMemberId);
  }
}
