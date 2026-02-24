/**
 * Synchronization Status and Control API Routes
 * Endpoints for viewing sync status and triggering manual sync
 */

import { Router, Request, Response } from 'express';
import { dynamoDBDataAccess } from '../data-access/dynamodb-client';
import { AuditLogger } from '../services/audit-logger';
import { EventManagementService } from '../services/event-management-service';

const router = Router();

// Initialize services
const auditLogger = new AuditLogger(dynamoDBDataAccess);
const eventService = new EventManagementService(dynamoDBDataAccess, auditLogger);

// In-memory sync status tracking (in production, this would be in DynamoDB)
interface SyncStatus {
  familyId: string;
  sourceId?: string;
  status: 'idle' | 'in_progress' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  eventsAdded: number;
  eventsUpdated: number;
  eventsDeleted: number;
  errorMessage?: string;
  retryCount: number;
}

const syncStatusMap = new Map<string, SyncStatus>();

/**
 * GET /api/sync/status
 * Get sync status for a family or specific calendar source
 * Query params: familyId (required), sourceId (optional)
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const { familyId, sourceId } = req.query;

    // Validate required parameters
    if (!familyId) {
      return res.status(400).json({
        error: 'Missing required query parameter: familyId',
      });
    }

    // Get sync status from in-memory map
    let statusKey = `${familyId}`;
    if (sourceId) {
      statusKey = `${familyId}:${sourceId}`;
    }

    const syncStatus = syncStatusMap.get(statusKey);

    if (!syncStatus) {
      // Return default status if no sync has been performed
      return res.status(200).json({
        familyId,
        sourceId: sourceId || null,
        status: 'idle',
        lastSyncTime: null,
        nextSyncTime: new Date(Date.now() + 5 * 60 * 1000), // Next sync in 5 minutes
        syncHistory: [],
      });
    }

    res.status(200).json({
      familyId,
      sourceId: sourceId || null,
      status: syncStatus.status,
      lastSyncTime: syncStatus.endTime || syncStatus.startTime,
      nextSyncTime: new Date(Date.now() + 5 * 60 * 1000), // Next sync in 5 minutes
      currentSync: syncStatus.status === 'in_progress' ? {
        startTime: syncStatus.startTime,
        duration: Date.now() - syncStatus.startTime.getTime(),
      } : null,
      lastSyncResult: syncStatus.status !== 'in_progress' ? {
        status: syncStatus.status,
        startTime: syncStatus.startTime,
        endTime: syncStatus.endTime,
        eventsAdded: syncStatus.eventsAdded,
        eventsUpdated: syncStatus.eventsUpdated,
        eventsDeleted: syncStatus.eventsDeleted,
        errorMessage: syncStatus.errorMessage,
        retryCount: syncStatus.retryCount,
      } : null,
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({
      error: 'Failed to get sync status',
    });
  }
});

/**
 * GET /api/sync/history
 * Get sync history for a family
 * Query params: familyId (required), limit (optional, default 10)
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { familyId, limit } = req.query;

    // Validate required parameters
    if (!familyId) {
      return res.status(400).json({
        error: 'Missing required query parameter: familyId',
      });
    }

    const limitNum = Math.min(parseInt(limit as string) || 10, 100);

    // In production, this would query DynamoDB for sync history
    // For now, return empty history
    const history: any[] = [];

    res.status(200).json({
      familyId,
      history,
      total: history.length,
    });
  } catch (error) {
    console.error('Error getting sync history:', error);
    res.status(500).json({
      error: 'Failed to get sync history',
    });
  }
});

/**
 * POST /api/sync/trigger
 * Trigger manual sync for a family or specific calendar source
 * Body: { familyId, sourceId (optional), priority (optional) }
 */
router.post('/trigger', async (req: Request, res: Response) => {
  try {
    const { familyId, sourceId, priority, triggeredBy } = req.body;

    // Validate required fields
    if (!familyId) {
      return res.status(400).json({
        error: 'Missing required field: familyId',
      });
    }

    // Validate priority if provided
    if (priority && !['high', 'medium', 'low'].includes(priority)) {
      return res.status(400).json({
        error: 'Invalid priority. Must be one of: high, medium, low',
      });
    }

    const statusKey = sourceId ? `${familyId}:${sourceId}` : familyId;

    // Check if sync is already in progress
    const existingStatus = syncStatusMap.get(statusKey);
    if (existingStatus && existingStatus.status === 'in_progress') {
      return res.status(409).json({
        error: 'Sync already in progress for this family/source',
        currentSync: {
          startTime: existingStatus.startTime,
          duration: Date.now() - existingStatus.startTime.getTime(),
        },
      });
    }

    // Create new sync status
    const newStatus: SyncStatus = {
      familyId,
      sourceId,
      status: 'in_progress',
      startTime: new Date(),
      eventsAdded: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      retryCount: 0,
    };

    syncStatusMap.set(statusKey, newStatus);

    // Simulate sync operation (in production, this would trigger actual sync)
    // For now, mark as completed after a short delay
    setTimeout(async () => {
      const status = syncStatusMap.get(statusKey);
      if (status) {
        status.status = 'completed';
        status.endTime = new Date();
        status.eventsAdded = Math.floor(Math.random() * 10);
        status.eventsUpdated = Math.floor(Math.random() * 5);
        status.eventsDeleted = Math.floor(Math.random() * 2);

        // Audit log
        await auditLogger.logEntityChange(
          familyId,
          'sync_operation' as any,
          statusKey,
          'updated',
          triggeredBy || 'system',
          undefined,
          {
            status: status.status,
            eventsAdded: status.eventsAdded,
            eventsUpdated: status.eventsUpdated,
            eventsDeleted: status.eventsDeleted,
            duration: status.endTime.getTime() - status.startTime.getTime(),
          } as any
        );
      }
    }, 2000); // Simulate 2-second sync

    // Audit log
    await auditLogger.logEntityChange(
      familyId,
      'sync_operation' as any,
      statusKey,
      'created',
      triggeredBy || 'system',
      undefined,
      {
        familyId,
        sourceId: sourceId || null,
        status: 'in_progress',
        startTime: new Date().toISOString(),
      } as any
    );

    res.status(202).json({
      familyId,
      sourceId: sourceId || null,
      status: 'in_progress',
      startTime: newStatus.startTime,
      message: 'Sync triggered successfully',
    });
  } catch (error) {
    console.error('Error triggering sync:', error);
    res.status(500).json({
      error: 'Failed to trigger sync',
    });
  }
});

/**
 * POST /api/sync/cancel
 * Cancel an in-progress sync operation
 * Body: { familyId, sourceId (optional) }
 */
router.post('/cancel', async (req: Request, res: Response) => {
  try {
    const { familyId, sourceId, cancelledBy } = req.body;

    // Validate required fields
    if (!familyId) {
      return res.status(400).json({
        error: 'Missing required field: familyId',
      });
    }

    const statusKey = sourceId ? `${familyId}:${sourceId}` : familyId;

    // Get current sync status
    const status = syncStatusMap.get(statusKey);

    if (!status) {
      return res.status(404).json({
        error: 'No sync operation found for this family/source',
      });
    }

    if (status.status !== 'in_progress') {
      return res.status(409).json({
        error: `Cannot cancel sync with status: ${status.status}`,
      });
    }

    // Cancel the sync
    status.status = 'failed';
    status.endTime = new Date();
    status.errorMessage = 'Sync cancelled by user';

    // Audit log
    await auditLogger.logEntityChange(
      familyId,
      'sync_operation' as any,
      statusKey,
      'updated',
      'system',
      undefined,
      {
        status: 'failed',
        errorMessage: 'Sync cancelled by user',
      } as any
    );

    res.status(200).json({
      familyId,
      sourceId: sourceId || null,
      status: 'cancelled',
      message: 'Sync cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling sync:', error);
    res.status(500).json({
      error: 'Failed to cancel sync',
    });
  }
});

/**
 * GET /api/sync/sources/:sourceId/status
 * Get sync status for a specific calendar source
 * Query params: familyId (required)
 */
router.get('/sources/:sourceId/status', async (req: Request, res: Response) => {
  try {
    const { sourceId } = req.params;
    const { familyId } = req.query;

    // Validate required parameters
    if (!familyId) {
      return res.status(400).json({
        error: 'Missing required query parameter: familyId',
      });
    }

    const statusKey = `${familyId}:${sourceId}`;
    const syncStatus = syncStatusMap.get(statusKey);

    if (!syncStatus) {
      return res.status(200).json({
        familyId,
        sourceId,
        status: 'idle',
        lastSyncTime: null,
        nextSyncTime: new Date(Date.now() + 5 * 60 * 1000),
        syncHistory: [],
      });
    }

    res.status(200).json({
      familyId,
      sourceId,
      status: syncStatus.status,
      lastSyncTime: syncStatus.endTime || syncStatus.startTime,
      nextSyncTime: new Date(Date.now() + 5 * 60 * 1000),
      currentSync: syncStatus.status === 'in_progress' ? {
        startTime: syncStatus.startTime,
        duration: Date.now() - syncStatus.startTime.getTime(),
      } : null,
      lastSyncResult: syncStatus.status !== 'in_progress' ? {
        status: syncStatus.status,
        startTime: syncStatus.startTime,
        endTime: syncStatus.endTime,
        eventsAdded: syncStatus.eventsAdded,
        eventsUpdated: syncStatus.eventsUpdated,
        eventsDeleted: syncStatus.eventsDeleted,
        errorMessage: syncStatus.errorMessage,
        retryCount: syncStatus.retryCount,
      } : null,
    });
  } catch (error) {
    console.error('Error getting source sync status:', error);
    res.status(500).json({
      error: 'Failed to get source sync status',
    });
  }
});

export default router;
