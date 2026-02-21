/**
 * Ideal Time Allocation Service
 * Manages user preferences for ideal time allocation across activity categories
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import {
  IdealTimeAllocation,
  IdealTimeAllocationDynamoDBItem,
  idealAllocationToDynamoDB,
  idealAllocationFromDynamoDB,
  validateIdealAllocation,
  AllocationType,
} from '../models/ideal-time-allocation';

export class IdealAllocationService {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(dynamoClient: DynamoDBClient, tableName: string) {
    this.docClient = DynamoDBDocumentClient.from(dynamoClient);
    this.tableName = tableName;
  }

  /**
   * Set or update ideal time allocation for a family member and category
   */
  async setIdealAllocation(
    familyId: string,
    familyMemberId: string,
    categoryId: string,
    categoryName: string,
    allocationType: AllocationType,
    targetValue: number
  ): Promise<IdealTimeAllocation> {
    const allocation: IdealTimeAllocation = {
      id: uuidv4(),
      familyId,
      familyMemberId,
      categoryId,
      categoryName,
      allocationType,
      targetValue,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate allocation
    const validation = validateIdealAllocation(allocation);
    if (!validation.valid) {
      throw new Error(`Invalid ideal allocation: ${validation.errors.join(', ')}`);
    }

    const item = idealAllocationToDynamoDB(allocation);

    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      })
    );

    return allocation;
  }

  /**
   * Get ideal time allocation for a specific family member and category
   */
  async getIdealAllocation(
    familyId: string,
    familyMemberId: string,
    categoryId: string
  ): Promise<IdealTimeAllocation | null> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: `IDEAL_ALLOCATION#${familyMemberId}#${categoryId}`,
        },
      })
    );

    if (!result.Item) {
      return null;
    }

    return idealAllocationFromDynamoDB(result.Item as IdealTimeAllocationDynamoDBItem);
  }

  /**
   * Get all ideal time allocations for a family member
   */
  async getIdealAllocationsForMember(familyId: string, familyMemberId: string): Promise<IdealTimeAllocation[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `FAMILY#${familyId}`,
          ':sk': `IDEAL_ALLOCATION#${familyMemberId}#`,
        },
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    return result.Items.map((item) => idealAllocationFromDynamoDB(item as IdealTimeAllocationDynamoDBItem));
  }

  /**
   * Get all ideal time allocations for a family
   */
  async getIdealAllocationsForFamily(familyId: string): Promise<IdealTimeAllocation[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `FAMILY#${familyId}`,
          ':sk': 'IDEAL_ALLOCATION#',
        },
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    return result.Items.map((item) => idealAllocationFromDynamoDB(item as IdealTimeAllocationDynamoDBItem));
  }

  /**
   * Delete ideal time allocation for a family member and category
   */
  async deleteIdealAllocation(familyId: string, familyMemberId: string, categoryId: string): Promise<void> {
    await this.docClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: `IDEAL_ALLOCATION#${familyMemberId}#${categoryId}`,
        },
      })
    );
  }

  /**
   * Update ideal time allocation
   */
  async updateIdealAllocation(
    familyId: string,
    familyMemberId: string,
    categoryId: string,
    categoryName: string,
    allocationType: AllocationType,
    targetValue: number
  ): Promise<IdealTimeAllocation> {
    // Get existing allocation to preserve ID and createdAt
    const existing = await this.getIdealAllocation(familyId, familyMemberId, categoryId);

    const allocation: IdealTimeAllocation = {
      id: existing?.id || uuidv4(),
      familyId,
      familyMemberId,
      categoryId,
      categoryName,
      allocationType,
      targetValue,
      createdAt: existing?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    // Validate allocation
    const validation = validateIdealAllocation(allocation);
    if (!validation.valid) {
      throw new Error(`Invalid ideal allocation: ${validation.errors.join(', ')}`);
    }

    const item = idealAllocationToDynamoDB(allocation);

    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      })
    );

    return allocation;
  }
}
