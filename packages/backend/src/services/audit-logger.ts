/**
 * Audit Logger Service
 * Logs all event changes for audit trail and compliance
 */

import { v4 as uuidv4 } from 'uuid';
import { DynamoDBDataAccess } from '../data-access/dynamodb-client';
import { Event } from '../models/event';

export type AuditEntityType = 'event' | 'calendar_source' | 'user' | 'threshold' | 'agent' | 'agent_task';
export type AuditAction = 'created' | 'updated' | 'deleted';

export interface AuditLogEntry {
  PK: string; // FAMILY#<familyId>
  SK: string; // AUDIT#<timestamp>#<logId>
  EntityType: 'AUDIT_LOG';
  id: string;
  familyId: string;
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  changedBy: string;
  timestamp: string; // ISO 8601
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  TTL: number; // Unix timestamp for DynamoDB TTL (1 year retention)
}

export class AuditLogger {
  private readonly TTL_SECONDS = 365 * 24 * 60 * 60; // 1 year

  constructor(private dataAccess: DynamoDBDataAccess) {}

  /**
   * Log an event change
   */
  async logEventChange(
    familyId: string,
    eventId: string,
    action: AuditAction,
    changedBy: string,
    previousEvent?: Event,
    newEvent?: Event
  ): Promise<void> {
    const logId = uuidv4();
    const now = new Date();
    const timestamp = now.toISOString();
    const ttl = Math.floor(now.getTime() / 1000) + this.TTL_SECONDS;

    const entry: AuditLogEntry = {
      PK: `FAMILY#${familyId}`,
      SK: `AUDIT#${timestamp}#${logId}`,
      EntityType: 'AUDIT_LOG',
      id: logId,
      familyId,
      entityType: 'event',
      entityId: eventId,
      action,
      changedBy,
      timestamp,
      previousValues: previousEvent ? this.serializeEvent(previousEvent) : undefined,
      newValues: newEvent ? this.serializeEvent(newEvent) : undefined,
      TTL: ttl,
    };

    await this.dataAccess.putItem(entry as any);
  }

  /**
   * Log a generic entity change
   */
  async logEntityChange(
    familyId: string,
    entityType: AuditEntityType,
    entityId: string,
    action: AuditAction,
    changedBy: string,
    previousValues?: Record<string, any>,
    newValues?: Record<string, any>
  ): Promise<void> {
    const logId = uuidv4();
    const now = new Date();
    const timestamp = now.toISOString();
    const ttl = Math.floor(now.getTime() / 1000) + this.TTL_SECONDS;

    const entry: AuditLogEntry = {
      PK: `FAMILY#${familyId}`,
      SK: `AUDIT#${timestamp}#${logId}`,
      EntityType: 'AUDIT_LOG',
      id: logId,
      familyId,
      entityType,
      entityId,
      action,
      changedBy,
      timestamp,
      previousValues,
      newValues,
      TTL: ttl,
    };

    await this.dataAccess.putItem(entry as any);
  }

  /**
   * Get audit logs for an entity
   */
  async getAuditLogs(
    familyId: string,
    entityId?: string,
    limit?: number
  ): Promise<AuditLogEntry[]> {
    // Query all audit logs for the family
    const items = await this.dataAccess.query(
      `FAMILY#${familyId}`,
      'AUDIT#'
    );

    let logs = items as AuditLogEntry[];

    // Filter by entity ID if specified
    if (entityId) {
      logs = logs.filter((log) => log.entityId === entityId);
    }

    // Sort by timestamp descending (most recent first)
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply limit if specified
    if (limit) {
      logs = logs.slice(0, limit);
    }

    return logs;
  }

  /**
   * Get audit logs for a date range
   */
  async getAuditLogsByDateRange(
    familyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AuditLogEntry[]> {
    const items = await this.dataAccess.query(
      `FAMILY#${familyId}`,
      'AUDIT#'
    );

    const logs = items as AuditLogEntry[];

    return logs.filter((log) => {
      const logDate = new Date(log.timestamp);
      return logDate >= startDate && logDate <= endDate;
    });
  }

  /**
   * Serialize event for audit logging
   */
  private serializeEvent(event: Event): Record<string, any> {
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      location: event.location,
      category: event.category,
      source: event.source,
      externalId: event.externalId,
      sourceId: event.sourceId,
      familyMemberId: event.familyMemberId,
      attendees: event.attendees,
      createdBy: event.createdBy,
      isDeleted: event.isDeleted,
    };
  }
}
