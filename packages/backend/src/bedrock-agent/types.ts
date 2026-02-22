/**
 * Core type definitions for AWS Bedrock Agent integration
 * Validates: Requirements 1.1, 1.3, 3.6
 */

/**
 * Request to execute an agent
 */
export interface AgentExecutionRequest {
  agentId: string;
  agentType: string;
  input: Record<string, unknown>;
  parameters?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

/**
 * Response from agent execution
 */
export interface AgentExecutionResponse {
  executionId: string;
  agentId: string;
  status: 'success' | 'failure' | 'partial';
  result: Record<string, unknown>;
  error?: string;
  metadata: {
    startTime: string;
    endTime: string;
    duration: number;
    modelUsed: string;
  };
}

/**
 * Input to a tool invocation
 */
export interface ToolInput {
  [key: string]: unknown;
}

/**
 * Output from a tool invocation
 */
export interface ToolOutput {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

/**
 * Record of an agent execution persisted to DynamoDB
 */
export interface AgentExecutionRecord {
  executionId: string;
  agentId: string;
  agentType: string;
  status: 'success' | 'failure' | 'partial';
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  error?: string;
  startTime: number;
  endTime: number;
  duration: number;
  modelUsed: string;
  toolInvocations: Array<{
    toolName: string;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    duration: number;
  }>;
  ttl?: number;
}

/**
 * Agent configuration stored in DynamoDB
 */
export interface AgentConfiguration {
  agentId: string;
  agentType: string;
  agentName: string;
  description: string;
  foundationModel: string;
  tools: Array<{
    toolName: string;
    description: string;
    lambdaArn: string;
  }>;
  parameters: {
    temperature: number;
    maxTokens: number;
  };
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Error types for different failure scenarios
 */
export class BedrockAgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'BedrockAgentError';
  }
}

export class ToolInvocationError extends Error {
  constructor(
    message: string,
    public toolName: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ToolInvocationError';
  }
}

export class DataPersistenceError extends Error {
  constructor(
    message: string,
    public retryable: boolean = true
  ) {
    super(message);
    this.name = 'DataPersistenceError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}
