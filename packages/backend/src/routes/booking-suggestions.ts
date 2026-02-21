/**
 * Time Booking Suggestions API Routes
 * Endpoints for managing proactive time booking suggestions
 * Requirements: 5a.8, 5a.9, 5a.10, 5a.11, 5a.12
 */

import { Router, Request, Response } from 'express';
import { TimeBookingSuggestionService } from '../services/time-booking-suggestion-service';
import { BookingSuggestionRepository } from '../services/booking-suggestion-repository';
import { TimeBookingAcceptanceService } from '../services/time-booking-acceptance-service';
import { IdealAllocationService } from '../services/ideal-allocation-service';
import { EventManagementService } from '../services/event-management-service';
import { AuditLogger } from '../services/audit-logger';
import { AgentTaskDispatcher } from '../services/agent-task-dispatcher';
import { AgentOrchestrator } from '../agents/agent-orchestrator';
import { CalendarSourceRegistry } from '../services/calendar-source-registry';
import { dynamoDBDataAccess, dynamoDBClientWrapper } from '../data-access/dynamodb-client';
import { dynamoDBClient } from '../config/dynamodb';
import { config } from '../config/env';

const router = Router();

// Initialize services
const tableName = config.dynamodb.tableName;
const suggestionService = new TimeBookingSuggestionService();
const suggestionRepository = new BookingSuggestionRepository(dynamoDBClient, tableName);
const idealAllocationService = new IdealAllocationService(dynamoDBClient, tableName);
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
  maxRetries: 3,
});

const agentDispatcher = new AgentTaskDispatcher(orchestrator, registry, {
  maxRetries: 3,
  taskTimeout: 30000,
  loadBalancingStrategy: 'least_loaded',
});

const eventManagementService = new EventManagementService(dynamoDBDataAccess, agentDispatcher, auditLogger);
const acceptanceService = new TimeBookingAcceptanceService(suggestionRepository, eventManagementService);

/**
 * POST /api/booking-suggestions/generate
 * Generate booking suggestions for a family member
 * Body: { familyMemberId, events, weekStartDate, weekEndDate }
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { familyMemberId, events, weekStartDate, weekEndDate } = req.body;

    // Validate required fields
    if (!familyMemberId || !events || !weekStartDate || !weekEndDate) {
      return res.status(400).json({
        error: 'Missing required fields: familyMemberId, events, weekStartDate, weekEndDate',
      });
    }

    // For now, use a default familyId (in production, this would come from authenticated session)
    const familyId = req.body.familyId || 'default-family';

    // Get ideal allocations for the family member
    const idealAllocations = await idealAllocationService.getIdealAllocationsForMember(
      familyId,
      familyMemberId
    );

    if (idealAllocations.length === 0) {
      return res.status(400).json({
        error: 'No ideal allocations configured for this family member',
      });
    }

    // Parse dates
    const weekStart = new Date(weekStartDate);
    const weekEnd = new Date(weekEndDate);

    // Parse events (convert ISO strings to Date objects)
    const parsedEvents = events.map((e: any) => ({
      ...e,
      startTime: new Date(e.startTime),
      endTime: new Date(e.endTime),
      createdAt: new Date(e.createdAt),
      updatedAt: new Date(e.updatedAt),
    }));

    // Generate suggestions
    const suggestions = suggestionService.generateBookingSuggestions(
      parsedEvents,
      familyMemberId,
      idealAllocations,
      weekStart,
      weekEnd
    );

    // Save suggestions to database
    const savedSuggestions = [];
    for (const suggestion of suggestions) {
      const saved = await suggestionRepository.saveSuggestion({
        ...suggestion,
        familyId,
        updatedAt: new Date(),
      });
      savedSuggestions.push(saved);
    }

    res.status(201).json(savedSuggestions);
  } catch (error) {
    console.error('Error generating booking suggestions:', error);
    res.status(500).json({ error: 'Failed to generate booking suggestions' });
  }
});

/**
 * GET /api/booking-suggestions
 * Get booking suggestions for a family member
 * Query params: familyMemberId (optional), status (optional: pending, accepted, dismissed, modified)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { familyMemberId, status } = req.query;

    // For now, use a default familyId (in production, this would come from authenticated session)
    const familyId = (req.query.familyId as string) || 'default-family';

    let suggestions;

    if (familyMemberId && status === 'pending') {
      // Get pending suggestions for a specific family member
      suggestions = await suggestionRepository.getPendingSuggestionsForMember(
        familyId,
        familyMemberId as string
      );
    } else if (familyMemberId) {
      // Get all suggestions for a specific family member
      suggestions = await suggestionRepository.getSuggestionsForMember(familyId, familyMemberId as string);
    } else {
      // Get all suggestions for the family
      suggestions = await suggestionRepository.getSuggestionsForFamily(familyId);
    }

    // Filter by status if provided
    if (status && status !== 'pending') {
      suggestions = suggestions.filter((s) => s.status === status);
    }

    res.status(200).json(suggestions);
  } catch (error) {
    console.error('Error getting booking suggestions:', error);
    res.status(500).json({ error: 'Failed to get booking suggestions' });
  }
});

/**
 * GET /api/booking-suggestions/:suggestionId
 * Get a specific booking suggestion
 */
router.get('/:suggestionId', async (req: Request, res: Response) => {
  try {
    const { suggestionId } = req.params;

    // For now, use a default familyId (in production, this would come from authenticated session)
    const familyId = (req.query.familyId as string) || 'default-family';

    const suggestion = await suggestionRepository.getSuggestion(familyId, suggestionId);

    if (!suggestion) {
      return res.status(404).json({ error: 'Booking suggestion not found' });
    }

    res.status(200).json(suggestion);
  } catch (error) {
    console.error('Error getting booking suggestion:', error);
    res.status(500).json({ error: 'Failed to get booking suggestion' });
  }
});

/**
 * POST /api/booking-suggestions/:suggestionId/accept
 * Accept a booking suggestion with specific slots and create calendar events
 * Body: { acceptedSlots }
 * Requirements: 5a.11, 5a.12
 */
router.post('/:suggestionId/accept', async (req: Request, res: Response) => {
  try {
    const { suggestionId } = req.params;
    const { acceptedSlots } = req.body;

    if (!acceptedSlots || !Array.isArray(acceptedSlots)) {
      return res.status(400).json({ error: 'acceptedSlots is required and must be an array' });
    }

    // For now, use a default familyId (in production, this would come from authenticated session)
    const familyId = (req.query.familyId as string) || 'default-family';
    const userId = (req.query.userId as string) || 'system';

    // Parse slot dates
    const parsedSlots = acceptedSlots.map((slot: any) => ({
      ...slot,
      startTime: new Date(slot.startTime),
      endTime: new Date(slot.endTime),
    }));

    // Accept suggestion and create events
    const result = await acceptanceService.acceptSuggestion({
      familyId,
      suggestionId,
      acceptedSlots: parsedSlots,
      userId,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(200).json({
      suggestion: result.suggestion,
      createdEvents: result.createdEvents,
      message: `Suggestion accepted and ${result.createdEvents?.length || 0} event(s) created`,
    });
  } catch (error) {
    console.error('Error accepting booking suggestion:', error);
    res.status(500).json({ error: 'Failed to accept booking suggestion' });
  }
});

/**
 * POST /api/booking-suggestions/:suggestionId/modify
 * Modify a booking suggestion with different time slots
 * Body: { modifiedSlots }
 * Requirements: 5a.11
 */
router.post('/:suggestionId/modify', async (req: Request, res: Response) => {
  try {
    const { suggestionId } = req.params;
    const { modifiedSlots } = req.body;

    if (!modifiedSlots || !Array.isArray(modifiedSlots)) {
      return res.status(400).json({ error: 'modifiedSlots is required and must be an array' });
    }

    // For now, use a default familyId (in production, this would come from authenticated session)
    const familyId = (req.query.familyId as string) || 'default-family';
    const userId = (req.query.userId as string) || 'system';

    // Parse slot dates
    const parsedSlots = modifiedSlots.map((slot: any) => ({
      ...slot,
      startTime: new Date(slot.startTime),
      endTime: new Date(slot.endTime),
    }));

    // Modify suggestion
    const result = await acceptanceService.modifySuggestion({
      familyId,
      suggestionId,
      modifiedSlots: parsedSlots,
      userId,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(200).json({
      suggestion: result.suggestion,
      message: 'Suggestion modified successfully',
    });
  } catch (error) {
    console.error('Error modifying booking suggestion:', error);
    res.status(500).json({ error: 'Failed to modify booking suggestion' });
  }
});

/**
 * POST /api/booking-suggestions/:suggestionId/dismiss
 * Dismiss a booking suggestion
 * Requirements: 5a.11
 */
router.post('/:suggestionId/dismiss', async (req: Request, res: Response) => {
  try {
    const { suggestionId } = req.params;

    // For now, use a default familyId (in production, this would come from authenticated session)
    const familyId = (req.query.familyId as string) || 'default-family';
    const userId = (req.query.userId as string) || 'system';

    // Dismiss suggestion
    const result = await acceptanceService.dismissSuggestion({
      familyId,
      suggestionId,
      userId,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(200).json({
      suggestion: result.suggestion,
      message: 'Suggestion dismissed successfully',
    });
  } catch (error) {
    console.error('Error dismissing booking suggestion:', error);
    res.status(500).json({ error: 'Failed to dismiss booking suggestion' });
  }
});

/**
 * DELETE /api/booking-suggestions/:suggestionId
 * Delete a booking suggestion
 */
router.delete('/:suggestionId', async (req: Request, res: Response) => {
  try {
    const { suggestionId } = req.params;

    // For now, use a default familyId (in production, this would come from authenticated session)
    const familyId = (req.query.familyId as string) || 'default-family';

    await suggestionRepository.deleteSuggestion(familyId, suggestionId);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting booking suggestion:', error);
    res.status(500).json({ error: 'Failed to delete booking suggestion' });
  }
});

export default router;
