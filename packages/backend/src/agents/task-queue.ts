/**
 * Task Queue
 * Priority-based task queue with scheduling, retry, and timeout support
 */

import { AgentTask, TaskPriority, TaskStatus } from './types';

interface QueuedTask {
  task: AgentTask;
  status: TaskStatus;
  assignedAt?: Date;
  scheduledFor?: Date;
  timeoutHandle?: NodeJS.Timeout;
}

export class TaskQueue {
  private tasks: Map<string, QueuedTask>;
  private priorityQueues: Map<TaskPriority, string[]>;
  private readonly priorityOrder: TaskPriority[] = ['high', 'medium', 'low'];

  constructor() {
    this.tasks = new Map();
    this.priorityQueues = new Map([
      ['high', []],
      ['medium', []],
      ['low', []]
    ]);
  }

  /**
   * Add a task to the queue
   */
  enqueue(task: AgentTask, scheduledFor?: Date): void {
    if (this.tasks.has(task.id)) {
      throw new Error(`Task with id ${task.id} already exists in queue`);
    }

    const queuedTask: QueuedTask = {
      task,
      status: 'pending',
      scheduledFor
    };

    this.tasks.set(task.id, queuedTask);
    
    // Add to priority queue if not scheduled for future
    if (!scheduledFor || scheduledFor <= new Date()) {
      this.priorityQueues.get(task.priority)!.push(task.id);
    }
  }

  /**
   * Get the next task from the queue based on priority
   */
  dequeue(): AgentTask | undefined {
    const now = new Date();

    // Check scheduled tasks first
    for (const [taskId, queuedTask] of this.tasks.entries()) {
      if (queuedTask.scheduledFor && queuedTask.scheduledFor <= now && queuedTask.status === 'pending') {
        // Move scheduled task to priority queue
        this.priorityQueues.get(queuedTask.task.priority)!.push(taskId);
        queuedTask.scheduledFor = undefined;
      }
    }

    // Dequeue by priority
    for (const priority of this.priorityOrder) {
      const queue = this.priorityQueues.get(priority)!;
      while (queue.length > 0) {
        const taskId = queue.shift()!;
        const queuedTask = this.tasks.get(taskId);
        
        if (queuedTask && queuedTask.status === 'pending') {
          queuedTask.status = 'assigned';
          queuedTask.assignedAt = new Date();
          return queuedTask.task;
        }
      }
    }

    return undefined;
  }

  /**
   * Mark a task as in progress
   */
  markInProgress(taskId: string, agentId: string, timeout?: number): void {
    const queuedTask = this.tasks.get(taskId);
    if (!queuedTask) {
      throw new Error(`Task ${taskId} not found in queue`);
    }

    queuedTask.status = 'in_progress';
    queuedTask.task.assignedTo = agentId;

    // Set timeout if specified
    if (timeout) {
      queuedTask.timeoutHandle = setTimeout(() => {
        this.handleTimeout(taskId);
      }, timeout);
    }
  }

  /**
   * Mark a task as completed
   */
  markCompleted(taskId: string): void {
    const queuedTask = this.tasks.get(taskId);
    if (!queuedTask) {
      throw new Error(`Task ${taskId} not found in queue`);
    }

    queuedTask.status = 'completed';
    
    // Clear timeout if set
    if (queuedTask.timeoutHandle) {
      clearTimeout(queuedTask.timeoutHandle);
      queuedTask.timeoutHandle = undefined;
    }
  }

  /**
   * Mark a task as failed and optionally retry
   */
  markFailed(taskId: string, retry: boolean = true): void {
    const queuedTask = this.tasks.get(taskId);
    if (!queuedTask) {
      throw new Error(`Task ${taskId} not found in queue`);
    }

    // Clear timeout if set
    if (queuedTask.timeoutHandle) {
      clearTimeout(queuedTask.timeoutHandle);
      queuedTask.timeoutHandle = undefined;
    }

    if (retry && queuedTask.task.retryCount < queuedTask.task.maxRetries) {
      // Retry the task
      queuedTask.task.retryCount++;
      queuedTask.status = 'pending';
      queuedTask.task.assignedTo = undefined;
      queuedTask.assignedAt = undefined;
      
      // Re-add to priority queue
      this.priorityQueues.get(queuedTask.task.priority)!.push(taskId);
    } else {
      queuedTask.status = 'failed';
    }
  }

  /**
   * Handle task timeout
   */
  private handleTimeout(taskId: string): void {
    const queuedTask = this.tasks.get(taskId);
    if (queuedTask && queuedTask.status === 'in_progress') {
      this.markFailed(taskId, true);
    }
  }

  /**
   * Get a task by ID
   */
  getTask(taskId: string): AgentTask | undefined {
    return this.tasks.get(taskId)?.task;
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): TaskStatus | undefined {
    return this.tasks.get(taskId)?.status;
  }

  /**
   * Get all tasks with a specific status
   */
  getTasksByStatus(status: TaskStatus): AgentTask[] {
    return Array.from(this.tasks.values())
      .filter(qt => qt.status === status)
      .map(qt => qt.task);
  }

  /**
   * Get pending task count
   */
  getPendingCount(): number {
    return this.getTasksByStatus('pending').length;
  }

  /**
   * Get in-progress task count
   */
  getInProgressCount(): number {
    return this.getTasksByStatus('in_progress').length;
  }

  /**
   * Remove a task from the queue
   */
  remove(taskId: string): boolean {
    const queuedTask = this.tasks.get(taskId);
    if (!queuedTask) {
      return false;
    }

    // Clear timeout if set
    if (queuedTask.timeoutHandle) {
      clearTimeout(queuedTask.timeoutHandle);
    }

    // Remove from priority queue
    const queue = this.priorityQueues.get(queuedTask.task.priority)!;
    const index = queue.indexOf(taskId);
    if (index !== -1) {
      queue.splice(index, 1);
    }

    this.tasks.delete(taskId);
    return true;
  }

  /**
   * Clear all tasks
   */
  clear(): void {
    // Clear all timeouts
    for (const queuedTask of this.tasks.values()) {
      if (queuedTask.timeoutHandle) {
        clearTimeout(queuedTask.timeoutHandle);
      }
    }

    this.tasks.clear();
    for (const queue of this.priorityQueues.values()) {
      queue.length = 0;
    }
  }

  /**
   * Get total task count
   */
  size(): number {
    return this.tasks.size;
  }
}
