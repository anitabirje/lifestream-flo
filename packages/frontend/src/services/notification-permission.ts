/**
 * Notification Permission Service
 * Manages push notification permissions with clear user explanations
 */

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
    if (!this.isSupported()) {
      return null;
    }

    if (this.getPermissionStatus() !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        return existingSubscription;
      }

      // Subscribe to push notifications
      // Note: In production, you would use your VAPID public key here
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          process.env.VITE_VAPID_PUBLIC_KEY || ''
        ),
      });

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
    if (!this.isSupported()) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        const success = await subscription.unsubscribe();
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
    try {
      const response = await fetch('/api/push-subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
      throw new Error('Failed to register push subscription');
    }
  }

  /**
   * Remove subscription from server
   */
  async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch('/api/push-subscriptions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to remove subscription from server:', error);
      throw new Error('Failed to unregister push subscription');
    }
  }

  /**
   * Convert VAPID key from base64 to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Show a test notification
   */
  async showTestNotification(): Promise<void> {
    if (this.getPermissionStatus() !== 'granted') {
      throw new Error('Notification permission not granted');
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification('Flo Notifications Enabled', {
        body: 'You will now receive updates about your family schedule.',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: 'test-notification',
        requireInteraction: false,
      });
    } catch (error) {
      console.error('Failed to show test notification:', error);
    }
  }
}

export const notificationPermission = new NotificationPermissionService();
