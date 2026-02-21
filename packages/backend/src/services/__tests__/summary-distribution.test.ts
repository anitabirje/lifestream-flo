/**
 * Tests for Summary Distribution Services
 * Property-based tests for scheduled and event-triggered summary distribution
 * Requirements: 6.5, 6.7
 */

import fc from 'fast-check';
import { SummaryScheduler, ScheduledSummaryConfig } from '../summary-scheduler';
import { EventTriggeredSummaryService, EventChangeNotification } from '../event-triggered-summary-service';
import { SummaryGenerator } from '../summary-generator';
import { NotificationDispatcher } from '../notification-dispatcher';
import { NotificationBuilder } from '../notification-builder';
import { Event, ActivityCategoryName } from '../../models/event';

// Mock implementations
class MockNotificationDispatcher {
  private sentNotifications: any[] = [];

  async sendEmailNotification(
    recipientEmail: string,
    subject: string,
    htmlContent: string,
    plainText: string
  ): Promise<{ success: boolean; error?: string }> {
    this.sentNotifications.push({ recipientEmail, subject, htmlContent, plainText });
    return { success: true };
  }

  async sendInAppNotification(
    recipientId: string,
    subject: string,
    content: string
  ): Promise<{ success: boolean; error?: string }> {
    this.sentNotifications.push({ recipientId, subject, content });
    return { success: true };
  }

  async dispatchNotification(
    notificationId: string,
    recipientId: string,
    recipientEmail: string,
    subject: string,
    htmlContent: string,
    plainText: string,
    channels: ('email' | 'in_app')[]
  ): Promise<any> {
    this.sentNotifications.push({ notificationId, recipientId, recipientEmail, subject, channels });
    return { notificationId, status: 'sent', channels: {}, createdAt: new Date() };
  }

  getSentNotifications(): any[] {
    return this.sentNotifications;
  }

  clearSentNotifications(): void {
    this.sentNotifications = [];
  }
}

describe('Summary Distribution Services', () => {
  let summaryGenerator: SummaryGenerator;
  let mockNotificationDispatcher: MockNotificationDispatcher;
  let notificationBuilder: NotificationBuilder;

  beforeEach(() => {
    summaryGenerator = new SummaryGenerator();
    mockNotificationDispatcher = new MockNotificationDispatcher();
    notificationBuilder = new NotificationBuilder();
  });

  /**
   * Helper to create test events
   */
  const createTestEvent = (
    id: string,
    familyMemberId: string,
    startTime: Date,
    endTime: Date,
    category?: ActivityCategoryName
  ): Event => ({
    id,
    familyId: 'family-1',
    familyMemberId,
    title: `Event ${id}`,
    description: 'Test event',
    startTime,
    endTime,
    location: 'Test Location',
    category: category || 'Work',
    source: 'internal',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1',
    isDeleted: false,
  });

  /**
   * Helper to get week boundaries
   */
  const getWeekBoundaries = (date: Date) => {
    const dayOfWeek = date.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - daysToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return { weekStart, weekEnd };
  };

  describe('SummaryScheduler', () => {
    test('should initialize with default config', () => {
      const scheduler = new SummaryScheduler(
        summaryGenerator,
        mockNotificationDispatcher as any,
        notificationBuilder
      );

      const config = scheduler.getConfig();
      expect(config.dayOfWeek).toBe(0); // Sunday
      expect(config.hour).toBe(18); // 6 PM
      expect(config.minute).toBe(0);
      expect(config.enabled).toBe(true);
    });

    test('should initialize with custom config', () => {
      const customConfig: ScheduledSummaryConfig = {
        dayOfWeek: 1,
        hour: 20,
        minute: 30,
        enabled: true,
      };

      const scheduler = new SummaryScheduler(
        summaryGenerator,
        mockNotificationDispatcher as any,
        notificationBuilder,
        customConfig
      );

      const config = scheduler.getConfig();
      expect(config.dayOfWeek).toBe(1);
      expect(config.hour).toBe(20);
      expect(config.minute).toBe(30);
    });

    test('should start and stop scheduler', () => {
      const scheduler = new SummaryScheduler(
        summaryGenerator,
        mockNotificationDispatcher as any,
        notificationBuilder
      );

      expect(scheduler.isRunning()).toBe(false);

      scheduler.startScheduler();
      expect(scheduler.isRunning()).toBe(true);

      scheduler.stopScheduler();
      expect(scheduler.isRunning()).toBe(false);
    });

    test('should not start scheduler if disabled', () => {
      const config: ScheduledSummaryConfig = {
        dayOfWeek: 0,
        hour: 18,
        minute: 0,
        enabled: false,
      };

      const scheduler = new SummaryScheduler(
        summaryGenerator,
        mockNotificationDispatcher as any,
        notificationBuilder,
        config
      );

      scheduler.startScheduler();
      expect(scheduler.isRunning()).toBe(false);
    });

    test('should update config', () => {
      const scheduler = new SummaryScheduler(
        summaryGenerator,
        mockNotificationDispatcher as any,
        notificationBuilder
      );

      scheduler.updateConfig({ hour: 20, minute: 30 });

      const config = scheduler.getConfig();
      expect(config.hour).toBe(20);
      expect(config.minute).toBe(30);
      expect(config.dayOfWeek).toBe(0); // Should remain unchanged
    });

    test('should generate and distribute summary', async () => {
      const scheduler = new SummaryScheduler(
        summaryGenerator,
        mockNotificationDispatcher as any,
        notificationBuilder
      );

      const { weekStart, weekEnd } = getWeekBoundaries(new Date());

      const events: Event[] = [
        createTestEvent('event-1', 'member-1', new Date(weekStart.getTime() + 1000 * 60 * 60), new Date(weekStart.getTime() + 1000 * 60 * 60 * 3), 'Work'),
      ];

      const familyMembers = [
        { id: 'member-1', email: 'member1@example.com', name: 'Member 1' },
        { id: 'member-2', email: 'member2@example.com', name: 'Member 2' },
      ];

      const preferences = new Map([
        ['member-1', { channels: ['email' as const], enabled: true }],
        ['member-2', { channels: ['email' as const], enabled: true }],
      ]);

      const result = await scheduler.generateAndDistributeSummary(
        'family-1',
        events,
        familyMembers,
        preferences
      );

      expect(result.success).toBe(true);
      expect(result.recipientsNotified).toBe(2);
      expect(result.failedRecipients).toHaveLength(0);
    });

    test('should respect notification preferences', async () => {
      const scheduler = new SummaryScheduler(
        summaryGenerator,
        mockNotificationDispatcher as any,
        notificationBuilder
      );

      const { weekStart, weekEnd } = getWeekBoundaries(new Date());

      const events: Event[] = [
        createTestEvent('event-1', 'member-1', new Date(weekStart.getTime() + 1000 * 60 * 60), new Date(weekStart.getTime() + 1000 * 60 * 60 * 3)),
      ];

      const familyMembers = [
        { id: 'member-1', email: 'member1@example.com', name: 'Member 1' },
        { id: 'member-2', email: 'member2@example.com', name: 'Member 2' },
      ];

      const preferences = new Map([
        ['member-1', { channels: ['email' as const], enabled: true }],
        ['member-2', { channels: ['email' as const], enabled: false }], // Opted out
      ]);

      const result = await scheduler.generateAndDistributeSummary(
        'family-1',
        events,
        familyMembers,
        preferences
      );

      expect(result.success).toBe(true);
      expect(result.recipientsNotified).toBe(1); // Only member-1
    });
  });

  describe('EventTriggeredSummaryService', () => {
    test('should initialize with default debounce delay', () => {
      const service = new EventTriggeredSummaryService(
        summaryGenerator,
        mockNotificationDispatcher as any,
        notificationBuilder
      );

      expect(service.getDebounceDelay()).toBe(5000);
    });

    test('should initialize with custom debounce delay', () => {
      const service = new EventTriggeredSummaryService(
        summaryGenerator,
        mockNotificationDispatcher as any,
        notificationBuilder,
        3000
      );

      expect(service.getDebounceDelay()).toBe(3000);
    });

    test('should set debounce delay', () => {
      const service = new EventTriggeredSummaryService(
        summaryGenerator,
        mockNotificationDispatcher as any,
        notificationBuilder
      );

      service.setDebounceDelay(2000);
      expect(service.getDebounceDelay()).toBe(2000);
    });

    test('should handle event change and generate summary', async () => {
      const service = new EventTriggeredSummaryService(
        summaryGenerator,
        mockNotificationDispatcher as any,
        notificationBuilder,
        100 // Short delay for testing
      );

      const { weekStart, weekEnd } = getWeekBoundaries(new Date());

      const event = createTestEvent('event-1', 'member-1', new Date(weekStart.getTime() + 1000 * 60 * 60), new Date(weekStart.getTime() + 1000 * 60 * 60 * 3));

      const notification: EventChangeNotification = {
        familyId: 'family-1',
        eventId: 'event-1',
        changeType: 'created',
        event,
        timestamp: new Date(),
      };

      const familyMembers = [
        { id: 'member-1', email: 'member1@example.com', name: 'Member 1' },
      ];

      const preferences = new Map([
        ['member-1', { channels: ['email' as const], enabled: true }],
      ]);

      const result = await service.handleEventChange(
        notification,
        [event],
        familyMembers,
        preferences
      );

      expect(result.summaryGenerated).toBe(true);
      expect(result.summaryDistributed).toBe(true);
      expect(result.recipientsNotified).toBeGreaterThan(0);
    });

    test('should clear pending timers', async () => {
      const service = new EventTriggeredSummaryService(
        summaryGenerator,
        mockNotificationDispatcher as any,
        notificationBuilder,
        5000 // Long delay
      );

      const { weekStart } = getWeekBoundaries(new Date());

      const event = createTestEvent('event-1', 'member-1', new Date(weekStart.getTime() + 1000 * 60 * 60), new Date(weekStart.getTime() + 1000 * 60 * 60 * 3));

      const notification: EventChangeNotification = {
        familyId: 'family-1',
        eventId: 'event-1',
        changeType: 'created',
        event,
        timestamp: new Date(),
      };

      const familyMembers = [
        { id: 'member-1', email: 'member1@example.com', name: 'Member 1' },
      ];

      const preferences = new Map([
        ['member-1', { channels: ['email' as const], enabled: true }],
      ]);

      service.handleEventChange(notification, [event], familyMembers, preferences);
      expect(service.getPendingCount()).toBe(1);

      service.clearPendingTimers();
      expect(service.getPendingCount()).toBe(0);
    });
  });

  // Property-based tests
  describe('Property 24: Event-Triggered Summary Distribution', () => {
    it(
      'should generate summary for any event change',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.record({
              changeType: fc.constantFrom<'created' | 'updated' | 'deleted'>('created', 'updated', 'deleted'),
              memberCount: fc.integer({ min: 1, max: 5 }),
            }),
            async (data: { changeType: 'created' | 'updated' | 'deleted'; memberCount: number }) => {
              const service = new EventTriggeredSummaryService(
                summaryGenerator,
                mockNotificationDispatcher as any,
                notificationBuilder,
                50 // Short delay for testing
              );

              const { weekStart } = getWeekBoundaries(new Date());

              const event = createTestEvent('event-1', 'member-1', new Date(weekStart.getTime() + 1000 * 60 * 60), new Date(weekStart.getTime() + 1000 * 60 * 60 * 3));

              const notification: EventChangeNotification = {
                familyId: 'family-1',
                eventId: 'event-1',
                changeType: data.changeType,
                event,
                timestamp: new Date(),
              };

              const familyMembers = Array.from({ length: data.memberCount }, (_, i) => ({
                id: `member-${i}`,
                email: `member${i}@example.com`,
                name: `Member ${i}`,
              }));

              const preferences = new Map(
                familyMembers.map((m) => [m.id, { channels: ['email' as const], enabled: true }])
              );

              const result = await service.handleEventChange(
                notification,
                [event],
                familyMembers,
                preferences
              );

              // Verify summary was generated and distributed
              expect(result.summaryGenerated).toBe(true);
              expect(result.summaryDistributed).toBe(true);
              expect(result.recipientsNotified).toBe(data.memberCount);
            }
          ),
          { timeout: 10000 }
        );
      },
      10000
    );
  });

  describe('Property 25: Summary Opt-Out Respect', () => {
    it(
      'should respect notification opt-out preferences',
      async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.array(
              fc.record({
                memberId: fc.string({ minLength: 1, maxLength: 10 }),
                enabled: fc.boolean(),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            async (memberPrefs: Array<{ memberId: string; enabled: boolean }>) => {
              const scheduler = new SummaryScheduler(
                summaryGenerator,
                mockNotificationDispatcher as any,
                notificationBuilder
              );

              const { weekStart } = getWeekBoundaries(new Date());

              const event = createTestEvent('event-1', 'member-1', new Date(weekStart.getTime() + 1000 * 60 * 60), new Date(weekStart.getTime() + 1000 * 60 * 60 * 3));

              const familyMembers = memberPrefs.map((p) => ({
                id: p.memberId,
                email: `${p.memberId}@example.com`,
                name: p.memberId,
              }));

              const preferences = new Map(
                memberPrefs.map((p) => [p.memberId, { channels: ['email' as const], enabled: p.enabled }])
              );

              const result = await scheduler.generateAndDistributeSummary(
                'family-1',
                [event],
                familyMembers,
                preferences
              );

              // Count expected recipients (those with enabled=true)
              const expectedRecipients = memberPrefs.filter((p) => p.enabled).length;

              // Verify only enabled members received notification
              expect(result.recipientsNotified).toBe(expectedRecipients);
            }
          )
        );
      }
    );
  });
});
