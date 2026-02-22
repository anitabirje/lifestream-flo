/**
 * Bedrock Agent invocation
 * Validates: Requirements 1.1, 2.1
 */

import { InvokeAgentCommand } from '@aws-sdk/client-bedrock-agent-runtime';
import { getBedrockClient } from './aws-clients';
import { BedrockAgentError } from './types';
import { createLogger } from './logger';

/**
 * Invoke Bedrock Agent
 */
export async function invokeBedrockAgent(
  action: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const logger = createLogger();

  logger.debug('Invoking Bedrock Agent', {
    agentId: action.agentId,
  });

  try {
    const client = getBedrockClient();

    const command = new InvokeAgentCommand({
      agentId: action.agentId as string,
      agentAliasId: action.agentAliasId as string,
      sessionId: action.sessionId as string,
      inputText: action.inputText as string,
      enableTrace: action.enableTrace as boolean,
      sessionState: action.sessionState as any,
    });

    const response = await client.send(command);

    logger.debug('Bedrock Agent invocation successful', {
      agentId: action.agentId,
      sessionId: action.sessionId,
    });

    // Parse response
    const result = {
      sessionId: response.sessionId,
      output: response.completion,
      trace: response.trace,
    };

    return result;
  } catch (error) {
    const err = error as any;
    logger.error('Bedrock Agent invocation failed', error as Error, {
      agentId: action.agentId,
      errorCode: err.code,
    });

    // Determine if error is retryable
    const retryable =
      err.code === 'ThrottlingException' ||
      err.code === 'ServiceUnavailableException' ||
      err.code === 'RequestLimitExceededException';

    throw new BedrockAgentError(
      `Bedrock Agent invocation failed: ${err.message}`,
      err.code || 'BEDROCK_ERROR',
      retryable
    );
  }
}

/**
 * Parse Bedrock Agent response
 */
export function parseBedrockResponse(
  response: Record<string, unknown>
): Record<string, unknown> {
  const logger = createLogger();

  try {
    const output = response.output as string;

    // Try to parse as JSON
    try {
      return JSON.parse(output);
    } catch {
      // If not JSON, return as text
      return { text: output };
    }
  } catch (error) {
    logger.error('Failed to parse Bedrock response', error as Error);
    return { error: 'Failed to parse response' };
  }
}

/**
 * Validate Bedrock response
 */
export function validateBedrockResponse(
  response: Record<string, unknown>
): { valid: true } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  if (!response.sessionId || typeof response.sessionId !== 'string') {
    errors.push('sessionId is required in response');
  }

  if (!response.output) {
    errors.push('output is required in response');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}
