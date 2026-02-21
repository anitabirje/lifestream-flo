/**
 * Conflict Resolution Logger
 * Records all conflict detections and resolutions for audit purposes
 */

import { v4 as uuidv4 } from 'uuid';
import { DynamoDBDataAccess } from '../data-access/dynamodb-client';
import { Event } from '../models/event';

export interface ConflictDetectionLog {
  PK: string; // FAMILY#<familyId>
  SK: string; // CONFLICT_DETECTION#<timestamp>#<logId>
  EntityType: 'CONFLICT_DETECTION';
  id: string;
  familyId: string;
  event1Id: string;
  event2Id: string;
  event1Title: string;
  event2Title: string;
  familyMemberId: string;
  conflictType: 'overlap' | 'adjacent';
  severity: 'high' | 'medium' | 'low';
  overlapDurationMs: number;
  detectedAt: string; // ISO 8601
  detectedBy: string; // System or user ID
  TTL: number; // Unix timestamp for DynamoDB TTL (1 year retention)
}

export interface ConflictResolutionLog {
  PK: string; // FAMILY#<familyId>
  SK: string; // CONFLICT_RESOLUTION#<timestamp>#<logId>
  EntityType: 'CONFLICT_RESOLUTION';
  id: string;
  familyId: string;
  conflictDetectionId?: string;
  event1Id: string;
  event2Id: string;
  resolutionType: 'reschedule' | 'delegate' | 'cancel' | 'split' | 'manual';
  resolutionMethod: string;
  affectedEventIds: string[];
  appliedBy: string;
  appliedAt: string; // ISO 8601
  changes: Array<{
    eventId: string;
    previousValues: Record<string, any>;
    newValues: Record<string, any>;
  }>;
  outcome: 'success' | 'partial_success' | 'failed';
  notes?: string;
  TTL: number; // Unix timestamp for DynamoDB TTL (1 year retention)
}

export class ConflictResolutionLogger {
  private readonly TTL_SECONDS = 365 * 24 * 60 * 60; // 1 year

  constructor(private dataAccess: DynamoDBDataAccess) {}

  /**
   * Log a conflict detection
   */
  async logConflictDetection(
    familyId: string,
    event1: Event,
    event2: Event,
    conflictType: 'overlap' | 'adjacent',
    severity: 'high' | 'medium' | 'low',
    overlapDurationMs: number,
    detectedBy: string = 'system'
  ): Promise<string> {
    const logId = uuidv4();
    const now = new Date();
    const timestamp = now.toISOString();
    const ttl = Math.floor(now.getTime() / 1000) + this.TTL_SECONDS;

    const entry: ConflictDetectionLog = {
      PK: `FAMILY#${familyId}`,
      SK: `CONFLICT_DETECTION#${timestamp}#${logId}`,
      EntityType: 'CONFLICT_DETECTION',
      id: logId,
      familyId,
      event1Id: event1.id,
      event2Id: event2.id,
      event1Title: event1.title,
      event2Title: event2.title,
      familyMemberId: event1.familyMemberId,
      conflictType,
      severity,
      overlapDurationMs,
      detectedAt: timestamp,
      detectedBy,
      TTL: ttl,
    };

    await this.dataAccess.putItem(entry as any);
    return logId;
  }

  /**
   * Log a conflict resolution
   */
  async logConflictResolution(
    familyId: string,
    event1Id: string,
    event2Id: string,
    resolutionType: 'reschedule' | 'delegate' | 'cancel' | 'split' | 'manual',
    resolutionMethod: string,
    affectedEventIds: string[],
    appliedBy: string,
    changes: Array<{
      eventId: string;
      previousValues: Record<string, any>;
      newValues: Record<string, any>;
    }>,
    outcome: 'success' | 'partial_success' | 'failed' = 'success',
    notes?: string,
    conflictDetectionId?: string
  ): Promise<string> {
    const logId = uuidv4();
    const now = new Date();
    const timestamp = now.toISOString();
    const ttl = Math.floor(now.getTime() / 1000) + this.TTL_SECONDS;

    const entry: ConflictResolutionLog = {
      PK: `FAMILY#${familyId}`,
      SK: `CONFLICT_RESOLUTION#${timestamp}#${logId}`,
      EntityType: 'CONFLICT_RESOLUTION',
      id: logId,
      familyId,
      conflictDetectionId,
      event1Id,
      event2Id,
      resolutionType,
      resolutionMethod,
      affectedEventIds,
      appliedBy,
      appliedAt: timestamp,
      changes,
      outcome,
      notes,
      TTL: ttl,
    };

    await this.dataAccess.putItem(entry as any);
    return logId;
  }

  /**
   * Get conflict detection logs for a family
   */
  async getConflictDetectionLogs(
    familyId: string,
    limit?: number
  ): Promise<ConflictDetectionLog[]> {
    const items = await this.dataAccess.query(
      `FAMILY#${familyId}`,
      'CONFLICT_DETECTION#'
    );

    let logs = items as ConflictDetectionLog[];

    // Sort by timestamp descending (most recent first)
    logs.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());

    // Apply limit if specified
    if (limit) {
      logs = logs.slice(0, limit);
    }

    return logs;
  }

  /**
   * Get conflict resolution logs for a family
   */
  async getConflictResolutionLogs(
    familyId: string,
    limit?: number
  ): Promise<ConflictResolutionLog[]> {
    const items = await this.dataAccess.query(
      `FAMILY#${familyId}`,
      'CONFLICT_RESOLUTION#'
    );

    let logs = items as ConflictResolutionLog[];

    // Sort by timestamp descending (most recent first)
    logs.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());

    // Apply limit if specified
    if (limit) {
      logs = logs.slice(0, limit);
    }

    return logs;
  }

  /**
   * Get conflict logs for a specific event
   */
  async getConflictLogsForEvent(
    familyId: string,
    eventId: string
  ): Promise<{
    detections: ConflictDetectionLog[];
    resolutions: ConflictResolutionLog[];
  }> {
    const detectionLogs = await this.getConflictDetectionLogs(familyId);
    const resolutionLogs = await this.getConflictResolutionLogs(familyId);

    const detections = detectionLogs.filter(
      (log) => log.event1Id === eventId || log.event2Id === eventId
    );

    const resolutions = resolutionLogs.filter(
      (log) => log.event1Id === eventId || log.event2Id === eventId || log.affectedEventIds.includes(eventId)
    );

    return { detections, resolutions };
  }

  /**
   * Get conflict statistics for a family
   */
  async getConflictStatistics(familyId: string): Promise<{
    totalDetections: number;
    highSeverityConflicts: number;
    mediumSeverityConflicts: number;
    lowSeverityConflicts: number;
    totalResolutions: number;
    successfulResolutions: number;
    failedResolutions: number;
    resolutionsByType: Record<string, number>;
  }> {
    const detectionLogs = await this.getConflictDetectionLogs(familyId);
    const resolutionLogs = await this.getConflictResolutionLogs(familyId);

    const stats = {
      totalDetections: detectionLogs.length,
      highSeverityConflicts: detectionLogs.filter((log) => log.severity === 'high').length,
      mediumSeverityConflicts: detectionLogs.filter((log) => log.severity === 'medium').length,
      lowSeverityConflicts: detectionLogs.filter((log) => log.severity === 'low').length,
      totalResolutions: resolutionLogs.length,
      successfulResolutions: resolutionLogs.filter((log) => log.outcome === 'success').length,
      failedResolutions: resolutionLogs.filter((log) => log.outcome === 'failed').length,
      resolutionsByType: {} as Record<string, number>,
    };

    // Count resolutions by type
    for (const log of resolutionLogs) {
      stats.resolutionsByType[log.resolutionType] =
        (stats.resolutionsByType[log.resolutionType] || 0) + 1;
    }

    return stats;
  }

  /**
   * Get conflict logs for a date range
   */
  async getConflictLogsByDateRange(
    familyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    detections: ConflictDetectionLog[];
    resolutions: ConflictResolutionLog[];
  }> {
    const detectionLogs = await this.getConflictDetectionLogs(familyId);
    const resolutionLogs = await this.getConflictResolutionLogs(familyId);

    const detections = detectionLogs.filter((log) => {
      const logDate = new Date(log.detectedAt);
      return logDate >= startDate && logDate <= endDate;
    });

    const resolutions = resolutionLogs.filter((log) => {
      const logDate = new Date(log.appliedAt);
      return logDate >= startDate && logDate <= endDate;
    });

    return { detections, resolutions };
  }
}
