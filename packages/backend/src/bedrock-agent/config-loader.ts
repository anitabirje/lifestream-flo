/**
 * Configuration loader for agent definitions
 * Validates: Requirements 12.1
 */

import { AgentConfiguration } from './types';
import { getDynamoDBClient } from './aws-clients';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { createLogger } from './logger';

const CONFIG_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedConfig {
  config: AgentConfiguration;
  timestamp: number;
}

/**
 * Configuration loader with caching
 */
export class ConfigurationLoader {
  private cache: Map<string, CachedConfig> = new Map();
  private logger = createLogger();

  /**
   * Load agent configuration from DynamoDB
   */
  async loadAgentConfiguration(
    agentId: string
  ): Promise<AgentConfiguration | null> {
    // Check cache first
    const cached = this.cache.get(agentId);
    if (cached && Date.now() - cached.timestamp < CONFIG_CACHE_TTL_MS) {
      this.logger.debug('Configuration loaded from cache', { agentId });
      return cached.config;
    }

    try {
      const dynamodb = getDynamoDBClient();
      const tableName = process.env.AGENT_CONFIG_TABLE || 'agent-configurations';

      const result = await dynamodb.send(
        new GetCommand({
          TableName: tableName,
          Key: { agentId },
        })
      );

      if (!result.Item) {
        this.logger.warn('Agent configuration not found', { agentId });
        return null;
      }

      const config = result.Item as AgentConfiguration;

      // Cache the configuration
      this.cache.set(agentId, {
        config,
        timestamp: Date.now(),
      });

      this.logger.debug('Configuration loaded from DynamoDB', { agentId });
      return config;
    } catch (error) {
      this.logger.error(
        'Failed to load agent configuration',
        error as Error,
        { agentId }
      );
      return null;
    }
  }

  /**
   * Load system configuration from environment variables
   */
  loadSystemConfiguration(): Record<string, unknown> {
    return {
      awsRegion: process.env.AWS_REGION || 'us-east-1',
      agentConfigTable: process.env.AGENT_CONFIG_TABLE || 'agent-configurations',
      agentExecutionTable: process.env.AGENT_EXECUTION_TABLE || 'agent-executions',
      snsTopicArn: process.env.SNS_TOPIC_ARN,
      logLevel: process.env.LOG_LEVEL || 'INFO',
      bedrockRegion: process.env.BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1',
    };
  }

  /**
   * Clear cache for a specific agent
   */
  clearCache(agentId?: string): void {
    if (agentId) {
      this.cache.delete(agentId);
      this.logger.debug('Cache cleared for agent', { agentId });
    } else {
      this.cache.clear();
      this.logger.debug('All cache cleared');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}

/**
 * Global configuration loader instance
 */
let globalLoader: ConfigurationLoader | null = null;

/**
 * Get or create global configuration loader
 */
export function getConfigurationLoader(): ConfigurationLoader {
  if (!globalLoader) {
    globalLoader = new ConfigurationLoader();
  }
  return globalLoader;
}
