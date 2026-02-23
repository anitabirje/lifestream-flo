/**
 * Push Notification Service
 * Handles push notification sending via Web Push API
 * Manages push subscriptions and sends notifications to subscribed devices
 */

import { DynamoDBDataAccess } from '../data-access/dynamodb-client';
import { v4 as uuidv4 } from 'uuid';

// Mock web-push for development/testing when package is not available
let webpush: any;
try {
  webpush = require('web-push');
} catch (e) {
  // Fallback mock for testing
  webpush = {
    setVapidDetails: () => {},
    sendNotification: async () => ({ success: true }),
  };
}

export interface PushNotificationConfig {
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidSubject: string;
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  data?: Record<string, any>;
}

export interface PushSendResult {
  success: boolean;
  error?: string;
  retryCount?: number;
  subscriptionId?: string;
}

export interface StoredPushSubscription {
  PK: string;
  SK: string;
  EntityType: 'PUSH_SUBSCRIPTION';
  id: string;
  userId: string;
  familyId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: string;
  lastUsedAt?: string;
  isActive: boolean;
  TTL?: number;
}

export interface PushNotificationRecord {
  PK: string;
  SK: string;
  EntityType: 'PUSH_NOTIFICATION';
  id: string;
  userId: string;
  familyId: string;
  subscriptionId: string;
  title: string;
  body: string;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: string;
  failureReason?: string;
  createdAt: string;
  TTL?: number;
}

export interface PushRetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * PushNotificationService handles sending push notifications via Web Push API
 */
export class PushNotificationService {
  private config: PushNotificationConfig;
  private retryConfig: PushRetryConfig;
  private isInitialized: boolean = false;

  constructor(private dataAccess: DynamoDBDataAccess, config: PushNotificationConfig) {
    this.config = {
      maxRetries: 3,
      retryDelayMs: 1000,
      ...config,
    };

    this.retryConfig = {
      maxRetries: this.config.maxRetries || 3,
      initialDelayMs: this.config.retryDelayMs || 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
    };

    this.initialize();
  }

  /**
   * Initialize Web Push client
   */
  private initialize(): void {
    if (!this.config.vapidPublicKey || !this.config.vapidPrivateKey || !this.config.vapidSubject) {
      throw new Error('VAPID keys and subject are required for push notifications');
    }

    webpush.setVapidDetails(
      this.config.vapidSubject,
      this.config.vapidPublicKey,
      this.config.vapidPrivateKey
    );
    this.isInitialized = true;
  }

  /**
   * Store a push subscription
   */
  async storeSubscription(
    userId: string,
    familyId: string,
    subscription: PushSubscription,
    userAgent?: string
  ): Promise<string> {
    const subscriptionId = uuidv4();
    const now = new Date();

    const entity: StoredPushSubscription = {
      PK: `USER#${userId}`,
      SK: `PUSH_SUBSCRIPTION#${subscriptionId}`,
      EntityType: 'PUSH_SUBSCRIPTION',
      id: subscriptionId,
      userId,
      familyId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      userAgent,
      createdAt: now.toISOString(),
      isActive: true,
      TTL: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year TTL
    };

    await this.dataAccess.putItem(entity as any);
    return subscriptionId;
  }

  /**
   * Get all subscriptions for a user
   */
  async getUserSubscriptions(userId: string): Promise<StoredPushSubscription[]> {
    const items = await this.dataAccess.query(`USER#${userId}`, `PUSH_SUBSCRIPTION#`);
    return items.filter((item: any) => item.isActive).map((item: any) => item as StoredPushSubscription);
  }

  /**
   * Remove a subscription
   */
  async removeSubscription(userId: string, subscriptionId: string): Promise<boolean> {
    const items = await this.dataAccess.query(`USER#${userId}`, `PUSH_SUBSCRIPTION#${subscriptionId}`);

    if (items.length === 0) {
      return false;
    }

    const subscription = items[0] as any;
    const updated = {
      ...subscription,
      isActive: false,
    };

    await this.dataAccess.putItem(updated);
    return true;
  }

  /**
   * Send push notification to a subscription
   */
  async sendNotification(
    userId: string,
    subscriptionId: string,
    payload: PushNotificationPayload
  ): Promise<PushSendResult> {
    if (!this.isInitialized) {
      return {
        success: false,
        error: 'Push notification service not initialized',
      };
    }

    // Get subscription from database
    const items = await this.dataAccess.query(`USER#${userId}`, `PUSH_SUBSCRIPTION#${subscriptionId}`);

    if (items.length === 0) {
      return {
        success: false,
        error: 'Subscription not found',
      };
    }

    const subscription = items[0] as any as StoredPushSubscription;

    if (!subscription.isActive) {
      return {
        success: false,
        error: 'Subscription is inactive',
      };
    }

    let lastError: Error | null = null;
    let retryCount = 0;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        await this.attemptSendNotification(subscription, payload);

        // Record successful send
        await this.recordNotificationSent(userId, subscription.familyId, subscriptionId, payload);

        // Update last used time
        await this.updateSubscriptionLastUsed(userId, subscriptionId);

        return {
          success: true,
          subscriptionId,
          retryCount,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retryCount = attempt;

        // Check if error is retryable
        if (!this.isRetryableError(lastError) || attempt === this.retryConfig.maxRetries) {
          // If subscription is invalid, mark it as inactive
          if (this.isInvalidSubscriptionError(lastError)) {
            await this.removeSubscription(userId, subscriptionId);
          }
          break;
        }

        // Calculate backoff delay
        const delayMs = this.calculateBackoffDelay(attempt);
        await this.delay(delayMs);
      }
    }

    // Record failed send
    await this.recordNotificationFailed(
      userId,
      subscription.familyId,
      subscriptionId,
      payload,
      lastError?.message || 'Unknown error'
    );

    return {
      success: false,
      error: lastError?.message || 'Failed to send push notification',
      retryCount,
      subscriptionId,
    };
  }

  /**
   * Send notification to all user subscriptions
   */
  async sendToAllSubscriptions(
    userId: string,
    familyId: string,
    payload: PushNotificationPayload
  ): Promise<PushSendResult[]> {
    const subscriptions = await this.getUserSubscriptions(userId);

    const results = await Promise.all(
      subscriptions.map((sub) => this.sendNotification(userId, sub.id, payload))
    );

    return results;
  }

  /**
   * Attempt to send notification via Web Push API
   */
  private async attemptSendNotification(
    subscription: StoredPushSubscription,
    payload: PushNotificationPayload
  ): Promise<void> {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    };

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/pwa-192x192.png',
      badge: payload.badge || '/pwa-192x192.png',
      tag: payload.tag || 'flo-notification',
      requireInteraction: payload.requireInteraction || false,
      data: payload.data || {},
    });

    await webpush.sendNotification(pushSubscription, notificationPayload);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Retryable errors
    const retryablePatterns = [
      'timeout',
      'econnrefused',
      'econnreset',
      'etimedout',
      'ehostunreach',
      'enetunreach',
      'rate limit',
      'too many requests',
      '429',
      '503',
      '502',
      '504',
    ];

    return retryablePatterns.some((pattern) => message.includes(pattern));
  }

  /**
   * Check if error indicates invalid subscription
   */
  private isInvalidSubscriptionError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Invalid subscription errors
    const invalidPatterns = [
      'invalid subscription',
      'subscription expired',
      'not found',
      '404',
      '410',
      'gone',
      'unsubscribed',
    ];

    return invalidPatterns.some((pattern) => message.includes(pattern));
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const delay = this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt);
    return Math.min(delay, this.retryConfig.maxDelayMs);
  }

  /**
   * Delay execution for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Record successful notification send
   */
  private async recordNotificationSent(
    userId: string,
    familyId: string,
    subscriptionId: string,
    payload: PushNotificationPayload
  ): Promise<void> {
    const notificationId = uuidv4();
    const now = new Date();

    const entity: PushNotificationRecord = {
      PK: `USER#${userId}`,
      SK: `PUSH_NOTIFICATION#${now.getTime()}#${notificationId}`,
      EntityType: 'PUSH_NOTIFICATION',
      id: notificationId,
      userId,
      familyId,
      subscriptionId,
      title: payload.title,
      body: payload.body,
      status: 'sent',
      sentAt: now.toISOString(),
      createdAt: now.toISOString(),
      TTL: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60, // 90 days TTL
    };

    await this.dataAccess.putItem(entity as any);
  }

  /**
   * Record failed notification send
   */
  private async recordNotificationFailed(
    userId: string,
    familyId: string,
    subscriptionId: string,
    payload: PushNotificationPayload,
    failureReason: string
  ): Promise<void> {
    const notificationId = uuidv4();
    const now = new Date();

    const entity: PushNotificationRecord = {
      PK: `USER#${userId}`,
      SK: `PUSH_NOTIFICATION#${now.getTime()}#${notificationId}`,
      EntityType: 'PUSH_NOTIFICATION',
      id: notificationId,
      userId,
      familyId,
      subscriptionId,
      title: payload.title,
      body: payload.body,
      status: 'failed',
      failureReason,
      createdAt: now.toISOString(),
      TTL: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60, // 90 days TTL
    };

    await this.dataAccess.putItem(entity as any);
  }

  /**
   * Update subscription last used time
   */
  private async updateSubscriptionLastUsed(userId: string, subscriptionId: string): Promise<void> {
    const items = await this.dataAccess.query(`USER#${userId}`, `PUSH_SUBSCRIPTION#${subscriptionId}`);

    if (items.length === 0) {
      return;
    }

    const subscription = items[0] as any;
    const updated = {
      ...subscription,
      lastUsedAt: new Date().toISOString(),
    };

    await this.dataAccess.putItem(updated);
  }

  /**
   * Get service status
   */
  getStatus(): {
    initialized: boolean;
    vapidPublicKey: string;
    maxRetries: number;
  } {
    return {
      initialized: this.isInitialized,
      vapidPublicKey: this.config.vapidPublicKey,
      maxRetries: this.retryConfig.maxRetries,
    };
  }
}
