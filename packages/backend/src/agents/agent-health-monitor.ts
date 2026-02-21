/**
 * Agent Health Monitor
 * Monitors agent performance and availability
 * Supports automatic agent recovery and restart
 */

import { IAgent, AgentStatus } from './types';

export interface HealthCheckResult {
  agentId: string;
  isHealthy: boolean;
  timestamp: Date;
  responseTime?: number;
  error?: string;
}

export interface AgentHealthStats {
  agentId: string;
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  averageResponseTime: number;
  lastCheckTime?: Date;
  lastHealthyTime?: Date;
  consecutiveFailures: number;
}

export class AgentHealthMonitor {
  private agents: Map<string, IAgent>;
  private healthStats: Map<string, AgentHealthStats>;
  private monitoringInterval?: NodeJS.Timeout;
  private checkIntervalMs: number;
  private maxConsecutiveFailures: number;
  private onAgentFailure?: (agentId: string) => void;
  private onAgentRecovery?: (agentId: string) => void;

  constructor(
    checkIntervalMs: number = 30000, // Default: 30 seconds
    maxConsecutiveFailures: number = 3
  ) {
    this.agents = new Map();
    this.healthStats = new Map();
    this.checkIntervalMs = checkIntervalMs;
    this.maxConsecutiveFailures = maxConsecutiveFailures;
  }

  /**
   * Register an agent for health monitoring
   */
  registerAgent(agent: IAgent): void {
    this.agents.set(agent.id, agent);
    
    if (!this.healthStats.has(agent.id)) {
      this.healthStats.set(agent.id, {
        agentId: agent.id,
        totalChecks: 0,
        successfulChecks: 0,
        failedChecks: 0,
        averageResponseTime: 0,
        consecutiveFailures: 0
      });
    }
  }

  /**
   * Unregister an agent from health monitoring
   */
  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
  }

  /**
   * Start monitoring all registered agents
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      return; // Already monitoring
    }

    this.monitoringInterval = setInterval(() => {
      this.checkAllAgents();
    }, this.checkIntervalMs);

    // Perform initial check
    this.checkAllAgents();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Check health of all registered agents
   */
  private async checkAllAgents(): Promise<void> {
    const checkPromises = Array.from(this.agents.values()).map(agent =>
      this.checkAgentHealth(agent)
    );

    await Promise.allSettled(checkPromises);
  }

  /**
   * Check health of a specific agent
   */
  async checkAgentHealth(agent: IAgent): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const stats = this.healthStats.get(agent.id);

    if (!stats) {
      throw new Error(`Agent ${agent.id} not registered for monitoring`);
    }

    try {
      const isHealthy = await agent.healthCheck();
      const responseTime = Date.now() - startTime;

      stats.totalChecks++;
      stats.lastCheckTime = new Date();

      if (isHealthy) {
        stats.successfulChecks++;
        stats.lastHealthyTime = new Date();
        stats.consecutiveFailures = 0;

        // Update average response time
        stats.averageResponseTime =
          (stats.averageResponseTime * (stats.successfulChecks - 1) + responseTime) /
          stats.successfulChecks;

        // Check if agent was previously failed and is now recovered
        if (agent.status === 'failed' || agent.status === 'offline') {
          agent.status = 'idle';
          if (this.onAgentRecovery) {
            this.onAgentRecovery(agent.id);
          }
        }

        return {
          agentId: agent.id,
          isHealthy: true,
          timestamp: new Date(),
          responseTime
        };
      } else {
        return this.handleUnhealthyAgent(agent, stats);
      }
    } catch (error) {
      return this.handleUnhealthyAgent(agent, stats, error);
    }
  }

  /**
   * Handle unhealthy agent
   */
  private handleUnhealthyAgent(
    agent: IAgent,
    stats: AgentHealthStats,
    error?: any
  ): HealthCheckResult {
    stats.totalChecks++;
    stats.failedChecks++;
    stats.consecutiveFailures++;
    stats.lastCheckTime = new Date();

    // Mark agent as failed if consecutive failures exceed threshold
    if (stats.consecutiveFailures >= this.maxConsecutiveFailures) {
      if (agent.status !== 'failed' && agent.status !== 'offline') {
        agent.status = 'failed';
        if (this.onAgentFailure) {
          this.onAgentFailure(agent.id);
        }
      }
    }

    return {
      agentId: agent.id,
      isHealthy: false,
      timestamp: new Date(),
      error: error ? String(error) : 'Health check failed'
    };
  }

  /**
   * Get health statistics for an agent
   */
  getAgentStats(agentId: string): AgentHealthStats | undefined {
    return this.healthStats.get(agentId);
  }

  /**
   * Get health statistics for all agents
   */
  getAllStats(): AgentHealthStats[] {
    return Array.from(this.healthStats.values());
  }

  /**
   * Get unhealthy agents
   */
  getUnhealthyAgents(): IAgent[] {
    return Array.from(this.agents.values()).filter(
      agent => agent.status === 'failed' || agent.status === 'offline'
    );
  }

  /**
   * Get healthy agents
   */
  getHealthyAgents(): IAgent[] {
    return Array.from(this.agents.values()).filter(
      agent => agent.status === 'idle' || agent.status === 'busy'
    );
  }

  /**
   * Set callback for agent failure
   */
  onFailure(callback: (agentId: string) => void): void {
    this.onAgentFailure = callback;
  }

  /**
   * Set callback for agent recovery
   */
  onRecovery(callback: (agentId: string) => void): void {
    this.onAgentRecovery = callback;
  }

  /**
   * Reset statistics for an agent
   */
  resetStats(agentId: string): void {
    const stats = this.healthStats.get(agentId);
    if (stats) {
      stats.totalChecks = 0;
      stats.successfulChecks = 0;
      stats.failedChecks = 0;
      stats.averageResponseTime = 0;
      stats.consecutiveFailures = 0;
      stats.lastCheckTime = undefined;
      stats.lastHealthyTime = undefined;
    }
  }

  /**
   * Clear all monitoring data
   */
  clear(): void {
    this.stopMonitoring();
    this.agents.clear();
    this.healthStats.clear();
  }
}
