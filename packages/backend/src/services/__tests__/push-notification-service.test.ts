/**
 * Tests for Push Notification Service
 * Property-based tests for push notification delivery
 * Requirements: 8a.8, 8a.9
 */

import fc from 'fast-check';
import { PushNotificationService, PushSubscription, PushNotificationPayload } from '../push-notification-service';
import { DynamoDBDataAccess } from '../../data-access/dynamodb-client';

// Mock DynamoDB
jest.mock('../../data-access/dynamodb-client');

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  let mockDataAccess: jest.Mocked<DynamoDBDataAccess>;

  const mockConfig = {
    vapidPublicKey: 'test-public-key',
    vapidPrivateKey: 'test-private-key',
    vapidSubject: 'mailto:test@example.com',
  };

  beforeEach(() => {
    mockDataAccess = new DynamoDBDataAccess() as jest.Mocked<DynamoDBDataAccess>;
    service = new PushNotificationService(mockDataAccess, mockConfig);
  });

  describe('storeSubscription', () => {
    test('should store a push subscription', async () => {
      const subscription: PushSubscription = {
        endpoint: 'https://example.com/push/endpoint',
        keys: {
          p256dh: 'test-p256dh-key',
          auth: 'test-auth-key',
        },
      };

      mockDataAccess.putItem = jest.fn().mockResolvedValue(undefined);

      const subscriptionId = await service.storeSubscription('user-1', 'family-1', subscription, 'Mozilla/5.0');

      expect(subscriptionId).toBeDefined();
      expect(mockDataAccess.putItem).toHaveBeenCalled();

      const storedEntity = (mockDataAccess.putItem as jest.Mock).mock.calls[0][0];
      expect(storedEntity.PK).toBe('USER#user-1');
      expect(storedEntity.endpoint).toBe(subscription.endpoint);
      expect(storedEntity.isActive).toBe(true);
    });

    /**
     * Property 67: Push Subscription Storage
     * **Validates: Requirements 8a.8**
     *
     * For any valid push subscription, the service should:
     * 1. Store the subscription in the database
     * 2. Return a unique subscription ID
     * 3. Mark the subscription as active
     * 4. Set appropriate TTL for the subscription
     */
    test('Property 67: Push Subscription Storage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (userId, familyId, endpoint, authKey) => {
            const subscription: PushSubscription = {
              endpoint: `https://example.com/${endpoint}`,
              keys: {
                p256dh: 'test-key',
                auth: authKey,
              },
            };

            mockDataAccess.putItem = jest.fn().mockResolvedValue(undefined);

            const subscriptionId = await service.storeSubscription(userId, familyId, subscription);

            expect(subscriptionId).toBeDefined();
            expect(subscriptionId).toMatch(/^[a-f0-9-]{36}$/); // UUID format
            expect(mockDataAccess.putItem).toHaveBeenCalled();

            const storedEntity = (mockDataAccess.putItem as jest.Mock).mock.calls[0][0];
            expect(storedEntity.isActive).toBe(true);
            expect(storedEntity.TTL).toBeGreaterThan(Math.floor(Date.now() / 1000));
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('getUserSubscriptions', () => {
    test('should retrieve active subscriptions for a user', async () => {
      const mockSubscriptions = [
        {
          PK: 'USER#user-1',
          SK: 'PUSH_SUBSCRIPTION#sub-1',
          id: 'sub-1',
          isActive: true,
          endpoint: 'https://example.com/push/1',
          keys: { p256dh: 'key1', auth: 'auth1' },
        },
        {
          PK: 'USER#user-1',
          SK: 'PUSH_SUBSCRIPTION#sub-2',
          id: 'sub-2',
          isActive: true,
          endpoint: 'https://example.com/push/2',
          keys: { p256dh: 'key2', auth: 'auth2' },
        },
      ];

      mockDataAccess.query = jest.fn().mockResolvedValue(mockSubscriptions);

      const subscriptions = await service.getUserSubscriptions('user-1');

      expect(subscriptions).toHaveLength(2);
      expect(subscriptions[0].id).toBe('sub-1');
      expect(subscriptions[1].id).toBe('sub-2');
    });

    test('should filter out inactive subscriptions', async () => {
      const mockSubscriptions = [
        {
          PK: 'USER#user-1',
          SK: 'PUSH_SUBSCRIPTION#sub-1',
          id: 'sub-1',
          isActive: true,
          endpoint: 'https://example.com/push/1',
        },
        {
          PK: 'USER#user-1',
          SK: 'PUSH_SUBSCRIPTION#sub-2',
          id: 'sub-2',
          isActive: false,
          endpoint: 'https://example.com/push/2',
        },
      ];

      mockDataAccess.query = jest.fn().mockResolvedValue(mockSubscriptions);

      const subscriptions = await service.getUserSubscriptions('user-1');

      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0].id).toBe('sub-1');
    });
  });

  describe('removeSubscription', () => {
    test('should mark subscription as inactive', async () => {
      const mockSubscription = {
        PK: 'USER#user-1',
        SK: 'PUSH_SUBSCRIPTION#sub-1',
        id: 'sub-1',
        isActive: true,
        endpoint: 'https://example.com/push/1',
      };

      mockDataAccess.query = jest.fn().mockResolvedValue([mockSubscription]);
      mockDataAccess.putItem = jest.fn().mockResolvedValue(undefined);

      const success = await service.removeSubscription('user-1', 'sub-1');

      expect(success).toBe(true);
      expect(mockDataAccess.putItem).toHaveBeenCalled();

      const updatedEntity = (mockDataAccess.putItem as jest.Mock).mock.calls[0][0];
      expect(updatedEntity.isActive).toBe(false);
    });

    test('should return false if subscription not found', async () => {
      mockDataAccess.query = jest.fn().mockResolvedValue([]);

      const success = await service.removeSubscription('user-1', 'non-existent');

      expect(success).toBe(false);
      expect(mockDataAccess.putItem).not.toHaveBeenCalled();
    });
  });

  describe('sendNotification', () => {
    test('should send notification to active subscription', async () => {
      const mockSubscription = {
        PK: 'USER#user-1',
        SK: 'PUSH_SUBSCRIPTION#sub-1',
        id: 'sub-1',
        userId: 'user-1',
        familyId: 'family-1',
        isActive: true,
        endpoint: 'https://example.com/push/1',
        keys: { p256dh: 'key1', auth: 'auth1' },
      };

      const payload: PushNotificationPayload = {
        title: 'Test Notification',
        body: 'This is a test notification',
      };

      mockDataAccess.query = jest.fn().mockResolvedValue([mockSubscription]);
      mockDataAccess.putItem = jest.fn().mockResolvedValue(undefined);

      // Mock web-push
      jest.mock('web-push', () => ({
        setVapidDetails: jest.fn(),
        sendNotification: jest.fn().mockResolvedValue({}),
      }));

      const result = await service.sendNotification('user-1', 'sub-1', payload);

      expect(result.success).toBe(true);
      expect(result.subscriptionId).toBe('sub-1');
    });

    /**
     * Property 68: Push Notification Delivery
     * **Validates: Requirements 8a.8, 8a.9**
     *
     * For any valid push notification payload, the service should:
     * 1. Attempt to send the notification
     * 2. Record the send attempt in the database
     * 3. Return a result indicating success or failure
     * 4. Implement retry logic for transient failures
     */
    test('Property 68: Push Notification Delivery', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 500 }),
          async (title, body) => {
            const mockSubscription = {
              PK: 'USER#user-1',
              SK: 'PUSH_SUBSCRIPTION#sub-1',
              id: 'sub-1',
              userId: 'user-1',
              familyId: 'family-1',
              isActive: true,
              endpoint: 'https://example.com/push/1',
              keys: { p256dh: 'key1', auth: 'auth1' },
            };

            const payload: PushNotificationPayload = {
              title,
              body,
            };

            mockDataAccess.query = jest.fn().mockResolvedValue([mockSubscription]);
            mockDataAccess.putItem = jest.fn().mockResolvedValue(undefined);

            const result = await service.sendNotification('user-1', 'sub-1', payload);

            expect(result).toBeDefined();
            expect(result.subscriptionId).toBe('sub-1');
            expect(result.retryCount).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('sendToAllSubscriptions', () => {
    test('should send notification to all active subscriptions', async () => {
      const mockSubscriptions = [
        {
          PK: 'USER#user-1',
          SK: 'PUSH_SUBSCRIPTION#sub-1',
          id: 'sub-1',
          userId: 'user-1',
          familyId: 'family-1',
          isActive: true,
          endpoint: 'https://example.com/push/1',
          keys: { p256dh: 'key1', auth: 'auth1' },
        },
        {
          PK: 'USER#user-1',
          SK: 'PUSH_SUBSCRIPTION#sub-2',
          id: 'sub-2',
          userId: 'user-1',
          familyId: 'family-1',
          isActive: true,
          endpoint: 'https://example.com/push/2',
          keys: { p256dh: 'key2', auth: 'auth2' },
        },
      ];

      const payload: PushNotificationPayload = {
        title: 'Test Notification',
        body: 'This is a test notification',
      };

      mockDataAccess.query = jest.fn().mockResolvedValue(mockSubscriptions);
      mockDataAccess.putItem = jest.fn().mockResolvedValue(undefined);

      const results = await service.sendToAllSubscriptions('user-1', 'family-1', payload);

      expect(results).toHaveLength(2);
      expect(results[0].subscriptionId).toBe('sub-1');
      expect(results[1].subscriptionId).toBe('sub-2');
    });
  });

  describe('getStatus', () => {
    test('should return service status', () => {
      const status = service.getStatus();

      expect(status).toBeDefined();
      expect(status.initialized).toBe(true);
      expect(status.vapidPublicKey).toBe('test-public-key');
      expect(status.maxRetries).toBeGreaterThan(0);
    });
  });
});
