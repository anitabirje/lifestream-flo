/**
 * Property-Based Tests for Notification Preferences
 * 
 * Feature: flo-family-calendar
 * Property 20: Notification Preference Respect
 * Validates: Requirements 5.6, 5a.5
 * 
 * These tests verify that the system respects user notification preferences
 * and does not send notifications when they are disabled.
 */

import * as fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';
import { NotificationPreferenceService } from '../services/notification-preference-service';
import { dynamoDBDataAccess } from '../data-access/dynamodb-client';

describe('Property 20: Notification Preference Respect', () => {
  let preferenceService: NotificationPreferenceService;

  beforeAll(() => {
    preferenceService = new NotificationPreferenceService(dynamoDBDataAccess);
  });

  // Arbitrary for notification types
  const notificationTypeArb = fc.oneof(
    fc.constant('threshold_alert' as const),
    fc.constant('weekly_summary' as const),
    fc.constant('event_update' as const),
    fc.constant('conflict_alert' as const)
  );

  it('should respect disabled threshold alert preferences', async () => {
    const familyMemberId = `test-member-${uuidv4()}`;

    // Create preference with threshold alerts disabled
    const preference = await preferenceService.createPreference({
      familyMemberId,
      disableThresholdAlerts: true,
      preferredChannels: ['email', 'in_app'],
    });

    // Verify preference was created
    expect(preference.disableThresholdAlerts).toBe(true);

    // Check if threshold alerts are enabled
    const isEnabled = await preferenceService.isNotificationTypeEnabled(
      familyMemberId,
      'threshold_alert'
    );

    // Verify threshold alerts are disabled
    expect(isEnabled).toBe(false);
  });

  it('should respect disabled summary email preferences', async () => {
    const familyMemberId = `test-member-${uuidv4()}`;

    // Create preference with summary emails disabled
    const preference = await preferenceService.createPreference({
      familyMemberId,
      disableSummaryEmails: true,
      preferredChannels: ['email', 'in_app'],
    });

    // Verify preference was created
    expect(preference.disableSummaryEmails).toBe(true);

    // Check if summary emails are enabled
    const isEnabled = await preferenceService.isNotificationTypeEnabled(
      familyMemberId,
      'weekly_summary'
    );

    // Verify summary emails are disabled
    expect(isEnabled).toBe(false);
  });

  it('should respect disabled event update preferences', async () => {
    const familyMemberId = `test-member-${uuidv4()}`;

    // Create preference with event updates disabled
    const preference = await preferenceService.createPreference({
      familyMemberId,
      disableEventUpdates: true,
      preferredChannels: ['email', 'in_app'],
    });

    // Verify preference was created
    expect(preference.disableEventUpdates).toBe(true);

    // Check if event updates are enabled
    const isEnabled = await preferenceService.isNotificationTypeEnabled(
      familyMemberId,
      'event_update'
    );

    // Verify event updates are disabled
    expect(isEnabled).toBe(false);
  });

  it('should respect disabled conflict alert preferences', async () => {
    const familyMemberId = `test-member-${uuidv4()}`;

    // Create preference with conflict alerts disabled
    const preference = await preferenceService.createPreference({
      familyMemberId,
      disableConflictAlerts: true,
      preferredChannels: ['email', 'in_app'],
    });

    // Verify preference was created
    expect(preference.disableConflictAlerts).toBe(true);

    // Check if conflict alerts are enabled
    const isEnabled = await preferenceService.isNotificationTypeEnabled(
      familyMemberId,
      'conflict_alert'
    );

    // Verify conflict alerts are disabled
    expect(isEnabled).toBe(false);
  });

  it('should enable notifications when preferences are not disabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        notificationTypeArb,
        async (notificationType) => {
          const familyMemberId = `test-member-${uuidv4()}`;

          // Create preference with all notifications enabled
          const preference = await preferenceService.createPreference({
            familyMemberId,
            disableThresholdAlerts: false,
            disableSummaryEmails: false,
            disableEventUpdates: false,
            disableConflictAlerts: false,
            preferredChannels: ['email', 'in_app'],
          });

          // Check if notification type is enabled
          const isEnabled = await preferenceService.isNotificationTypeEnabled(
            familyMemberId,
            notificationType
          );

          // Verify notification is enabled
          expect(isEnabled).toBe(true);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should respect preferred notification channels', async () => {
    const familyMemberId = `test-member-${uuidv4()}`;
    const channels: ('email' | 'in_app')[] = ['email'];

    // Create preference with specific channels
    const preference = await preferenceService.createPreference({
      familyMemberId,
      preferredChannels: channels,
    });

    // Verify preference was created with correct channels
    expect(preference.preferredChannels).toEqual(channels);

    // Get preferred channels
    const preferredChannels = await preferenceService.getPreferredChannels(familyMemberId);

    // Verify channels match
    expect(preferredChannels).toEqual(channels);
  });

  it('should allow disabling all notifications', async () => {
    const familyMemberId = `test-member-${uuidv4()}`;

    // Create default preference
    await preferenceService.createPreference({
      familyMemberId,
    });

    // Disable all notifications
    const updated = await preferenceService.disableAllNotifications(familyMemberId);

    // Verify all notifications are disabled
    expect(updated?.disableThresholdAlerts).toBe(true);
    expect(updated?.disableSummaryEmails).toBe(true);
    expect(updated?.disableEventUpdates).toBe(true);
    expect(updated?.disableConflictAlerts).toBe(true);

    // Verify all notification types are disabled
    const thresholdEnabled = await preferenceService.isNotificationTypeEnabled(
      familyMemberId,
      'threshold_alert'
    );
    const summaryEnabled = await preferenceService.isNotificationTypeEnabled(
      familyMemberId,
      'weekly_summary'
    );
    const eventEnabled = await preferenceService.isNotificationTypeEnabled(
      familyMemberId,
      'event_update'
    );
    const conflictEnabled = await preferenceService.isNotificationTypeEnabled(
      familyMemberId,
      'conflict_alert'
    );

    expect(thresholdEnabled).toBe(false);
    expect(summaryEnabled).toBe(false);
    expect(eventEnabled).toBe(false);
    expect(conflictEnabled).toBe(false);
  });

  it('should allow enabling all notifications', async () => {
    const familyMemberId = `test-member-${uuidv4()}`;

    // Create preference with all notifications disabled
    await preferenceService.createPreference({
      familyMemberId,
      disableThresholdAlerts: true,
      disableSummaryEmails: true,
      disableEventUpdates: true,
      disableConflictAlerts: true,
    });

    // Enable all notifications
    const updated = await preferenceService.enableAllNotifications(familyMemberId);

    // Verify all notifications are enabled
    expect(updated?.disableThresholdAlerts).toBe(false);
    expect(updated?.disableSummaryEmails).toBe(false);
    expect(updated?.disableEventUpdates).toBe(false);
    expect(updated?.disableConflictAlerts).toBe(false);

    // Verify all notification types are enabled
    const thresholdEnabled = await preferenceService.isNotificationTypeEnabled(
      familyMemberId,
      'threshold_alert'
    );
    const summaryEnabled = await preferenceService.isNotificationTypeEnabled(
      familyMemberId,
      'weekly_summary'
    );
    const eventEnabled = await preferenceService.isNotificationTypeEnabled(
      familyMemberId,
      'event_update'
    );
    const conflictEnabled = await preferenceService.isNotificationTypeEnabled(
      familyMemberId,
      'conflict_alert'
    );

    expect(thresholdEnabled).toBe(true);
    expect(summaryEnabled).toBe(true);
    expect(eventEnabled).toBe(true);
    expect(conflictEnabled).toBe(true);
  });

  it('should support category-specific notification preferences', async () => {
    const familyMemberId = `test-member-${uuidv4()}`;
    const categoryId = `category-${uuidv4()}`;
    const categoryName = 'Work';

    // Create category-specific preference with threshold alerts disabled
    const preference = await preferenceService.createPreference({
      familyMemberId,
      categoryId,
      categoryName,
      disableThresholdAlerts: true,
      preferredChannels: ['email'],
    });

    // Verify preference was created with category
    expect(preference.categoryId).toBe(categoryId);
    expect(preference.categoryName).toBe(categoryName);

    // Check if threshold alerts are enabled for this category
    const isEnabled = await preferenceService.isNotificationTypeEnabled(
      familyMemberId,
      'threshold_alert',
      categoryId
    );

    // Verify threshold alerts are disabled for this category
    expect(isEnabled).toBe(false);
  });

  it('should default to enabled notifications when no preference exists', async () => {
    await fc.assert(
      fc.asyncProperty(
        notificationTypeArb,
        async (notificationType) => {
          const familyMemberId = `test-member-${uuidv4()}`;

          // Check if notification type is enabled without creating preference
          const isEnabled = await preferenceService.isNotificationTypeEnabled(
            familyMemberId,
            notificationType
          );

          // Verify notification is enabled by default
          expect(isEnabled).toBe(true);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should default to both channels when no preference exists', async () => {
    const familyMemberId = `test-member-${uuidv4()}`;

    // Get preferred channels without creating preference
    const channels = await preferenceService.getPreferredChannels(familyMemberId);

    // Verify both channels are returned by default
    expect(channels).toContain('email');
    expect(channels).toContain('in_app');
  });

  it('should update preferences without affecting other settings', async () => {
    const familyMemberId = `test-member-${uuidv4()}`;

    // Create preference
    const original = await preferenceService.createPreference({
      familyMemberId,
      disableThresholdAlerts: false,
      disableSummaryEmails: false,
      disableEventUpdates: false,
      disableConflictAlerts: false,
      preferredChannels: ['email', 'in_app'],
    });

    // Update only threshold alerts
    const updated = await preferenceService.updatePreference(
      familyMemberId,
      original.id,
      {
        disableThresholdAlerts: true,
      }
    );

    // Verify only threshold alerts changed
    expect(updated?.disableThresholdAlerts).toBe(true);
    expect(updated?.disableSummaryEmails).toBe(false);
    expect(updated?.disableEventUpdates).toBe(false);
    expect(updated?.disableConflictAlerts).toBe(false);
    expect(updated?.preferredChannels).toEqual(['email', 'in_app']);
  });
});
