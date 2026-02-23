/**
 * Notification Dispatcher Service
 * Sends notifications via email, push, and in-app channels
 * Queues notifications for async delivery
 */

import { DynamoDBDataAccess } from '../data-access/dynamodb-client';
import { EmailNotificationService, EmailPayload } from './email-notification-service';
import { PushNotificationService, PushNotificationPayload } from './push-notification-service';
import { v4 as uuidv4 } from 'uuid';

export interface NotificationPayload {
  recipientId: string;
  familyId: string;
  type: 'threshold_alert' | 'weekly_summary' | 'event_update' | 'conflict_alert';
  subject: string;
  content: string;
  htmlContent?: string;
  channels: ('email' | 'push' | 'in_app')[];
}

export interface DispatchResult {
  notificationId: string;
  status: 'queued' | 'sent' | 'failed';
  channels: {
    email?: { status: 'queued' | 'sent' | 'failed'; error?: string };
    push?: { status: 'queued' | 'sent' | 'failed'; error?: string };
    in_app?: { status: 'queued' | 'sent' | 'failed'; error?: string };
  };
  createdAt: Date;
  sentAt?: Date;
}

export interface NotificationEntity {
  PK: string;
  SK: string;
  EntityType: 'NOTIFICATION';
  id: string;
  familyId: string;
  recipientId: string;
  type: 'threshold_alert' | 'weekly_summary' | 'event_update' | 'conflict_alert';
  subject: string;
  content: string;
  htmlContent?: string;
  channels: ('email' | 'push' | 'in_app')[];
  status: 'pending' | 'sent' | 'failed';
  createdAt: string;
  sentAt?: string;
  failureReason?: string;
  TTL?: number;
}

export class NotificationDispatcher {
  private emailService?: EmailNotificationService;
  private pushService?: PushNotificationService;

  constructor(private dataAccess: DynamoDBDataAccess, emailService?: EmailNotificationService, pushService?: PushNotificationService) {
    this.emailService = emailService;
    this.pushService = pushService;
  }

  /**
   * Set email service (for dependency injection)
   */
  setEmailService(emailService: EmailNotificationService): void {
    this.emailService = emailService;
  }

  /**
   * Set push service (for dependency injection)
   */
  setPushService(pushService: PushNotificationService): void {
    this.pushService = pushService;
  }

  /**
   * Queue a notification for delivery
   */
  async queueNotification(payload: NotificationPayload): Promise<DispatchResult> {
    const notificationId = uuidv4();
    const now = new Date();

    const entity: NotificationEntity = {
      PK: `USER#${payload.recipientId}`,
      SK: `NOTIFICATION#${now.getTime()}#${notificationId}`,
      EntityType: 'NOTIFICATION',
      id: notificationId,
      familyId: payload.familyId,
      recipientId: payload.recipientId,
      type: payload.type,
      subject: payload.subject,
      content: payload.content,
      htmlContent: payload.htmlContent,
      channels: payload.channels,
      status: 'pending',
      createdAt: now.toISOString(),
      TTL: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60, // 90 days TTL
    };

    // Store in DynamoDB
    await this.dataAccess.putItem(entity as any);

    return {
      notificationId,
      status: 'queued',
      channels: {
        email: payload.channels.includes('email') ? { status: 'queued' } : undefined,
        in_app: payload.channels.includes('in_app') ? { status: 'queued' } : undefined,
      },
      createdAt: now,
    };
  }

  /**
   * Send notification via email
   * Integrates with SendGrid for reliable email delivery
   */
  async sendEmailNotification(
    recipientEmail: string,
    subject: string,
    htmlContent: string,
    plainText: string
  ): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
      // If no email service is configured, log and return success
      if (!this.emailService) {
        console.log(`[EMAIL] To: ${recipientEmail}`);
        console.log(`[EMAIL] Subject: ${subject}`);
        console.log(`[EMAIL] Content: ${plainText.substring(0, 100)}...`);
        console.warn('[EMAIL] Warning: Email service not configured. Email not sent.');
        return { success: true };
      }

      const payload: EmailPayload = {
        to: recipientEmail,
        subject,
        plainText,
        htmlContent,
      };

      const result = await this.emailService.sendEmail(payload);

      if (result.success) {
        console.log(`[EMAIL] Successfully sent to ${recipientEmail} (Message ID: ${result.messageId})`);
        return { success: true, messageId: result.messageId };
      } else {
        console.error(`[EMAIL] Failed to send to ${recipientEmail}: ${result.error}`);
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[EMAIL] Error sending to ${recipientEmail}: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send notification via push
   */
  async sendPushNotification(
    recipientId: string,
    payload: PushNotificationPayload
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // If no push service is configured, log and return success
      if (!this.pushService) {
        console.log(`[PUSH] To: ${recipientId}`);
        console.log(`[PUSH] Title: ${payload.title}`);
        console.log(`[PUSH] Body: ${payload.body}`);
        console.warn('[PUSH] Warning: Push service not configured. Push notification not sent.');
        return { success: true };
      }

      // Send to all subscriptions for this user
      const results = await this.pushService.sendToAllSubscriptions(
        recipientId,
        '', // familyId will be retrieved from subscription
        payload
      );

      // Check if at least one subscription was successful
      const anySuccess = results.some((r) => r.success);

      if (anySuccess) {
        console.log(`[PUSH] Successfully sent to ${recipientId}`);
        return { success: true };
      } else {
        const errors = results.map((r) => r.error).filter(Boolean);
        const errorMessage = errors.join('; ') || 'All push subscriptions failed';
        console.error(`[PUSH] Failed to send to ${recipientId}: ${errorMessage}`);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[PUSH] Error sending to ${recipientId}: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send notification via in-app channel
   */
  async sendInAppNotification(
    recipientId: string,
    subject: string,
    content: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // TODO: Integrate with WebSocket or push notification service
      // For now, just log the notification
      console.log(`[IN_APP] To: ${recipientId}`);
      console.log(`[IN_APP] Subject: ${subject}`);
      console.log(`[IN_APP] Content: ${content.substring(0, 100)}...`);

      // Simulate successful send
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Dispatch a queued notification
   */
  async dispatchNotification(
    notificationId: string,
    recipientId: string,
    recipientEmail: string,
    subject: string,
    htmlContent: string,
    plainText: string,
    channels: ('email' | 'push' | 'in_app')[]
  ): Promise<DispatchResult> {
    const results: DispatchResult['channels'] = {};
    let overallStatus: 'sent' | 'failed' = 'sent';

    // Send via email if requested
    if (channels.includes('email')) {
      const emailResult = await this.sendEmailNotification(recipientEmail, subject, htmlContent, plainText);
      results.email = {
        status: emailResult.success ? 'sent' : 'failed',
        error: emailResult.error,
      };
      if (!emailResult.success) {
        overallStatus = 'failed';
      }
    }

    // Send via push if requested
    if (channels.includes('push')) {
      const pushPayload: PushNotificationPayload = {
        title: subject,
        body: plainText,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: `notification-${notificationId}`,
        requireInteraction: false,
      };

      const pushResult = await this.sendPushNotification(recipientId, pushPayload);
      results.push = {
        status: pushResult.success ? 'sent' : 'failed',
        error: pushResult.error,
      };
      if (!pushResult.success) {
        overallStatus = 'failed';
      }
    }

    // Send via in-app if requested
    if (channels.includes('in_app')) {
      const inAppResult = await this.sendInAppNotification(recipientId, subject, plainText);
      results.in_app = {
        status: inAppResult.success ? 'sent' : 'failed',
        error: inAppResult.error,
      };
      if (!inAppResult.success) {
        overallStatus = 'failed';
      }
    }

    // Update notification status in database
    const now = new Date();
    await this.updateNotificationStatus(recipientId, notificationId, overallStatus, now);

    return {
      notificationId,
      status: overallStatus,
      channels: results,
      createdAt: new Date(),
      sentAt: now,
    };
  }

  /**
   * Update notification status in database
   */
  private async updateNotificationStatus(
    recipientId: string,
    notificationId: string,
    status: 'sent' | 'failed',
    sentAt: Date
  ): Promise<void> {
    // Query to find the notification
    const items = await this.dataAccess.query(
      `USER#${recipientId}`,
      `NOTIFICATION#`
    );

    // Find the specific notification
    const notification = items.find((item: any) => item.id === notificationId);
    if (!notification) {
      throw new Error(`Notification ${notificationId} not found`);
    }

    // Update the notification
    const updated = {
      ...notification,
      status,
      sentAt: sentAt.toISOString(),
    };

    await this.dataAccess.putItem(updated as any);
  }

  /**
   * Get pending notifications for a user
   */
  async getPendingNotifications(recipientId: string): Promise<NotificationEntity[]> {
    const items = await this.dataAccess.query(
      `USER#${recipientId}`,
      `NOTIFICATION#`
    );

    return items.filter((item: any) => item.status === 'pending').map((item: any) => item as NotificationEntity);
  }

  /**
   * Get notification by ID
   */
  async getNotification(recipientId: string, notificationId: string): Promise<NotificationEntity | null> {
    const items = await this.dataAccess.query(
      `USER#${recipientId}`,
      `NOTIFICATION#`
    );

    const notification = items.find((item: any) => item.id === notificationId);
    return (notification as NotificationEntity) || null;
  }

  /**
   * Get all notifications for a user
   */
  async getUserNotifications(recipientId: string, limit?: number): Promise<NotificationEntity[]> {
    const items = await this.dataAccess.query(
      `USER#${recipientId}`,
      `NOTIFICATION#`
    );

    // Sort by creation time (newest first)
    const sorted = items.sort((a: any, b: any) => {
      const timeA = parseInt(a.SK.split('#')[1]);
      const timeB = parseInt(b.SK.split('#')[1]);
      return timeB - timeA;
    });

    return (limit ? sorted.slice(0, limit) : sorted).map((item: any) => item as NotificationEntity);
  }

  /**
   * Mark notification as read (for in-app notifications)
   */
  async markAsRead(recipientId: string, notificationId: string): Promise<boolean> {
    const notification = await this.getNotification(recipientId, notificationId);
    if (!notification) {
      return false;
    }

    const updated = {
      ...notification,
      read: true,
    };

    await this.dataAccess.putItem(updated as any);
    return true;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(recipientId: string, notificationId: string): Promise<boolean> {
    const notification = await this.getNotification(recipientId, notificationId);
    if (!notification) {
      return false;
    }

    await this.dataAccess.deleteItem(notification.PK, notification.SK);
    return true;
  }
}
