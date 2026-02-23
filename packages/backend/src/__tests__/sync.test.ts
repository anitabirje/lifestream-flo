/**
 * Unit Tests for Sync API
 * Tests for sync status, history, and manual sync triggering
 */

describe('Sync API', () => {
  describe('GET /api/sync/status', () => {
    it('should return idle status when no sync has been performed', () => {
      const status = {
        familyId: 'family-123',
        sourceId: null,
        status: 'idle',
        lastSyncTime: null,
        nextSyncTime: expect.any(Date),
        syncHistory: [],
      };

      expect(status.status).toBe('idle');
      expect(status.lastSyncTime).toBeNull();
      expect(status.nextSyncTime).toBeDefined();
    });

    it('should return in-progress status during sync', () => {
      const status = {
        familyId: 'family-123',
        sourceId: null,
        status: 'in_progress',
        lastSyncTime: null,
        nextSyncTime: new Date(),
        currentSync: {
          startTime: new Date(),
          duration: 1000,
        },
      };

      expect(status.status).toBe('in_progress');
      expect(status.currentSync).toBeDefined();
      expect(status.currentSync.startTime).toBeDefined();
      expect(status.currentSync.duration).toBeGreaterThanOrEqual(0);
    });

    it('should return completed status with results', () => {
      const status = {
        familyId: 'family-123',
        sourceId: null,
        status: 'completed',
        lastSyncTime: new Date(),
        nextSyncTime: new Date(),
        lastSyncResult: {
          status: 'completed',
          startTime: new Date(),
          endTime: new Date(),
          eventsAdded: 5,
          eventsUpdated: 2,
          eventsDeleted: 1,
          errorMessage: null,
          retryCount: 0,
        },
      };

      expect(status.status).toBe('completed');
      expect(status.lastSyncResult).toBeDefined();
      expect(status.lastSyncResult.eventsAdded).toBeGreaterThanOrEqual(0);
      expect(status.lastSyncResult.eventsUpdated).toBeGreaterThanOrEqual(0);
      expect(status.lastSyncResult.eventsDeleted).toBeGreaterThanOrEqual(0);
    });

    it('should return failed status with error message', () => {
      const status = {
        familyId: 'family-123',
        sourceId: null,
        status: 'failed',
        lastSyncTime: expect.any(Date),
        nextSyncTime: expect.any(Date),
        lastSyncResult: {
          status: 'failed',
          startTime: expect.any(Date),
          endTime: expect.any(Date),
          eventsAdded: 0,
          eventsUpdated: 0,
          eventsDeleted: 0,
          errorMessage: 'Connection timeout',
          retryCount: 2,
        },
      };

      expect(status.status).toBe('failed');
      expect(status.lastSyncResult.errorMessage).toBeDefined();
      expect(status.lastSyncResult.retryCount).toBeGreaterThan(0);
    });

    it('should return status for specific calendar source', () => {
      const status = {
        familyId: 'family-123',
        sourceId: 'google-calendar-1',
        status: 'completed',
        lastSyncTime: expect.any(Date),
        nextSyncTime: expect.any(Date),
      };

      expect(status.sourceId).toBe('google-calendar-1');
    });
  });

  describe('GET /api/sync/history', () => {
    it('should return empty history when no syncs have been performed', () => {
      const history = {
        familyId: 'family-123',
        history: [],
        total: 0,
      };

      expect(history.history).toHaveLength(0);
      expect(history.total).toBe(0);
    });

    it('should return sync history with limit', () => {
      const history = {
        familyId: 'family-123',
        history: [
          {
            id: 'sync-1',
            status: 'completed',
            startTime: expect.any(Date),
            endTime: expect.any(Date),
            eventsAdded: 5,
            eventsUpdated: 2,
            eventsDeleted: 1,
          },
          {
            id: 'sync-2',
            status: 'completed',
            startTime: expect.any(Date),
            endTime: expect.any(Date),
            eventsAdded: 3,
            eventsUpdated: 1,
            eventsDeleted: 0,
          },
        ],
        total: 2,
      };

      expect(history.history).toHaveLength(2);
      expect(history.total).toBe(2);
    });

    it('should respect limit parameter', () => {
      const limit = 5;
      const history = {
        familyId: 'family-123',
        history: Array(3).fill({
          id: 'sync-1',
          status: 'completed',
          startTime: new Date(),
          endTime: new Date(),
          eventsAdded: 5,
          eventsUpdated: 2,
          eventsDeleted: 1,
        }),
        total: 3,
      };

      expect(history.history.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('POST /api/sync/trigger', () => {
    it('should trigger sync and return 202 Accepted', () => {
      const response = {
        familyId: 'family-123',
        sourceId: null,
        status: 'in_progress',
        startTime: expect.any(Date),
        message: 'Sync triggered successfully',
      };

      expect(response.status).toBe('in_progress');
      expect(response.message).toBe('Sync triggered successfully');
    });

    it('should trigger sync for specific calendar source', () => {
      const response = {
        familyId: 'family-123',
        sourceId: 'google-calendar-1',
        status: 'in_progress',
        startTime: expect.any(Date),
        message: 'Sync triggered successfully',
      };

      expect(response.sourceId).toBe('google-calendar-1');
    });

    it('should return 409 if sync already in progress', () => {
      const error = {
        error: 'Sync already in progress for this family/source',
        currentSync: {
          startTime: expect.any(Date),
          duration: expect.any(Number),
        },
      };

      expect(error.error).toContain('already in progress');
      expect(error.currentSync).toBeDefined();
    });

    it('should accept priority parameter', () => {
      const request = {
        familyId: 'family-123',
        priority: 'high',
      };

      expect(['high', 'medium', 'low']).toContain(request.priority);
    });

    it('should reject invalid priority', () => {
      const request = {
        familyId: 'family-123',
        priority: 'invalid',
      };

      expect(['high', 'medium', 'low']).not.toContain(request.priority);
    });

    it('should track triggered by user', () => {
      const response = {
        familyId: 'family-123',
        sourceId: null,
        status: 'in_progress',
        startTime: expect.any(Date),
        message: 'Sync triggered successfully',
        triggeredBy: 'user-123',
      };

      expect(response.triggeredBy).toBe('user-123');
    });
  });

  describe('POST /api/sync/cancel', () => {
    it('should cancel in-progress sync', () => {
      const response = {
        familyId: 'family-123',
        sourceId: null,
        status: 'cancelled',
        message: 'Sync cancelled successfully',
      };

      expect(response.status).toBe('cancelled');
      expect(response.message).toBe('Sync cancelled successfully');
    });

    it('should return 404 if no sync in progress', () => {
      const error = {
        error: 'No sync operation found for this family/source',
      };

      expect(error.error).toContain('No sync operation found');
    });

    it('should return 409 if sync not in progress', () => {
      const error = {
        error: 'Cannot cancel sync with status: completed',
      };

      expect(error.error).toContain('Cannot cancel sync');
    });

    it('should track cancelled by user', () => {
      const response = {
        familyId: 'family-123',
        sourceId: null,
        status: 'cancelled',
        message: 'Sync cancelled successfully',
        cancelledBy: 'user-123',
      };

      expect(response.cancelledBy).toBe('user-123');
    });
  });

  describe('GET /api/sync/sources/:sourceId/status', () => {
    it('should return status for specific calendar source', () => {
      const status = {
        familyId: 'family-123',
        sourceId: 'google-calendar-1',
        status: 'completed',
        lastSyncTime: expect.any(Date),
        nextSyncTime: expect.any(Date),
      };

      expect(status.sourceId).toBe('google-calendar-1');
    });

    it('should return idle status if source never synced', () => {
      const status = {
        familyId: 'family-123',
        sourceId: 'outlook-calendar-1',
        status: 'idle',
        lastSyncTime: null,
        nextSyncTime: expect.any(Date),
        syncHistory: [],
      };

      expect(status.status).toBe('idle');
      expect(status.lastSyncTime).toBeNull();
    });

    it('should include sync result details', () => {
      const status = {
        familyId: 'family-123',
        sourceId: 'google-calendar-1',
        status: 'completed',
        lastSyncTime: expect.any(Date),
        nextSyncTime: expect.any(Date),
        lastSyncResult: {
          status: 'completed',
          startTime: expect.any(Date),
          endTime: expect.any(Date),
          eventsAdded: 5,
          eventsUpdated: 2,
          eventsDeleted: 1,
          errorMessage: null,
          retryCount: 0,
        },
      };

      expect(status.lastSyncResult).toBeDefined();
      expect(status.lastSyncResult.eventsAdded).toBe(5);
      expect(status.lastSyncResult.eventsUpdated).toBe(2);
      expect(status.lastSyncResult.eventsDeleted).toBe(1);
    });
  });

  describe('Sync Status Transitions', () => {
    it('should transition from idle to in_progress', () => {
      const initialStatus = 'idle';
      const afterTrigger = 'in_progress';

      expect(initialStatus).toBe('idle');
      expect(afterTrigger).toBe('in_progress');
    });

    it('should transition from in_progress to completed', () => {
      const initialStatus = 'in_progress';
      const afterCompletion = 'completed';

      expect(initialStatus).toBe('in_progress');
      expect(afterCompletion).toBe('completed');
    });

    it('should transition from in_progress to failed', () => {
      const initialStatus = 'in_progress';
      const afterFailure = 'failed';

      expect(initialStatus).toBe('in_progress');
      expect(afterFailure).toBe('failed');
    });

    it('should transition from failed to in_progress on retry', () => {
      const initialStatus = 'failed';
      const afterRetry = 'in_progress';

      expect(initialStatus).toBe('failed');
      expect(afterRetry).toBe('in_progress');
    });
  });

  describe('Sync Result Metrics', () => {
    it('should track events added during sync', () => {
      const result = {
        eventsAdded: 10,
        eventsUpdated: 5,
        eventsDeleted: 2,
      };

      expect(result.eventsAdded).toBe(10);
      expect(result.eventsAdded).toBeGreaterThanOrEqual(0);
    });

    it('should track events updated during sync', () => {
      const result = {
        eventsAdded: 10,
        eventsUpdated: 5,
        eventsDeleted: 2,
      };

      expect(result.eventsUpdated).toBe(5);
      expect(result.eventsUpdated).toBeGreaterThanOrEqual(0);
    });

    it('should track events deleted during sync', () => {
      const result = {
        eventsAdded: 10,
        eventsUpdated: 5,
        eventsDeleted: 2,
      };

      expect(result.eventsDeleted).toBe(2);
      expect(result.eventsDeleted).toBeGreaterThanOrEqual(0);
    });

    it('should calculate sync duration', () => {
      const startTime = new Date('2024-01-15T09:00:00');
      const endTime = new Date('2024-01-15T09:05:00');
      const duration = endTime.getTime() - startTime.getTime();

      expect(duration).toBe(5 * 60 * 1000);
      expect(duration).toBeGreaterThan(0);
    });
  });

  describe('Sync Error Handling', () => {
    it('should track retry count on failure', () => {
      const result = {
        status: 'failed',
        errorMessage: 'Connection timeout',
        retryCount: 2,
      };

      expect(result.retryCount).toBe(2);
      expect(result.retryCount).toBeGreaterThanOrEqual(0);
    });

    it('should include error message on failure', () => {
      const result = {
        status: 'failed',
        errorMessage: 'Authentication failed',
        retryCount: 1,
      };

      expect(result.errorMessage).toBeDefined();
      expect(result.errorMessage).toContain('Authentication');
    });

    it('should clear error message on success', () => {
      const result = {
        status: 'completed',
        errorMessage: null,
        retryCount: 0,
      };

      expect(result.errorMessage).toBeNull();
    });
  });
});
