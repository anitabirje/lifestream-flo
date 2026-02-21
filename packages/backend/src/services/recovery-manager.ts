/**
 * Recovery Manager Service
 * Handles data restoration from DynamoDB backups and data corruption detection
 */

import { v4 as uuidv4 } from 'uuid';
import { DynamoDBDataAccess } from '../data-access/dynamodb-client';

export interface RecoveryOperation {
  PK: string; // RECOVERY#<operationId>
  SK: string; // RECOVERY#<operationId>
  EntityType: 'RECOVERY_OPERATION';
  id: string;
  backupArn: string;
  backupName: string;
  status: 'initiated' | 'in_progress' | 'completed' | 'failed';
  startTime: string; // ISO 8601
  endTime?: string; // ISO 8601
  itemsRestored: number;
  errorMessage?: string;
  corruptionDetected: boolean;
  corruptionDetails?: string;
  createdAt: string; // ISO 8601
}

export interface DataCorruptionReport {
  PK: string; // CORRUPTION#<reportId>
  SK: string; // CORRUPTION#<reportId>
  EntityType: 'CORRUPTION_REPORT';
  id: string;
  familyId: string;
  detectionTime: string; // ISO 8601
  corruptionType: 'missing_fields' | 'invalid_data' | 'inconsistent_state' | 'unknown';
  affectedEntities: string[]; // Entity IDs
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recoveryAttempted: boolean;
  recoverySuccessful?: boolean;
  recoveryDetails?: string;
}

export class RecoveryManager {
  constructor(private dataAccess: DynamoDBDataAccess) {}

  /**
   * Initiate a recovery operation from backup
   */
  async initiateRecovery(backupArn: string, backupName: string): Promise<RecoveryOperation> {
    try {
      const operationId = uuidv4();
      const now = new Date();

      const operation: RecoveryOperation = {
        PK: `RECOVERY#${operationId}`,
        SK: `RECOVERY#${operationId}`,
        EntityType: 'RECOVERY_OPERATION',
        id: operationId,
        backupArn,
        backupName,
        status: 'initiated',
        startTime: now.toISOString(),
        itemsRestored: 0,
        corruptionDetected: false,
        createdAt: now.toISOString(),
      };

      await this.dataAccess.putItem(operation as any);
      return operation;
    } catch (error) {
      console.error('Failed to initiate recovery operation:', error);
      throw error;
    }
  }

  /**
   * Update recovery operation status
   */
  async updateRecoveryStatus(
    operationId: string,
    status: 'in_progress' | 'completed' | 'failed',
    itemsRestored?: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      const operation = await this.dataAccess.getItem(`RECOVERY#${operationId}`, `RECOVERY#${operationId}`);

      if (operation) {
        const updated = {
          ...operation,
          status,
          itemsRestored: itemsRestored ?? (operation as any).itemsRestored,
          errorMessage,
          endTime: new Date().toISOString(),
        };

        await this.dataAccess.putItem(updated);
      }
    } catch (error) {
      console.error('Failed to update recovery status:', error);
      throw error;
    }
  }

  /**
   * Detect data corruption in an entity
   */
  async detectCorruption(entity: any): Promise<{ isCorrupted: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Check for required fields
    if (!entity.PK || !entity.SK) {
      issues.push('Missing partition or sort key');
    }

    if (!entity.EntityType) {
      issues.push('Missing EntityType');
    }

    // Check for entity-specific required fields
    if (entity.EntityType === 'EVENT') {
      if (!entity.id || !entity.familyId || !entity.familyMemberId) {
        issues.push('Event missing required fields: id, familyId, or familyMemberId');
      }
      if (!entity.title || !entity.startTime || !entity.endTime) {
        issues.push('Event missing required fields: title, startTime, or endTime');
      }
      if (!entity.category || !entity.source) {
        issues.push('Event missing required fields: category or source');
      }
    }

    if (entity.EntityType === 'FAMILY_MEMBER') {
      if (!entity.id || !entity.familyId || !entity.email) {
        issues.push('Family member missing required fields: id, familyId, or email');
      }
    }

    if (entity.EntityType === 'SESSION') {
      if (!entity.userId || !entity.token || !entity.expiresAt) {
        issues.push('Session missing required fields: userId, token, or expiresAt');
      }
    }

    // Check for data type consistency
    if (entity.startTime && typeof entity.startTime !== 'string' && !(entity.startTime instanceof Date)) {
      issues.push('startTime has invalid data type');
    }

    if (entity.endTime && typeof entity.endTime !== 'string' && !(entity.endTime instanceof Date)) {
      issues.push('endTime has invalid data type');
    }

    return {
      isCorrupted: issues.length > 0,
      issues,
    };
  }

  /**
   * Report data corruption
   */
  async reportCorruption(
    familyId: string,
    corruptionType: 'missing_fields' | 'invalid_data' | 'inconsistent_state' | 'unknown',
    affectedEntities: string[],
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string
  ): Promise<DataCorruptionReport> {
    try {
      const reportId = uuidv4();
      const now = new Date();

      const report: DataCorruptionReport = {
        PK: `CORRUPTION#${reportId}`,
        SK: `CORRUPTION#${reportId}`,
        EntityType: 'CORRUPTION_REPORT',
        id: reportId,
        familyId,
        detectionTime: now.toISOString(),
        corruptionType,
        affectedEntities,
        severity,
        description,
        recoveryAttempted: false,
      };

      await this.dataAccess.putItem(report as any);
      return report;
    } catch (error) {
      console.error('Failed to report corruption:', error);
      throw error;
    }
  }

  /**
   * Get corruption reports for a family
   */
  async getCorruptionReports(familyId: string): Promise<DataCorruptionReport[]> {
    try {
      const items = await this.dataAccess.query('CORRUPTION#', 'CORRUPTION#');
      const reports = (items as any[]).filter((item) => item.EntityType === 'CORRUPTION_REPORT') as DataCorruptionReport[];
      return reports.filter((r) => r.familyId === familyId);
    } catch (error) {
      console.error('Failed to get corruption reports:', error);
      throw error;
    }
  }

  /**
   * Mark corruption as recovered
   */
  async markCorruptionRecovered(
    reportId: string,
    recoverySuccessful: boolean,
    recoveryDetails?: string
  ): Promise<void> {
    try {
      const report = await this.dataAccess.getItem(`CORRUPTION#${reportId}`, `CORRUPTION#${reportId}`);

      if (report) {
        const updated = {
          ...report,
          recoveryAttempted: true,
          recoverySuccessful,
          recoveryDetails,
        };

        await this.dataAccess.putItem(updated);
      }
    } catch (error) {
      console.error('Failed to mark corruption as recovered:', error);
      throw error;
    }
  }

  /**
   * Get recovery operations
   */
  async getRecoveryOperations(): Promise<RecoveryOperation[]> {
    try {
      const items = await this.dataAccess.query('RECOVERY#', 'RECOVERY#');
      return (items as any[]).filter((item) => item.EntityType === 'RECOVERY_OPERATION') as RecoveryOperation[];
    } catch (error) {
      console.error('Failed to get recovery operations:', error);
      throw error;
    }
  }

  /**
   * Get recovery operation by ID
   */
  async getRecoveryOperation(operationId: string): Promise<RecoveryOperation | null> {
    try {
      const operation = await this.dataAccess.getItem(`RECOVERY#${operationId}`, `RECOVERY#${operationId}`);
      return (operation as RecoveryOperation) || null;
    } catch (error) {
      console.error('Failed to get recovery operation:', error);
      throw error;
    }
  }

  /**
   * Validate data consistency after recovery
   */
  async validateDataConsistency(familyId: string): Promise<{
    isConsistent: boolean;
    issues: string[];
    totalEntitiesChecked: number;
    corruptedEntities: number;
  }> {
    try {
      const items = await this.dataAccess.query(`FAMILY#${familyId}`, '');
      const issues: string[] = [];
      let corruptedCount = 0;

      for (const item of items) {
        const { isCorrupted, issues: itemIssues } = await this.detectCorruption(item);
        if (isCorrupted) {
          corruptedCount++;
          issues.push(`Entity ${(item as any).id}: ${itemIssues.join(', ')}`);
        }
      }

      return {
        isConsistent: corruptedCount === 0,
        issues,
        totalEntitiesChecked: items.length,
        corruptedEntities: corruptedCount,
      };
    } catch (error) {
      console.error('Failed to validate data consistency:', error);
      throw error;
    }
  }
}
