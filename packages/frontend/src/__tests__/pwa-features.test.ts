/**
 * Property-Based Tests for PWA Features
 * Feature: flo-family-calendar
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { CalendarCacheService, type CachedEvent } from '../services/calendar-cache';
import { OfflineSyncService, type PendingChange } from '../services/offline-sync';
import { NotificationPermissionService } from '../services/notification-permission';
import { NotificationPreferencesService } from '../services/notification-preferences';

describe('PWA Features - Property-Based Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  /**
   * Property 60: Offline Data Availability
   * 
   * **Validates: Requirements 8a.1, 8a.2, 8a.3**
   * 
   * GIVEN a set of calendar events for the current week
   * WHEN the events are cached
   * THEN the cached data should be retrievable offline
   * AND the cached data should match the original events
   * AND the cache should remain valid for 24 hours
   */
  describe('Property 60: Offline Data Availability', () => {
    it('should cache and retrieve current week calendar data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              startTime: fc.date().map(d => d.toISOString()),
              endTime: fc.date().map(d => d.toISOString()),
              familyMemberId: fc.uuid(),
              category: fc.constantFrom('Work', 'Family Time', 'Health/Fitness', 'Upskilling', 'Relaxation'),
              description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
              location: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
            }),
            { minLength: 0, maxLength: 50 }
          ),
          async (events) => {
            const cacheService = new CalendarCacheService();

            // Cache the events
            await cacheService.cacheCurrentWeek(events);

            // Retrieve cached data
            const cached = await cacheService.getCachedCurrentWeek();

            // Verify cache exists
            expect(cached).not.toBeNull();
            expect(cached!.events).toHaveLength(events.length);

            // Verify all events are cached correctly
            for (let i = 0; i < events.length; i++) {
              expect(cached!.events[i]).toEqual(events[i]);
            }

            // Verify cache metadata
            expect(cached!.weekStart).toBeDefined();
            expect(cached!.weekEnd).toBeDefined();
            expect(cached!.cachedAt).toBeDefined();

            // Verify cache is valid (not expired)
            const cachedAt = new Date(cached!.cachedAt);
            const now = new Date();
            const age = now.getTime() - cachedAt.getTime();
            expect(age).toBeLessThan(24 * 60 * 60 * 1000); // Less than 24 hours
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should expire cache after 24 hours', async () => {
      const cacheService = new CalendarCacheService();
      const events: CachedEvent[] = [
        {
          id: '1',
          title: 'Test Event',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          familyMemberId: 'user1',
          category: 'Work',
        },
      ];

      // Cache events
      await cacheService.cacheCurrentWeek(events);

      // Manually set cache timestamp to 25 hours ago
      const weekData = JSON.parse(localStorage.getItem('flo_current_week')!);
      const oldTimestamp = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      weekData.cachedAt = oldTimestamp;
      localStorage.setItem('flo_current_week', JSON.stringify(weekData));

      // Try to retrieve - should return null (expired)
      const cached = await cacheService.getCachedCurrentWeek();
      expect(cached).toBeNull();
    });

    it('should clear cache when week changes', async () => {
      const cacheService = new CalendarCacheService();
      const events: CachedEvent[] = [
        {
          id: '1',
          title: 'Test Event',
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          familyMemberId: 'user1',
          category: 'Work',
        },
      ];

      // Cache events
      await cacheService.cacheCurrentWeek(events);

      // Manually set week range to last week
      const weekData = JSON.parse(localStorage.getItem('flo_current_week')!);
      const lastWeekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const lastWeekEnd = new Date(lastWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
      weekData.weekStart = lastWeekStart.toISOString();
      weekData.weekEnd = lastWeekEnd.toISOString();
      localStorage.setItem('flo_current_week', JSON.stringify(weekData));

      // Try to retrieve - should return null (week changed)
      const cached = await cacheService.getCachedCurrentWeek();
      expect(cached).toBeNull();
    });
  });

  /**
   * Property 61: Notification Permission Handling
   * 
   * **Validates: Requirements 8a.5, 8a.6, 8a.7, 8a.8, 8a.9, 8a.10, 8a.11**
   * 
   * GIVEN a user's notification preferences
   * WHEN preferences are updated
   * THEN the preferences should be saved correctly
   * AND channel consistency should be maintained
   * AND preferences should be retrievable
   */
  describe('Property 61: Notification Permission Handling', () => {
    it('should maintain channel consistency when updating preferences', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            pushEnabled: fc.boolean(),
            emailEnabled: fc.boolean(),
            thresholdAlerts: fc.boolean(),
            weeklySummaries: fc.boolean(),
            eventUpdates: fc.boolean(),
            conflictAlerts: fc.boolean(),
            weatherReminders: fc.boolean(),
            timeBookingSuggestions: fc.boolean(),
          }),
          async (prefs) => {
            const prefsService = new NotificationPreferencesService();

            // Mock fetch to avoid actual API calls
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            // Update preferences
            const updated = await prefsService.updatePreferences(prefs).catch(() => {
              // If update fails, get from local storage
              return JSON.parse(
                localStorage.getItem(`flo_notification_preferences_${prefs.userId}`)!
              );
            });

            // Verify channel consistency
            if (prefs.pushEnabled && prefs.emailEnabled) {
              expect(updated.channels).toBe('both');
            } else if (prefs.pushEnabled) {
              expect(updated.channels).toBe('push');
            } else if (prefs.emailEnabled) {
              expect(updated.channels).toBe('email');
            } else {
              expect(updated.channels).toBe('none');
            }

            // Verify all preferences are saved
            expect(updated.pushEnabled).toBe(prefs.pushEnabled);
            expect(updated.emailEnabled).toBe(prefs.emailEnabled);
            expect(updated.thresholdAlerts).toBe(prefs.thresholdAlerts);
            expect(updated.weeklySummaries).toBe(prefs.weeklySummaries);
            expect(updated.eventUpdates).toBe(prefs.eventUpdates);
            expect(updated.conflictAlerts).toBe(prefs.conflictAlerts);
            expect(updated.weatherReminders).toBe(prefs.weatherReminders);
            expect(updated.timeBookingSuggestions).toBe(prefs.timeBookingSuggestions);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle permission denied gracefully', () => {
      const permissionService = new NotificationPermissionService();

      // Mock Notification API
      const mockNotification = {
        permission: 'denied' as NotificationPermission,
        requestPermission: vi.fn().mockResolvedValue('denied'),
      };
      global.Notification = mockNotification as any;

      // Check permission status
      const status = permissionService.getPermissionStatus();
      expect(status).toBe('denied');

      // Requesting permission should throw when already denied
      expect(async () => {
        await permissionService.requestPermission();
      }).rejects.toThrow('Notification permission was previously denied');
    });

    it('should support email as alternative channel', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (userId) => {
            const prefsService = new NotificationPreferencesService();

            // Mock fetch
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            // Disable push, enable email
            const updated = await prefsService.updatePreferences({
              userId,
              pushEnabled: false,
              emailEnabled: true,
            }).catch(() => {
              return JSON.parse(
                localStorage.getItem(`flo_notification_preferences_${userId}`)!
              );
            });

            // Verify email is the channel
            expect(updated.channels).toBe('email');
            expect(updated.emailEnabled).toBe(true);
            expect(updated.pushEnabled).toBe(false);

            // Verify user can still receive notifications
            const hasChannel = await prefsService.hasAnyChannelEnabled(userId);
            expect(hasChannel).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional Test: Offline Sync Queue Management
   * 
   * GIVEN changes made while offline
   * WHEN connectivity is restored
   * THEN changes should be queued and synced
   */
  describe('Offline Sync Queue Management', () => {
    it('should queue changes and track retry count', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              type: fc.constantFrom('create', 'update', 'delete') as fc.Arbitrary<PendingChange['type']>,
              entity: fc.constantFrom('event', 'preference', 'threshold') as fc.Arbitrary<PendingChange['entity']>,
              data: fc.record({
                id: fc.uuid(),
                title: fc.string({ minLength: 1, maxLength: 100 }),
              }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (changes) => {
            const syncService = new OfflineSyncService();

            // Queue all changes
            for (const change of changes) {
              await syncService.queueChange(change.type, change.entity, change.data);
            }

            // Verify all changes are queued
            const pendingCount = syncService.getPendingCount();
            expect(pendingCount).toBe(changes.length);

            // Verify changes have retry count initialized
            const pending = JSON.parse(localStorage.getItem('flo_pending_changes')!);
            for (const change of pending) {
              expect(change.retryCount).toBe(0);
              expect(change.id).toBeDefined();
              expect(change.timestamp).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should discard changes after max retries', async () => {
      const syncService = new OfflineSyncService();

      // Mock fetch to always fail
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      // Mock navigator.onLine to return true
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      // Queue a change
      await syncService.queueChange('create', 'event', { id: '1', title: 'Test' });

      // Manually set retry count to max
      const pending = JSON.parse(localStorage.getItem('flo_pending_changes')!);
      pending[0].retryCount = 3; // MAX_RETRY_COUNT
      localStorage.setItem('flo_pending_changes', JSON.stringify(pending));

      // Try to sync - should discard the change
      const result = await syncService.syncPendingChanges();

      expect(result.failed).toBe(1);
      expect(syncService.getPendingCount()).toBe(0);
    });
  });
});
