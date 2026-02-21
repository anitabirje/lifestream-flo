/**
 * Agent Orchestrator
 * Central coordinator for all AI agents
 * Handles task assignment, load balancing, and agent coordination
 * Includes graceful error handling and fallback mechanisms
 */

import { IAgent, AgentTask, AgentResult, AgentOrchestrationConfig, TaskType } from './types';
import { AgentRegistry } from './agent-registry';
import { TaskQueue } from './task-queue';
import { errorHandler, ErrorCategory, ErrorSeverity } from '../utils/error-handler';
import { cacheManager } from '../utils/cache-manager';

export class AgentOrchestrator {
  private registry: AgentRegistry;
  private taskQueue: TaskQueue;
  private config: AgentOrchestrationConfig;
  private activeTaskCount: Map<string, number>; // agentId -> active task count
  private isProcessing: boolean;
  private processingInterval?: NodeJS.Timeout;

  constructor(config: AgentOrchestrationConfig) {
    this.registry = new AgentRegistry();
    this.taskQueue = new TaskQueue();
    this.config = config;
    this.activeTaskCount = new Map();
    this.isProcessing = false;
  }

  /**
   * Register an agent with the orchestrator
   */
  registerAgent(agent: IAgent): void {
    this.registry.register(agent);
    this.activeTaskCount.set(agent.id, 0);
  }

  /**
   * Unregister an agent from the orchestrator
   */
  unregisterAgent(agentId: string): boolean {
    const success = this.registry.unregister(agentId);
    if (success) {
      this.activeTaskCount.delete(agentId);
    }
    return success;
  }

  /**
   * Submit a task for execution
   */
  async submitTask(task: AgentTask): Promise<string> {
    this.taskQueue.enqueue(task);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }

    return task.id;
  }

  /**
   * Submit multiple tasks for execution
   */
  async submitTasks(tasks: AgentTask[]): Promise<string[]> {
    const taskIds: string[] = [];
    
    for (const task of tasks) {
      this.taskQueue.enqueue(task);
      taskIds.push(task.id);
    }

    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }

    return taskIds;
  }

  /**
   * Start processing tasks from the queue
   */
  private startProcessing(): void {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.processingInterval = setInterval(() => {
      this.processTasks();
    }, 100); // Check every 100ms
  }

  /**
   * Stop processing tasks
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    this.isProcessing = false;
  }

  /**
   * Process tasks from the queue
   */
  private async processTasks(): Promise<void> {
    // Check if we can process more tasks
    const totalActiveTasks = Array.from(this.activeTaskCount.values()).reduce((sum, count) => sum + count, 0);
    
    if (totalActiveTasks >= this.config.maxConcurrentAgents) {
      return;
    }

    // Get next task
    const task = this.taskQueue.dequeue();
    if (!task) {
      // No more tasks, stop processing
      if (this.taskQueue.getPendingCount() === 0 && this.taskQueue.getInProgressCount() === 0) {
        this.stopProcessing();
      }
      return;
    }

    // Find suitable agent
    const agent = this.selectAgent(task);
    if (!agent) {
      // No suitable agent available, re-queue the task
      this.taskQueue.enqueue(task);
      return;
    }

    // Assign task to agent
    this.executeTask(agent, task);
  }

  /**
   * Select the best agent for a task using load balancing
   */
  private selectAgent(task: AgentTask): IAgent | undefined {
    // Get agents that can handle this task type
    const capability = this.getCapabilityForTaskType(task.type);
    const candidates = this.registry.getAgentsByCapability(capability)
      .filter(agent => agent.status === 'idle' || agent.status === 'busy');

    if (candidates.length === 0) {
      return undefined;
    }

    // Load balancing: select agent with fewest active tasks
    let selectedAgent: IAgent | undefined;
    let minTasks = Infinity;

    for (const agent of candidates) {
      const activeCount = this.activeTaskCount.get(agent.id) || 0;
      if (activeCount < minTasks) {
        minTasks = activeCount;
        selectedAgent = agent;
      }
    }

    return selectedAgent;
  }

  /**
   * Execute a task with an agent
   */
  private async executeTask(agent: IAgent, task: AgentTask): Promise<void> {
    // Update active task count
    const currentCount = this.activeTaskCount.get(agent.id) || 0;
    this.activeTaskCount.set(agent.id, currentCount + 1);

    // Mark task as in progress
    this.taskQueue.markInProgress(task.id, agent.id, this.config.taskTimeout);

    try {
      // Execute the task
      const result = await agent.execute(task);
      
      // Mark task as completed
      this.taskQueue.markCompleted(task.id);
      
      // Handle result (could emit event or store result)
      this.handleResult(result);
    } catch (error: any) {
      // Mark task as failed
      this.taskQueue.markFailed(task.id, true);
      
      // Handle error with graceful degradation
      await this.handleAgentError(task, agent, error);
    } finally {
      // Update active task count
      const count = this.activeTaskCount.get(agent.id) || 0;
      this.activeTaskCount.set(agent.id, Math.max(0, count - 1));
    }
  }

  /**
   * Get capability string for a task type
   */
  private getCapabilityForTaskType(taskType: TaskType): string {
    const capabilityMap: Record<TaskType, string> = {
      'query_calendar': 'calendar_query',
      'parse_events': 'event_parsing',
      'classify_event': 'event_classification',
      'fetch_weather': 'weather_data'
    };
    return capabilityMap[taskType];
  }

  /**
   * Handle task result
   */
  private handleResult(result: AgentResult): void {
    // This could emit an event or store the result
    // For now, just log it
    console.log(`Task ${result.taskId} completed by agent ${result.agentId} with status ${result.status}`);
  }

  /**
   * Handle agent error with graceful degradation
   */
  private async handleAgentError(task: AgentTask, agent: IAgent, error: any): Promise<void> {
    const context = {
      taskId: task.id,
      agentId: agent.id,
      taskType: task.type,
      sourceId: task.sourceId,
      operation: 'agent_execution'
    };

    // Log error to CloudWatch
    await errorHandler.handleAgentFailure(agent.id, task.id, error, context);

    // Cache the error for monitoring
    cacheManager.set(`agent_error:${agent.id}:${task.id}`, {
      error: error.message,
      timestamp: new Date(),
      taskType: task.type
    }, 3600000); // Cache for 1 hour

    // Mark agent as potentially unhealthy
    if (agent.status !== 'failed') {
      agent.status = 'failed';
      console.warn(`Agent ${agent.id} marked as failed after error: ${error.message}`);
    }
  }

  /**
   * Handle task error (legacy method for compatibility)
   */
  private handleError(task: AgentTask, error: any): void {
    console.error(`Task ${task.id} failed:`, error);
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): string | undefined {
    return this.taskQueue.getTaskStatus(taskId);
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): IAgent | undefined {
    return this.registry.getAgent(agentId);
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): IAgent[] {
    return this.registry.getAllAgents();
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    pending: number;
    inProgress: number;
    totalAgents: number;
    activeAgents: number;
  } {
    return {
      pending: this.taskQueue.getPendingCount(),
      inProgress: this.taskQueue.getInProgressCount(),
      totalAgents: this.registry.getAgentCount(),
      activeAgents: Array.from(this.activeTaskCount.values()).filter(count => count > 0).length
    };
  }

  /**
   * Shutdown the orchestrator
   */
  shutdown(): void {
    this.stopProcessing();
    this.taskQueue.clear();
    this.registry.clear();
    this.activeTaskCount.clear();
  }
}
