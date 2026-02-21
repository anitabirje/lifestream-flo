/**
 * Calendar Source Registry
 * Manages calendar source connections, agent assignments, and encrypted credential storage
 */

import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClientWrapper } from '../data-access/dynamodb-client';
import { IAgent } from '../agents/types';
import * as crypto from 'crypto';

export interface CalendarSourceConfig {
  id: string;
  familyMemberId: string;
  type: 'google' | 'outlook' | 'kids_school' | 'kids_connect';
  credentials: EncryptedCredentials;
  lastSyncTime: Date;
  syncStatus: 'active' | 'failed' | 'disconnected';
  retryCount: number;
  assignedAgentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EncryptedCredentials {
  encryptedData: string;
  iv: string;
  algorithm: string;
}

export interface RegistryConfig {
  encryptionKey: string; // 32-byte hex string for AES-256
  maxRetries: number;
}

export class CalendarSourceRegistry {
  private dynamodbClient: DynamoDBClientWrapper;
  private config: RegistryConfig;
  private sourceCache: Map<string, CalendarSourceConfig>;
  private agentAssignments: Map<string, string>; // sourceId -> agentId

  constructor(dynamodbClient: DynamoDBClientWrapper, config: RegistryConfig) {
    this.dynamodbClient = dynamodbClient;
    this.config = config;
    this.sourceCache = new Map();
    this.agentAssignments = new Map();
  }

  /**
   * Register a new calendar source
   */
  async registerSource(
    familyMemberId: string,
    type: 'google' | 'outlook' | 'kids_school' | 'kids_connect',
    credentials: any,
    familyId: string
  ): Promise<CalendarSourceConfig> {
    const sourceId = uuidv4();
    const now = new Date();

    // Encrypt credentials
    const encryptedCreds = this.encryptCredentials(credentials);

    const source: CalendarSourceConfig = {
      id: sourceId,
      familyMemberId,
      type,
      credentials: encryptedCreds,
      lastSyncTime: now,
      syncStatus: 'active',
      retryCount: 0,
      createdAt: now,
      updatedAt: now
    };

    // Store in DynamoDB
    await this.dynamodbClient.put({
      PK: `FAMILY#${familyId}`,
      SK: `SOURCE#${sourceId}`,
      EntityType: 'CALENDAR_SOURCE',
      id: sourceId,
      familyMemberId,
      type,
      credentials: encryptedCreds.encryptedData,
      credentialsIv: encryptedCreds.iv,
      credentialsAlgorithm: encryptedCreds.algorithm,
      lastSyncTime: now.toISOString(),
      syncStatus: 'active',
      retryCount: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    });

    // Cache the source
    this.sourceCache.set(sourceId, source);

    return source;
  }

  /**
   * Get a calendar source by ID
   */
  async getSource(sourceId: string, familyId: string): Promise<CalendarSourceConfig | null> {
    // Check cache first
    if (this.sourceCache.has(sourceId)) {
      return this.sourceCache.get(sourceId) || null;
    }

    // Query DynamoDB
    const item = await this.dynamodbClient.get({
      PK: `FAMILY#${familyId}`,
      SK: `SOURCE#${sourceId}`
    });

    if (!item) {
      return null;
    }

    const source = this.mapItemToSource(item);
    this.sourceCache.set(sourceId, source);
    return source;
  }

  /**
   * Get all calendar sources for a family member
   */
  async getSourcesForMember(
    familyMemberId: string,
    familyId: string
  ): Promise<CalendarSourceConfig[]> {
    // Query DynamoDB for all sources for this family member
    const result = await this.dynamodbClient.query(
      'PK = :pk AND begins_with(SK, :sk)',
      {
        ':pk': `FAMILY#${familyId}`,
        ':sk': 'SOURCE#'
      }
    );

    const items = result.items || [];
    const sources = items
      .filter((item: any) => item.familyMemberId === familyMemberId)
      .map((item: any) => this.mapItemToSource(item));

    // Update cache
    sources.forEach((source: CalendarSourceConfig) => {
      this.sourceCache.set(source.id, source);
    });

    return sources;
  }

  /**
   * Get all active calendar sources for a family
   */
  async getActiveSources(familyId: string): Promise<CalendarSourceConfig[]> {
    // Query DynamoDB for all active sources
    const result = await this.dynamodbClient.query(
      'PK = :pk AND begins_with(SK, :sk)',
      {
        ':pk': `FAMILY#${familyId}`,
        ':sk': 'SOURCE#'
      }
    );

    const items = result.items || [];
    const sources = items
      .filter((item: any) => item.syncStatus === 'active')
      .map((item: any) => this.mapItemToSource(item));

    // Update cache
    sources.forEach((source: CalendarSourceConfig) => {
      this.sourceCache.set(source.id, source);
    });

    return sources;
  }

  /**
   * Update a calendar source
   */
  async updateSource(
    sourceId: string,
    familyId: string,
    updates: Partial<CalendarSourceConfig>
  ): Promise<CalendarSourceConfig> {
    const source = await this.getSource(sourceId, familyId);
    if (!source) {
      throw new Error(`Calendar source ${sourceId} not found`);
    }

    const updated: CalendarSourceConfig = {
      ...source,
      ...updates,
      updatedAt: new Date()
    };

    // Build update expression
    const updateParts: string[] = [];
    const expressionValues: Record<string, any> = {};

    if (updates.syncStatus !== undefined) {
      updateParts.push('syncStatus = :syncStatus');
      expressionValues[':syncStatus'] = updated.syncStatus;
    }
    if (updates.lastSyncTime !== undefined) {
      updateParts.push('lastSyncTime = :lastSyncTime');
      expressionValues[':lastSyncTime'] = updated.lastSyncTime.toISOString();
    }
    if (updates.retryCount !== undefined) {
      updateParts.push('retryCount = :retryCount');
      expressionValues[':retryCount'] = updated.retryCount;
    }
    if (updates.assignedAgentId !== undefined) {
      updateParts.push('assignedAgentId = :assignedAgentId');
      expressionValues[':assignedAgentId'] = updated.assignedAgentId;
    }

    updateParts.push('updatedAt = :updatedAt');
    expressionValues[':updatedAt'] = updated.updatedAt.toISOString();

    const updateExpression = `SET ${updateParts.join(', ')}`;

    // Update DynamoDB
    await this.dynamodbClient.update(
      {
        PK: `FAMILY#${familyId}`,
        SK: `SOURCE#${sourceId}`
      },
      updateExpression,
      undefined,
      expressionValues
    );

    // Update cache
    this.sourceCache.set(sourceId, updated);

    return updated;
  }

  /**
   * Remove a calendar source
   */
  async removeSource(sourceId: string, familyId: string): Promise<boolean> {
    const source = await this.getSource(sourceId, familyId);
    if (!source) {
      return false;
    }

    // Delete from DynamoDB
    await this.dynamodbClient.delete({
      PK: `FAMILY#${familyId}`,
      SK: `SOURCE#${sourceId}`
    });

    // Remove from cache and assignments
    this.sourceCache.delete(sourceId);
    this.agentAssignments.delete(sourceId);

    return true;
  }

  /**
   * Assign an agent to a calendar source
   */
  async assignAgent(sourceId: string, agent: IAgent, familyId: string): Promise<void> {
    const source = await this.getSource(sourceId, familyId);
    if (!source) {
      throw new Error(`Calendar source ${sourceId} not found`);
    }

    // Update source with agent assignment
    source.assignedAgentId = agent.id;
    await this.updateSource(sourceId, familyId, { assignedAgentId: agent.id });

    // Track assignment
    this.agentAssignments.set(sourceId, agent.id);
  }

  /**
   * Get assigned agent for a source
   */
  getAssignedAgent(sourceId: string): string | undefined {
    return this.agentAssignments.get(sourceId);
  }

  /**
   * Unassign an agent from a source
   */
  async unassignAgent(sourceId: string, familyId: string): Promise<void> {
    const source = await this.getSource(sourceId, familyId);
    if (!source) {
      throw new Error(`Calendar source ${sourceId} not found`);
    }

    // Update source to remove agent assignment
    source.assignedAgentId = undefined;
    await this.updateSource(sourceId, familyId, { assignedAgentId: undefined });

    // Remove from assignments
    this.agentAssignments.delete(sourceId);
  }

  /**
   * Get decrypted credentials for a source
   */
  async getDecryptedCredentials(sourceId: string, familyId: string): Promise<any> {
    const source = await this.getSource(sourceId, familyId);
    if (!source) {
      throw new Error(`Calendar source ${sourceId} not found`);
    }

    return this.decryptCredentials(source.credentials);
  }

  /**
   * Update sync status for a source
   */
  async updateSyncStatus(
    sourceId: string,
    familyId: string,
    status: 'active' | 'failed' | 'disconnected',
    retryCount?: number
  ): Promise<void> {
    const source = await this.getSource(sourceId, familyId);
    if (!source) {
      throw new Error(`Calendar source ${sourceId} not found`);
    }

    const updates: Partial<CalendarSourceConfig> = {
      syncStatus: status,
      lastSyncTime: new Date()
    };

    if (retryCount !== undefined) {
      updates.retryCount = retryCount;
    }

    await this.updateSource(sourceId, familyId, updates);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.sourceCache.clear();
    this.agentAssignments.clear();
  }

  /**
   * Encrypt credentials using AES-256
   */
  private encryptCredentials(credentials: any): EncryptedCredentials {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(this.config.encryptionKey, 'hex');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const credentialsJson = JSON.stringify(credentials);

    let encrypted = cipher.update(credentialsJson, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      algorithm
    };
  }

  /**
   * Decrypt credentials using AES-256
   */
  private decryptCredentials(encrypted: EncryptedCredentials): any {
    const algorithm = encrypted.algorithm;
    const key = Buffer.from(this.config.encryptionKey, 'hex');
    const iv = Buffer.from(encrypted.iv, 'hex');

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }

  /**
   * Map DynamoDB item to CalendarSourceConfig
   */
  private mapItemToSource(item: any): CalendarSourceConfig {
    return {
      id: item.id,
      familyMemberId: item.familyMemberId,
      type: item.type,
      credentials: {
        encryptedData: item.credentials,
        iv: item.credentialsIv,
        algorithm: item.credentialsAlgorithm
      },
      lastSyncTime: new Date(item.lastSyncTime),
      syncStatus: item.syncStatus,
      retryCount: item.retryCount,
      assignedAgentId: item.assignedAgentId,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt)
    };
  }
}
