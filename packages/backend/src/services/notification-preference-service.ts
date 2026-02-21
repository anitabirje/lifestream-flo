/**
 * Notification Preference Service
 * Handles CRUD operations for notification preferences
 */

import { DynamoDBDataAccess } from '../data-access/dynamodb-client';
import {
  NotificationPreference,
  preferenceToDynamoDB,
  preferenceFromDynamoDB,
  validateNotificationPreference,
  getDefaultPreferences,
} from '../models/notification-preference';
import { v4 as uuidv4 } from 'uuid';

export interface CreatePreferenceInput {
  familyMemberId: string;
  categoryId?: string;
  categoryName?: string;
  disableThresholdAlerts?: boolean;
  disableSummaryEmails?: boolean;
  disableEventUpdates?: boolean;
  disableConflictAlerts?: boolean;
  preferredChannels?: ('email' | 'in_app')[];
}

export interface UpdatePreferenceInput {
  disableThresholdAlerts?: boolean;
  disableSummaryEmails?: boolean;
  disableEventUpdates?: boolean;
  disableConflictAlerts?: boolean;
  preferredChannels?: ('email' | 'in_app')[];
}

export class NotificationPreferenceService {
  constructor(private dataAccess: DynamoDBDataAccess) {}

  /**
   * Create notification preferences for a family member
   */
  async createPreference(input: CreatePreferenceInput): Promise<NotificationPreference> {
    const now = new Date();
    const defaults = getDefaultPreferences(input.familyMemberId);

    const preference: NotificationPreference = {
      id: uuidv4(),
      familyMemberId: input.familyMemberId,
      categoryId: input.categoryId,
      categoryName: input.categoryName,
      disableThresholdAlerts: input.disableThresholdAlerts ?? defaults.disableThresholdAlerts,
      disableSummaryEmails: input.disableSummaryEmails ?? defaults.disableSummaryEmails,
      disableEventUpdates: input.disableEventUpdates ?? defaults.disableEventUpdates,
      disableConflictAlerts: input.disableConflictAlerts ?? defaults.disableConflictAlerts,
      preferredChannels: input.preferredChannels ?? defaults.preferredChannels,
      createdAt: now,
      updatedAt: now,
    };

    // Validate preference
    const validation = validateNotificationPreference(preference);
    if (!validation.valid) {
      throw new Error(`Invalid preference: ${validation.errors.join(', ')}`);
    }

    const dynamoItem = preferenceToDynamoDB(preference);
    await this.dataAccess.putItem(dynamoItem);

    return preference;
  }

  /**
   * Get notification preferences for a family member
   */
  async getPreference(familyMemberId: string, preferenceId: string): Promise<NotificationPreference | null> {
    const item = await this.dataAccess.getItem(
      `USER#${familyMemberId}`,
      `NOTIFICATION_PREFERENCE#${preferenceId}`
    );

    if (!item) {
      return null;
    }

    return preferenceFromDynamoDB(item as any);
  }

  /**
   * Get all notification preferences for a family member
   */
  async getPreferencesForMember(familyMemberId: string): Promise<NotificationPreference[]> {
    const items = await this.dataAccess.query(
      `USER#${familyMemberId}`,
      'NOTIFICATION_PREFERENCE#'
    );

    return items.map((item) => preferenceFromDynamoDB(item as any));
  }

  /**
   * Get global notification preferences for a family member (without category filter)
   */
  async getGlobalPreference(familyMemberId: string): Promise<NotificationPreference | null> {
    const preferences = await this.getPreferencesForMember(familyMemberId);
    // Return the preference without a category ID (global preference)
    return preferences.find((p) => !p.categoryId) || null;
  }

  /**
   * Get category-specific notification preferences
   */
  async getCategoryPreference(familyMemberId: string, categoryId: string): Promise<NotificationPreference | null> {
    const preferences = await this.getPreferencesForMember(familyMemberId);
    return preferences.find((p) => p.categoryId === categoryId) || null;
  }

  /**
   * Update notification preferences
   */
  async updatePreference(
    familyMemberId: string,
    preferenceId: string,
    updates: UpdatePreferenceInput
  ): Promise<NotificationPreference | null> {
    const existing = await this.getPreference(familyMemberId, preferenceId);
    if (!existing) {
      return null;
    }

    const updated: NotificationPreference = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    // Validate updated preference
    const validation = validateNotificationPreference(updated);
    if (!validation.valid) {
      throw new Error(`Invalid preference: ${validation.errors.join(', ')}`);
    }

    const dynamoItem = preferenceToDynamoDB(updated);
    await this.dataAccess.putItem(dynamoItem);

    return updated;
  }

  /**
   * Delete notification preferences
   */
  async deletePreference(familyMemberId: string, preferenceId: string): Promise<boolean> {
    const existing = await this.getPreference(familyMemberId, preferenceId);
    if (!existing) {
      return false;
    }

    await this.dataAccess.deleteItem(
      `USER#${familyMemberId}`,
      `NOTIFICATION_PREFERENCE#${preferenceId}`
    );

    return true;
  }

  /**
   * Check if a notification type is enabled for a family member
   */
  async isNotificationTypeEnabled(
    familyMemberId: string,
    notificationType: 'threshold_alert' | 'weekly_summary' | 'event_update' | 'conflict_alert',
    categoryId?: string
  ): Promise<boolean> {
    // Get category-specific preference if categoryId provided
    let preference: NotificationPreference | null = null;
    if (categoryId) {
      preference = await this.getCategoryPreference(familyMemberId, categoryId);
    }

    // Fall back to global preference
    if (!preference) {
      preference = await this.getGlobalPreference(familyMemberId);
    }

    // If no preference exists, default to enabled
    if (!preference) {
      return true;
    }

    // Check if notification type is disabled
    switch (notificationType) {
      case 'threshold_alert':
        return !preference.disableThresholdAlerts;
      case 'weekly_summary':
        return !preference.disableSummaryEmails;
      case 'event_update':
        return !preference.disableEventUpdates;
      case 'conflict_alert':
        return !preference.disableConflictAlerts;
      default:
        return true;
    }
  }

  /**
   * Get preferred notification channels for a family member
   */
  async getPreferredChannels(familyMemberId: string, categoryId?: string): Promise<('email' | 'in_app')[]> {
    // Get category-specific preference if categoryId provided
    let preference: NotificationPreference | null = null;
    if (categoryId) {
      preference = await this.getCategoryPreference(familyMemberId, categoryId);
    }

    // Fall back to global preference
    if (!preference) {
      preference = await this.getGlobalPreference(familyMemberId);
    }

    // If no preference exists, default to both channels
    if (!preference) {
      return ['email', 'in_app'];
    }

    return preference.preferredChannels;
  }

  /**
   * Initialize default preferences for a new family member
   */
  async initializeDefaultPreferences(familyMemberId: string): Promise<NotificationPreference> {
    return this.createPreference({
      familyMemberId,
    });
  }

  /**
   * Disable all notifications for a family member
   */
  async disableAllNotifications(familyMemberId: string): Promise<NotificationPreference | null> {
    const globalPreference = await this.getGlobalPreference(familyMemberId);
    if (!globalPreference) {
      return null;
    }

    return this.updatePreference(familyMemberId, globalPreference.id, {
      disableThresholdAlerts: true,
      disableSummaryEmails: true,
      disableEventUpdates: true,
      disableConflictAlerts: true,
    });
  }

  /**
   * Enable all notifications for a family member
   */
  async enableAllNotifications(familyMemberId: string): Promise<NotificationPreference | null> {
    const globalPreference = await this.getGlobalPreference(familyMemberId);
    if (!globalPreference) {
      return null;
    }

    return this.updatePreference(familyMemberId, globalPreference.id, {
      disableThresholdAlerts: false,
      disableSummaryEmails: false,
      disableEventUpdates: false,
      disableConflictAlerts: false,
    });
  }
}
