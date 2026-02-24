/**
 * Notification Permission Service
 * Manages push notification permissions with clear user explanations
 */

import { pushNotificationClient } from './push-notification-client';

export type NotificationPermissionStatus = 'default' | 'granted' | 'denied';

export interface NotificationExplanation {
  title: string;
  description: string;
  examples: string[];
}

export class NotificationPermissionService {
  /**
   * Get current notification permission status
   */
  getPermissionStatus(): NotificationPermissionStatus {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission as NotificationPermissionStatus;
  }

  /**
   * Check if notifications are supported
   */
  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  /**
   * Get explanation of what notifications will be sent
   */
  getNotificationExplanation(): NotificationExplanation {
    return {
      title: 'Stay Updated with Flo',
      description: 'Enable notifications to receive timely updates about your family schedule.',
      examples: [
        'Time allocation threshold alerts (e.g., "Work time exceeded 40 hours this week")',
        'Weekly calendar summaries every Sunday at 6:00 PM',
        'Event updates when calendar changes occur',
        'Scheduling conflict alerts when overlapping events are detected',
        'Weather reminders for outdoor activities (e.g., "Bring an umbrella")',
        'Proactive time booking suggestions for underutilized activities',
      ],
    };
  }

  /**
   * Request notification permission with explanation
   */
  async requestPermission(): Promise<NotificationPermissionStatus> {
    if (!this.isSupported()) {
      throw new Error('Notifications are not supported in this browser');
    }

    if (this.getPermissionStatus() === 'granted') {
      return 'granted';
    }

    if (this.getPermissionStatus() === 'denied') {
      throw new Error('Notification permission was previously denied');
    }

    try {
      const permission = await Notification.requestPermission();
      return permission as NotificationPermissionStatus;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      throw new Error('Failed to request notification permission');
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(): Promise<PushSubscription | null> {
    if (!pushNotificationClient.isSupported()) {
      return null;
    }

    if (this.getPermissionStatus() !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    try {
      // Initialize push client
      await pushNotificationClient.initialize();

      // Subscribe to push notifications
      const subscription = await pushNotificationClient.subscribe();

      // Send subscription to server
      await pushNotificationClient.sendSubscriptionToServer(subscription);

      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw new Error('Failed to subscribe to push notifications');
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(): Promise<boolean> {
    if (!pushNotificationClient.isSupported()) {
      return false;
    }

    try {
      const subscription = await pushNotificationClient.getSubscription();

      if (subscription) {
        // Remove from server
        await pushNotificationClient.removeSubscriptionFromServer(subscription);

        // Unsubscribe locally
        const success = await pushNotificationClient.unsubscribe();
        return success;
      }

      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  /**
   * Send subscription to server
   */
  async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    await pushNotificationClient.sendSubscriptionToServer(subscription);
  }

  /**
   * Remove subscription from server
   */
  async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    await pushNotificationClient.removeSubscriptionFromServer(subscription);
  }

  /**
   * Show a test notification
   */
  async showTestNotification(): Promise<void> {
    if (this.getPermissionStatus() !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    try {
      await pushNotificationClient.showTestNotification();
    } catch (error) {
      console.error('Failed to show test notification:', error);
    }
  }
}

export const notificationPermission = new NotificationPermissionService();
