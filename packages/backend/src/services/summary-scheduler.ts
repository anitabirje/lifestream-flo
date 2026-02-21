/**
 * Summary Scheduler Service
 * Schedules weekly summary generation and distribution
 * Generates summary every Sunday at 6:00 PM
 */

import { SummaryGenerator, ConsolidatedSummary } from './summary-generator';
import { NotificationDispatcher } from './notification-dispatcher';
import { NotificationBuilder } from './notification-builder';
import { Event } from '../models/event';

export interface ScheduledSummaryConfig {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  hour: number; // 0-23
  minute: number; // 0-59
  enabled: boolean;
}

export interface SummaryDistributionResult {
  success: boolean;
  summaryId?: string;
  recipientsNotified: number;
  failedRecipients: string[];
  error?: string;
}

export class SummaryScheduler {
  private summaryGenerator: SummaryGenerator;
  private notificationDispatcher: NotificationDispatcher;
  private notificationBuilder: NotificationBuilder;
  private scheduledConfig: ScheduledSummaryConfig;
  private schedulerInterval?: NodeJS.Timeout;

  constructor(
    summaryGenerator: SummaryGenerator,
    notificationDispatcher: NotificationDispatcher,
    notificationBuilder: NotificationBuilder,
    config?: ScheduledSummaryConfig
  ) {
    this.summaryGenerator = summaryGenerator;
    this.notificationDispatcher = notificationDispatcher;
    this.notificationBuilder = notificationBuilder;
    this.scheduledConfig = config || {
      dayOfWeek: 0, // Sunday
      hour: 18, // 6 PM
      minute: 0,
      enabled: true,
    };
  }

  /**
   * Calculate milliseconds until next scheduled time
   */
  private getMillisecondsUntilNextSchedule(): number {
    const now = new Date();
    const next = new Date();

    // Set to next occurrence of scheduled day and time
    const daysUntilScheduled = (this.scheduledConfig.dayOfWeek - now.getDay() + 7) % 7;
    const daysToAdd = daysUntilScheduled === 0 && (now.getHours() > this.scheduledConfig.hour || (now.getHours() === this.scheduledConfig.hour && now.getMinutes() >= this.scheduledConfig.minute)) ? 7 : daysUntilScheduled;

    next.setDate(now.getDate() + daysToAdd);
    next.setHours(this.scheduledConfig.hour, this.scheduledConfig.minute, 0, 0);

    return Math.max(0, next.getTime() - now.getTime());
  }

  /**
   * Start the scheduler
   */
  startScheduler(): void {
    if (!this.scheduledConfig.enabled) {
      console.log('Summary scheduler is disabled');
      return;
    }

    if (this.schedulerInterval) {
      console.log('Summary scheduler is already running');
      return;
    }

    const scheduleNext = () => {
      const msUntilNext = this.getMillisecondsUntilNextSchedule();
      console.log(`Summary scheduler will run in ${Math.round(msUntilNext / 1000 / 60)} minutes`);

      this.schedulerInterval = setTimeout(async () => {
        try {
          console.log('Running scheduled summary generation');
          // This would be called with actual family data
          // For now, just schedule the next run
        } catch (error) {
          console.error('Error in scheduled summary generation:', error);
        }

        scheduleNext();
      }, msUntilNext);
    };

    scheduleNext();
  }

  /**
   * Stop the scheduler
   */
  stopScheduler(): void {
    if (this.schedulerInterval) {
      clearTimeout(this.schedulerInterval);
      this.schedulerInterval = undefined;
      console.log('Summary scheduler stopped');
    }
  }

  /**
   * Generate and distribute summary for a family
   */
  async generateAndDistributeSummary(
    familyId: string,
    events: Event[],
    familyMembers: Array<{ id: string; email: string; name: string }>,
    notificationPreferences: Map<string, { channels: ('email' | 'in_app')[]; enabled: boolean }>
  ): Promise<SummaryDistributionResult> {
    try {
      // Generate upcoming week summary
      const summary = this.summaryGenerator.generateUpcomingWeekSummary(familyId, events);

      // Get summary data for notification
      const summaryData = this.summaryGenerator.getSummaryDataForNotification(summary);

      // Build notification content
      const notificationContent = this.notificationBuilder.buildWeeklySummaryNotification(
        summary.weekStartDate,
        summary.weekEndDate,
        summaryData,
        'Family'
      );

      // Distribute to all family members
      const failedRecipients: string[] = [];
      let successCount = 0;

      for (const member of familyMembers) {
        const preferences = notificationPreferences.get(member.id);

        // Skip if member has opted out
        if (preferences && !preferences.enabled) {
          continue;
        }

        const channels = preferences?.channels || ['email'];

        try {
          // Send via email if requested
          if (channels.includes('email')) {
            await this.notificationDispatcher.sendEmailNotification(
              member.email,
              notificationContent.subject,
              notificationContent.htmlContent,
              notificationContent.plainText
            );
          }

          // Send via in-app if requested
          if (channels.includes('in_app')) {
            await this.notificationDispatcher.sendInAppNotification(
              member.id,
              notificationContent.subject,
              notificationContent.plainText
            );
          }

          successCount++;
        } catch (error) {
          console.error(`Failed to send summary to ${member.email}:`, error);
          failedRecipients.push(member.id);
        }
      }

      return {
        success: true,
        summaryId: `summary-${familyId}-${Date.now()}`,
        recipientsNotified: successCount,
        failedRecipients,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        recipientsNotified: 0,
        failedRecipients: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Update scheduler configuration
   */
  updateConfig(config: Partial<ScheduledSummaryConfig>): void {
    this.scheduledConfig = {
      ...this.scheduledConfig,
      ...config,
    };

    // Restart scheduler if it's running
    if (this.schedulerInterval) {
      this.stopScheduler();
      this.startScheduler();
    }
  }

  /**
   * Get current scheduler configuration
   */
  getConfig(): ScheduledSummaryConfig {
    return { ...this.scheduledConfig };
  }

  /**
   * Check if scheduler is running
   */
  isRunning(): boolean {
    return this.schedulerInterval !== undefined;
  }

  /**
   * Get time until next scheduled run
   */
  getTimeUntilNextRun(): number {
    return this.getMillisecondsUntilNextSchedule();
  }
}
