/**
 * Agent Registry
 * Tracks available agents and their capabilities
 * Supports dynamic registration and unregistration
 */

import { IAgent, AgentType, AgentStatus } from './types';

export class AgentRegistry {
  private agents: Map<string, IAgent>;
  private agentsByType: Map<AgentType, Set<string>>;
  private agentsByCapability: Map<string, Set<string>>;

  constructor() {
    this.agents = new Map();
    this.agentsByType = new Map();
    this.agentsByCapability = new Map();
  }

  /**
   * Register a new agent
   */
  register(agent: IAgent): void {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent with id ${agent.id} is already registered`);
    }

    this.agents.set(agent.id, agent);

    // Index by type
    if (!this.agentsByType.has(agent.type)) {
      this.agentsByType.set(agent.type, new Set());
    }
    this.agentsByType.get(agent.type)!.add(agent.id);

    // Index by capabilities
    for (const capability of agent.capabilities) {
      if (!this.agentsByCapability.has(capability)) {
        this.agentsByCapability.set(capability, new Set());
      }
      this.agentsByCapability.get(capability)!.add(agent.id);
    }
  }

  /**
   * Unregister an agent
   */
  unregister(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    // Remove from type index
    const typeSet = this.agentsByType.get(agent.type);
    if (typeSet) {
      typeSet.delete(agentId);
      if (typeSet.size === 0) {
        this.agentsByType.delete(agent.type);
      }
    }

    // Remove from capability indexes
    for (const capability of agent.capabilities) {
      const capSet = this.agentsByCapability.get(capability);
      if (capSet) {
        capSet.delete(agentId);
        if (capSet.size === 0) {
          this.agentsByCapability.delete(capability);
        }
      }
    }

    this.agents.delete(agentId);
    return true;
  }

  /**
   * Get an agent by ID
   */
  getAgent(agentId: string): IAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all agents of a specific type
   */
  getAgentsByType(type: AgentType): IAgent[] {
    const agentIds = this.agentsByType.get(type);
    if (!agentIds) {
      return [];
    }
    return Array.from(agentIds)
      .map(id => this.agents.get(id))
      .filter((agent): agent is IAgent => agent !== undefined);
  }

  /**
   * Get all agents with a specific capability
   */
  getAgentsByCapability(capability: string): IAgent[] {
    const agentIds = this.agentsByCapability.get(capability);
    if (!agentIds) {
      return [];
    }
    return Array.from(agentIds)
      .map(id => this.agents.get(id))
      .filter((agent): agent is IAgent => agent !== undefined);
  }

  /**
   * Get all agents with a specific status
   */
  getAgentsByStatus(status: AgentStatus): IAgent[] {
    return Array.from(this.agents.values()).filter(agent => agent.status === status);
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): IAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Check if an agent is registered
   */
  hasAgent(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  /**
   * Get the count of registered agents
   */
  getAgentCount(): number {
    return this.agents.size;
  }

  /**
   * Clear all registered agents
   */
  clear(): void {
    this.agents.clear();
    this.agentsByType.clear();
    this.agentsByCapability.clear();
  }
}
