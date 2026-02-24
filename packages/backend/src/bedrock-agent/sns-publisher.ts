/**
 * SNS Event Publisher for agent execution events
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4
 */

import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { getLogger } from './logger';
import { AgentExecutionRecord } from './types';

const logger = getLogger();

/**
 * SNS event types
 */
export enum EventType {
  EXECUTION_SUCCESS = 'agent.execution.success',
  EXECUTION_FAILURE = 'agent.execution.failure',
  EXECUTION_PARTIAL = 'agent.execution.partial',
}

/**
 * SNS event payload
 */
export interface SNSEventPayload {
  eventType: EventType;
  executionId: string;
  agentId: string;
  agentType: string;
  status: 'success' | 'failure' | 'partial';
  result?: Record<string, unknown>;
  error?: string;
  timestamp: string;
  duration: number;
  modelUsed: string;
}

/**
 * SNS Publisher for agent execution events
 */
export class SNSPublisher {
  private snsClient: SNSClient;
  private topicArn: string;

  constructor(topicArn?: string) {
    this.snsClient = new SNSClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });

    this.topicArn = topicArn || process.env.AGENT_EVENTS_TOPIC_ARN || '';

    if (!this.topicArn) {
      logger.warn('SNS topic ARN not configured', {
        env: 'AGENT_EVENTS_TOPIC_ARN',
      });
    }
  }

  /**
   * Publish an agent execution event
   */
  async publishExecutionEvent(record: AgentExecutionRecord): Promise<boolean> {
    if (!this.topicArn) {
      logger.warn('SNS topic ARN not configured, skipping event publication', {
        executionId: record.executionId,
      });
      return false;
    }

    try {
      // Determine event type based on status
      let eventType: EventType;
      if (record.status === 'success') {
        eventType = EventType.EXECUTION_SUCCESS;
      } else if (record.status === 'failure') {
        eventType = EventType.EXECUTION_FAILURE;
      } else {
        eventType = EventType.EXECUTION_PARTIAL;
      }

      // Create event payload
      const payload: SNSEventPayload = {
        eventType,
        executionId: record.executionId,
        agentId: record.agentId,
        agentType: record.agentType,
        status: record.status,
        result: record.result,
        error: record.error,
        timestamp: new Date(record.startTime).toISOString(),
        duration: record.duration,
        modelUsed: record.modelUsed,
      };

      // Publish to SNS
      const command = new PublishCommand({
        TopicArn: this.topicArn,
        Subject: `Agent Execution: ${record.agentType} - ${record.status.toUpperCase()}`,
        Message: JSON.stringify(payload),
        MessageAttributes: {
          eventType: {
            DataType: 'String',
            StringValue: eventType,
          },
          agentId: {
            DataType: 'String',
            StringValue: record.agentId,
          },
          agentType: {
            DataType: 'String',
            StringValue: record.agentType,
          },
          status: {
            DataType: 'String',
            StringValue: record.status,
          },
        },
      });

      const response = await this.snsClient.send(command);

      logger.info('Agent execution event published', {
        executionId: record.executionId,
        eventType,
        messageId: response?.MessageId || 'unknown',
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to publish agent execution event', error instanceof Error ? error : new Error(errorMessage), {
        executionId: record.executionId,
        errorMessage,
      });

      // Don't throw - SNS publishing failures should not block execution
      return false;
    }
  }

  /**
   * Publish a success event
   */
  async publishSuccessEvent(record: AgentExecutionRecord): Promise<boolean> {
    if (record.status !== 'success') {
      logger.warn('Attempted to publish success event for non-success execution', {
        executionId: record.executionId,
        status: record.status,
      });
      return false;
    }

    return this.publishExecutionEvent(record);
  }

  /**
   * Publish a failure event
   */
  async publishFailureEvent(record: AgentExecutionRecord): Promise<boolean> {
    if (record.status !== 'failure') {
      logger.warn('Attempted to publish failure event for non-failure execution', {
        executionId: record.executionId,
        status: record.status,
      });
      return false;
    }

    return this.publishExecutionEvent(record);
  }

  /**
   * Publish a partial execution event
   */
  async publishPartialEvent(record: AgentExecutionRecord): Promise<boolean> {
    if (record.status !== 'partial') {
      logger.warn('Attempted to publish partial event for non-partial execution', {
        executionId: record.executionId,
        status: record.status,
      });
      return false;
    }

    return this.publishExecutionEvent(record);
  }

  /**
   * Close the SNS client
   */
  async close(): Promise<void> {
    await this.snsClient.destroy();
  }
}

/**
 * Global SNS publisher instance
 */
let globalPublisher: SNSPublisher | null = null;

/**
 * Get or create global SNS publisher
 */
export function getPublisher(topicArn?: string): SNSPublisher {
  if (!globalPublisher) {
    globalPublisher = new SNSPublisher(topicArn);
  }
  return globalPublisher;
}

/**
 * Create a new SNS publisher instance
 */
export function createPublisher(topicArn?: string): SNSPublisher {
  return new SNSPublisher(topicArn);
}
