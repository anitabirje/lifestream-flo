/**
 * Configuration update handler
 * Validates: Requirements 12.2, 12.3, 12.4
 */

import { AgentConfiguration } from './types';
import { getDynamoDBClient } from './aws-clients';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { createLogger } from './logger';
import { validateModelParameters } from './config-validator';
import { getConfigurationLoader } from './config-loader';

/**
 * Update handler for agent configurations
 */
export class ConfigurationUpdater {
  private logger = createLogger();

  /**
   * Update model selection for an agent
   */
  async updateModel(agentId: string, model: string): Promise<void> {
    this.logger.info('Updating agent model', { agentId, model });

    try {
      const dynamodb = getDynamoDBClient();
      const tableName = process.env.AGENT_CONFIG_TABLE || 'agent-configurations';

      await dynamodb.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { agentId },
          UpdateExpression: 'SET foundationModel = :model, updatedAt = :timestamp',
          ExpressionAttributeValues: {
            ':model': model,
            ':timestamp': Date.now(),
          },
        })
      );

      // Clear cache to force reload
      getConfigurationLoader().clearCache(agentId);

      this.logger.info('Agent model updated successfully', { agentId, model });
    } catch (error) {
      this.logger.error('Failed to update agent model', error as Error, {
        agentId,
      });
      throw error;
    }
  }

  /**
   * Update temperature for an agent
   */
  async updateTemperature(agentId: string, temperature: number): Promise<void> {
    const validation = validateModelParameters({ temperature });
    if (!validation.valid) {
      throw new Error(`Invalid temperature: ${validation.errors.join(', ')}`);
    }

    this.logger.info('Updating agent temperature', { agentId, temperature });

    try {
      const dynamodb = getDynamoDBClient();
      const tableName = process.env.AGENT_CONFIG_TABLE || 'agent-configurations';

      await dynamodb.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { agentId },
          UpdateExpression: 'SET #params.#temp = :temp, updatedAt = :timestamp',
          ExpressionAttributeNames: {
            '#params': 'parameters',
            '#temp': 'temperature',
          },
          ExpressionAttributeValues: {
            ':temp': temperature,
            ':timestamp': Date.now(),
          },
        })
      );

      // Clear cache to force reload
      getConfigurationLoader().clearCache(agentId);

      this.logger.info('Agent temperature updated successfully', {
        agentId,
        temperature,
      });
    } catch (error) {
      this.logger.error('Failed to update agent temperature', error as Error, {
        agentId,
      });
      throw error;
    }
  }

  /**
   * Update max tokens for an agent
   */
  async updateMaxTokens(agentId: string, maxTokens: number): Promise<void> {
    const validation = validateModelParameters({ maxTokens });
    if (!validation.valid) {
      throw new Error(`Invalid maxTokens: ${validation.errors.join(', ')}`);
    }

    this.logger.info('Updating agent maxTokens', { agentId, maxTokens });

    try {
      const dynamodb = getDynamoDBClient();
      const tableName = process.env.AGENT_CONFIG_TABLE || 'agent-configurations';

      await dynamodb.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { agentId },
          UpdateExpression: 'SET #params.#tokens = :tokens, updatedAt = :timestamp',
          ExpressionAttributeNames: {
            '#params': 'parameters',
            '#tokens': 'maxTokens',
          },
          ExpressionAttributeValues: {
            ':tokens': maxTokens,
            ':timestamp': Date.now(),
          },
        })
      );

      // Clear cache to force reload
      getConfigurationLoader().clearCache(agentId);

      this.logger.info('Agent maxTokens updated successfully', {
        agentId,
        maxTokens,
      });
    } catch (error) {
      this.logger.error('Failed to update agent maxTokens', error as Error, {
        agentId,
      });
      throw error;
    }
  }

  /**
   * Update tool configurations for an agent
   */
  async updateTools(
    agentId: string,
    tools: Array<{
      toolName: string;
      description: string;
      lambdaArn: string;
    }>
  ): Promise<void> {
    this.logger.info('Updating agent tools', { agentId, toolCount: tools.length });

    try {
      const dynamodb = getDynamoDBClient();
      const tableName = process.env.AGENT_CONFIG_TABLE || 'agent-configurations';

      await dynamodb.send(
        new UpdateCommand({
          TableName: tableName,
          Key: { agentId },
          UpdateExpression: 'SET tools = :tools, updatedAt = :timestamp',
          ExpressionAttributeValues: {
            ':tools': tools,
            ':timestamp': Date.now(),
          },
        })
      );

      // Clear cache to force reload
      getConfigurationLoader().clearCache(agentId);

      this.logger.info('Agent tools updated successfully', {
        agentId,
        toolCount: tools.length,
      });
    } catch (error) {
      this.logger.error('Failed to update agent tools', error as Error, {
        agentId,
      });
      throw error;
    }
  }
}

/**
 * Global configuration updater instance
 */
let globalUpdater: ConfigurationUpdater | null = null;

/**
 * Get or create global configuration updater
 */
export function getConfigurationUpdater(): ConfigurationUpdater {
  if (!globalUpdater) {
    globalUpdater = new ConfigurationUpdater();
  }
  return globalUpdater;
}
