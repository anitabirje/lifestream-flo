/**
 * Booking Suggestion Repository Service
 * Handles persistence and retrieval of booking suggestions from DynamoDB
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import {
  BookingSuggestion,
  BookingSuggestionDynamoDBItem,
  bookingSuggestionToDynamoDB,
  bookingSuggestionFromDynamoDB,
  validateBookingSuggestion,
  TimeSlot,
} from '../models/booking-suggestion';

export class BookingSuggestionRepository {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor(dynamoClient: DynamoDBClient, tableName: string) {
    this.docClient = DynamoDBDocumentClient.from(dynamoClient);
    this.tableName = tableName;
  }

  /**
   * Save a booking suggestion
   */
  async saveSuggestion(suggestion: BookingSuggestion): Promise<BookingSuggestion> {
    const validation = validateBookingSuggestion(suggestion);
    if (!validation.valid) {
      throw new Error(`Invalid booking suggestion: ${validation.errors.join(', ')}`);
    }

    const item = bookingSuggestionToDynamoDB(suggestion);

    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      })
    );

    return suggestion;
  }

  /**
   * Get a booking suggestion by ID
   */
  async getSuggestion(familyId: string, suggestionId: string): Promise<BookingSuggestion | null> {
    const result = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: `BOOKING_SUGGESTION#${suggestionId}`,
        },
      })
    );

    if (!result.Item) {
      return null;
    }

    return bookingSuggestionFromDynamoDB(result.Item as BookingSuggestionDynamoDBItem);
  }

  /**
   * Get all pending suggestions for a family member
   */
  async getPendingSuggestionsForMember(
    familyId: string,
    familyMemberId: string
  ): Promise<BookingSuggestion[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        FilterExpression: 'familyMemberId = :memberId AND #status = :status',
        ExpressionAttributeValues: {
          ':pk': `FAMILY#${familyId}`,
          ':sk': 'BOOKING_SUGGESTION#',
          ':memberId': familyMemberId,
          ':status': 'pending',
        },
        ExpressionAttributeNames: {
          '#status': 'status',
        },
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    return result.Items.map((item) => bookingSuggestionFromDynamoDB(item as BookingSuggestionDynamoDBItem));
  }

  /**
   * Get all suggestions for a family member
   */
  async getSuggestionsForMember(familyId: string, familyMemberId: string): Promise<BookingSuggestion[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        FilterExpression: 'familyMemberId = :memberId',
        ExpressionAttributeValues: {
          ':pk': `FAMILY#${familyId}`,
          ':sk': 'BOOKING_SUGGESTION#',
          ':memberId': familyMemberId,
        },
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    return result.Items.map((item) => bookingSuggestionFromDynamoDB(item as BookingSuggestionDynamoDBItem));
  }

  /**
   * Get all suggestions for a family
   */
  async getSuggestionsForFamily(familyId: string): Promise<BookingSuggestion[]> {
    const result = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `FAMILY#${familyId}`,
          ':sk': 'BOOKING_SUGGESTION#',
        },
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    return result.Items.map((item) => bookingSuggestionFromDynamoDB(item as BookingSuggestionDynamoDBItem));
  }

  /**
   * Update suggestion status
   */
  async updateSuggestionStatus(
    familyId: string,
    suggestionId: string,
    status: 'pending' | 'accepted' | 'dismissed' | 'modified'
  ): Promise<BookingSuggestion | null> {
    const result = await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: `BOOKING_SUGGESTION#${suggestionId}`,
        },
        UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': status,
          ':updatedAt': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    if (!result.Attributes) {
      return null;
    }

    return bookingSuggestionFromDynamoDB(result.Attributes as BookingSuggestionDynamoDBItem);
  }

  /**
   * Accept suggestion with specific slots
   */
  async acceptSuggestion(
    familyId: string,
    suggestionId: string,
    acceptedSlots: TimeSlot[]
  ): Promise<BookingSuggestion | null> {
    const result = await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: `BOOKING_SUGGESTION#${suggestionId}`,
        },
        UpdateExpression: 'SET #status = :status, acceptedSlots = :slots, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': 'accepted',
          ':slots': acceptedSlots.map((slot) => ({
            startTime: slot.startTime.toISOString(),
            endTime: slot.endTime.toISOString(),
            durationHours: slot.durationHours,
            dayOfWeek: slot.dayOfWeek,
          })),
          ':updatedAt': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    if (!result.Attributes) {
      return null;
    }

    return bookingSuggestionFromDynamoDB(result.Attributes as BookingSuggestionDynamoDBItem);
  }

  /**
   * Dismiss suggestion
   */
  async dismissSuggestion(familyId: string, suggestionId: string): Promise<BookingSuggestion | null> {
    const result = await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: `BOOKING_SUGGESTION#${suggestionId}`,
        },
        UpdateExpression: 'SET #status = :status, dismissedAt = :dismissedAt, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': 'dismissed',
          ':dismissedAt': new Date().toISOString(),
          ':updatedAt': new Date().toISOString(),
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    if (!result.Attributes) {
      return null;
    }

    return bookingSuggestionFromDynamoDB(result.Attributes as BookingSuggestionDynamoDBItem);
  }

  /**
   * Delete a booking suggestion
   */
  async deleteSuggestion(familyId: string, suggestionId: string): Promise<void> {
    await this.docClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: {
          PK: `FAMILY#${familyId}`,
          SK: `BOOKING_SUGGESTION#${suggestionId}`,
        },
      })
    );
  }
}
