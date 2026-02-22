/**
 * Agent Orchestration Types and Interfaces
 * Defines core types for the AI agent-based system
 */

/**
 * Agent types supported by the system
 */
export type AgentType = 'calendar_query' | 'event_parser' | 'event_classifier' | 'weather';

/**
 * Agent status
 */
export type AgentStatus = 'idle' | 'busy' | 'failed' | 'offline';

/**
 * Task types that agents can execute
 */
export type TaskType = 'query_calendar' | 'parse_events' | 'classify_event' | 'fetch_weather';

/**
 * Task priority levels
 */
export type TaskPriority = 'high' | 'medium' | 'low';

/**
 * Task status
 */
export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';

/**
 * Result status
 */
export type ResultStatus = 'success' | 'partial_success' | 'failed';

/**
 * Retry strategy for failed tasks
 */
export type RetryStrategy = 'exponential' | 'linear' | 'fixed';

/**
 * Agent task definition
 */
export interface AgentTask {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  payload: any;
  sourceId?: string;
  createdAt: Date;
  assignedTo?: string; // Agent ID
  retryCount: number;
  maxRetries: number;
}

/**
 * Agent result definition
 */
export interface AgentResult {
  taskId: string;
  agentId: string;
  status: ResultStatus;
  data: any;
  errors?: string[];
  executionTime: number; // milliseconds
  completedAt: Date;
}

/**
 * Agent orchestration configuration
 */
export interface AgentOrchestrationConfig {
  maxConcurrentAgents: number;
  taskTimeout: number; // milliseconds
  retryStrategy: RetryStrategy;
  retryDelay: number; // milliseconds
  healthCheckInterval: number; // milliseconds
}

/**
 * Base agent interface
 * All agents must implement this interface
 */
export interface IAgent {
  id: string;
  type: AgentType;
  capabilities: string[];
  status: AgentStatus;
  
  /**
   * Execute a task assigned to this agent
   */
  execute(task: AgentTask): Promise<AgentResult>;
  
  /**
   * Check if the agent is healthy and operational
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Weather data structure
 */
export interface WeatherData {
  date: string; // YYYY-MM-DD format
  location: string;
  temperature: number;
  temperatureUnit: 'C' | 'F';
  aqi: number; // Air Quality Index (0-500)
  uvIndex: number;
  precipitationChance: number; // 0-100 percentage
  conditions: string;
  retrievedAt: Date;
}
