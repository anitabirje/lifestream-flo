/**
 * Notification Preferences Service
 * Manages user preferences for push notifications and email notifications
 */

export type NotificationChannel = 'push' | 'email' | 'both' | 'none';

export interface NotificationPreferences {
  userId: string;
  channels: NotificationChannel;
  pushEnabled: boolean;
  emailEnabled: boolean;
  thresholdAlerts: boolean;
  weeklySummaries: boolean;
  eventUpdates: boolean;
  conflictAlerts: boolean;
  weatherReminders: boolean;
  timeBookingSuggestions: boolean;
  updatedAt: string;
}

const PREFERENCES_KEY = 'flo_notification_preferences';

export class NotificationPreferencesService {
  /**
   * Get notification preferences for current user
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      // Try to fetch from server first
      const response = await fetch(`/api/notification-preferences/${userId}`);
      
      if (response.ok) {
        return await response.json();
      }
      
      // Fall back to local storage
      return this.getLocalPreferences(userId);
    } catch (error) {
      console.error('Failed to fetch preferences from server:', error);
      return this.getLocalPreferences(userId);
    }
  }

  /**
   * Get preferences from local storage
   */
  private getLocalPreferences(userId: string): NotificationPreferences {
    try {
      const stored = localStorage.getItem(`${PREFERENCES_KEY}_${userId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to retrieve local preferences:', error);
    }

    // Return default preferences
    return this.getDefaultPreferences(userId);
  }

  /**
   * Get default notification preferences
   */
  private getDefaultPreferences(userId: string): NotificationPreferences {
    return {
      userId,
      channels: 'email',
      pushEnabled: false,
      emailEnabled: true,
      thresholdAlerts: true,
      weeklySummaries: true,
      eventUpdates: true,
      conflictAlerts: true,
      weatherReminders: true,
      timeBookingSuggestions: true,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    const userId = preferences.userId;
    if (!userId) {
      throw new Error('User ID is required');
    }

    const current = await this.getPreferences(userId);
    const updated: NotificationPreferences = {
      ...current,
      ...preferences,
      updatedAt: new Date().toISOString(),
    };

    // Ensure channel consistency
    if (updated.pushEnabled && updated.emailEnabled) {
      updated.channels = 'both';
    } else if (updated.pushEnabled) {
      updated.channels = 'push';
    } else if (updated.emailEnabled) {
      updated.channels = 'email';
    } else {
      updated.channels = 'none';
    }

    try {
      // Save to server
      const response = await fetch(`/api/notification-preferences/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updated),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const saved = await response.json();
      
      // Also save to local storage as backup
      this.saveLocalPreferences(saved);
      
      return saved;
    } catch (error) {
      console.error('Failed to save preferences to server:', error);
      
      // Save to local storage as fallback
      this.saveLocalPreferences(updated);
      
      throw new Error('Failed to save notification preferences');
    }
  }

  /**
   * Save preferences to local storage
   */
  private saveLocalPreferences(preferences: NotificationPreferences): void {
    try {
      localStorage.setItem(
        `${PREFERENCES_KEY}_${preferences.userId}`,
        JSON.stringify(preferences)
      );
    } catch (error) {
      console.error('Failed to save local preferences:', error);
    }
  }

  /**
   * Enable push notifications
   */
  async enablePushNotifications(userId: string): Promise<NotificationPreferences> {
    return this.updatePreferences({
      userId,
      pushEnabled: true,
    });
  }

  /**
   * Disable push notifications
   */
  async disablePushNotifications(userId: string): Promise<NotificationPreferences> {
    return this.updatePreferences({
      userId,
      pushEnabled: false,
    });
  }

  /**
   * Enable email notifications
   */
  async enableEmailNotifications(userId: string): Promise<NotificationPreferences> {
    return this.updatePreferences({
      userId,
      emailEnabled: true,
    });
  }

  /**
   * Disable email notifications
   */
  async disableEmailNotifications(userId: string): Promise<NotificationPreferences> {
    return this.updatePreferences({
      userId,
      emailEnabled: false,
    });
  }

  /**
   * Update specific notification type preference
   */
  async updateNotificationType(
    userId: string,
    type: keyof Pick<
      NotificationPreferences,
      | 'thresholdAlerts'
      | 'weeklySummaries'
      | 'eventUpdates'
      | 'conflictAlerts'
      | 'weatherReminders'
      | 'timeBookingSuggestions'
    >,
    enabled: boolean
  ): Promise<NotificationPreferences> {
    return this.updatePreferences({
      userId,
      [type]: enabled,
    });
  }

  /**
   * Check if a specific notification type is enabled
   */
  async isNotificationTypeEnabled(
    userId: string,
    type: keyof Pick<
      NotificationPreferences,
      | 'thresholdAlerts'
      | 'weeklySummaries'
      | 'eventUpdates'
      | 'conflictAlerts'
      | 'weatherReminders'
      | 'timeBookingSuggestions'
    >
  ): Promise<boolean> {
    const preferences = await this.getPreferences(userId);
    return preferences[type];
  }

  /**
   * Check if any notification channel is enabled
   */
  async hasAnyChannelEnabled(userId: string): Promise<boolean> {
    const preferences = await this.getPreferences(userId);
    return preferences.pushEnabled || preferences.emailEnabled;
  }
}

export const notificationPreferences = new NotificationPreferencesService();
