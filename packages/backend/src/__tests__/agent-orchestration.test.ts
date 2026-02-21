/**
 * Property-based tests for agent orchestration
 * Property 47: Agent Task Assignment
 * Property 48: Agent Result Aggregation
 * Validates: Requirements 1.5, 1.7
 */

import * as fc from 'fast-check';
import { 
  AgentOrchestrator, 
  AgentRegistry,
  TaskQueue,
  ResultAggregator,
  IAgent, 
  AgentTask, 
  AgentResult,
  AgentType,
  AgentStatus,
  TaskType,
  TaskPriority,
  ResultStatus
} from '../agents';

// Mock agent implementation for testing
class MockAgent implements IAgent {
  id: string;
  type: AgentType;
  capabilities: string[];
  status: AgentStatus;
  private shouldFail: boolean;
  private executionDelay: number;

  constructor(
    id: string, 
    type: AgentType, 
    capabilities: string[], 
    shouldFail: boolean = false,
    executionDelay: number = 10
  ) {
    this.id = id;
    this.type = type;
    this.capabilities = capabilities;
    this.status = 'idle';
    this.shouldFail = shouldFail;
    this.executionDelay = executionDelay;
  }

  async execute(task: AgentTask): Promise<AgentResult> {
    this.status = 'busy';
    
    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, this.executionDelay));

    this.status = 'idle';

    if (this.shouldFail) {
      return {
        taskId: task.id,
        agentId: this.id,
        status: 'failed',
        data: null,
        errors: ['Mock agent failure'],
        executionTime: this.executionDelay,
        completedAt: new Date()
      };
    }

    return {
      taskId: task.id,
      agentId: this.id,
      status: 'success',
      data: { processed: true, taskType: task.type },
      executionTime: this.executionDelay,
      completedAt: new Date()
    };
  }

  async healthCheck(): Promise<boolean> {
    return !this.shouldFail;
  }
}

describe('Property 47: Agent Task Assignment', () => {
  it('should assign tasks to agents with matching capabilities', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            type: fc.constantFrom<AgentType>('calendar_query', 'event_parser', 'event_classifier'),
            capability: fc.string({ minLength: 1, maxLength: 20 })
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (agentConfigs) => {
          const registry = new AgentRegistry();
          
          // Register agents
          const agents = agentConfigs.map(config => 
            new MockAgent(config.id, config.type, [config.capability])
          );
          
          agents.forEach(agent => registry.register(agent));
          
          // Verify all agents are registered
          expect(registry.getAgentCount()).toBe(agents.length);
          
          // Verify agents can be retrieved by capability
          for (const agent of agents) {
            const foundAgents = registry.getAgentsByCapability(agent.capabilities[0]);
            expect(foundAgents.some(a => a.id === agent.id)).toBe(true);
          }
          
          // Verify agents can be retrieved by type
          for (const agent of agents) {
            const foundAgents = registry.getAgentsByType(agent.type);
            expect(foundAgents.some(a => a.id === agent.id)).toBe(true);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should handle agent registration and unregistration correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            type: fc.constantFrom<AgentType>('calendar_query', 'event_parser', 'event_classifier')
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (agentConfigs) => {
          // Ensure unique agent IDs
          const uniqueConfigs = Array.from(
            new Map(agentConfigs.map(config => [config.id, config])).values()
          );
          
          fc.pre(uniqueConfigs.length >= 2); // Need at least 2 unique agents
          
          const registry = new AgentRegistry();
          
          // Register all agents
          const agents = uniqueConfigs.map(config => 
            new MockAgent(config.id, config.type, ['test_capability'])
          );
          
          agents.forEach(agent => registry.register(agent));
          const initialCount = registry.getAgentCount();
          
          // Unregister first agent
          const firstAgent = agents[0];
          const unregistered = registry.unregister(firstAgent.id);
          
          expect(unregistered).toBe(true);
          expect(registry.getAgentCount()).toBe(initialCount - 1);
          expect(registry.hasAgent(firstAgent.id)).toBe(false);
          
          // Verify other agents still registered
          for (let i = 1; i < agents.length; i++) {
            expect(registry.hasAgent(agents[i].id)).toBe(true);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should queue tasks with correct priority ordering', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            priority: fc.constantFrom<TaskPriority>('high', 'medium', 'low'),
            type: fc.constantFrom<TaskType>('query_calendar', 'parse_events', 'classify_event')
          }),
          { minLength: 3, maxLength: 10 }
        ),
        async (taskConfigs) => {
          const queue = new TaskQueue();
          
          // Enqueue all tasks
          const tasks: AgentTask[] = taskConfigs.map(config => ({
            id: config.id,
            type: config.type,
            priority: config.priority,
            payload: {},
            createdAt: new Date(),
            retryCount: 0,
            maxRetries: 3
          }));
          
          tasks.forEach(task => queue.enqueue(task));
          
          expect(queue.size()).toBe(tasks.length);
          
          // Dequeue tasks and verify high priority comes first
          const dequeuedTasks: AgentTask[] = [];
          let task = queue.dequeue();
          while (task) {
            dequeuedTasks.push(task);
            task = queue.dequeue();
          }
          
          // Verify all tasks were dequeued
          expect(dequeuedTasks.length).toBe(tasks.length);
          
          // Verify priority ordering (high before medium before low)
          const highPriorityTasks = dequeuedTasks.filter(t => t.priority === 'high');
          const mediumPriorityTasks = dequeuedTasks.filter(t => t.priority === 'medium');
          const lowPriorityTasks = dequeuedTasks.filter(t => t.priority === 'low');
          
          const lastHighIndex = dequeuedTasks.lastIndexOf(highPriorityTasks[highPriorityTasks.length - 1]);
          const firstMediumIndex = dequeuedTasks.indexOf(mediumPriorityTasks[0]);
          const lastMediumIndex = dequeuedTasks.lastIndexOf(mediumPriorityTasks[mediumPriorityTasks.length - 1]);
          const firstLowIndex = dequeuedTasks.indexOf(lowPriorityTasks[0]);
          
          if (highPriorityTasks.length > 0 && mediumPriorityTasks.length > 0) {
            expect(lastHighIndex).toBeLessThan(firstMediumIndex);
          }
          
          if (mediumPriorityTasks.length > 0 && lowPriorityTasks.length > 0) {
            expect(lastMediumIndex).toBeLessThan(firstLowIndex);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should handle task retry logic correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (maxRetries) => {
          const queue = new TaskQueue();
          
          const task: AgentTask = {
            id: 'test-task',
            type: 'query_calendar',
            priority: 'high',
            payload: {},
            createdAt: new Date(),
            retryCount: 0,
            maxRetries
          };
          
          queue.enqueue(task);
          const dequeuedTask = queue.dequeue();
          expect(dequeuedTask).toBeDefined();
          
          if (dequeuedTask) {
            queue.markInProgress(dequeuedTask.id, 'agent-1');
            
            // Fail the task multiple times
            for (let i = 0; i < maxRetries; i++) {
              queue.markFailed(dequeuedTask.id, true);
              expect(dequeuedTask.retryCount).toBe(i + 1);
              
              // Task should be re-queued
              const retriedTask = queue.dequeue();
              expect(retriedTask).toBeDefined();
              expect(retriedTask?.id).toBe(dequeuedTask.id);
              
              if (retriedTask) {
                queue.markInProgress(retriedTask.id, 'agent-1');
              }
            }
            
            // Final failure should not retry
            queue.markFailed(dequeuedTask.id, true);
            expect(queue.getTaskStatus(dequeuedTask.id)).toBe('failed');
            
            // No more tasks in queue
            expect(queue.dequeue()).toBeUndefined();
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});

describe('Property 48: Agent Result Aggregation', () => {
  it('should aggregate results from multiple agents correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            taskId: fc.string({ minLength: 1, maxLength: 10 }),
            agentId: fc.string({ minLength: 1, maxLength: 10 }),
            status: fc.constantFrom<ResultStatus>('success', 'partial_success', 'failed'),
            data: fc.anything(),
            executionTime: fc.integer({ min: 10, max: 1000 })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (resultConfigs) => {
          const aggregator = new ResultAggregator();
          
          // Add all results
          const results: AgentResult[] = resultConfigs.map(config => ({
            taskId: config.taskId,
            agentId: config.agentId,
            status: config.status,
            data: config.data,
            errors: config.status === 'failed' ? ['Test error'] : undefined,
            executionTime: config.executionTime,
            completedAt: new Date()
          }));
          
          results.forEach(result => aggregator.addResult(result));
          
          // Aggregate results
          const aggregated = aggregator.aggregate();
          
          // Verify counts
          expect(aggregated.results.length).toBe(results.length);
          expect(aggregated.successCount).toBe(results.filter(r => r.status === 'success').length);
          expect(aggregated.partialSuccessCount).toBe(results.filter(r => r.status === 'partial_success').length);
          expect(aggregated.failureCount).toBe(results.filter(r => r.status === 'failed').length);
          
          // Verify overall status
          const allSuccess = results.every(r => r.status === 'success');
          const allFailed = results.every(r => r.status === 'failed');
          
          if (allSuccess) {
            expect(aggregated.overallStatus).toBe('success');
          } else if (allFailed) {
            expect(aggregated.overallStatus).toBe('failed');
          } else {
            expect(aggregated.overallStatus).toBe('partial_success');
          }
          
          // Verify total execution time
          const expectedTotalTime = results.reduce((sum, r) => sum + r.executionTime, 0);
          expect(aggregated.totalExecutionTime).toBe(expectedTotalTime);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should handle empty result set correctly', async () => {
    const aggregator = new ResultAggregator();
    const aggregated = aggregator.aggregate();
    
    expect(aggregated.results.length).toBe(0);
    expect(aggregated.overallStatus).toBe('failed');
    expect(aggregated.successCount).toBe(0);
    expect(aggregated.failureCount).toBe(0);
    expect(aggregated.errors.length).toBeGreaterThan(0);
  });

  it('should aggregate array data correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.array(fc.integer(), { minLength: 1, maxLength: 5 }),
          { minLength: 2, maxLength: 5 }
        ),
        async (dataArrays) => {
          const aggregator = new ResultAggregator();
          
          // Create results with array data
          const results: AgentResult[] = dataArrays.map((data, index) => ({
            taskId: `task-${index}`,
            agentId: `agent-${index}`,
            status: 'success' as ResultStatus,
            data,
            executionTime: 100,
            completedAt: new Date()
          }));
          
          results.forEach(result => aggregator.addResult(result));
          
          const aggregated = aggregator.aggregate();
          
          // Verify aggregated data is concatenation of all arrays
          expect(Array.isArray(aggregated.aggregatedData)).toBe(true);
          expect(aggregated.aggregatedData.length).toBe(
            dataArrays.reduce((sum, arr) => sum + arr.length, 0)
          );
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should filter results by status correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            taskId: fc.string({ minLength: 1, maxLength: 10 }),
            status: fc.constantFrom<ResultStatus>('success', 'partial_success', 'failed')
          }),
          { minLength: 3, maxLength: 10 }
        ),
        async (resultConfigs) => {
          const aggregator = new ResultAggregator();
          
          const results: AgentResult[] = resultConfigs.map(config => ({
            taskId: config.taskId,
            agentId: 'agent-1',
            status: config.status,
            data: {},
            executionTime: 100,
            completedAt: new Date()
          }));
          
          results.forEach(result => aggregator.addResult(result));
          
          // Test filtering by each status
          const successResults = aggregator.getResultsByStatus('success');
          const partialResults = aggregator.getResultsByStatus('partial_success');
          const failedResults = aggregator.getResultsByStatus('failed');
          
          expect(successResults.length).toBe(results.filter(r => r.status === 'success').length);
          expect(partialResults.length).toBe(results.filter(r => r.status === 'partial_success').length);
          expect(failedResults.length).toBe(results.filter(r => r.status === 'failed').length);
          
          // Verify all results are accounted for
          expect(successResults.length + partialResults.length + failedResults.length).toBe(results.length);
        }
      ),
      { numRuns: 20 }
    );
  });
});
