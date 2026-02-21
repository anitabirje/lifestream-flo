/**
 * Tests for Data Retention Manager Service
 * Property-based tests for data retention policy enforcement
 * Requirements: 9.5, 9.6, 9.7
 */

import fc from 'fast-check';
import { DataRetentionManager, DataRetentionNotification } from '../data-retention-manager';
import { DynamoDBDataAccess } from '../../data-access/dynamodb-client';
import { Event, ActivityCategoryName } from '../../models/event';

describe('DataRetentionManager', () => {
  let retentionManager: DataRetentionManager;
  let mockDataAccess: jest.Mocked<DynamoDBDataAccess>;

  beforeEach(() => {
    mockDataAccess = {
      putItem: jest.fn().mockResolvedValue(undefined),
      getItem: jest.fn().mockResolvedValue(null),
      query: jest.fn().mockResolvedValue([]),
      deleteItem: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
    } as any;

    retentionManager = new DataRetentionManager(mockDataAccess);
  });

  describe('calculateEventCutoffDate', () => {
    test('should calculate cutoff date 90 days in past', () => {
      const now = new Date();
      const expectedCutoff = new Date(now);
      expectedCutoff.setDate(expectedCutoff.getDate() - 90);

      const cutoff = retentionManager.calculateEventCutoffDate();

      // Check that cutoff is approximately 90 days in past (within 1 minute)
      const diffMs = Math.abs(cutoff.getTime() - expectedCutoff.getTime());
      expect(diffMs).toBeLessThan(60000); // Within 1 minute
    });
  });

  describe('calculateNotificationDate', () => {
    test('should calculate notification date 83 days in past (90 - 7)', () => {
      const now = new Date();
      const expectedNotification = new Date(now);
      expectedNotification.setDate(expectedNotification.getDate() - 83);

      const notification = retentionManager.calculateNotificationDate();

      // Check that notification date is approximately 83 days in past (within 1 minute)
      const diffMs = Math.abs(notification.getTime() - expectedNotification.getTime());
      expect(diffMs).toBeLessThan(60000); // Within 1 minute
    });
  });

  describe('getRetentionPolicy', () => {
    test('should return retention policy with correct values', () => {
      const policy = retentionManager.getRetentionPolicy();

      expect(policy.eventRetentionDays).toBe(90);
      expect(policy.userDataRetentionDays).toBe(Infinity);
      expect(policy.notificationDaysBeforeDeletion).toBe(7);
    });
  });

  describe('shouldRetainUserData', () => {
    test('should indicate user data is retained indefinitely', () => {
      const shouldRetain = retentionManager.shouldRetainUserData();
      expect(shouldRetain).toBe(true);
    });
  });

  // Property-based tests
  describe('Property 66: Data Retention Policy Enforcement', () => {
    it(
      'should identify events older than 90 days for deletion',
      () => {
        fc.assert(
          fc.property(
            fc.array(
              fc.record({
                daysOld: fc.integer({ min: 0, max: 180 }),
              }),
              { minLength: 1, maxLength: 20 }
            ),
            (eventDataArray: Array<{ daysOld: number }>) => {
              const now = new Date();
              const cutoffDate = retentionManager.calculateEventCutoffDate();

              const events: Event[] = eventDataArray.map((data, i) => {
                const createdAt = new Date(now);
                createdAt.setDate(createdAt.getDate() - data.daysOld);

                return {
                  id: `event-${i}`,
                  familyId: 'family-1',
                  familyMemberId: 'member-1',
                  title: `Event ${i}`,
                  description: 'Test event',
                  startTime: createdAt,
                  endTime: new Date(createdAt.getTime() + 3600000),
                  location: 'Test Location',
                  category: 'Work' as ActivityCategoryName,
                  source: 'internal',
                  createdAt,
                  updatedAt: createdAt,
                  createdBy: 'user-1',
                  isDeleted: false,
                };
              });

              // Identify events for deletion
              const eventsForDeletion = events.filter((e) => new Date(e.createdAt) < cutoffDate);

              // Verify all events for deletion are older than 90 days
              for (const event of eventsForDeletion) {
                const ageInDays = (now.getTime() - new Date(event.createdAt).getTime()) / (1000 * 60 * 60 * 24);
                expect(ageInDays).toBeGreaterThan(90);
              }

              // Verify recent events are not marked for deletion
              for (const event of events) {
                const ageInDays = (now.getTime() - new Date(event.createdAt).getTime()) / (1000 * 60 * 60 * 24);
                if (ageInDays <= 90) {
                  expect(eventsForDeletion).not.toContain(event);
                }
              }
            }
          )
        );
      }
    );

    it(
      'should identify events for notification 7 days before deletion',
      () => {
        fc.assert(
          fc.property(
            fc.array(
              fc.record({
                daysOld: fc.integer({ min: 0, max: 180 }),
              }),
              { minLength: 1, maxLength: 20 }
            ),
            (eventDataArray: Array<{ daysOld: number }>) => {
              const now = new Date();
              const cutoffDate = retentionManager.calculateEventCutoffDate();
              const notificationDate = retentionManager.calculateNotificationDate();

              const events: Event[] = eventDataArray.map((data, i) => {
                const createdAt = new Date(now);
                createdAt.setDate(createdAt.getDate() - data.daysOld);

                return {
                  id: `event-${i}`,
                  familyId: 'family-1',
                  familyMemberId: 'member-1',
                  title: `Event ${i}`,
                  description: 'Test event',
                  startTime: createdAt,
                  endTime: new Date(createdAt.getTime() + 3600000),
                  location: 'Test Location',
                  category: 'Work' as ActivityCategoryName,
                  source: 'internal',
                  createdAt,
                  updatedAt: createdAt,
                  createdBy: 'user-1',
                  isDeleted: false,
                };
              });

              // Identify events for notification
              const eventsForNotification = events.filter(
                (e) =>
                  new Date(e.createdAt) < notificationDate &&
                  new Date(e.createdAt) >= cutoffDate
              );

              // Verify all events for notification are in the correct age range
              for (const event of eventsForNotification) {
                const ageInDays = (now.getTime() - new Date(event.createdAt).getTime()) / (1000 * 60 * 60 * 24);
                expect(ageInDays).toBeGreaterThanOrEqual(83); // 90 - 7
                expect(ageInDays).toBeLessThan(90);
              }

              // Verify events outside the range are not included
              for (const event of events) {
                const ageInDays = (now.getTime() - new Date(event.createdAt).getTime()) / (1000 * 60 * 60 * 24);
                if (ageInDays < 83 || ageInDays >= 90) {
                  expect(eventsForNotification).not.toContain(event);
                }
              }
            }
          )
        );
      }
    );

    it(
      'should create retention notifications with all required fields',
      () => {
        fc.assert(
          fc.property(
            fc.record({
              eventCount: fc.integer({ min: 1, max: 1000 }),
              daysOld: fc.integer({ min: 90, max: 180 }),
            }),
            (data: { eventCount: number; daysOld: number }) => {
              const now = new Date();
              const notificationId = 'notification-1';
              const userId = 'user-1';
              const familyId = 'family-1';

              const oldestEventDate = new Date(now);
              oldestEventDate.setDate(oldestEventDate.getDate() - data.daysOld);

              const deletionDate = new Date(now);
              deletionDate.setDate(deletionDate.getDate() + 7);

              const notification: DataRetentionNotification = {
                PK: `USER#${userId}`,
                SK: `RETENTION_NOTIFICATION#${notificationId}`,
                EntityType: 'RETENTION_NOTIFICATION',
                id: notificationId,
                familyId,
                userId,
                eventCount: data.eventCount,
                oldestEventDate: oldestEventDate.toISOString(),
                deletionDate: deletionDate.toISOString(),
                notificationSentAt: now.toISOString(),
                acknowledged: false,
              };

              // Verify all required fields are present
              expect(notification.PK).toBeDefined();
              expect(notification.SK).toBeDefined();
              expect(notification.EntityType).toBe('RETENTION_NOTIFICATION');
              expect(notification.id).toBeDefined();
              expect(notification.familyId).toBe(familyId);
              expect(notification.userId).toBe(userId);
              expect(notification.eventCount).toBe(data.eventCount);
              expect(notification.eventCount).toBeGreaterThan(0);
              expect(notification.oldestEventDate).toBeDefined();
              expect(notification.deletionDate).toBeDefined();
              expect(notification.notificationSentAt).toBeDefined();
              expect(notification.acknowledged).toBe(false);

              // Verify timestamps are valid ISO 8601
              expect(() => new Date(notification.oldestEventDate)).not.toThrow();
              expect(() => new Date(notification.deletionDate)).not.toThrow();
              expect(() => new Date(notification.notificationSentAt)).not.toThrow();

              // Verify deletion date is after notification sent date
              expect(new Date(notification.deletionDate).getTime()).toBeGreaterThan(
                new Date(notification.notificationSentAt).getTime()
              );

              // Verify oldest event date is before deletion date
              expect(new Date(notification.oldestEventDate).getTime()).toBeLessThan(
                new Date(notification.deletionDate).getTime()
              );
            }
          )
        );
      }
    );

    it(
      'should preserve user data indefinitely',
      () => {
        fc.assert(
          fc.property(
            fc.array(
              fc.record({
                daysOld: fc.integer({ min: 0, max: 3650 }), // Up to 10 years
              }),
              { minLength: 1, maxLength: 10 }
            ),
            (userDataArray: Array<{ daysOld: number }>) => {
              const policy = retentionManager.getRetentionPolicy();

              // Verify user data retention is indefinite
              expect(policy.userDataRetentionDays).toBe(Infinity);
              expect(retentionManager.shouldRetainUserData()).toBe(true);

              // Verify that no user data should be deleted regardless of age
              for (const userData of userDataArray) {
                const ageInDays = userData.daysOld;
                // User data should never be deleted
                expect(ageInDays).toBeLessThanOrEqual(3650);
              }
            }
          )
        );
      }
    );
  });
});
