import React, { useState, useEffect } from 'react';
import {
  notificationPreferences,
  type NotificationPreferences,
} from '../services/notification-preferences';
import {
  notificationPermission,
  type NotificationPermissionStatus,
} from '../services/notification-permission';

interface NotificationSettingsProps {
  userId: string;
  onPreferencesUpdated?: (preferences: NotificationPreferences) => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  userId,
  onPreferencesUpdated,
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>('default');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadPreferences();
    setPermissionStatus(notificationPermission.getPermissionStatus());
  }, [userId]);

  const loadPreferences = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const prefs = await notificationPreferences.getPreferences(userId);
      setPreferences(prefs);
    } catch (err) {
      setError('Failed to load notification preferences');
      console.error('Failed to load preferences:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePush = async () => {
    if (!preferences) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (!preferences.pushEnabled) {
        // Enabling push notifications
        if (permissionStatus !== 'granted') {
          const status = await notificationPermission.requestPermission();
          setPermissionStatus(status);

          if (status !== 'granted') {
            setError('Push notification permission was denied');
            return;
          }

          // Subscribe to push
          const subscription = await notificationPermission.subscribeToPush();
          if (subscription) {
            await notificationPermission.sendSubscriptionToServer(subscription);
          }
        }

        const updated = await notificationPreferences.enablePushNotifications(userId);
        setPreferences(updated);
        setSuccessMessage('Push notifications enabled');
        onPreferencesUpdated?.(updated);
      } else {
        // Disabling push notifications
        await notificationPermission.unsubscribeFromPush();
        const updated = await notificationPreferences.disablePushNotifications(userId);
        setPreferences(updated);
        setSuccessMessage('Push notifications disabled');
        onPreferencesUpdated?.(updated);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update push notifications';
      setError(errorMessage);
      console.error('Failed to toggle push notifications:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEmail = async () => {
    if (!preferences) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updated = preferences.emailEnabled
        ? await notificationPreferences.disableEmailNotifications(userId)
        : await notificationPreferences.enableEmailNotifications(userId);

      setPreferences(updated);
      setSuccessMessage(
        updated.emailEnabled ? 'Email notifications enabled' : 'Email notifications disabled'
      );
      onPreferencesUpdated?.(updated);
    } catch (err) {
      setError('Failed to update email notifications');
      console.error('Failed to toggle email notifications:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleNotificationType = async (
    type: keyof Pick<
      NotificationPreferences,
      | 'thresholdAlerts'
      | 'weeklySummaries'
      | 'eventUpdates'
      | 'conflictAlerts'
      | 'weatherReminders'
      | 'timeBookingSuggestions'
    >
  ) => {
    if (!preferences) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updated = await notificationPreferences.updateNotificationType(
        userId,
        type,
        !preferences[type]
      );

      setPreferences(updated);
      setSuccessMessage('Notification preferences updated');
      onPreferencesUpdated?.(updated);
    } catch (err) {
      setError('Failed to update notification preferences');
      console.error('Failed to toggle notification type:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="notification-settings notification-settings--loading">Loading preferences...</div>;
  }

  if (!preferences) {
    return <div className="notification-settings notification-settings--error">Failed to load preferences</div>;
  }

  const isPushSupported = notificationPermission.isSupported();
  const isPushBlocked = permissionStatus === 'denied';

  return (
    <div className="notification-settings">
      <h2>Notification Preferences</h2>

      {error && (
        <div className="notification-settings__message notification-settings__message--error" role="alert">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="notification-settings__message notification-settings__message--success" role="status">
          {successMessage}
        </div>
      )}

      <div className="notification-settings__section">
        <h3>Notification Channels</h3>
        <p className="notification-settings__description">
          Choose how you want to receive notifications from Flo.
        </p>

        <div className="notification-settings__option">
          <div className="notification-settings__option-info">
            <label htmlFor="push-toggle">Push Notifications</label>
            <p>Receive instant notifications on this device</p>
            {isPushBlocked && (
              <p className="notification-settings__warning">
                Push notifications are blocked. Please enable them in your browser settings.
              </p>
            )}
            {!isPushSupported && (
              <p className="notification-settings__warning">
                Push notifications are not supported in your browser.
              </p>
            )}
          </div>
          <label className="notification-settings__toggle">
            <input
              id="push-toggle"
              type="checkbox"
              checked={preferences.pushEnabled}
              onChange={handleTogglePush}
              disabled={isSaving || !isPushSupported || isPushBlocked}
            />
            <span className="notification-settings__toggle-slider"></span>
          </label>
        </div>

        <div className="notification-settings__option">
          <div className="notification-settings__option-info">
            <label htmlFor="email-toggle">Email Notifications</label>
            <p>Receive notifications via email</p>
          </div>
          <label className="notification-settings__toggle">
            <input
              id="email-toggle"
              type="checkbox"
              checked={preferences.emailEnabled}
              onChange={handleToggleEmail}
              disabled={isSaving}
            />
            <span className="notification-settings__toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="notification-settings__section">
        <h3>Notification Types</h3>
        <p className="notification-settings__description">
          Choose which types of notifications you want to receive.
        </p>

        <div className="notification-settings__option">
          <div className="notification-settings__option-info">
            <label htmlFor="threshold-toggle">Time Allocation Alerts</label>
            <p>Get notified when time thresholds are exceeded or not met</p>
          </div>
          <label className="notification-settings__toggle">
            <input
              id="threshold-toggle"
              type="checkbox"
              checked={preferences.thresholdAlerts}
              onChange={() => handleToggleNotificationType('thresholdAlerts')}
              disabled={isSaving}
            />
            <span className="notification-settings__toggle-slider"></span>
          </label>
        </div>

        <div className="notification-settings__option">
          <div className="notification-settings__option-info">
            <label htmlFor="summary-toggle">Weekly Summaries</label>
            <p>Receive weekly calendar summaries every Sunday at 6:00 PM</p>
          </div>
          <label className="notification-settings__toggle">
            <input
              id="summary-toggle"
              type="checkbox"
              checked={preferences.weeklySummaries}
              onChange={() => handleToggleNotificationType('weeklySummaries')}
              disabled={isSaving}
            />
            <span className="notification-settings__toggle-slider"></span>
          </label>
        </div>

        <div className="notification-settings__option">
          <div className="notification-settings__option-info">
            <label htmlFor="event-toggle">Event Updates</label>
            <p>Get notified when calendar events are added, changed, or deleted</p>
          </div>
          <label className="notification-settings__toggle">
            <input
              id="event-toggle"
              type="checkbox"
              checked={preferences.eventUpdates}
              onChange={() => handleToggleNotificationType('eventUpdates')}
              disabled={isSaving}
            />
            <span className="notification-settings__toggle-slider"></span>
          </label>
        </div>

        <div className="notification-settings__option">
          <div className="notification-settings__option-info">
            <label htmlFor="conflict-toggle">Conflict Alerts</label>
            <p>Get notified when scheduling conflicts are detected</p>
          </div>
          <label className="notification-settings__toggle">
            <input
              id="conflict-toggle"
              type="checkbox"
              checked={preferences.conflictAlerts}
              onChange={() => handleToggleNotificationType('conflictAlerts')}
              disabled={isSaving}
            />
            <span className="notification-settings__toggle-slider"></span>
          </label>
        </div>

        <div className="notification-settings__option">
          <div className="notification-settings__option-info">
            <label htmlFor="weather-toggle">Weather Reminders</label>
            <p>Receive reminders for outdoor activities based on weather conditions</p>
          </div>
          <label className="notification-settings__toggle">
            <input
              id="weather-toggle"
              type="checkbox"
              checked={preferences.weatherReminders}
              onChange={() => handleToggleNotificationType('weatherReminders')}
              disabled={isSaving}
            />
            <span className="notification-settings__toggle-slider"></span>
          </label>
        </div>

        <div className="notification-settings__option">
          <div className="notification-settings__option-info">
            <label htmlFor="booking-toggle">Time Booking Suggestions</label>
            <p>Receive proactive suggestions to book time for underutilized activities</p>
          </div>
          <label className="notification-settings__toggle">
            <input
              id="booking-toggle"
              type="checkbox"
              checked={preferences.timeBookingSuggestions}
              onChange={() => handleToggleNotificationType('timeBookingSuggestions')}
              disabled={isSaving}
            />
            <span className="notification-settings__toggle-slider"></span>
          </label>
        </div>
      </div>

      {!preferences.pushEnabled && !preferences.emailEnabled && (
        <div className="notification-settings__warning-box">
          <strong>Warning:</strong> You have disabled all notification channels. You will not receive any notifications from Flo.
        </div>
      )}
    </div>
  );
};
