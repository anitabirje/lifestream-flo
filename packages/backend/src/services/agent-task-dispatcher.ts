/**
 * Agent Task Dispatcher
 * Dispatches calendar operations to appropriate agents
 * Handles agent selection and load balancing
 */

import { v4 as uuidv4 } from 'uuid';
import { AgentOrchestrator } from '../agents/agent-orchestrator';
import { CalendarSourceRegistry } from './calendar-source-registry';
import { AgentTask, TaskPriority } from '../agents/types';
import { ICalendarQueryAgent } from '../agents/calendar-query-agent';

export interface DispatcherConfig {
  maxRetries: number;
  taskTimeout: number; // milliseconds
  loadBalancingStrategy: 'round_robin' | 'least_loaded' | 'random';
}

export interface DispatchResult {
  taskId: string;
  sourceId: string;
  agentId?: string;
  status: 'dispatched' | 'queued' | 'failed';
  error?: string;
}

export class AgentTaskDispatcher {
  private orchestrator: AgentOrchestrator;
  private registry: CalendarSourceRegistry;
  private config: DispatcherConfig;
  private agentRoundRobinIndex: number;
  private dispatchHistory: Map<string, DispatchResult>;

  constructor(
    orchestrator: AgentOrchestrator,
    registry: CalendarSourceRegistry,
    config: Partial<DispatcherConfig> = {}
  ) {
    this.orchestrator = orchestrator;
    this.registry = registry;
    this.config = {
      maxRetries: config.maxRetries || 3,
      taskTimeout: config.taskTimeout || 30000,
      loadBalancingStrategy: config.loadBalancingStrategy || 'least_loaded'
    };
    this.agentRoundRobinIndex = 0;
    this.dispatchHistory = new Map();
  }

  /**
   * Dispatch a calendar query operation to an appropriate agent
   */
  async dispatchQueryOperation(
    sourceId: string,
    operationType: 'full_sync' | 'incremental_sync',
    priority: TaskPriority = 'medium',
    familyId?: string
  ): Promise<DispatchResult> {
    try {
      // Get the calendar source
      if (!familyId) {
        throw new Error('familyId is required for dispatching operations');
      }

      const source = await this.registry.getSource(sourceId, familyId);
      if (!source) {
        return {
          taskId: uuidv4(),
          sourceId,
          status: 'failed',
          error: `Calendar source ${sourceId} not found`
        };
      }

      // Select an appropriate agent for this source type
      const agent = this.selectAgentForSourceType(source.type);
      if (!agent) {
        return {
          taskId: uuidv4(),
          sourceId,
          status: 'failed',
          error: `No available agent for source type ${source.type}`
        };
      }

      // Create agent task
      const task: AgentTask = {
        id: uuidv4(),
        type: 'query_calendar',
        priority,
        payload: {
          sourceId,
          operationType,
          sourceType: source.type
        },
        sourceId,
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: this.config.maxRetries
      };

      // Assign agent to source
      await this.registry.assignAgent(sourceId, agent, familyId);

      // Submit task to orchestrator
      await this.orchestrator.submitTask(task);

      const result: DispatchResult = {
        taskId: task.id,
        sourceId,
        agentId: agent.id,
        status: 'dispatched'
      };

      // Track dispatch
      this.dispatchHistory.set(task.id, result);

      return result;
    } catch (error) {
      const taskId = uuidv4();
      return {
        taskId,
        sourceId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Dispatch multiple calendar operations in parallel
   */
  async dispatchParallelOperations(
    sourceIds: string[],
    operationType: 'full_sync' | 'incremental_sync',
    familyId: string,
    priority: TaskPriority = 'medium'
  ): Promise<DispatchResult[]> {
    const results: DispatchResult[] = [];

    for (const sourceId of sourceIds) {
      const result = await this.dispatchQueryOperation(
        sourceId,
        operationType,
        priority,
        familyId
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Dispatch a create event operation
   */
  async dispatchCreateEventOperation(
    sourceId: string,
    eventData: any,
    familyId: string,
    priority: TaskPriority = 'high'
  ): Promise<DispatchResult> {
    try {
      const source = await this.registry.getSource(sourceId, familyId);
      if (!source) {
        return {
          taskId: uuidv4(),
          sourceId,
          status: 'failed',
          error: `Calendar source ${sourceId} not found`
        };
      }

      const agent = this.selectAgentForSourceType(source.type);
      if (!agent) {
        return {
          taskId: uuidv4(),
          sourceId,
          status: 'failed',
          error: `No available agent for source type ${source.type}`
        };
      }

      const task: AgentTask = {
        id: uuidv4(),
        type: 'query_calendar',
        priority,
        payload: {
          sourceId,
          operation: 'create_event',
          eventData,
          sourceType: source.type
        },
        sourceId,
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: this.config.maxRetries
      };

      await this.registry.assignAgent(sourceId, agent, familyId);
      await this.orchestrator.submitTask(task);

      const result: DispatchResult = {
        taskId: task.id,
        sourceId,
        agentId: agent.id,
        status: 'dispatched'
      };

      this.dispatchHistory.set(task.id, result);
      return result;
    } catch (error) {
      const taskId = uuidv4();
      return {
        taskId,
        sourceId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Dispatch an update event operation
   */
  async dispatchUpdateEventOperation(
    sourceId: string,
    eventId: string,
    eventData: any,
    familyId: string,
    priority: TaskPriority = 'high'
  ): Promise<DispatchResult> {
    try {
      const source = await this.registry.getSource(sourceId, familyId);
      if (!source) {
        return {
          taskId: uuidv4(),
          sourceId,
          status: 'failed',
          error: `Calendar source ${sourceId} not found`
        };
      }

      const agent = this.selectAgentForSourceType(source.type);
      if (!agent) {
        return {
          taskId: uuidv4(),
          sourceId,
          status: 'failed',
          error: `No available agent for source type ${source.type}`
        };
      }

      const task: AgentTask = {
        id: uuidv4(),
        type: 'query_calendar',
        priority,
        payload: {
          sourceId,
          operation: 'update_event',
          eventId,
          eventData,
          sourceType: source.type
        },
        sourceId,
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: this.config.maxRetries
      };

      await this.registry.assignAgent(sourceId, agent, familyId);
      await this.orchestrator.submitTask(task);

      const result: DispatchResult = {
        taskId: task.id,
        sourceId,
        agentId: agent.id,
        status: 'dispatched'
      };

      this.dispatchHistory.set(task.id, result);
      return result;
    } catch (error) {
      const taskId = uuidv4();
      return {
        taskId,
        sourceId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Dispatch a delete event operation
   */
  async dispatchDeleteEventOperation(
    sourceId: string,
    eventId: string,
    familyId: string,
    priority: TaskPriority = 'high'
  ): Promise<DispatchResult> {
    try {
      const source = await this.registry.getSource(sourceId, familyId);
      if (!source) {
        return {
          taskId: uuidv4(),
          sourceId,
          status: 'failed',
          error: `Calendar source ${sourceId} not found`
        };
      }

      const agent = this.selectAgentForSourceType(source.type);
      if (!agent) {
        return {
          taskId: uuidv4(),
          sourceId,
          status: 'failed',
          error: `No available agent for source type ${source.type}`
        };
      }

      const task: AgentTask = {
        id: uuidv4(),
        type: 'query_calendar',
        priority,
        payload: {
          sourceId,
          operation: 'delete_event',
          eventId,
          sourceType: source.type
        },
        sourceId,
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: this.config.maxRetries
      };

      await this.registry.assignAgent(sourceId, agent, familyId);
      await this.orchestrator.submitTask(task);

      const result: DispatchResult = {
        taskId: task.id,
        sourceId,
        agentId: agent.id,
        status: 'dispatched'
      };

      this.dispatchHistory.set(task.id, result);
      return result;
    } catch (error) {
      const taskId = uuidv4();
      return {
        taskId,
        sourceId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Select an agent for a specific source type using load balancing
   */
  private selectAgentForSourceType(sourceType: string): ICalendarQueryAgent | undefined {
    // Get all agents that can handle calendar queries
    const agents = this.orchestrator.getAllAgents()
      .filter(agent => agent.type === 'calendar_query' && agent.status !== 'offline');

    if (agents.length === 0) {
      return undefined;
    }

    // Apply load balancing strategy
    switch (this.config.loadBalancingStrategy) {
      case 'round_robin':
        return this.selectByRoundRobin(agents as ICalendarQueryAgent[]);
      case 'least_loaded':
        return this.selectByLeastLoaded(agents as ICalendarQueryAgent[]);
      case 'random':
        return this.selectByRandom(agents as ICalendarQueryAgent[]);
      default:
        return agents[0] as ICalendarQueryAgent;
    }
  }

  /**
   * Select agent using round-robin strategy
   */
  private selectByRoundRobin(agents: ICalendarQueryAgent[]): ICalendarQueryAgent {
    const selected = agents[this.agentRoundRobinIndex % agents.length];
    this.agentRoundRobinIndex++;
    return selected;
  }

  /**
   * Select agent using least-loaded strategy
   */
  private selectByLeastLoaded(agents: ICalendarQueryAgent[]): ICalendarQueryAgent {
    // For now, just return the first idle agent, or the first one if all are busy
    const idleAgent = agents.find(agent => agent.status === 'idle');
    return idleAgent || agents[0];
  }

  /**
   * Select agent using random strategy
   */
  private selectByRandom(agents: ICalendarQueryAgent[]): ICalendarQueryAgent {
    return agents[Math.floor(Math.random() * agents.length)];
  }

  /**
   * Get dispatch result by task ID
   */
  getDispatchResult(taskId: string): DispatchResult | undefined {
    return this.dispatchHistory.get(taskId);
  }

  /**
   * Get all dispatch results
   */
  getAllDispatchResults(): DispatchResult[] {
    return Array.from(this.dispatchHistory.values());
  }

  /**
   * Clear dispatch history
   */
  clearHistory(): void {
    this.dispatchHistory.clear();
  }

  /**
   * Get dispatcher statistics
   */
  getStats(): {
    totalDispatches: number;
    successfulDispatches: number;
    failedDispatches: number;
    loadBalancingStrategy: string;
  } {
    const results = Array.from(this.dispatchHistory.values());
    return {
      totalDispatches: results.length,
      successfulDispatches: results.filter(r => r.status === 'dispatched').length,
      failedDispatches: results.filter(r => r.status === 'failed').length,
      loadBalancingStrategy: this.config.loadBalancingStrategy
    };
  }
}
