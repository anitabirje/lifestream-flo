/**
 * Event-Triggered Summary Service
 * Generates and distributes summary when events change
 * Requirements: 6.5
 */

import { SummaryGenerator, ConsolidatedSummary } from './summary-generator';
import { NotificationDispatcher } from './notification-dispatcher';
import { NotificationBuilder } from './notification-builder';
import { Event } from '../models/event';

export interface EventChangeNotification {
  familyId: string;
  eventId: string;
  changeType: 'created' | 'updated' | 'deleted';
  event?: Event;
  timestamp: Date;
}

export interface EventTriggeredSummaryResult {
  success: boolean;
  summaryGenerated: boolean;
  summaryDistributed: boolean;
  recipientsNotified: number;
  error?: string;
}

export class EventTriggeredSummaryService {
  private summaryGenerator: SummaryGenerator;
  private notificationDispatcher: NotificationDispatcher;
  private notificationBuilder: NotificationBuilder;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private debounceDelayMs: number;

  constructor(
    summaryGenerator: SummaryGenerator,
    notificationDispatcher: NotificationDispatcher,
    notificationBuilder: NotificationBuilder,
    debounceDelayMs: number = 5000 // 5 seconds default
  ) {
    this.summaryGenerator = summaryGenerator;
    this.notificationDispatcher = notificationDispatcher;
    this.notificationBuilder = notificationBuilder;
    this.debounceDelayMs = debounceDelayMs;
  }

  /**
   * Handle event change and trigger summary generation
   * Uses debouncing to avoid generating multiple summaries for rapid changes
   */
  async handleEventChange(
    notification: EventChangeNotification,
    events: Event[],
    familyMembers: Array<{ id: string; email: string; name: string }>,
    notificationPreferences: Map<string, { channels: ('email' | 'in_app')[]; enabled: boolean }>
  ): Promise<EventTriggeredSummaryResult> {
    const debounceKey = `${notification.familyId}`;

    // Clear existing debounce timer
    const existingTimer = this.debounceTimers.get(debounceKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounce timer
    return new Promise((resolve) => {
      const timer = setTimeout(async () => {
        this.debounceTimers.delete(debounceKey);

        try {
          // Generate current week summary
          const summary = this.summaryGenerator.generatePastWeekSummary(notification.familyId, events);

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
          let successCount = 0;
          let hasError = false;

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
              console.error(`Failed to send event-triggered summary to ${member.email}:`, error);
              hasError = true;
            }
          }

          resolve({
            success: !hasError,
            summaryGenerated: true,
            summaryDistributed: successCount > 0,
            recipientsNotified: successCount,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('Error in event-triggered summary generation:', error);

          resolve({
            success: false,
            summaryGenerated: false,
            summaryDistributed: false,
            recipientsNotified: 0,
            error: errorMessage,
          });
        }
      }, this.debounceDelayMs);

      this.debounceTimers.set(debounceKey, timer);
    });
  }

  /**
   * Set debounce delay
   */
  setDebounceDelay(delayMs: number): void {
    this.debounceDelayMs = delayMs;
  }

  /**
   * Get debounce delay
   */
  getDebounceDelay(): number {
    return this.debounceDelayMs;
  }

  /**
   * Clear all pending debounce timers
   */
  clearPendingTimers(): void {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  /**
   * Get number of pending event-triggered summaries
   */
  getPendingCount(): number {
    return this.debounceTimers.size;
  }
}
