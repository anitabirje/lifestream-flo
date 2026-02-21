/**
 * Notification Builder Service
 * Constructs notification messages with required content
 * Supports email and in-app notification formats
 */

import { ThresholdViolation } from './threshold-monitor';

export interface NotificationContent {
  subject: string;
  plainText: string;
  htmlContent: string;
}

export interface NotificationMessage {
  id: string;
  type: 'threshold_alert' | 'weekly_summary' | 'event_update' | 'conflict_alert';
  recipientId: string;
  familyId: string;
  subject: string;
  content: string;
  htmlContent?: string;
  channels: ('email' | 'in_app')[];
  createdAt: Date;
}

export class NotificationBuilder {
  /**
   * Build a maximum threshold violation notification
   */
  buildMaxThresholdNotification(violation: ThresholdViolation, recipientName: string): NotificationContent {
    const subject = `⚠️ Time Limit Exceeded: ${violation.categoryName}`;

    const plainText = `
Hi ${recipientName},

${violation.categoryName} time limit has been exceeded.

Current Time: ${violation.currentHours.toFixed(1)} hours
Threshold: ${violation.thresholdHours} hours
Excess: ${(violation.currentHours - violation.thresholdHours).toFixed(1)} hours

Please review your schedule and consider adjusting your activities.

Best regards,
Flo Calendar
    `.trim();

    const htmlContent = `
<html>
  <body style="font-family: Arial, sans-serif; color: #333;">
    <h2 style="color: #EF4444;">⚠️ Time Limit Exceeded: ${violation.categoryName}</h2>
    <p>Hi ${recipientName},</p>
    <p>${violation.categoryName} time limit has been exceeded.</p>
    <table style="border-collapse: collapse; margin: 20px 0;">
      <tr style="background-color: #f5f5f5;">
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Current Time</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${violation.currentHours.toFixed(1)} hours</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Threshold</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${violation.thresholdHours} hours</td>
      </tr>
      <tr style="background-color: #f5f5f5;">
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Excess</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd; color: #EF4444;"><strong>${(violation.currentHours - violation.thresholdHours).toFixed(1)} hours</strong></td>
      </tr>
    </table>
    <p>Please review your schedule and consider adjusting your activities.</p>
    <p>Best regards,<br/>Flo Calendar</p>
  </body>
</html>
    `.trim();

    return { subject, plainText, htmlContent };
  }

  /**
   * Build a minimum threshold violation notification
   */
  buildMinThresholdNotification(violation: ThresholdViolation, recipientName: string): NotificationContent {
    const subject = `📊 Insufficient Time: ${violation.categoryName}`;

    const plainText = `
Hi ${recipientName},

You haven't spent enough time on ${violation.categoryName} this week.

Current Time: ${violation.currentHours.toFixed(1)} hours
Minimum Target: ${violation.thresholdHours} hours
Shortfall: ${(violation.thresholdHours - violation.currentHours).toFixed(1)} hours

Consider scheduling more time for this activity to meet your goals.

Best regards,
Flo Calendar
    `.trim();

    const htmlContent = `
<html>
  <body style="font-family: Arial, sans-serif; color: #333;">
    <h2 style="color: #F59E0B;">📊 Insufficient Time: ${violation.categoryName}</h2>
    <p>Hi ${recipientName},</p>
    <p>You haven't spent enough time on ${violation.categoryName} this week.</p>
    <table style="border-collapse: collapse; margin: 20px 0;">
      <tr style="background-color: #f5f5f5;">
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Current Time</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${violation.currentHours.toFixed(1)} hours</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Minimum Target</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${violation.thresholdHours} hours</td>
      </tr>
      <tr style="background-color: #f5f5f5;">
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Shortfall</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd; color: #F59E0B;"><strong>${(violation.thresholdHours - violation.currentHours).toFixed(1)} hours</strong></td>
      </tr>
    </table>
    <p>Consider scheduling more time for this activity to meet your goals.</p>
    <p>Best regards,<br/>Flo Calendar</p>
  </body>
</html>
    `.trim();

    return { subject, plainText, htmlContent };
  }

  /**
   * Build a generic threshold alert notification
   */
  buildThresholdAlertNotification(
    categoryName: string,
    currentHours: number,
    thresholdHours: number,
    violationType: 'max' | 'min',
    recipientName: string
  ): NotificationContent {
    const violation: ThresholdViolation = {
      type: violationType === 'max' ? 'max_exceeded' : 'min_not_met',
      thresholdId: '',
      categoryId: '',
      categoryName,
      familyMemberId: '',
      currentHours,
      thresholdHours,
      violationTime: new Date(),
    };

    return violationType === 'max'
      ? this.buildMaxThresholdNotification(violation, recipientName)
      : this.buildMinThresholdNotification(violation, recipientName);
  }

  /**
   * Build a weekly summary notification
   */
  buildWeeklySummaryNotification(
    weekStartDate: Date,
    weekEndDate: Date,
    summaryData: {
      totalEvents: number;
      categoriesTracked: string[];
      topCategory: { name: string; hours: number };
      insights: string[];
    },
    recipientName: string
  ): NotificationContent {
    const weekStr = `${weekStartDate.toLocaleDateString()} - ${weekEndDate.toLocaleDateString()}`;

    const subject = `📅 Weekly Calendar Summary: ${weekStr}`;

    const plainText = `
Hi ${recipientName},

Here's your weekly calendar summary for ${weekStr}:

Total Events: ${summaryData.totalEvents}
Categories Tracked: ${summaryData.categoriesTracked.join(', ')}
Top Activity: ${summaryData.topCategory.name} (${summaryData.topCategory.hours.toFixed(1)} hours)

Insights:
${summaryData.insights.map((insight) => `• ${insight}`).join('\n')}

Keep up the great work!

Best regards,
Flo Calendar
    `.trim();

    const htmlContent = `
<html>
  <body style="font-family: Arial, sans-serif; color: #333;">
    <h2 style="color: #3B82F6;">📅 Weekly Calendar Summary</h2>
    <p>Hi ${recipientName},</p>
    <p>Here's your weekly calendar summary for <strong>${weekStr}</strong>:</p>
    <table style="border-collapse: collapse; margin: 20px 0;">
      <tr style="background-color: #f5f5f5;">
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Total Events</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${summaryData.totalEvents}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Categories Tracked</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${summaryData.categoriesTracked.join(', ')}</td>
      </tr>
      <tr style="background-color: #f5f5f5;">
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Top Activity</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${summaryData.topCategory.name} (${summaryData.topCategory.hours.toFixed(1)} hours)</td>
      </tr>
    </table>
    <h3>Insights:</h3>
    <ul>
      ${summaryData.insights.map((insight) => `<li>${insight}</li>`).join('\n')}
    </ul>
    <p>Keep up the great work!</p>
    <p>Best regards,<br/>Flo Calendar</p>
  </body>
</html>
    `.trim();

    return { subject, plainText, htmlContent };
  }

  /**
   * Build a conflict alert notification
   */
  buildConflictAlertNotification(
    conflictDetails: {
      event1Title: string;
      event1Time: string;
      event2Title: string;
      event2Time: string;
      familyMemberName: string;
    },
    recipientName: string
  ): NotificationContent {
    const subject = `⚠️ Schedule Conflict Detected`;

    const plainText = `
Hi ${recipientName},

A schedule conflict has been detected for ${conflictDetails.familyMemberName}:

Event 1: ${conflictDetails.event1Title}
Time: ${conflictDetails.event1Time}

Event 2: ${conflictDetails.event2Title}
Time: ${conflictDetails.event2Time}

Please review and resolve this conflict in your calendar.

Best regards,
Flo Calendar
    `.trim();

    const htmlContent = `
<html>
  <body style="font-family: Arial, sans-serif; color: #333;">
    <h2 style="color: #EF4444;">⚠️ Schedule Conflict Detected</h2>
    <p>Hi ${recipientName},</p>
    <p>A schedule conflict has been detected for <strong>${conflictDetails.familyMemberName}</strong>:</p>
    <div style="background-color: #FEE2E2; padding: 15px; border-left: 4px solid #EF4444; margin: 20px 0;">
      <p><strong>Event 1:</strong> ${conflictDetails.event1Title}</p>
      <p><strong>Time:</strong> ${conflictDetails.event1Time}</p>
      <hr style="border: none; border-top: 1px solid #FECACA; margin: 10px 0;" />
      <p><strong>Event 2:</strong> ${conflictDetails.event2Title}</p>
      <p><strong>Time:</strong> ${conflictDetails.event2Time}</p>
    </div>
    <p>Please review and resolve this conflict in your calendar.</p>
    <p>Best regards,<br/>Flo Calendar</p>
  </body>
</html>
    `.trim();

    return { subject, plainText, htmlContent };
  }

  /**
   * Build an event update notification
   */
  buildEventUpdateNotification(
    eventTitle: string,
    updateType: 'created' | 'updated' | 'deleted',
    eventDetails: {
      date: string;
      time: string;
      location?: string;
      description?: string;
    },
    recipientName: string
  ): NotificationContent {
    const actionText = updateType === 'created' ? 'created' : updateType === 'updated' ? 'updated' : 'deleted';
    const subject = `📝 Event ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}: ${eventTitle}`;

    const plainText = `
Hi ${recipientName},

An event has been ${actionText}:

Event: ${eventTitle}
Date: ${eventDetails.date}
Time: ${eventDetails.time}
${eventDetails.location ? `Location: ${eventDetails.location}` : ''}
${eventDetails.description ? `Description: ${eventDetails.description}` : ''}

Best regards,
Flo Calendar
    `.trim();

    const htmlContent = `
<html>
  <body style="font-family: Arial, sans-serif; color: #333;">
    <h2 style="color: #3B82F6;">📝 Event ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}</h2>
    <p>Hi ${recipientName},</p>
    <p>An event has been ${actionText}:</p>
    <table style="border-collapse: collapse; margin: 20px 0;">
      <tr style="background-color: #f5f5f5;">
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Event</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${eventTitle}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Date</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${eventDetails.date}</td>
      </tr>
      <tr style="background-color: #f5f5f5;">
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Time</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${eventDetails.time}</td>
      </tr>
      ${eventDetails.location ? `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Location</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${eventDetails.location}</td>
      </tr>
      ` : ''}
      ${eventDetails.description ? `
      <tr style="background-color: #f5f5f5;">
        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Description</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${eventDetails.description}</td>
      </tr>
      ` : ''}
    </table>
    <p>Best regards,<br/>Flo Calendar</p>
  </body>
</html>
    `.trim();

    return { subject, plainText, htmlContent };
  }
}
