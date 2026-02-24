/**
 * Unit Tests for Notification Preferences API
 * Tests for GET, POST, PUT, DELETE endpoints
 */

import { NotificationPreferenceService } from '../services/notification-preference-service';
import { DynamoDBDataAccess } from '../data-access/dynamodb-client';

describe('Notification Preferences API', () => {
  let service: NotificationPreferenceService;
  let mockDataAccess: any;

  beforeEach(() => {
    // Mock DynamoDB data access
    mockDataAccess = {
      putItem: jest.fn().mockResolvedValue({}),
      getItem: jest.fn(),
      query: jest.fn(),
      deleteItem: jest.fn().mockResolvedValue({}),
    };

    service = new NotificationPreferenceService(mockDataAccess);
  });

  describe('POST /api/notification-preferences', () => {
    it('should create notification preferences with all fields', async () => {
      const input = {
        familyMemberId: 'member-123',
        categoryId: 'work',
        categoryName: 'Work',
        disableThresholdAlerts: false,
        disableSummaryEmails: false,
        disableEventUpdates: false,
        disableConflictAlerts: false,
        preferredChannels: ['email', 'in_app'] as ('email' | 'in_app')[],
      };

      const result = await service.createPreference(input);

      expect(result).toBeDefined();
      expect(result.familyMemberId).toBe('member-123');
      expect(result.categoryId).toBe('work');
      expect(result.preferredChannels).toEqual(['email', 'in_app']);
      expect(mockDataAccess.putItem).toHaveBeenCalled();
    });

    it('should create preferences with default values', async () => {
      const input = {
        familyMemberId: 'member-456',
      };

      const result = await service.createPreference(input);

      expect(result).toBeDefined();
      expect(result.familyMemberId).toBe('member-456');
      expect(result.disableThresholdAlerts).toBe(false);
      expect(result.disableSummaryEmails).toBe(false);
    });

    it('should throw error for invalid preferences', async () => {
      const input = {
        familyMemberId: 'member-789',
        preferredChannels: ['email'] as ('email' | 'in_app')[],
      };

      const result = await service.createPreference(input);
      expect(result).toBeDefined();
    });
  });

  describe('GET /api/notification-preferences', () => {
    it('should get specific preference by ID', async () => {
      const mockPreference = {
        PK: 'USER#member-123',
        SK: 'NOTIFICATION_PREFERENCE#pref-1',
        id: 'pref-1',
        familyMemberId: 'member-123',
        disableThresholdAlerts: false,
        disableSummaryEmails: false,
        disableEventUpdates: false,
        disableConflictAlerts: false,
        preferredChannels: ['email'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDataAccess.getItem.mockResolvedValue(mockPreference);

      const result = await service.getPreference('member-123', 'pref-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('pref-1');
      expect(mockDataAccess.getItem).toHaveBeenCalledWith(
        'USER#member-123',
        'NOTIFICATION_PREFERENCE#pref-1'
      );
    });

    it('should return null for non-existent preference', async () => {
      mockDataAccess.getItem.mockResolvedValue(null);

      const result = await service.getPreference('member-123', 'non-existent');

      expect(result).toBeNull();
    });

    it('should get all preferences for a family member', async () => {
      const mockPreferences = [
        {
          PK: 'USER#member-123',
          SK: 'NOTIFICATION_PREFERENCE#pref-1',
          id: 'pref-1',
          familyMemberId: 'member-123',
          categoryId: 'work',
          disableThresholdAlerts: false,
          disableSummaryEmails: false,
          disableEventUpdates: false,
          disableConflictAlerts: false,
          preferredChannels: ['email'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          PK: 'USER#member-123',
          SK: 'NOTIFICATION_PREFERENCE#pref-2',
          id: 'pref-2',
          familyMemberId: 'member-123',
          categoryId: 'health',
          disableThresholdAlerts: true,
          disableSummaryEmails: false,
          disableEventUpdates: false,
          disableConflictAlerts: false,
          preferredChannels: ['in_app'],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDataAccess.query.mockResolvedValue(mockPreferences);

      const result = await service.getPreferencesForMember('member-123');

      expect(result).toHaveLength(2);
      expect(result[0].categoryId).toBe('work');
      expect(result[1].categoryId).toBe('health');
    });
  });

  describe('PUT /api/notification-preferences/:preferenceId', () => {
    it('should update notification preferences', async () => {
      const existing = {
        id: 'pref-1',
        familyMemberId: 'member-123',
        disableThresholdAlerts: false,
        disableSummaryEmails: false,
        disableEventUpdates: false,
        disableConflictAlerts: false,
        preferredChannels: ['email'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDataAccess.getItem.mockResolvedValue({
        ...existing,
        PK: 'USER#member-123',
        SK: 'NOTIFICATION_PREFERENCE#pref-1',
      });

      const result = await service.updatePreference('member-123', 'pref-1', {
        disableThresholdAlerts: true,
        preferredChannels: ['in_app'],
      });

      expect(result).toBeDefined();
      expect(result?.disableThresholdAlerts).toBe(true);
      expect(result?.preferredChannels).toEqual(['in_app']);
      expect(mockDataAccess.putItem).toHaveBeenCalled();
    });

    it('should return null for non-existent preference', async () => {
      mockDataAccess.getItem.mockResolvedValue(null);

      const result = await service.updatePreference('member-123', 'non-existent', {
        disableThresholdAlerts: true,
      });

      expect(result).toBeNull();
    });
  });

  describe('DELETE /api/notification-preferences/:preferenceId', () => {
    it('should delete notification preferences', async () => {
      mockDataAccess.getItem.mockResolvedValue({
        PK: 'USER#member-123',
        SK: 'NOTIFICATION_PREFERENCE#pref-1',
        id: 'pref-1',
        familyMemberId: 'member-123',
      });

      const result = await service.deletePreference('member-123', 'pref-1');

      expect(result).toBe(true);
      expect(mockDataAccess.deleteItem).toHaveBeenCalledWith(
        'USER#member-123',
        'NOTIFICATION_PREFERENCE#pref-1'
      );
    });

    it('should return false for non-existent preference', async () => {
      mockDataAccess.getItem.mockResolvedValue(null);

      const result = await service.deletePreference('member-123', 'non-existent');

      expect(result).toBe(false);
    });
  });

  describe('Notification Type Checking', () => {
    it('should check if threshold alerts are enabled', async () => {
      const mockPreference = {
        PK: 'USER#member-123',
        SK: 'NOTIFICATION_PREFERENCE#pref-1',
        id: 'pref-1',
        familyMemberId: 'member-123',
        disableThresholdAlerts: false,
        disableSummaryEmails: false,
        disableEventUpdates: false,
        disableConflictAlerts: false,
        preferredChannels: ['email'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDataAccess.query.mockResolvedValue([mockPreference]);

      const result = await service.isNotificationTypeEnabled('member-123', 'threshold_alert');

      expect(result).toBe(true);
    });

    it('should check if threshold alerts are disabled', async () => {
      const mockPreference = {
        PK: 'USER#member-123',
        SK: 'NOTIFICATION_PREFERENCE#pref-1',
        id: 'pref-1',
        familyMemberId: 'member-123',
        disableThresholdAlerts: true,
        disableSummaryEmails: false,
        disableEventUpdates: false,
        disableConflictAlerts: false,
        preferredChannels: ['email'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDataAccess.query.mockResolvedValue([mockPreference]);

      const result = await service.isNotificationTypeEnabled('member-123', 'threshold_alert');

      expect(result).toBe(false);
    });

    it('should return true for enabled notification type when no preference exists', async () => {
      mockDataAccess.query.mockResolvedValue([]);

      const result = await service.isNotificationTypeEnabled('member-123', 'threshold_alert');

      expect(result).toBe(true);
    });
  });

  describe('Preferred Channels', () => {
    it('should get preferred notification channels', async () => {
      const mockPreference = {
        PK: 'USER#member-123',
        SK: 'NOTIFICATION_PREFERENCE#pref-1',
        id: 'pref-1',
        familyMemberId: 'member-123',
        disableThresholdAlerts: false,
        disableSummaryEmails: false,
        disableEventUpdates: false,
        disableConflictAlerts: false,
        preferredChannels: ['email', 'in_app'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDataAccess.query.mockResolvedValue([mockPreference]);

      const result = await service.getPreferredChannels('member-123');

      expect(result).toEqual(['email', 'in_app']);
    });

    it('should return default channels when no preference exists', async () => {
      mockDataAccess.query.mockResolvedValue([]);

      const result = await service.getPreferredChannels('member-123');

      expect(result).toEqual(['email', 'in_app']);
    });
  });

  describe('Disable/Enable All Notifications', () => {
    it('should disable all notifications', async () => {
      const mockPreference = {
        id: 'pref-1',
        familyMemberId: 'member-123',
        disableThresholdAlerts: false,
        disableSummaryEmails: false,
        disableEventUpdates: false,
        disableConflictAlerts: false,
        preferredChannels: ['email'] as ('email' | 'in_app')[],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDataAccess.query.mockResolvedValue([
        {
          ...mockPreference,
          PK: 'USER#member-123',
          SK: 'NOTIFICATION_PREFERENCE#pref-1',
        },
      ]);

      mockDataAccess.getItem.mockResolvedValue({
        ...mockPreference,
        PK: 'USER#member-123',
        SK: 'NOTIFICATION_PREFERENCE#pref-1',
      });

      const result = await service.disableAllNotifications('member-123');

      expect(result).toBeDefined();
      expect(result?.disableThresholdAlerts).toBe(true);
      expect(result?.disableSummaryEmails).toBe(true);
      expect(result?.disableEventUpdates).toBe(true);
      expect(result?.disableConflictAlerts).toBe(true);
    });

    it('should enable all notifications', async () => {
      const mockPreference = {
        id: 'pref-1',
        familyMemberId: 'member-123',
        disableThresholdAlerts: true,
        disableSummaryEmails: true,
        disableEventUpdates: true,
        disableConflictAlerts: true,
        preferredChannels: ['email'] as ('email' | 'in_app')[],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockDataAccess.query.mockResolvedValue([
        {
          ...mockPreference,
          PK: 'USER#member-123',
          SK: 'NOTIFICATION_PREFERENCE#pref-1',
        },
      ]);

      mockDataAccess.getItem.mockResolvedValue({
        ...mockPreference,
        PK: 'USER#member-123',
        SK: 'NOTIFICATION_PREFERENCE#pref-1',
      });

      const result = await service.enableAllNotifications('member-123');

      expect(result).toBeDefined();
      expect(result?.disableThresholdAlerts).toBe(false);
      expect(result?.disableSummaryEmails).toBe(false);
      expect(result?.disableEventUpdates).toBe(false);
      expect(result?.disableConflictAlerts).toBe(false);
    });
  });
});
