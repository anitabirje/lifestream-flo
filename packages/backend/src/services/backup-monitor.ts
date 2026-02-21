/**
 * Backup Monitor Service
 * Monitors backup status via CloudWatch and verifies PITR health
 */

import {
  CloudWatchClient,
  PutMetricDataCommand,
  GetMetricStatisticsCommand,
} from '@aws-sdk/client-cloudwatch';
import { BackupManager, BackupStatus } from './backup-manager';
import { DynamoDBDataAccess } from '../data-access/dynamodb-client';

export interface BackupHealthCheck {
  isHealthy: boolean;
  pitrEnabled: boolean;
  pitrHealthy: boolean;
  latestRestorableTime: Date | null;
  lastCheckTime: Date;
  issues: string[];
}

export interface BackupMetrics {
  pitrEnabled: boolean;
  latestRestorableTimeAge: number; // milliseconds
  onDemandBackupCount: number;
  oldestBackupAge: number; // milliseconds
  newestBackupAge: number; // milliseconds
  averageBackupSize: number; // bytes
  totalBackupSize: number; // bytes
}

export class BackupMonitor {
  private readonly cloudWatchClient: CloudWatchClient;
  private readonly namespace = 'Flo/Backup';
  private readonly region: string;

  constructor(
    private backupManager: BackupManager,
    private dataAccess: DynamoDBDataAccess,
    region: string
  ) {
    this.region = region;
    this.cloudWatchClient = new CloudWatchClient({ region });
  }

  /**
   * Perform a health check on backup systems
   */
  async performHealthCheck(): Promise<BackupHealthCheck> {
    const issues: string[] = [];
    const lastCheckTime = new Date();

    try {
      const backupStatus = await this.backupManager.getBackupStatus();

      // Check PITR status
      const pitrHealthy = this.validatePITRHealth(backupStatus, issues);

      // Publish metrics to CloudWatch
      await this.publishMetrics(backupStatus);

      return {
        isHealthy: pitrHealthy && issues.length === 0,
        pitrEnabled: backupStatus.pitrEnabled,
        pitrHealthy,
        latestRestorableTime: backupStatus.latestRestorableTime,
        lastCheckTime,
        issues,
      };
    } catch (error) {
      issues.push(`Health check failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        isHealthy: false,
        pitrEnabled: false,
        pitrHealthy: false,
        latestRestorableTime: null,
        lastCheckTime,
        issues,
      };
    }
  }

  /**
   * Validate PITR health
   */
  private validatePITRHealth(backupStatus: BackupStatus, issues: string[]): boolean {
    if (!backupStatus.pitrEnabled) {
      issues.push('PITR is not enabled');
      return false;
    }

    if (!backupStatus.latestRestorableTime) {
      issues.push('Latest restorable time is not available');
      return false;
    }

    const now = new Date();
    const ageMs = now.getTime() - backupStatus.latestRestorableTime.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    // PITR should be recent (within 24 hours)
    if (ageHours > 24) {
      issues.push(`PITR is stale: ${ageHours.toFixed(2)} hours old`);
      return false;
    }

    return true;
  }

  /**
   * Get backup metrics
   */
  async getBackupMetrics(): Promise<BackupMetrics> {
    const backupStatus = await this.backupManager.getBackupStatus();

    const now = new Date();
    let oldestBackupAge = 0;
    let newestBackupAge = 0;
    let totalBackupSize = 0;

    if (backupStatus.onDemandBackups.length > 0) {
      const ages = backupStatus.onDemandBackups.map(
        (b) => now.getTime() - b.backupCreationDate.getTime()
      );
      oldestBackupAge = Math.max(...ages);
      newestBackupAge = Math.min(...ages);
      totalBackupSize = backupStatus.onDemandBackups.reduce((sum, b) => sum + b.backupSizeBytes, 0);
    }

    const latestRestorableTimeAge = backupStatus.latestRestorableTime
      ? now.getTime() - backupStatus.latestRestorableTime.getTime()
      : 0;

    return {
      pitrEnabled: backupStatus.pitrEnabled,
      latestRestorableTimeAge,
      onDemandBackupCount: backupStatus.onDemandBackups.length,
      oldestBackupAge,
      newestBackupAge,
      averageBackupSize:
        backupStatus.onDemandBackups.length > 0
          ? totalBackupSize / backupStatus.onDemandBackups.length
          : 0,
      totalBackupSize,
    };
  }

  /**
   * Publish backup metrics to CloudWatch
   */
  private async publishMetrics(backupStatus: BackupStatus): Promise<void> {
    try {
      const now = new Date();
      const metrics = [];

      // PITR enabled metric
      metrics.push({
        MetricName: 'PITREnabled',
        Value: backupStatus.pitrEnabled ? 1 : 0,
        Unit: 'None' as const,
        Timestamp: now,
      });

      // On-demand backup count
      metrics.push({
        MetricName: 'OnDemandBackupCount',
        Value: backupStatus.onDemandBackups.length,
        Unit: 'Count' as const,
        Timestamp: now,
      });

      // Total backup size
      const totalSize = backupStatus.onDemandBackups.reduce((sum, b) => sum + b.backupSizeBytes, 0);
      metrics.push({
        MetricName: 'TotalBackupSize',
        Value: totalSize,
        Unit: 'Bytes' as const,
        Timestamp: now,
      });

      // Latest restorable time age
      if (backupStatus.latestRestorableTime) {
        const ageMs = now.getTime() - backupStatus.latestRestorableTime.getTime();
        metrics.push({
          MetricName: 'LatestRestorableTimeAge',
          Value: ageMs / 1000, // Convert to seconds
          Unit: 'Seconds' as const,
          Timestamp: now,
        });
      }

      // Publish metrics
      const command = new PutMetricDataCommand({
        Namespace: this.namespace,
        MetricData: metrics,
      });

      await this.cloudWatchClient.send(command);
    } catch (error) {
      console.error('Failed to publish backup metrics to CloudWatch:', error);
      // Don't throw - metric publishing failure shouldn't affect backup operations
    }
  }

  /**
   * Get CloudWatch metrics for a time period
   */
  async getCloudWatchMetrics(
    metricName: string,
    startTime: Date,
    endTime: Date
  ): Promise<number[]> {
    try {
      const command = new GetMetricStatisticsCommand({
        Namespace: this.namespace,
        MetricName: metricName,
        StartTime: startTime,
        EndTime: endTime,
        Period: 3600, // 1 hour
        Statistics: ['Average', 'Maximum', 'Minimum'],
      });

      const response = await this.cloudWatchClient.send(command);
      return response.Datapoints?.map((dp) => dp.Average || 0) || [];
    } catch (error) {
      console.error('Failed to get CloudWatch metrics:', error);
      throw error;
    }
  }

  /**
   * Close the CloudWatch client
   */
  async close(): Promise<void> {
    this.cloudWatchClient.destroy();
  }
}
