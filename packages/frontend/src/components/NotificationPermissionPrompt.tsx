import React, { useState, useEffect } from 'react';
import {
  notificationPermission,
  type NotificationPermissionStatus,
} from '../services/notification-permission';

interface NotificationPermissionPromptProps {
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
  onDismiss?: () => void;
}

export const NotificationPermissionPrompt: React.FC<NotificationPermissionPromptProps> = ({
  onPermissionGranted,
  onPermissionDenied,
  onDismiss,
}) => {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>('default');
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPermissionStatus(notificationPermission.getPermissionStatus());
  }, []);

  const explanation = notificationPermission.getNotificationExplanation();

  const handleEnableNotifications = async () => {
    setIsRequesting(true);
    setError(null);

    try {
      const status = await notificationPermission.requestPermission();
      setPermissionStatus(status);

      if (status === 'granted') {
        // Subscribe to push notifications
        const subscription = await notificationPermission.subscribeToPush();
        if (subscription) {
          await notificationPermission.sendSubscriptionToServer(subscription);
        }

        // Show test notification
        await notificationPermission.showTestNotification();

        onPermissionGranted?.();
      } else if (status === 'denied') {
        onPermissionDenied?.();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enable notifications';
      setError(errorMessage);
      console.error('Notification permission error:', err);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    onDismiss?.();
  };

  if (!notificationPermission.isSupported()) {
    return (
      <div className="notification-prompt notification-prompt--unsupported">
        <h3>Notifications Not Supported</h3>
        <p>Your browser does not support push notifications. You can still receive updates via email.</p>
        <button onClick={handleDismiss}>Dismiss</button>
      </div>
    );
  }

  if (permissionStatus === 'granted') {
    return null;
  }

  if (permissionStatus === 'denied') {
    return (
      <div className="notification-prompt notification-prompt--denied">
        <h3>Notifications Blocked</h3>
        <p>
          You have blocked notifications for Flo. To enable them, please update your browser settings.
          You can still receive updates via email.
        </p>
        <button onClick={handleDismiss}>Dismiss</button>
      </div>
    );
  }

  return (
    <div className="notification-prompt">
      <div className="notification-prompt__header">
        <h3>{explanation.title}</h3>
        <button
          className="notification-prompt__close"
          onClick={handleDismiss}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="notification-prompt__content">
        <p className="notification-prompt__description">{explanation.description}</p>

        <div className="notification-prompt__examples">
          <h4>You'll receive notifications for:</h4>
          <ul>
            {explanation.examples.map((example, index) => (
              <li key={index}>{example}</li>
            ))}
          </ul>
        </div>

        {error && (
          <div className="notification-prompt__error" role="alert">
            {error}
          </div>
        )}
      </div>

      <div className="notification-prompt__actions">
        <button
          className="notification-prompt__button notification-prompt__button--primary"
          onClick={handleEnableNotifications}
          disabled={isRequesting}
        >
          {isRequesting ? 'Enabling...' : 'Enable Notifications'}
        </button>
        <button
          className="notification-prompt__button notification-prompt__button--secondary"
          onClick={handleDismiss}
          disabled={isRequesting}
        >
          Not Now
        </button>
      </div>
    </div>
  );
};
