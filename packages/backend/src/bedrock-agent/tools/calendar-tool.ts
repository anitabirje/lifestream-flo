/**
 * Calendar Tool Lambda Function
 * Provides calendar query capabilities to Bedrock Agents
 * Validates: Requirements 3.1, 3.6
 */

import { ToolInput, ToolOutput } from '../types';
import { getLogger } from '../logger';

const logger = getLogger();

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: string[];
  category?: string;
}

export interface CalendarQueryInput extends ToolInput {
  familyId: string;
  startDate: string; // ISO 8601 format
  endDate: string; // ISO 8601 format
  memberId?: string;
  category?: string;
}

/**
 * Query calendar events from data source
 * Filter by date range, attendees, categories
 * Return structured event data
 */
export async function handleCalendarTool(input: CalendarQueryInput): Promise<ToolOutput> {
  const executionId = (input as any).executionId || 'unknown';

  try {
    logger.info('Calendar tool invoked', {
      executionId,
      familyId: input.familyId,
      startDate: input.startDate,
      endDate: input.endDate,
    });

    // Validate required inputs
    if (!input.familyId) {
      return {
        success: false,
        error: 'familyId is required',
      };
    }

    if (!input.startDate || !input.endDate) {
      return {
        success: false,
        error: 'startDate and endDate are required in ISO 8601 format',
      };
    }

    // Parse and validate dates
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    // Check if dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return {
        success: false,
        error: 'Invalid date format. Use ISO 8601 format (e.g., 2024-01-15T10:30:00Z)',
      };
    }

    if (startDate > endDate) {
      return {
        success: false,
        error: 'startDate must be before endDate',
      };
    }

    // TODO: Implement actual calendar query from data source
    // For now, return mock data structure
    const events: CalendarEvent[] = [
      {
        id: 'event-1',
        title: 'Team Meeting',
        description: 'Weekly team sync',
        startTime: new Date(startDate.getTime() + 3600000).toISOString(),
        endTime: new Date(startDate.getTime() + 5400000).toISOString(),
        location: 'Conference Room A',
        attendees: ['john@example.com', 'jane@example.com'],
        category: 'work',
      },
    ];

    logger.info('Calendar query completed', {
      executionId,
      eventCount: events.length,
    });

    return {
      success: true,
      data: {
        events,
        count: events.length,
        dateRange: {
          start: input.startDate,
          end: input.endDate,
        },
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Calendar tool error', errorObj, {
      executionId,
      errorMessage,
    });

    return {
      success: false,
      error: `Calendar query failed: ${errorMessage}`,
    };
  }
}

/**
 * Lambda handler for Calendar Tool
 */
export async function handler(event: any): Promise<ToolOutput> {
  try {
    const input: CalendarQueryInput = {
      familyId: event.familyId,
      startDate: event.startDate,
      endDate: event.endDate,
      memberId: event.memberId,
      category: event.category,
      executionId: event.executionId,
    };

    return await handleCalendarTool(input);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Calendar tool handler error', errorObj);

    return {
      success: false,
      error: `Calendar tool handler failed: ${errorMessage}`,
    };
  }
}
