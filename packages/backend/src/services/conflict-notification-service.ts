/**
 * Conflict Notification Service
 * Sends notifications when scheduling conflicts are detected
 * Notifies all affected family members
 */

import { NotificationDispatcher, NotificationPayload } from './notification-dispatcher';
import { DynamoDBDataAccess } from '../data-access/dynamodb-client';
import { Event } from '../models/event';

export interface ConflictNotificationPayload {
  familyId: string;
  event1: Event;
  event2: Event;
  conflictType: 'overlap' | 'adjacent';
  severity: 'high' | 'medium' | 'low';
  overlapDurationMs: number;
  affectedMemberIds: string[];
}

export interface ConflictNotificationResult {
  notificationsSent: number;
  failedNotifications: number;
  notificationIds: string[];
}

export class ConflictNotificationService {
  constructor(
    private notificationDispatcher: NotificationDispatcher,
    private dataAccess: DynamoDBDataAccess
  ) {}

  /**
   * Send conflict notifications to affected family members
   */
  async notifyConflict(payload: ConflictNotificationPayload): Promise<ConflictNotificationResult> {
    const notificationIds: string[] = [];
    let failedCount = 0;

    // Get all family members to notify
    const familyMembers = await this.getFamilyMembers(payload.familyId);

    for (const member of familyMembers) {
      try {
        // Build notification content
        const { subject, content, htmlContent } = this.buildConflictNotification(
          payload.event1,
          payload.event2,
          payload.conflictType,
          payload.severity,
          payload.overlapDurationMs
        );

        // Queue notification
        const notificationPayload: NotificationPayload = {
          recipientId: member.id,
          familyId: payload.familyId,
          type: 'conflict_alert',
          subject,
          content,
          htmlContent,
          channels: ['email', 'in_app'],
        };

        const result = await this.notificationDispatcher.queueNotification(notificationPayload);
        notificationIds.push(result.notificationId);
      } catch (error) {
        console.error(`Failed to send conflict notification to member ${member.id}:`, error);
        failedCount++;
      }
    }

    return {
      notificationsSent: notificationIds.length,
      failedNotifications: failedCount,
      notificationIds,
    };
  }

  /**
   * Build conflict notification content
   */
  private buildConflictNotification(
    event1: Event,
    event2: Event,
    conflictType: 'overlap' | 'adjacent',
    severity: 'high' | 'medium' | 'low',
    overlapDurationMs: number
  ): { subject: string; content: string; htmlContent: string } {
    const severityLabel = severity.toUpperCase();
    const overlapMinutes = Math.round(overlapDurationMs / (60 * 1000));

    let conflictDescription = '';
    if (conflictType === 'overlap') {
      conflictDescription = `"${event1.title}" overlaps with "${event2.title}" by ${overlapMinutes} minutes`;
    } else {
      conflictDescription = `"${event1.title}" is immediately followed by "${event2.title}"`;
    }

    const subject = `[${severityLabel}] Scheduling Conflict Detected`;

    const content = `A scheduling conflict has been detected:\n\n${conflictDescription}\n\nEvent 1: ${event1.title}\nTime: ${event1.startTime.toLocaleString()} - ${event1.endTime.toLocaleString()}\n\nEvent 2: ${event2.title}\nTime: ${event2.startTime.toLocaleString()} - ${event2.endTime.toLocaleString()}\n\nPlease review and resolve this conflict.`;

    const htmlContent = `
      <h2>[${severityLabel}] Scheduling Conflict Detected</h2>
      <p>A scheduling conflict has been detected:</p>
      <p><strong>${conflictDescription}</strong></p>
      <h3>Event 1</h3>
      <p><strong>${event1.title}</strong></p>
      <p>Time: ${event1.startTime.toLocaleString()} - ${event1.endTime.toLocaleString()}</p>
      ${event1.location ? `<p>Location: ${event1.location}</p>` : ''}
      ${event1.description ? `<p>Description: ${event1.description}</p>` : ''}
      <h3>Event 2</h3>
      <p><strong>${event2.title}</strong></p>
      <p>Time: ${event2.startTime.toLocaleString()} - ${event2.endTime.toLocaleString()}</p>
      ${event2.location ? `<p>Location: ${event2.location}</p>` : ''}
      ${event2.description ? `<p>Description: ${event2.description}</p>` : ''}
      <p>Please review and resolve this conflict.</p>
    `;

    return { subject, content, htmlContent };
  }

  /**
   * Get all family members for a family
   */
  private async getFamilyMembers(familyId: string): Promise<Array<{ id: string; email: string; name: string }>> {
    try {
      const items = await this.dataAccess.query(`FAMILY#${familyId}`, 'MEMBER#');
      return items.map((item: any) => ({
        id: item.id,
        email: item.email,
        name: item.name,
      }));
    } catch (error) {
      console.error(`Failed to fetch family members for ${familyId}:`, error);
      return [];
    }
  }

  /**
   * Send conflict resolution notification
   */
  async notifyConflictResolution(
    familyId: string,
    event1Id: string,
    event2Id: string,
    resolutionMethod: string,
    affectedMemberIds: string[]
  ): Promise<ConflictNotificationResult> {
    const notificationIds: string[] = [];
    let failedCount = 0;

    for (const memberId of affectedMemberIds) {
      try {
        const subject = 'Scheduling Conflict Resolved';
        const content = `A scheduling conflict has been resolved using: ${resolutionMethod}`;
        const htmlContent = `<h2>Scheduling Conflict Resolved</h2><p>A scheduling conflict has been resolved using: <strong>${resolutionMethod}</strong></p>`;

        const notificationPayload: NotificationPayload = {
          recipientId: memberId,
          familyId,
          type: 'conflict_alert',
          subject,
          content,
          htmlContent,
          channels: ['email', 'in_app'],
        };

        const result = await this.notificationDispatcher.queueNotification(notificationPayload);
        notificationIds.push(result.notificationId);
      } catch (error) {
        console.error(`Failed to send resolution notification to member ${memberId}:`, error);
        failedCount++;
      }
    }

    return {
      notificationsSent: notificationIds.length,
      failedNotifications: failedCount,
      notificationIds,
    };
  }
}
