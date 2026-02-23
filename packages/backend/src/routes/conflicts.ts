/**
 * Conflict Management API Routes
 * Endpoints for viewing and resolving scheduling conflicts
 */

import { Router, Request, Response } from 'express';
import { ConflictDetector } from '../services/conflict-detector';
import { ConflictResolutionEngine } from '../services/conflict-resolution-engine';
import { EventManagementService } from '../services/event-management-service';
import { dynamoDBDataAccess } from '../data-access/dynamodb-client';
import { AuditLogger } from '../services/audit-logger';

const router = Router();

// Initialize services
const conflictDetector = new ConflictDetector();
const conflictResolutionEngine = new ConflictResolutionEngine(dynamoDBDataAccess);
const auditLogger = new AuditLogger(dynamoDBDataAccess);
const eventService = new EventManagementService(dynamoDBDataAccess, auditLogger);

/**
 * GET /api/conflicts
 * Get conflicts for a family or specific family member
 * Query params: familyId (required), familyMemberId (optional), startDate (optional), endDate (optional)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { familyId, familyMemberId, startDate, endDate } = req.query;

    // Validate required parameters
    if (!familyId) {
      return res.status(400).json({
        error: 'Missing required query parameter: familyId',
      });
    }

    // Fetch all events for the family
    const events = await eventService.listEvents(familyId as string, {
      familyMemberId: familyMemberId as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    if (!events || events.length === 0) {
      return res.status(200).json({
        conflicts: [],
        summary: {
          totalConflicts: 0,
          highSeverity: 0,
          mediumSeverity: 0,
          lowSeverity: 0,
          overlapConflicts: 0,
          adjacentConflicts: 0,
        },
      });
    }

    // Convert events to conflict detector format
    const detectorEvents = events.map((event: any) => ({
      id: event.id,
      familyMemberId: event.familyMemberId,
      title: event.title,
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
      source: event.source,
    }));

    // Detect all conflicts
    let conflicts = conflictDetector.detectAllConflicts(detectorEvents);

    // Get summary
    const summary = conflictDetector.getSummary(conflicts);

    res.status(200).json({
      conflicts: conflicts.map((c) => ({
        id: c.id,
        familyMemberId: c.familyMemberId,
        event1: {
          id: c.event1.id,
          title: c.event1.title,
          startTime: c.event1.startTime,
          endTime: c.event1.endTime,
          source: c.event1.source,
        },
        event2: {
          id: c.event2.id,
          title: c.event2.title,
          startTime: c.event2.startTime,
          endTime: c.event2.endTime,
          source: c.event2.source,
        },
        conflictType: c.conflictType,
        severity: c.severity,
        overlapDurationMs: c.overlapDurationMs,
        detectedAt: c.detectedAt,
      })),
      summary,
    });
  } catch (error) {
    console.error('Error getting conflicts:', error);
    res.status(500).json({
      error: 'Failed to get conflicts',
    });
  }
});

/**
 * GET /api/conflicts/:conflictId
 * Get details for a specific conflict
 * Query params: familyId (required)
 */
router.get('/:conflictId', async (req: Request, res: Response) => {
  try {
    const { conflictId } = req.params;
    const { familyId } = req.query;

    // Validate required parameters
    if (!familyId) {
      return res.status(400).json({
        error: 'Missing required query parameter: familyId',
      });
    }

    // Fetch all events for the family
    const events = await eventService.listEvents(familyId as string);

    if (!events || events.length === 0) {
      return res.status(404).json({
        error: 'Conflict not found',
      });
    }

    // Convert events to conflict detector format
    const detectorEvents = events.map((event: any) => ({
      id: event.id,
      familyMemberId: event.familyMemberId,
      title: event.title,
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
      source: event.source,
    }));

    // Detect all conflicts
    const conflicts = conflictDetector.detectAllConflicts(detectorEvents);

    // Find the specific conflict
    const conflict = conflicts.find((c) => c.id === conflictId);

    if (!conflict) {
      return res.status(404).json({
        error: 'Conflict not found',
      });
    }

    res.status(200).json({
      id: conflict.id,
      familyMemberId: conflict.familyMemberId,
      event1: {
        id: conflict.event1.id,
        title: conflict.event1.title,
        startTime: conflict.event1.startTime,
        endTime: conflict.event1.endTime,
        source: conflict.event1.source,
      },
      event2: {
        id: conflict.event2.id,
        title: conflict.event2.title,
        startTime: conflict.event2.startTime,
        endTime: conflict.event2.endTime,
        source: conflict.event2.source,
      },
      conflictType: conflict.conflictType,
      severity: conflict.severity,
      overlapDurationMs: conflict.overlapDurationMs,
      detectedAt: conflict.detectedAt,
    });
  } catch (error) {
    console.error('Error getting conflict details:', error);
    res.status(500).json({
      error: 'Failed to get conflict details',
    });
  }
});

/**
 * POST /api/conflicts/:conflictId/resolve
 * Apply a resolution to a conflict
 * Body: { familyId, resolutionType, resolutionData }
 * resolutionType: 'reschedule' | 'delegate' | 'cancel' | 'manual'
 */
router.post('/:conflictId/resolve', async (req: Request, res: Response) => {
  try {
    const { conflictId } = req.params;
    const { familyId, resolutionType, resolutionData, resolvedBy } = req.body;

    // Validate required fields
    if (!familyId || !resolutionType) {
      return res.status(400).json({
        error: 'Missing required fields: familyId, resolutionType',
      });
    }

    // Validate resolution type
    const validTypes = ['reschedule', 'delegate', 'cancel', 'manual'];
    if (!validTypes.includes(resolutionType)) {
      return res.status(400).json({
        error: `Invalid resolutionType. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    // Fetch all events for the family
    const events = await eventService.listEvents(familyId);

    if (!events || events.length === 0) {
      return res.status(404).json({
        error: 'Conflict not found',
      });
    }

    // Convert events to conflict detector format
    const detectorEvents = events.map((event: any) => ({
      id: event.id,
      familyMemberId: event.familyMemberId,
      title: event.title,
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
      source: event.source,
    }));

    // Detect all conflicts
    const conflicts = conflictDetector.detectAllConflicts(detectorEvents);

    // Find the specific conflict
    const conflict = conflicts.find((c) => c.id === conflictId);

    if (!conflict) {
      return res.status(404).json({
        error: 'Conflict not found',
      });
    }

    // Apply resolution based on type
    let resolutionResult: any = {
      conflictId,
      resolutionType,
      status: 'applied',
      appliedAt: new Date(),
      appliedBy: resolvedBy || 'system',
    };

    switch (resolutionType) {
      case 'reschedule':
        // Reschedule one of the events
        if (!resolutionData || !resolutionData.eventId || !resolutionData.newStartTime) {
          return res.status(400).json({
            error: 'Reschedule resolution requires eventId and newStartTime in resolutionData',
          });
        }

        const eventToReschedule = events.find((e: any) => e.id === resolutionData.eventId);
        if (!eventToReschedule) {
          return res.status(404).json({
            error: 'Event to reschedule not found',
          });
        }

        const duration = new Date(eventToReschedule.endTime).getTime() - new Date(eventToReschedule.startTime).getTime();
        const newEndTime = new Date(new Date(resolutionData.newStartTime).getTime() + duration);

        await eventService.updateEvent(
          familyId,
          resolutionData.eventId,
          {
            startTime: new Date(resolutionData.newStartTime),
            endTime: newEndTime,
          },
          resolvedBy || 'system'
        );

        resolutionResult.details = {
          eventId: resolutionData.eventId,
          oldStartTime: eventToReschedule.startTime,
          oldEndTime: eventToReschedule.endTime,
          newStartTime: resolutionData.newStartTime,
          newEndTime: newEndTime.toISOString(),
        };
        break;

      case 'delegate':
        // Delegate to another family member
        if (!resolutionData || !resolutionData.eventId || !resolutionData.delegateTo) {
          return res.status(400).json({
            error: 'Delegate resolution requires eventId and delegateTo in resolutionData',
          });
        }

        const eventToDelegate = events.find((e: any) => e.id === resolutionData.eventId);
        if (!eventToDelegate) {
          return res.status(404).json({
            error: 'Event to delegate not found',
          });
        }

        // Note: Delegation would require updating familyMemberId, which is not supported
        // by the current UpdateEventRequest interface. This is a limitation that should
        // be addressed in a future update.

        resolutionResult.details = {
          eventId: resolutionData.eventId,
          delegatedFrom: eventToDelegate.familyMemberId,
          delegatedTo: resolutionData.delegateTo,
          note: 'Delegation not yet implemented - requires API enhancement',
        };
        break;

      case 'cancel':
        // Cancel one of the events
        if (!resolutionData || !resolutionData.eventId) {
          return res.status(400).json({
            error: 'Cancel resolution requires eventId in resolutionData',
          });
        }

        const eventToCancel = events.find((e: any) => e.id === resolutionData.eventId);
        if (!eventToCancel) {
          return res.status(404).json({
            error: 'Event to cancel not found',
          });
        }

        await eventService.deleteEvent(familyId, resolutionData.eventId, resolvedBy || 'system');

        resolutionResult.details = {
          eventId: resolutionData.eventId,
          cancelledEvent: {
            title: eventToCancel.title,
            startTime: eventToCancel.startTime,
            endTime: eventToCancel.endTime,
          },
        };
        break;

      case 'manual':
        // Manual resolution - just log it
        resolutionResult.details = resolutionData || {};
        break;
    }

    // Audit log
    await auditLogger.logEntityChange(
      familyId,
      'event',
      conflictId,
      'updated',
      resolvedBy || 'system',
      undefined,
      resolutionResult
    );

    res.status(200).json(resolutionResult);
  } catch (error) {
    console.error('Error resolving conflict:', error);
    res.status(500).json({
      error: 'Failed to resolve conflict',
    });
  }
});

/**
 * GET /api/conflicts/:conflictId/suggestions
 * Get resolution suggestions for a conflict
 * Query params: familyId (required)
 */
router.get('/:conflictId/suggestions', async (req: Request, res: Response) => {
  try {
    const { conflictId } = req.params;
    const { familyId } = req.query;

    // Validate required parameters
    if (!familyId) {
      return res.status(400).json({
        error: 'Missing required query parameter: familyId',
      });
    }

    // Fetch all events for the family
    const events = await eventService.listEvents(familyId as string);

    if (!events || events.length === 0) {
      return res.status(404).json({
        error: 'Conflict not found',
      });
    }

    // Convert events to conflict detector format
    const detectorEvents = events.map((event: any) => ({
      id: event.id,
      familyMemberId: event.familyMemberId,
      title: event.title,
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
      source: event.source,
    }));

    // Detect all conflicts
    const conflicts = conflictDetector.detectAllConflicts(detectorEvents);

    // Find the specific conflict
    const conflict = conflicts.find((c) => c.id === conflictId);

    if (!conflict) {
      return res.status(404).json({
        error: 'Conflict not found',
      });
    }

    // Get resolution suggestions from the resolution engine
    const analysis = await conflictResolutionEngine.analyzeConflict(
      conflict.event1 as any,
      conflict.event2 as any,
      events,
      [] // family members - empty for now
    );

    res.status(200).json({
      conflictId,
      conflictType: conflict.conflictType,
      severity: conflict.severity,
      suggestions: analysis.suggestions,
      analysis: {
        conflictType: analysis.conflictType,
        overlapDurationMs: analysis.overlapDurationMs,
        eventTypes: analysis.eventTypes,
      },
    });
  } catch (error) {
    console.error('Error getting conflict suggestions:', error);
    res.status(500).json({
      error: 'Failed to get conflict suggestions',
    });
  }
});

export default router;
