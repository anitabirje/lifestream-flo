/**
 * Event Classifier Tool Lambda Function
 * Provides event classification capabilities to Bedrock Agents
 * Validates: Requirements 3.3, 3.6
 */

import { ToolInput, ToolOutput } from '../types';
import { getLogger } from '../logger';

const logger = getLogger();

export interface ClassificationResult {
  categoryId: string;
  categoryName: string;
  confidence: number;
  requiresUserInput: boolean;
  suggestedAlternatives?: Array<{
    categoryId: string;
    categoryName: string;
    confidence: number;
  }>;
  reasoning?: string;
}

export interface ClassifierToolInput extends ToolInput {
  familyId: string;
  eventTitle: string;
  eventDescription?: string;
  eventLocation?: string;
  eventAttendees?: string[];
}

/**
 * Classify events into predefined categories
 * Return classification with confidence scores
 */
export async function handleClassifierTool(input: ClassifierToolInput): Promise<ToolOutput> {
  const executionId = (input as any).executionId || 'unknown';

  try {
    logger.info('Classifier tool invoked', {
      executionId,
      familyId: input.familyId,
      eventTitle: input.eventTitle,
    });

    // Validate required inputs
    if (!input.familyId) {
      return {
        success: false,
        error: 'familyId is required',
      };
    }

    if (!input.eventTitle) {
      return {
        success: false,
        error: 'eventTitle is required',
      };
    }

    // TODO: Implement actual classification logic using EventClassifierService
    // For now, return mock classification result
    const classification: ClassificationResult = {
      categoryId: 'cat-1',
      categoryName: 'Work',
      confidence: 0.85,
      requiresUserInput: false,
      suggestedAlternatives: [
        {
          categoryId: 'cat-2',
          categoryName: 'Meeting',
          confidence: 0.72,
        },
        {
          categoryId: 'cat-3',
          categoryName: 'Professional Development',
          confidence: 0.65,
        },
      ],
      reasoning: 'Event classified as "Work" based on strong keyword matches in title and description.',
    };

    logger.info('Classification completed', {
      executionId,
      category: classification.categoryName,
      confidence: classification.confidence,
    });

    return {
      success: true,
      data: classification as unknown as Record<string, unknown>,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Classifier tool error', errorObj, {
      executionId,
      errorMessage,
    });

    return {
      success: false,
      error: `Event classification failed: ${errorMessage}`,
    };
  }
}

/**
 * Lambda handler for Classifier Tool
 */
export async function handler(event: any): Promise<ToolOutput> {
  try {
    const input: ClassifierToolInput = {
      familyId: event.familyId,
      eventTitle: event.eventTitle,
      eventDescription: event.eventDescription,
      eventLocation: event.eventLocation,
      eventAttendees: event.eventAttendees,
      executionId: event.executionId,
    };

    return await handleClassifierTool(input);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Classifier tool handler error', errorObj);

    return {
      success: false,
      error: `Classifier tool handler failed: ${errorMessage}`,
    };
  }
}
