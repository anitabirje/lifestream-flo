/**
 * Calendar Sources API Routes
 * GET /api/calendar-sources - List all calendar sources for the family
 * POST /api/calendar-sources - Add a new calendar source
 * DELETE /api/calendar-sources/:id - Remove a calendar source
 * POST /api/calendar-sources/:id/sync - Trigger manual sync for a source
 */

import { Router, Request, Response } from 'express';
import { CalendarSourceRegistry } from '../services/calendar-source-registry';
import { AuditLogger } from '../services/audit-logger';
import { getDynamoDBClient } from '../data-access/dynamodb-client';
import { dynamoDBDataAccess } from '../data-access/dynamodb-client';
import { AuthService } from '../auth/auth-service';
import { PasswordManager } from '../auth/password-manager';
import { SessionManager } from '../auth/session-manager';
import { authenticate, requirePermission } from '../middleware/access-control';

const router = Router();

// Initialize services
const dynamoClient = getDynamoDBClient();
const passwordManager = new PasswordManager();
const sessionManager = new SessionManager(dynamoClient);
const authService = new AuthService(dynamoClient, passwordManager, sessionManager);
const auditLogger = new AuditLogger(dynamoDBDataAccess);

const calendarSourceRegistry = new CalendarSourceRegistry(dynamoDBDataAccess as any, {
  encryptionKey: 'default-encryption-key',
  maxRetries: 3,
});

/**
 * GET /api/calendar-sources
 * List all calendar sources for the family (requires canViewCalendar permission)
 */
router.get(
  '/',
  authenticate(authService),
  requirePermission('canViewCalendar'),
  async (req: Request, res: Response) => {
    try {
      const familyId = req.user!.familyId;

      const sources = await calendarSourceRegistry.getActiveSources(familyId);

      // Remove sensitive credential data from response
      const sanitizedSources = sources.map((source) => ({
        id: source.id,
        familyMemberId: source.familyMemberId,
        type: source.type,
        lastSyncTime: source.lastSyncTime,
        syncStatus: source.syncStatus,
        retryCount: source.retryCount,
        assignedAgentId: source.assignedAgentId,
        createdAt: source.createdAt,
        updatedAt: source.updatedAt,
      }));

      res.status(200).json({
        sources: sanitizedSources,
      });
    } catch (error: any) {
      console.error('List calendar sources error:', error);
      res.status(500).json({
        error: 'Failed to list calendar sources',
      });
    }
  }
);

/**
 * POST /api/calendar-sources
 * Add a new calendar source (requires canManageSources permission)
 * Request body:
 *   - familyMemberId: ID of the family member
 *   - type: 'google' | 'outlook' | 'kids_school' | 'kids_connect'
 *   - credentials: Object with authentication credentials
 */
router.post(
  '/',
  authenticate(authService),
  requirePermission('canManageSources'),
  async (req: Request, res: Response) => {
    try {
      const { familyMemberId, type, credentials } = req.body;
      const familyId = req.user!.familyId;
      const userId = req.user!.id;

      // Validate required fields
      if (!familyMemberId || !type || !credentials) {
        return res.status(400).json({
          error: 'Missing required fields: familyMemberId, type, credentials',
        });
      }

      // Validate calendar source type
      const validTypes = ['google', 'outlook', 'kids_school', 'kids_connect'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          error: `Invalid calendar source type. Must be one of: ${validTypes.join(', ')}`,
        });
      }

      // Register the calendar source
      const source = await calendarSourceRegistry.registerSource(
        familyMemberId,
        type,
        credentials,
        familyId
      );

      // Log the action
      await auditLogger.logEntityChange(
        familyId,
        'calendar_source',
        source.id,
        'created',
        userId,
        undefined,
        { familyMemberId, type }
      );

      // Return sanitized response
      const sanitizedSource = {
        id: source.id,
        familyMemberId: source.familyMemberId,
        type: source.type,
        lastSyncTime: source.lastSyncTime,
        syncStatus: source.syncStatus,
        retryCount: source.retryCount,
        assignedAgentId: source.assignedAgentId,
        createdAt: source.createdAt,
        updatedAt: source.updatedAt,
      };

      res.status(201).json({
        source: sanitizedSource,
      });
    } catch (error: any) {
      console.error('Add calendar source error:', error);
      res.status(400).json({
        error: error.message || 'Failed to add calendar source',
      });
    }
  }
);

/**
 * DELETE /api/calendar-sources/:id
 * Remove a calendar source (requires canManageSources permission)
 */
router.delete(
  '/:id',
  authenticate(authService),
  requirePermission('canManageSources'),
  async (req: Request, res: Response) => {
    try {
      const sourceId = req.params.id;
      const familyId = req.user!.familyId;
      const userId = req.user!.id;

      // Get the source before deletion for audit logging
      const source = await calendarSourceRegistry.getSource(sourceId, familyId);

      if (!source) {
        return res.status(404).json({
          error: 'Calendar source not found',
        });
      }

      // Remove the source
      const deleted = await calendarSourceRegistry.removeSource(sourceId, familyId);

      if (!deleted) {
        return res.status(404).json({
          error: 'Calendar source not found',
        });
      }

      // Log the action
      await auditLogger.logEntityChange(
        familyId,
        'calendar_source',
        sourceId,
        'deleted',
        userId,
        { familyMemberId: source.familyMemberId, type: source.type },
        undefined
      );

      res.status(200).json({
        message: 'Calendar source removed successfully',
      });
    } catch (error: any) {
      console.error('Remove calendar source error:', error);
      res.status(500).json({
        error: 'Failed to remove calendar source',
      });
    }
  }
);

/**
 * POST /api/calendar-sources/:id/sync
 * Trigger manual sync for a calendar source (requires canManageSources permission)
 * This endpoint queues a sync task for the calendar source
 */
router.post(
  '/:id/sync',
  authenticate(authService),
  requirePermission('canManageSources'),
  async (req: Request, res: Response) => {
    try {
      const sourceId = req.params.id;
      const familyId = req.user!.familyId;

      // Get the source to verify it exists
      const source = await calendarSourceRegistry.getSource(sourceId, familyId);

      if (!source) {
        return res.status(404).json({
          error: 'Calendar source not found',
        });
      }

      // Update sync status to active and reset retry count
      await calendarSourceRegistry.updateSyncStatus(sourceId, familyId, 'active', 0);

      // Log the sync trigger
      await auditLogger.logEntityChange(
        familyId,
        'calendar_source',
        sourceId,
        'updated',
        req.user!.id,
        { syncStatus: source.syncStatus },
        { syncStatus: 'active', retryCount: 0 }
      );

      res.status(202).json({
        message: 'Sync triggered successfully',
        sourceId,
        syncStatus: 'active',
      });
    } catch (error: any) {
      console.error('Trigger sync error:', error);
      res.status(400).json({
        error: error.message || 'Failed to trigger sync',
      });
    }
  }
);

export default router;
