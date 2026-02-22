/**
 * Agent Registry Service
 * Manages agent definitions and metadata
 * Validates: Requirements 10.1 through 10.10
 */

import { DynamoDBClient, GetItemCommand, PutItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand as DocScanCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDBClient } from './aws-clients';
import { StructuredLogger } from './logger';
import {
  AgentDefinition,
  getAllAgentDefinitions,
  getAgentDefinitionById,
  validateAgentDefinition,
} from './agent-definitions';

const logger = new StructuredLogger();

/**
 * Initialize agent registry with default agents
 */
export async function initializeAgentRegistry(): Promise<void> {
  try {
    const agents = getAllAgentDefinitions();

    for (const agent of agents) {
      await registerAgent(agent);
    }

    logger.info(`Initialized agent registry with ${agents.length} agents`);
  } catch (error) {
    logger.error('Failed to initialize agent registry', error as Error);
    throw error;
  }
}

/**
 * Register an agent in the registry
 */
export async function registerAgent(agent: AgentDefinition): Promise<void> {
  try {
    // Validate agent definition
    const validation = validateAgentDefinition(agent);
    if (!validation.valid) {
      throw new Error(`Invalid agent definition: ${validation.errors.join(', ')}`);
    }

    const client = getDynamoDBClient();
    const tableName = process.env.AGENT_CONFIGURATIONS_TABLE || 'agent-configurations';

    const command = new PutCommand({
      TableName: tableName,
      Item: {
        agentId: agent.agentId,
        agentType: agent.agentType,
        agentName: agent.agentName,
        description: agent.description,
        foundationModel: agent.foundationModel,
        tools: agent.tools,
        parameters: agent.parameters,
        enabled: agent.enabled,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    });

    await client.send(command);
    logger.info(`Registered agent: ${agent.agentId}`, {
      agentType: agent.agentType,
    });
  } catch (error) {
    logger.error('Failed to register agent', error as Error, {
      agentId: agent.agentId,
    });
    throw error;
  }
}

/**
 * Get agent from registry by ID
 */
export async function getRegisteredAgent(agentId: string): Promise<AgentDefinition | null> {
  try {
    const client = getDynamoDBClient();
    const tableName = process.env.AGENT_CONFIGURATIONS_TABLE || 'agent-configurations';

    const command = new GetCommand({
      TableName: tableName,
      Key: {
        agentId,
      },
    });

    const response = await client.send(command);

    if (!response.Item) {
      logger.warn(`Agent not found in registry: ${agentId}`);
      return null;
    }

    return response.Item as AgentDefinition;
  } catch (error) {
    logger.error('Failed to get agent from registry', error as Error, {
      agentId,
    });
    throw error;
  }
}

/**
 * Get all registered agents
 */
export async function getAllRegisteredAgents(): Promise<AgentDefinition[]> {
  try {
    const client = getDynamoDBClient();
    const tableName = process.env.AGENT_CONFIGURATIONS_TABLE || 'agent-configurations';

    const command = new DocScanCommand({
      TableName: tableName,
    });

    const response = await client.send(command);

    if (!response.Items) {
      return [];
    }

    return response.Items as AgentDefinition[];
  } catch (error) {
    logger.error('Failed to get all agents from registry', error as Error);
    throw error;
  }
}

/**
 * Get enabled agents
 */
export async function getEnabledAgents(): Promise<AgentDefinition[]> {
  try {
    const agents = await getAllRegisteredAgents();
    return agents.filter((agent) => agent.enabled);
  } catch (error) {
    logger.error('Failed to get enabled agents', error as Error);
    throw error;
  }
}

/**
 * Update agent in registry
 */
export async function updateAgent(agent: AgentDefinition): Promise<void> {
  try {
    // Validate agent definition
    const validation = validateAgentDefinition(agent);
    if (!validation.valid) {
      throw new Error(`Invalid agent definition: ${validation.errors.join(', ')}`);
    }

    const client = getDynamoDBClient();
    const tableName = process.env.AGENT_CONFIGURATIONS_TABLE || 'agent-configurations';

    const command = new PutCommand({
      TableName: tableName,
      Item: {
        agentId: agent.agentId,
        agentType: agent.agentType,
        agentName: agent.agentName,
        description: agent.description,
        foundationModel: agent.foundationModel,
        tools: agent.tools,
        parameters: agent.parameters,
        enabled: agent.enabled,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    });

    await client.send(command);
    logger.info(`Updated agent: ${agent.agentId}`, {
      agentType: agent.agentType,
    });
  } catch (error) {
    logger.error('Failed to update agent', error as Error, {
      agentId: agent.agentId,
    });
    throw error;
  }
}

/**
 * Enable agent
 */
export async function enableAgent(agentId: string): Promise<void> {
  try {
    const agent = await getRegisteredAgent(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    agent.enabled = true;
    await updateAgent(agent);
    logger.info(`Enabled agent: ${agentId}`);
  } catch (error) {
    logger.error('Failed to enable agent', error as Error, {
      agentId,
    });
    throw error;
  }
}

/**
 * Disable agent
 */
export async function disableAgent(agentId: string): Promise<void> {
  try {
    const agent = await getRegisteredAgent(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    agent.enabled = false;
    await updateAgent(agent);
    logger.info(`Disabled agent: ${agentId}`);
  } catch (error) {
    logger.error('Failed to disable agent', error as Error, {
      agentId,
    });
    throw error;
  }
}

/**
 * Get agent by type
 */
export async function getAgentByType(agentType: string): Promise<AgentDefinition | null> {
  try {
    const agents = await getAllRegisteredAgents();
    const agent = agents.find((a) => a.agentType === agentType);
    return agent || null;
  } catch (error) {
    logger.error('Failed to get agent by type', error as Error, {
      agentType,
    });
    throw error;
  }
}
