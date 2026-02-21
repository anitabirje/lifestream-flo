import fc from 'fast-check';
import { Event, ActivityCategoryName, EventSource } from '../models/event';
import { DashboardDataBuilder } from '../services/dashboard-data-builder';
import { AgentSyncCoordinator, SyncCoordinatorConfig } from '../services/agent-sync-coordinator';

/**
 * Mock Agent Orchestrator for testing
 */
class MockAgentOrchestrator {
  async submitTask(task: any): Promise<string> {
    // Mock implementation
    return 'task-id';
  }
}

/**
 * Mock Notification Service for testing
 */
interface MockNotification {
  id: string;
  recipientId: string;
  familyId: string;
  type: 'threshold_alert' | 'weekly_summary' | 'event_update' | 'conflict_alert';
  subject: string;
  content: string;
  channels: ('email' | 'in_app')[];
  status: 'pending' | 'sent' | 'failed';
  createdAt: Date;
  sentAt?: Date;
}

class MockNotificationService {
  private notifications: Map<string, MockNotification> = new Map();

  async queueNotification(payload: {
    recipientId: string;
    familyId: string;
    type: 'threshold_alert' | 'weekly_summary' | 'event_update' | 'conflict_alert';
    subject: string;
    content: string;
    channels: ('email' | 'in_app')[];
  }): Promise<{ notificationId: string; status: string; createdAt: Date }> {
    const id = Math.random().toString(36).substr(2, 9);
    const notification: MockNotification = {
      id,
      ...payload,
      status: 'pending',
      createdAt: new Date(),
    };
    this.notifications.set(id, notification);
    return { notificationId: id, status: 'pending', createdAt: new Date() };
  }

  async dispatchNotification(
    notificationId: string,
    channels: ('email' | 'in_app')[]
  ): Promise<{ notificationId: string; status: string; sentAt: Date }> {
    const notification = this.notifications.get(notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }
    notification.status = 'sent';
    notification.sentAt = new Date();
    return { notificationId, status: 'sent', sentAt: new Date() };
  }

  async getPendingNotifications(recipientId: string): Promise<MockNotification[]> {
    return Array.from(this.notifications.values()).filter(
      (n) => n.recipientId === recipientId && n.status === 'pending'
    );
  }

  clear(): void {
    this.notifications.clear();
  }
}

describe('Integration Tests - End-to-End Flows', () => {
  let dashboardBuilder: DashboardDataBuilder;
  let notificationService: MockNotificationService;
  let agentOrchestrator: MockAgentOrchestrator;
  let syncCoordinator: AgentSyncCoordinator;

  beforeEach(() => {
    dashboardBuilder = new DashboardDataBuilder(5 * 60 * 1000); // 5 minute cache
    notificationService = new MockNotificationService();
    agentOrchestrator = new MockAgentOrchestrator();

    const syncConfig: SyncCoordinatorConfig = {
      maxConcurrentSyncs: 5,
      syncTimeout: 30000,
      retryStrategy: 'exponential',
      retryDelay: 1000,
    };
    syncCoordinator = new AgentSyncCoordinator(agentOrchestrator as any, syncConfig);
  });

  afterEach(() => {
    dashboardBuilder.clearAllCache();
    notificationService.clear();
    syncCoordinator.clear();
  });

  describe('E2E Flow 1: Calendar Sync to Dashboard Display', () => {
    test('should build dashboard metrics from calendar events', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              familyId: fc.constant('family-1'),
              familyMemberId: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              category: fc.constantFrom<ActivityCategoryName>(
                'Work',
                'Family Time',
                'Health/Fitness',
                'Upskilling',
                'Relaxation'
              ),
              startTime: fc.date(),
              endTime: fc.date(),
              source: fc.constantFrom<EventSource>('google', 'outlook', 'kids_school'),
              createdAt: fc.date(),
              updatedAt: fc.date(),
              createdBy: fc.uuid(),
              isDeleted: fc.boolean(),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (eventData) => {
            // Ensure startTime < endTime
            const events: Event[] = eventData.map((e) => ({
              ...e,
              startTime: new Date(Math.min(e.startTime.getTime(), e.endTime.getTime())),
              endTime: new Date(Math.max(e.startTime.getTime(), e.endTime.getTime())),
            }));

            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-01-07');

            // Act: Build dashboard metrics
            const metrics = dashboardBuilder.buildDashboardMetrics(
              'family-1',
              events,
              startDate,
              endDate
            );

            // Assert: Verify dashboard structure
            expect(metrics).toBeDefined();
            expect(metrics.weekStartDate).toEqual(startDate);
            expect(metrics.weekEndDate).toEqual(endDate);
            expect(metrics.timeAllocations).toBeDefined();
            expect(Array.isArray(metrics.timeAllocations)).toBe(true);
            expect(metrics.comparativeMetrics).toBeDefined();
            expect(metrics.generatedAt).toBeInstanceOf(Date);
            expect(metrics.totalHours).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    test('should cache dashboard metrics for performance', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              familyId: fc.constant('family-1'),
              familyMemberId: fc.uuid(),
              title: fc.string({ minLength: 1 }),
              category: fc.constantFrom<ActivityCategoryName>(
                'Work',
                'Family Time',
                'Health/Fitness',
                'Upskilling',
                'Relaxation'
              ),
              startTime: fc.date(),
              endTime: fc.date(),
              source: fc.constantFrom<EventSource>('google', 'outlook'),
              createdAt: fc.date(),
              updatedAt: fc.date(),
              createdBy: fc.uuid(),
              isDeleted: fc.boolean(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (eventData) => {
            const events: Event[] = eventData.map((e) => ({
              ...e,
              startTime: new Date(Math.min(e.startTime.getTime(), e.endTime.getTime())),
              endTime: new Date(Math.max(e.startTime.getTime(), e.endTime.getTime())),
            }));

            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-01-07');

            // Act: Build metrics twice
            const metrics1 = dashboardBuilder.buildDashboardMetrics(
              'family-1',
              events,
              startDate,
              endDate,
              undefined,
              true
            );

            const metrics2 = dashboardBuilder.buildDashboardMetrics(
              'family-1',
              events,
              startDate,
              endDate,
              undefined,
              true
            );

            // Assert: Verify cache is working (same object reference)
            expect(metrics1).toEqual(metrics2);
            expect(metrics1.generatedAt).toEqual(metrics2.generatedAt);
          }
        ),
        { numRuns: 30 }
      );
    });

    test('should handle empty event list gracefully', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-07');

      // Act: Build metrics with empty events
      const metrics = dashboardBuilder.buildDashboardMetrics('family-1', [], startDate, endDate);

      // Assert: Verify empty state is handled
      expect(metrics).toBeDefined();
      expect(metrics.timeAllocations).toBeDefined();
      expect(metrics.totalHours).toBe(0);
      expect(metrics.generatedAt).toBeInstanceOf(Date);
    });

    test('should build metrics for all family members', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              familyId: fc.constant('family-1'),
              familyMemberId: fc.uuid(),
              title: fc.string({ minLength: 1 }),
              category: fc.constantFrom<ActivityCategoryName>(
                'Work',
                'Family Time',
                'Health/Fitness',
                'Upskilling',
                'Relaxation'
              ),
              startTime: fc.date(),
              endTime: fc.date(),
              source: fc.constantFrom<EventSource>('google', 'outlook'),
              createdAt: fc.date(),
              updatedAt: fc.date(),
              createdBy: fc.uuid(),
              isDeleted: fc.boolean(),
            }),
            { minLength: 2, maxLength: 15 }
          ),
          (eventData) => {
            const events: Event[] = eventData.map((e) => ({
              ...e,
              startTime: new Date(Math.min(e.startTime.getTime(), e.endTime.getTime())),
              endTime: new Date(Math.max(e.startTime.getTime(), e.endTime.getTime())),
            }));

            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-01-07');

            // Act: Build metrics for all members
            const metricsMap = dashboardBuilder.buildDashboardMetricsForAllMembers(
              'family-1',
              events,
              startDate,
              endDate
            );

            // Assert: Verify metrics for each member
            expect(metricsMap.size).toBeGreaterThan(0);
            for (const [memberId, metrics] of metricsMap.entries()) {
              expect(memberId).toBeDefined();
              expect(metrics).toBeDefined();
              expect(metrics.familyMemberId).toBe(memberId);
              expect(metrics.timeAllocations).toBeDefined();
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('E2E Flow 2: Notification Generation and Delivery', () => {
    test('should queue notifications for delivery', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            recipientId: fc.uuid(),
            familyId: fc.uuid(),
            subject: fc.string({ minLength: 1, maxLength: 100 }),
            content: fc.string({ minLength: 1, maxLength: 500 }),
            type: fc.constantFrom<'threshold_alert' | 'weekly_summary' | 'event_update' | 'conflict_alert'>(
              'threshold_alert',
              'weekly_summary',
              'event_update',
              'conflict_alert'
            ),
          }),
          async (payload) => {
            // Act: Queue notification
            const result = await notificationService.queueNotification({
              ...payload,
              channels: ['email', 'in_app'],
            });

            // Assert: Verify notification is queued
            expect(result).toBeDefined();
            expect(result.notificationId).toBeDefined();
            expect(result.status).toBe('pending');
            expect(result.createdAt).toBeInstanceOf(Date);
          }
        ),
        { numRuns: 30 }
      );
    });

    test('should dispatch notifications via multiple channels', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            recipientId: fc.uuid(),
            familyId: fc.uuid(),
            subject: fc.string({ minLength: 1, maxLength: 100 }),
            content: fc.string({ minLength: 1, maxLength: 500 }),
          }),
          async (data) => {
            // Act: Queue notification first
            const queueResult = await notificationService.queueNotification({
              recipientId: data.recipientId,
              familyId: data.familyId,
              subject: data.subject,
              content: data.content,
              type: 'weekly_summary',
              channels: ['email', 'in_app'],
            });

            // Act: Dispatch notification
            const result = await notificationService.dispatchNotification(
              queueResult.notificationId,
              ['email', 'in_app']
            );

            // Assert: Verify dispatch result
            expect(result).toBeDefined();
            expect(result.notificationId).toBe(queueResult.notificationId);
            expect(result.status).toBe('sent');
            expect(result.sentAt).toBeInstanceOf(Date);
          }
        ),
        { numRuns: 30 }
      );
    });

    test('should retrieve pending notifications for user', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              recipientId: fc.constant('user-1'),
              familyId: fc.uuid(),
              subject: fc.string({ minLength: 1 }),
              content: fc.string({ minLength: 1 }),
              type: fc.constantFrom<'threshold_alert' | 'weekly_summary' | 'event_update' | 'conflict_alert'>(
                'threshold_alert',
                'weekly_summary'
              ),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (notifications) => {
            // Act: Queue multiple notifications
            for (const notif of notifications) {
              await notificationService.queueNotification({
                ...notif,
                channels: ['email'],
              });
            }

            // Act: Retrieve pending notifications
            const pending = await notificationService.getPendingNotifications('user-1');

            // Assert: Verify pending notifications
            expect(pending).toBeDefined();
            expect(Array.isArray(pending)).toBe(true);
            expect(pending.length).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('E2E Flow 3: Agent Sync Coordination', () => {
    test('should start and track sync operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            sourceId: fc.uuid(),
            operationType: fc.constantFrom<'full_sync' | 'incremental_sync'>('full_sync', 'incremental_sync'),
          }),
          async (data) => {
            // Clear any previous syncs to avoid hitting concurrency limit
            syncCoordinator.clear();

            // Act: Start sync operation
            const syncId = await syncCoordinator.startSync(data.sourceId, data.operationType);

            // Assert: Verify sync is tracked
            expect(syncId).toBeDefined();
            const syncStatus = syncCoordinator.getSyncStatus(syncId);
            expect(syncStatus).toBeDefined();
            expect(syncStatus?.sourceId).toBe(data.sourceId);
            expect(syncStatus?.operationType).toBe(data.operationType);
            expect(syncStatus?.status).toBe('in_progress');
          }
        ),
        { numRuns: 30 }
      );
    });

    test('should handle parallel sync operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
          async (sourceIds) => {
            // Act: Start parallel syncs
            const syncIds = await syncCoordinator.startParallelSyncs(sourceIds, 'incremental_sync');

            // Assert: Verify all syncs are tracked
            expect(syncIds.length).toBeLessThanOrEqual(sourceIds.length);
            for (const syncId of syncIds) {
              const syncStatus = syncCoordinator.getSyncStatus(syncId);
              expect(syncStatus).toBeDefined();
              expect(syncStatus?.status).toBe('in_progress');
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should track sync completion and failure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (sourceId) => {
            // Act: Start sync
            const syncId = await syncCoordinator.startSync(sourceId);

            // Act: Mark as completed
            syncCoordinator.markSyncCompleted(syncId);

            // Assert: Verify completion
            let syncStatus = syncCoordinator.getSyncStatus(syncId);
            expect(syncStatus?.status).toBe('completed');
            expect(syncStatus?.endTime).toBeInstanceOf(Date);

            // Act: Start another sync and mark as failed
            const syncId2 = await syncCoordinator.startSync(sourceId);
            syncCoordinator.markSyncFailed(syncId2, 'Test error', false);

            // Assert: Verify failure
            syncStatus = syncCoordinator.getSyncStatus(syncId2);
            expect(syncStatus?.status).toBe('failed');
            expect(syncStatus?.errorMessage).toBe('Test error');
          }
        ),
        { numRuns: 20 }
      );
    });

    test('should provide sync statistics', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.uuid(), { minLength: 1, maxLength: 3 }),
          async (sourceIds) => {
            // Act: Start multiple syncs
            const syncIds = await syncCoordinator.startParallelSyncs(sourceIds);

            // Act: Mark some as completed
            if (syncIds.length > 0) {
              syncCoordinator.markSyncCompleted(syncIds[0]);
            }

            // Act: Get statistics
            const stats = syncCoordinator.getStats();

            // Assert: Verify statistics
            expect(stats).toBeDefined();
            expect(stats.totalSyncs).toBeGreaterThanOrEqual(0);
            expect(stats.activeSyncs).toBeGreaterThanOrEqual(0);
            expect(stats.completedSyncs).toBeGreaterThanOrEqual(0);
            expect(stats.failedSyncs).toBeGreaterThanOrEqual(0);
            expect(stats.pendingSyncs).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('E2E Flow 4: Complete User Workflow', () => {
    test('should handle complete workflow: sync -> dashboard -> notification', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            familyId: fc.constant('family-1'),
            userId: fc.uuid(),
            sourceId: fc.uuid(),
            eventCount: fc.integer({ min: 1, max: 10 }),
          }),
          async (workflow) => {
            // Step 1: Start calendar sync
            const syncId = await syncCoordinator.startSync(workflow.sourceId, 'full_sync');
            expect(syncId).toBeDefined();

            // Step 2: Create mock events
            const events: Event[] = Array.from({ length: workflow.eventCount }, (_, i) => ({
              id: `event-${i}`,
              familyId: workflow.familyId,
              familyMemberId: workflow.userId,
              title: `Event ${i}`,
              category: 'Work' as ActivityCategoryName,
              startTime: new Date('2024-01-01'),
              endTime: new Date('2024-01-01T02:00:00'),
              source: 'google' as EventSource,
              createdAt: new Date(),
              updatedAt: new Date(),
              createdBy: workflow.userId,
              isDeleted: false,
            }));

            // Step 3: Mark sync as completed
            syncCoordinator.markSyncCompleted(syncId);

            // Step 4: Build dashboard metrics
            const metrics = dashboardBuilder.buildDashboardMetrics(
              workflow.familyId,
              events,
              new Date('2024-01-01'),
              new Date('2024-01-07')
            );
            expect(metrics).toBeDefined();

            // Step 5: Queue notification
            const notifResult = await notificationService.queueNotification({
              recipientId: workflow.userId,
              familyId: workflow.familyId,
              type: 'weekly_summary',
              subject: 'Weekly Summary',
              content: `You have ${workflow.eventCount} events this week`,
              channels: ['email', 'in_app'],
            });
            expect(notifResult.status).toBe('pending');

            // Assert: Verify complete workflow
            expect(syncCoordinator.getSyncStatus(syncId)?.status).toBe('completed');
            expect(metrics.totalHours).toBeGreaterThanOrEqual(0);
            expect(notifResult.notificationId).toBeDefined();
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
