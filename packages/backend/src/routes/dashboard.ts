/**
 * Dashboard API Routes
 * Endpoints for retrieving dashboard metrics and analytics
 */

import { Router, Request, Response } from 'express';
import { EventManagementService } from '../services/event-management-service';
import { DashboardDataBuilder } from '../services/dashboard-data-builder';
import { getDynamoDBClient } from '../data-access/dynamodb-client';
import { getTableName } from '../config/dynamodb';

const router = Router();

// Initialize services
const dynamoClient = getDynamoDBClient();
const tableName = getTableName();
const eventService = new EventManagementService(dynamoClient, tableName);
const dashboardBuilder = new DashboardDataBuilder();

/**
 * Helper function to parse date query parameter
 */
function parseDate(dateStr: string | undefined): Date | undefined {
  if (!dateStr) {
    return undefined;
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return undefined;
  }
  return date;
}

/**
 * Helper function to get week boundaries
 */
function getWeekBoundaries(date: Date = new Date()): { startDate: Date; endDate: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday

  const startDate = new Date(d.setDate(diff));
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
}

/**
 * GET /api/dashboard/metrics
 * Get dashboard metrics with optional filters
 * Query params:
 *   - familyMemberId (optional): filter by specific family member
 *   - startDate (optional): start date in ISO format (defaults to current week start)
 *   - endDate (optional): end date in ISO format (defaults to current week end)
 *   - useCache (optional): whether to use cache (default: true)
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const { familyMemberId, useCache } = req.query;

    // For now, use a default familyId (in production, this would come from authenticated session)
    const familyId = (req.query.familyId as string) || 'default-family';

    // Parse dates or use current week
    let startDate = parseDate(req.query.startDate as string);
    let endDate = parseDate(req.query.endDate as string);

    if (!startDate || !endDate) {
      const weekBoundaries = getWeekBoundaries();
      startDate = startDate || weekBoundaries.startDate;
      endDate = endDate || weekBoundaries.endDate;
    }

    // Validate date range
    if (startDate >= endDate) {
      return res.status(400).json({ error: 'startDate must be before endDate' });
    }

    // Fetch events for the date range
    const events = await eventService.listEvents(familyId, {
      startDate,
      endDate,
      includeDeleted: false,
    });

    // Determine if cache should be used
    const shouldUseCache = useCache !== 'false';

    // Build dashboard metrics
    const metrics = dashboardBuilder.buildDashboardMetrics(
      familyId,
      events,
      startDate,
      endDate,
      familyMemberId as string | undefined,
      shouldUseCache
    );

    res.status(200).json(metrics);
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    res.status(500).json({ error: 'Failed to get dashboard metrics' });
  }
});

/**
 * GET /api/dashboard/metrics/all-members
 * Get dashboard metrics for all family members
 * Query params:
 *   - startDate (optional): start date in ISO format (defaults to current week start)
 *   - endDate (optional): end date in ISO format (defaults to current week end)
 *   - useCache (optional): whether to use cache (default: true)
 */
router.get('/metrics/all-members', async (req: Request, res: Response) => {
  try {
    // For now, use a default familyId (in production, this would come from authenticated session)
    const familyId = (req.query.familyId as string) || 'default-family';

    // Parse dates or use current week
    let startDate = parseDate(req.query.startDate as string);
    let endDate = parseDate(req.query.endDate as string);

    if (!startDate || !endDate) {
      const weekBoundaries = getWeekBoundaries();
      startDate = startDate || weekBoundaries.startDate;
      endDate = endDate || weekBoundaries.endDate;
    }

    // Validate date range
    if (startDate >= endDate) {
      return res.status(400).json({ error: 'startDate must be before endDate' });
    }

    // Fetch events for the date range
    const events = await eventService.listEvents(familyId, {
      startDate,
      endDate,
      includeDeleted: false,
    });

    // Determine if cache should be used
    const useCache = (req.query.useCache as string) !== 'false';

    // Build dashboard metrics for all members
    const metricsMap = dashboardBuilder.buildDashboardMetricsForAllMembers(familyId, events, startDate, endDate, useCache);

    // Convert map to object for JSON response
    const metricsObject: Record<string, any> = {};
    for (const [memberId, metrics] of metricsMap.entries()) {
      metricsObject[memberId] = metrics;
    }

    res.status(200).json(metricsObject);
  } catch (error) {
    console.error('Error getting dashboard metrics for all members:', error);
    res.status(500).json({ error: 'Failed to get dashboard metrics for all members' });
  }
});

/**
 * POST /api/dashboard/cache/clear
 * Clear dashboard cache for a family
 */
router.post('/cache/clear', async (req: Request, res: Response) => {
  try {
    // For now, use a default familyId (in production, this would come from authenticated session)
    const familyId = (req.body.familyId as string) || 'default-family';

    dashboardBuilder.clearFamilyCache(familyId);

    res.status(200).json({ message: 'Cache cleared successfully' });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

/**
 * GET /api/dashboard/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', async (req: Request, res: Response) => {
  try {
    const stats = dashboardBuilder.getCacheStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

export default router;
