/**
 * Main Lambda handler for agent execution
 * Validates: Requirements 5.1, 5.3, 5.4
 */

import { v4 as uuidv4 } from 'uuid';
import { AgentExecutionRequest, AgentExecutionResponse } from './types';
import { validateAgentExecutionRequest } from './request-validator';
import {
  formatSuccessResponse,
  formatErrorResponse,
  formatHTTPResponse,
  formatErrorHTTPResponse,
} from './response-formatter';
import { createLogger } from './logger';
import { validateAWSConfiguration } from './aws-clients';
import {
  publishAgentExecutionMetrics,
  publishLambdaDurationMetric,
} from './metrics-publisher';

/**
 * Lambda handler for agent execution requests
 */
export async function handleAgentExecution(
  event: unknown
): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> {
  const executionId = uuidv4();
  const logger = createLogger(executionId);
  const lambdaStartTime = Date.now();

  try {
    logger.info('Agent execution started', {
      event: typeof event === 'object' ? event : { raw: String(event) },
    });

    // Parse request body
    let request: unknown;
    if (typeof event === 'string') {
      try {
        request = JSON.parse(event);
      } catch (e) {
        logger.error('Failed to parse request body', e as Error);
        const errorResponse = formatErrorResponse(
          executionId,
          'unknown',
          'Invalid JSON in request body',
          'PARSE_ERROR'
        );
        return formatHTTPResponse(400, errorResponse as unknown as Record<string, unknown>);
      }
    } else if (typeof event === 'object' && event !== null) {
      const eventObj = event as Record<string, unknown>;
      if (eventObj.body && typeof eventObj.body === 'string') {
        try {
          request = JSON.parse(eventObj.body);
        } catch (e) {
          logger.error('Failed to parse request body', e as Error);
          const errorResponse = formatErrorResponse(
            executionId,
            'unknown',
            'Invalid JSON in request body',
            'PARSE_ERROR'
          );
          return formatHTTPResponse(400, errorResponse as unknown as Record<string, unknown>);
        }
      } else {
        request = event;
      }
    } else {
      logger.error('Invalid event type');
      const errorResponse = formatErrorResponse(
        executionId,
        'unknown',
        'Invalid request format',
        'INVALID_FORMAT'
      );
      return formatHTTPResponse(400, errorResponse as unknown as Record<string, unknown>);
    }

    // Validate request
    const validation = validateAgentExecutionRequest(request);
    if (!validation.valid) {
      logger.warn('Request validation failed', {
        errors: validation.errors,
      });
      const errorResponse = formatErrorResponse(
        executionId,
        (request as any)?.agentId || 'unknown',
        'Request validation failed',
        'VALIDATION_ERROR'
      );
      return formatHTTPResponse(400, errorResponse as unknown as Record<string, unknown>);
    }

    const agentRequest = request as AgentExecutionRequest;

    logger.info('Request validated', {
      agentId: agentRequest.agentId,
      agentType: agentRequest.agentType,
    });

    // Validate AWS configuration
    try {
      validateAWSConfiguration();
    } catch (e) {
      logger.error('AWS configuration validation failed', e as Error);
      const errorResponse = formatErrorResponse(
        executionId,
        agentRequest.agentId,
        'AWS configuration error',
        'CONFIG_ERROR'
      );
      const lambdaDuration = Date.now() - lambdaStartTime;
      await publishLambdaDurationMetric(lambdaDuration, 'agent-executor', false);
      return formatHTTPResponse(500, errorResponse as unknown as Record<string, unknown>);
    }

    // Route to appropriate agent executor
    const response = await routeAgentExecution(agentRequest, logger);

    logger.info('Agent execution completed', {
      status: response.status,
    });

    // Publish metrics
    const lambdaDuration = Date.now() - lambdaStartTime;
    await publishLambdaDurationMetric(lambdaDuration, 'agent-executor', response.status === 'success');
    await publishAgentExecutionMetrics({
      agentId: agentRequest.agentId,
      agentType: agentRequest.agentType,
      duration: lambdaDuration,
      success: response.status === 'success',
    });

    return formatHTTPResponse(200, response as unknown as Record<string, unknown>);
  } catch (error) {
    logger.error('Unexpected error in agent execution', error as Error, {
      executionId,
    });

    const errorResponse = formatErrorResponse(
      executionId,
      'unknown',
      'Internal server error',
      'INTERNAL_ERROR'
    );
    const lambdaDuration = Date.now() - lambdaStartTime;
    await publishLambdaDurationMetric(lambdaDuration, 'agent-executor', false);
    return formatHTTPResponse(500, errorResponse as unknown as Record<string, unknown>);
  }
}

/**
 * Route agent execution to appropriate handler
 */
async function routeAgentExecution(
  request: AgentExecutionRequest,
  logger: ReturnType<typeof createLogger>
): Promise<AgentExecutionResponse> {
  const startTime = new Date().toISOString();
  const startTimeMs = Date.now();

  try {
    // For now, return a placeholder response
    // This will be implemented in Task 5 (Bedrock Agent integration)
    const result = {
      message: 'Agent execution routed successfully',
      agentType: request.agentType,
    };

    const endTime = new Date().toISOString();
    const duration = Date.now() - startTimeMs;

    return formatSuccessResponse(
      uuidv4(),
      request.agentId,
      result,
      {
        startTime,
        endTime,
        duration,
        modelUsed: request.parameters?.model || 'default',
      }
    );
  } catch (error) {
    logger.error('Error routing agent execution', error as Error);

    return formatErrorResponse(
      uuidv4(),
      request.agentId,
      (error as Error).message || 'Unknown error',
      'EXECUTION_ERROR'
    );
  }
}

/**
 * Export handler for AWS Lambda
 */
export const handler = handleAgentExecution;
