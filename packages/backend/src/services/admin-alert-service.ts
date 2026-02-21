/**
 * Admin Alert Service
 * Manages critical error alerts to administrators
 * Sends SNS notifications for critical errors within 5 minutes
 * Implements alert throttling to avoid alert fatigue
 */

import { config } from '../config/env';
import { ErrorLog, ErrorSeverity, ErrorCategory } from '../utils/error-handler';

export interface AlertConfig {
  snsTopicArn: string;
  alertThrottleMs: number; // Minimum time between alerts for same error type
  enableAlerts: boolean;
}

export interface CriticalAlert {
  id: string;
  timestamp: Date;
  errorCategory: ErrorCategory;
  message: string;
  context: Record<string, any>;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export class AdminAlertService {
  private snsClient: any;
  private config: AlertConfig;
  private lastAlertTime: Map<string, Date> = new Map();
  private alertHistory: CriticalAlert[] = [];
  private maxAlertHistory: number = 1000;
  private alertQueue: CriticalAlert[] = [];
  private processingInterval?: NodeJS.Timeout;

  constructor(config: Partial<AlertConfig> = {}) {
    // Try to initialize SNS client if available
    try {
      const { SNSClient } = require('@aws-sdk/client-sns');
      this.snsClient = new SNSClient({ region: 'us-east-1' });
    } catch (error) {
      console.warn('SNS client not available, admin alerts will be limited');
      this.snsClient = null;
    }

    this.config = {
      snsTopicArn: config.snsTopicArn || '',
      alertThrottleMs: config.alertThrottleMs || 60000, // 1 minute default
      enableAlerts: config.enableAlerts !== false
    };

    this.startAlertProcessing();
  }

  /**
   * Send critical alert to administrators
   */
  async sendCriticalAlert(errorLog: ErrorLog): Promise<void> {
    if (!this.config.enableAlerts) {
      console.log('Alerts are disabled');
      return;
    }

    if (!this.config.snsTopicArn) {
      console.warn('SNS topic ARN not configured, skipping critical alert');
      return;
    }

    // Check throttling
    if (this.isThrottled(errorLog.category)) {
      console.log(`Alert throttled for category ${errorLog.category}`);
      return;
    }

    // Create alert
    const alert: CriticalAlert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      errorCategory: errorLog.category,
      message: errorLog.message,
      context: errorLog.context,
      acknowledged: false
    };

    // Queue alert for processing
    this.alertQueue.push(alert);

    // Update throttle time
    this.lastAlertTime.set(errorLog.category, new Date());
  }

  /**
   * Process alert queue
   */
  private async processAlertQueue(): Promise<void> {
    while (this.alertQueue.length > 0) {
      const alert = this.alertQueue.shift();
      if (alert) {
        try {
          await this.publishAlert(alert);
          this.addToHistory(alert);
        } catch (error) {
          console.error('Failed to publish alert:', error);
          // Re-queue alert for retry
          this.alertQueue.unshift(alert);
          break;
        }
      }
    }
  }

  /**
   * Publish alert via SNS
   */
  private async publishAlert(alert: CriticalAlert): Promise<void> {
    if (!this.snsClient) {
      console.log('SNS client not available, skipping SNS alert');
      return;
    }

    const message = this.formatAlertMessage(alert);

    const params = {
      TopicArn: this.config.snsTopicArn,
      Subject: `[CRITICAL] Flo Backend Error - ${alert.errorCategory}`,
      Message: message
    };

    try {
      const { PublishCommand } = require('@aws-sdk/client-sns');
      await this.snsClient.send(new PublishCommand(params));
      console.log(`Critical alert sent for ${alert.errorCategory}`);
    } catch (error) {
      console.error('Failed to send SNS alert:', error);
      throw error;
    }
  }

  /**
   * Format alert message
   */
  private formatAlertMessage(alert: CriticalAlert): string {
    return `
CRITICAL ERROR ALERT
====================
Alert ID: ${alert.id}
Timestamp: ${alert.timestamp.toISOString()}
Category: ${alert.errorCategory}
Message: ${alert.message}

Context:
${JSON.stringify(alert.context, null, 2)}

Action Required:
Please investigate this critical error immediately.
Check CloudWatch Logs for detailed error information.
    `.trim();
  }

  /**
   * Check if alert is throttled
   */
  private isThrottled(category: ErrorCategory): boolean {
    const lastTime = this.lastAlertTime.get(category);
    if (!lastTime) {
      return false;
    }

    const timeSinceLastAlert = Date.now() - lastTime.getTime();
    return timeSinceLastAlert < this.config.alertThrottleMs;
  }

  /**
   * Add alert to history
   */
  private addToHistory(alert: CriticalAlert): void {
    this.alertHistory.push(alert);

    // Keep only recent alerts
    if (this.alertHistory.length > this.maxAlertHistory) {
      this.alertHistory = this.alertHistory.slice(-this.maxAlertHistory);
    }
  }

  /**
   * Generate alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start alert processing
   */
  private startAlertProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.processAlertQueue().catch(error => {
        console.error('Error processing alert queue:', error);
      });
    }, 1000); // Process every second
  }

  /**
   * Stop alert processing
   */
  stopAlertProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 100): CriticalAlert[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Get alerts by category
   */
  getAlertsByCategory(category: ErrorCategory, limit: number = 100): CriticalAlert[] {
    return this.alertHistory
      .filter(alert => alert.errorCategory === category)
      .slice(-limit);
  }

  /**
   * Get unacknowledged alerts
   */
  getUnacknowledgedAlerts(): CriticalAlert[] {
    return this.alertHistory.filter(alert => !alert.acknowledged);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alertHistory.find(a => a.id === alertId);
    if (!alert) {
      return false;
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    return true;
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): {
    totalAlerts: number;
    unacknowledgedAlerts: number;
    alertsByCategory: Record<string, number>;
    recentAlerts: CriticalAlert[];
  } {
    const alertsByCategory: Record<string, number> = {};

    for (const alert of this.alertHistory) {
      alertsByCategory[alert.errorCategory] = (alertsByCategory[alert.errorCategory] || 0) + 1;
    }

    return {
      totalAlerts: this.alertHistory.length,
      unacknowledgedAlerts: this.alertHistory.filter(a => !a.acknowledged).length,
      alertsByCategory,
      recentAlerts: this.alertHistory.slice(-10)
    };
  }

  /**
   * Clear alert history
   */
  clearAlertHistory(): void {
    this.alertHistory = [];
    this.lastAlertTime.clear();
  }

  /**
   * Destroy service
   */
  destroy(): void {
    this.stopAlertProcessing();
    this.clearAlertHistory();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const adminAlertService = new AdminAlertService({
  snsTopicArn: (config.aws as any)?.snsTopicArn || '',
  alertThrottleMs: 60000, // 1 minute
  enableAlerts: config.app?.nodeEnv === 'production'
});
