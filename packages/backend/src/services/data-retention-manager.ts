/**
 * Data Retention Manager Service
 * Manages 3-month data retention policy and sends pre-deletion notifications
 */

import { v4 as uuidv4 } from 'uuid';
import { DynamoDBDataAccess } from '../data-access/dynamodb-client';
import { Event } from '../models/event';

export interface RetentionPolicy {
  eventRetentionDays: number; // 90 days for events
  userDataRetentionDays: number; // Indefinite for user data
  notificationDaysBeforeDeletion: number; // 7 days before deletion
}

export interface DataRetentionNotification {
  PK: string; // USER#<userId>
  SK: string; // RETENTION_NOTIFICATION#<notificationId>
  EntityType: 'RETENTION_NOTIFICATION';
  id: string;
  familyId: string;
  userId: string;
  eventCount: number;
  oldestEventDate: string; // ISO 8601
  deletionDate: string; // ISO 8601
  notificationSentAt: string; // ISO 8601
  acknowledged: boolean;
}

export class DataRetentionManager {
  private readonly retentionPolicy: RetentionPolicy = {
    eventRetentionDays: 90,
    userDataRetentionDays: Infinity, // Indefinite
    notificationDaysBeforeDeletion: 7,
  };

  constructor(private dataAccess: DynamoDBDataAccess) {}

  /**
   * Calculate the cutoff date for event deletion (90 days ago)
   */
  calculateEventCutoffDate(): Date {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionPolicy.eventRetentionDays);
    return cutoffDate;
  }

  /**
   * Calculate the notification date (7 days before deletion)
   */
  calculateNotificationDate(): Date {
    const notificationDate = new Date();
    notificationDate.setDate(
      notificationDate.getDate() - (this.retentionPolicy.eventRetentionDays - this.retentionPolicy.notificationDaysBeforeDeletion)
    );
    return notificationDate;
  }

  /**
   * Find events that should be deleted
   */
  async findEventsForDeletion(familyId: string): Promise<Event[]> {
    try {
      const cutoffDate = this.calculateEventCutoffDate();

      // Query all events for the family
      const items = await this.dataAccess.query(`FAMILY#${familyId}`, 'EVENT#');

      const events = (items as any[]).filter((item) => item.EntityType === 'EVENT') as Event[];

      // Filter events older than cutoff date
      return events.filter((event) => new Date(event.createdAt) < cutoffDate);
    } catch (error) {
      console.error('Failed to find events for deletion:', error);
      throw error;
    }
  }

  /**
   * Find events that should trigger notifications
   */
  async findEventsForNotification(familyId: string): Promise<Event[]> {
    try {
      const notificationDate = this.calculateNotificationDate();

      // Query all events for the family
      const items = await this.dataAccess.query(`FAMILY#${familyId}`, 'EVENT#');

      const events = (items as any[]).filter((item) => item.EntityType === 'EVENT') as Event[];

      // Filter events older than notification date but not yet deleted
      return events.filter(
        (event) =>
          new Date(event.createdAt) < notificationDate &&
          new Date(event.createdAt) >= this.calculateEventCutoffDate()
      );
    } catch (error) {
      console.error('Failed to find events for notification:', error);
      throw error;
    }
  }

  /**
   * Delete old events
   */
  async deleteOldEvents(familyId: string): Promise<number> {
    try {
      const eventsToDelete = await this.findEventsForDeletion(familyId);
      let deletedCount = 0;

      for (const event of eventsToDelete) {
        try {
          await this.dataAccess.deleteItem(`FAMILY#${familyId}`, `EVENT#${event.id}`);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete event ${event.id}:`, error);
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Failed to delete old events:', error);
      throw error;
    }
  }

  /**
   * Send retention notification to user
   */
  async sendRetentionNotification(
    familyId: string,
    userId: string,
    eventsToDelete: Event[]
  ): Promise<void> {
    try {
      if (eventsToDelete.length === 0) {
        return;
      }

      const notificationId = uuidv4();
      const now = new Date();
      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + this.retentionPolicy.notificationDaysBeforeDeletion);

      // Find oldest event
      const oldestEvent = eventsToDelete.reduce((oldest, current) =>
        new Date(current.createdAt) < new Date(oldest.createdAt) ? current : oldest
      );

      const notification: DataRetentionNotification = {
        PK: `USER#${userId}`,
        SK: `RETENTION_NOTIFICATION#${notificationId}`,
        EntityType: 'RETENTION_NOTIFICATION',
        id: notificationId,
        familyId,
        userId,
        eventCount: eventsToDelete.length,
        oldestEventDate: oldestEvent.createdAt.toISOString(),
        deletionDate: deletionDate.toISOString(),
        notificationSentAt: now.toISOString(),
        acknowledged: false,
      };

      await this.dataAccess.putItem(notification as any);
    } catch (error) {
      console.error('Failed to send retention notification:', error);
      throw error;
    }
  }

  /**
   * Get retention notifications for a user
   */
  async getRetentionNotifications(userId: string): Promise<DataRetentionNotification[]> {
    try {
      const items = await this.dataAccess.query(`USER#${userId}`, 'RETENTION_NOTIFICATION#');
      return (items as any[]).filter((item) => item.EntityType === 'RETENTION_NOTIFICATION') as DataRetentionNotification[];
    } catch (error) {
      console.error('Failed to get retention notifications:', error);
      throw error;
    }
  }

  /**
   * Acknowledge a retention notification
   */
  async acknowledgeRetentionNotification(userId: string, notificationId: string): Promise<void> {
    try {
      const notification = await this.dataAccess.getItem(
        `USER#${userId}`,
        `RETENTION_NOTIFICATION#${notificationId}`
      );

      if (notification) {
        const updated = { ...notification, acknowledged: true };
        await this.dataAccess.putItem(updated);
      }
    } catch (error) {
      console.error('Failed to acknowledge retention notification:', error);
      throw error;
    }
  }

  /**
   * Get retention policy
   */
  getRetentionPolicy(): RetentionPolicy {
    return this.retentionPolicy;
  }

  /**
   * Check if user data should be retained indefinitely
   */
  shouldRetainUserData(): boolean {
    return this.retentionPolicy.userDataRetentionDays === Infinity;
  }

  /**
   * Get retention statistics for a family
   */
  async getRetentionStatistics(familyId: string): Promise<{
    totalEvents: number;
    eventsForDeletion: number;
    eventsForNotification: number;
    cutoffDate: Date;
    notificationDate: Date;
  }> {
    try {
      const items = await this.dataAccess.query(`FAMILY#${familyId}`, 'EVENT#');
      const allEvents = (items as any[]).filter((item) => item.EntityType === 'EVENT') as Event[];

      const cutoffDate = this.calculateEventCutoffDate();
      const notificationDate = this.calculateNotificationDate();

      const eventsForDeletion = allEvents.filter((e) => new Date(e.createdAt) < cutoffDate).length;
      const eventsForNotification = allEvents.filter(
        (e) =>
          new Date(e.createdAt) < notificationDate &&
          new Date(e.createdAt) >= cutoffDate
      ).length;

      return {
        totalEvents: allEvents.length,
        eventsForDeletion,
        eventsForNotification,
        cutoffDate,
        notificationDate,
      };
    } catch (error) {
      console.error('Failed to get retention statistics:', error);
      throw error;
    }
  }
}
