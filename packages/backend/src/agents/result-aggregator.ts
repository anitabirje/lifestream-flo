/**
 * Result Aggregator
 * Collects and normalizes results from multiple agents
 * Handles partial successes and failures
 */

import { AgentResult, ResultStatus } from './types';

export interface AggregatedResult {
  taskIds: string[];
  overallStatus: ResultStatus;
  successCount: number;
  partialSuccessCount: number;
  failureCount: number;
  results: AgentResult[];
  aggregatedData: any;
  errors: string[];
  totalExecutionTime: number;
  completedAt: Date;
}

export class ResultAggregator {
  private results: Map<string, AgentResult>;

  constructor() {
    this.results = new Map();
  }

  /**
   * Add a result to the aggregator
   */
  addResult(result: AgentResult): void {
    this.results.set(result.taskId, result);
  }

  /**
   * Add multiple results
   */
  addResults(results: AgentResult[]): void {
    for (const result of results) {
      this.addResult(result);
    }
  }

  /**
   * Get a result by task ID
   */
  getResult(taskId: string): AgentResult | undefined {
    return this.results.get(taskId);
  }

  /**
   * Get all results
   */
  getAllResults(): AgentResult[] {
    return Array.from(this.results.values());
  }

  /**
   * Aggregate results and compute overall status
   */
  aggregate(): AggregatedResult {
    const results = this.getAllResults();
    
    if (results.length === 0) {
      return {
        taskIds: [],
        overallStatus: 'failed',
        successCount: 0,
        partialSuccessCount: 0,
        failureCount: 0,
        results: [],
        aggregatedData: null,
        errors: ['No results to aggregate'],
        totalExecutionTime: 0,
        completedAt: new Date()
      };
    }

    // Count statuses
    let successCount = 0;
    let partialSuccessCount = 0;
    let failureCount = 0;
    const allErrors: string[] = [];
    let totalExecutionTime = 0;

    for (const result of results) {
      if (result.status === 'success') {
        successCount++;
      } else if (result.status === 'partial_success') {
        partialSuccessCount++;
      } else {
        failureCount++;
      }

      if (result.errors) {
        allErrors.push(...result.errors);
      }

      totalExecutionTime += result.executionTime;
    }

    // Determine overall status
    let overallStatus: ResultStatus;
    if (failureCount === results.length) {
      overallStatus = 'failed';
    } else if (successCount === results.length) {
      overallStatus = 'success';
    } else {
      overallStatus = 'partial_success';
    }

    // Aggregate data from all results
    const aggregatedData = this.aggregateData(results);

    return {
      taskIds: results.map(r => r.taskId),
      overallStatus,
      successCount,
      partialSuccessCount,
      failureCount,
      results,
      aggregatedData,
      errors: allErrors,
      totalExecutionTime,
      completedAt: new Date()
    };
  }

  /**
   * Aggregate data from multiple results
   * This is a generic implementation that can be overridden for specific use cases
   */
  private aggregateData(results: AgentResult[]): any {
    // If all results have array data, concatenate them
    const allArrays = results.every(r => Array.isArray(r.data));
    if (allArrays) {
      return results.flatMap(r => r.data);
    }

    // If all results have object data, merge them
    const allObjects = results.every(r => typeof r.data === 'object' && r.data !== null && !Array.isArray(r.data));
    if (allObjects) {
      return results.reduce((acc, r) => ({ ...acc, ...r.data }), {});
    }

    // Otherwise, return array of all data
    return results.map(r => r.data);
  }

  /**
   * Get results by status
   */
  getResultsByStatus(status: ResultStatus): AgentResult[] {
    return this.getAllResults().filter(r => r.status === status);
  }

  /**
   * Get results by agent ID
   */
  getResultsByAgent(agentId: string): AgentResult[] {
    return this.getAllResults().filter(r => r.agentId === agentId);
  }

  /**
   * Check if all results are successful
   */
  allSuccessful(): boolean {
    const results = this.getAllResults();
    return results.length > 0 && results.every(r => r.status === 'success');
  }

  /**
   * Check if any results failed
   */
  anyFailed(): boolean {
    return this.getAllResults().some(r => r.status === 'failed');
  }

  /**
   * Get count of results
   */
  getResultCount(): number {
    return this.results.size;
  }

  /**
   * Clear all results
   */
  clear(): void {
    this.results.clear();
  }

  /**
   * Remove a result by task ID
   */
  removeResult(taskId: string): boolean {
    return this.results.delete(taskId);
  }
}
