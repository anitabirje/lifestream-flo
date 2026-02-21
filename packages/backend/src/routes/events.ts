/**
 * Events API Routes
 * POST /api/events - Create a new event
 * PUT /api/events/:id - Update an event
 * DELETE /api/events/:id - Delete an event
 * GET /api/events - List events with filters
 */

import { Router, Request, Response } from 'express';
import { EventManagementService } from '../services/event-management-service';
import { AuditLogger } from '../services/audit-logger';
import { AgentTaskDispatcher } from '../services/agent-task-dispatcher';
import { dynamoDBDataAccess, dynamoDBClientWrapper } from '../data-access/dynamodb-client';
import { AuthService } from '../auth/auth-service';
import { PasswordManager } from '../auth/password-manager';
import { SessionManager } from '../auth/session-manager';
import { authenticate, requirePermission } from '../middleware/access-control';
import { AgentOrchestrator } from '../agents/agent-orchestrator';
import { CalendarSourceRegistry } from '../services/calendar-source-registry';

const router = Router();

// Initialize services
const passwordManager = new PasswordManager();
const sessionManager = new SessionManager(dynamoDBDataAccess);
const authService = new AuthService(dynamoDBDataAccess, passwordManager, sessionManager);
const auditLogger = new AuditLogger(dynamoDBDataAccess);

// Initialize agent-based services
const orchestrator = new AgentOrchestrator({
  maxConcurrentAgents: 5,
  taskTimeout: 30000,
  retryStrategy: 'exponential',
  retryDelay: 1000,
  healthCheckInterval: 60000,
});

const registry = new CalendarSourceRegistry(dynamoDBClientWrapper, {
  encryptionKey: process.env.ENCRYPTION_KEY || 'default-key',
});

const agentDispatcher = new AgentTaskDispatcher(orchestrator, registry, {
  maxRetries: 3,
  taskTimeout: 30000,
  loadBalancingStrategy: 'least_loaded',
});

const eventService = new EventManagementService(dynamoDBDataAccess, agentDispatcher, auditLogger);

/**
 * POST /api/events
 * Create a new event (requires canCreateEvents permission)
 */
router.post(
  '/',
  authenticate(authService),
  requirePermission('canCreateEvents'),
  async (req: Request, res: Response) => {
    try {
      const {
        familyMemberId,
        title,
        description,
        startTime,
        endTime,
        location,
        category,
        attendees,
        source,
        externalId,
        sourceId,
      } = req.body;

      const familyId = req.user!.familyId;
      const userId = req.user!.id;

      // Validate required fields
      if (!familyMemberId || !title || !startTime || !endTime) {
        return res.status(400).json({
          error: 'Missing required fields: familyMemberId, title, startTime, endTime',
        });
      }

      // Parse dates if they're strings
      const parsedStartTime = typeof startTime === 'string' ? new Date(startTime) : startTime;
      const parsedEndTime = typeof endTime === 'string' ? new Date(endTime) : endTime;

      if (isNaN(parsedStartTime.getTime()) || isNaN(parsedEndTime.getTime())) {
        return res.status(400).json({
          error: 'Invalid date format for startTime or endTime',
        });
      }

      const event = await eventService.createEvent({
        familyId,
        familyMemberId,
        title,
        description,
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        location,
        category,
        attendees,
        source: source || 'internal',
        externalId,
        sourceId,
        createdBy: userId,
      });

      res.status(201).json({
        event,
      });
    } catch (error: any) {
      console.error('Create event error:', error);
      res.status(400).json({
        error: error.message || 'Failed to create event',
      });
    }
  }
);

/**
 * PUT /api/events/:id
 * Update an existing event (requires canEditEvents permission)
 */
router.put(
  '/:id',
  authenticate(authService),
  requirePermission('canEditEvents'),
  async (req: Request, res: Response) => {
    try {
      const eventId = req.params.id;
      const familyId = req.user!.familyId;
      const userId = req.user!.id;

      const {
        title,
        description,
        startTime,
        endTime,
        location,
        category,
        attendees,
      } = req.body;

      // Parse dates if they're strings
      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (location !== undefined) updates.location = location;
      if (category !== undefined) updates.category = category;
      if (attendees !== undefined) updates.attendees = attendees;

      if (startTime !== undefined) {
        const parsedStartTime = typeof startTime === 'string' ? new Date(startTime) : startTime;
        if (isNaN(parsedStartTime.getTime())) {
          return res.status(400).json({
            error: 'Invalid date format for startTime',
          });
        }
        updates.startTime = parsedStartTime;
      }

      if (endTime !== undefined) {
        const parsedEndTime = typeof endTime === 'string' ? new Date(endTime) : endTime;
        if (isNaN(parsedEndTime.getTime())) {
          return res.status(400).json({
            error: 'Invalid date format for endTime',
          });
        }
        updates.endTime = parsedEndTime;
      }

      const event = await eventService.updateEvent(familyId, eventId, updates, userId);

      if (!event) {
        return res.status(404).json({
          error: 'Event not found',
        });
      }

      res.status(200).json({
        event,
      });
    } catch (error: any) {
      console.error('Update event error:', error);
      res.status(400).json({
        error: error.message || 'Failed to update event',
      });
    }
  }
);

/**
 * DELETE /api/events/:id
 * Delete an event (requires canDeleteEvents permission)
 */
router.delete(
  '/:id',
  authenticate(authService),
  requirePermission('canDeleteEvents'),
  async (req: Request, res: Response) => {
    try {
      const eventId = req.params.id;
      const familyId = req.user!.familyId;
      const userId = req.user!.id;

      const deleted = await eventService.deleteEvent(familyId, eventId, userId);

      if (!deleted) {
        return res.status(404).json({
          error: 'Event not found',
        });
      }

      res.status(200).json({
        message: 'Event deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete event error:', error);
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/events
 * List events for the family (requires canViewCalendar permission)
 * Query parameters:
 *   - familyMemberId: Filter by family member
 *   - startDate: Filter by start date (ISO 8601)
 *   - endDate: Filter by end date (ISO 8601)
 */
router.get(
  '/',
  authenticate(authService),
  requirePermission('canViewCalendar'),
  async (req: Request, res: Response) => {
    try {
      const familyId = req.user!.familyId;
      const familyMemberId = req.query.familyMemberId as string | undefined;
      const startDateStr = req.query.startDate as string | undefined;
      const endDateStr = req.query.endDate as string | undefined;

      const options: any = {};

      if (familyMemberId) {
        options.familyMemberId = familyMemberId;
      }

      if (startDateStr) {
        const startDate = new Date(startDateStr);
        if (!isNaN(startDate.getTime())) {
          options.startDate = startDate;
        }
      }

      if (endDateStr) {
        const endDate = new Date(endDateStr);
        if (!isNaN(endDate.getTime())) {
          options.endDate = endDate;
        }
      }

      const events = await eventService.listEvents(familyId, options);

      res.status(200).json({
        events,
      });
    } catch (error: any) {
      console.error('List events error:', error);
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);

export default router;
