/**
 * Property-Based Tests for Notification Content
 * 
 * Feature: flo-family-calendar
 * Property 18: Threshold Notification Content
 * Property 19: Notification Delivery Channels
 * Validates: Requirements 5.3, 5.4, 5a.3, 5a.4
 * 
 * These tests verify that notifications are built with required content
 * and support multiple delivery channels (email and in-app).
 */

import * as fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';
import { NotificationBuilder } from '../services/notification-builder';
import { ThresholdViolation } from '../services/threshold-monitor';

describe('Property 18: Threshold Notification Content', () => {
  let notificationBuilder: NotificationBuilder;

  beforeAll(() => {
    notificationBuilder = new NotificationBuilder();
  });

  // Arbitrary for category names
  const categoryNameArb = fc.oneof(
    fc.constant('Work'),
    fc.constant('Family Time'),
    fc.constant('Health/Fitness'),
    fc.constant('Upskilling'),
    fc.constant('Relaxation')
  );

  // Arbitrary for hours
  const hoursArb = fc.float({ min: Math.fround(0.1), max: Math.fround(168) });

  // Arbitrary for recipient names
  const recipientNameArb = fc.string({ minLength: 2, maxLength: 50 });

  it('should build max threshold notification with required content', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryNameArb,
        hoursArb,
        hoursArb,
        recipientNameArb,
        async (categoryName, currentHours, thresholdHours, recipientName) => {
          fc.pre(currentHours > thresholdHours); // Ensure violation

          const violation: ThresholdViolation = {
            type: 'max_exceeded',
            thresholdId: uuidv4(),
            categoryId: uuidv4(),
            categoryName,
            familyMemberId: uuidv4(),
            currentHours,
            thresholdHours,
            violationTime: new Date(),
          };

          const notification = notificationBuilder.buildMaxThresholdNotification(violation, recipientName);

          // Verify required content
          expect(notification.subject).toBeTruthy();
          expect(notification.plainText).toBeTruthy();
          expect(notification.htmlContent).toBeTruthy();

          // Verify subject contains category name
          expect(notification.subject).toContain(categoryName);

          // Verify content contains key information
          expect(notification.plainText).toContain(recipientName);
          expect(notification.plainText).toContain(categoryName);
          expect(notification.plainText).toContain(currentHours.toFixed(1));
          expect(notification.plainText).toContain(thresholdHours.toString());

          // Verify HTML content contains key information
          expect(notification.htmlContent).toContain(recipientName);
          expect(notification.htmlContent).toContain(categoryName);
          expect(notification.htmlContent).toContain(currentHours.toFixed(1));
          expect(notification.htmlContent).toContain(thresholdHours.toString());

          // Verify HTML is well-formed
          expect(notification.htmlContent).toContain('<html>');
          expect(notification.htmlContent).toContain('</html>');
          expect(notification.htmlContent).toContain('<body');
          expect(notification.htmlContent).toContain('</body>');
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should build min threshold notification with required content', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryNameArb,
        hoursArb,
        hoursArb,
        recipientNameArb,
        async (categoryName, currentHours, thresholdHours, recipientName) => {
          fc.pre(currentHours < thresholdHours); // Ensure violation

          const violation: ThresholdViolation = {
            type: 'min_not_met',
            thresholdId: uuidv4(),
            categoryId: uuidv4(),
            categoryName,
            familyMemberId: uuidv4(),
            currentHours,
            thresholdHours,
            violationTime: new Date(),
          };

          const notification = notificationBuilder.buildMinThresholdNotification(violation, recipientName);

          // Verify required content
          expect(notification.subject).toBeTruthy();
          expect(notification.plainText).toBeTruthy();
          expect(notification.htmlContent).toBeTruthy();

          // Verify subject contains category name
          expect(notification.subject).toContain(categoryName);

          // Verify content contains key information
          expect(notification.plainText).toContain(recipientName);
          expect(notification.plainText).toContain(categoryName);
          expect(notification.plainText).toContain(currentHours.toFixed(1));
          expect(notification.plainText).toContain(thresholdHours.toString());

          // Verify HTML content contains key information
          expect(notification.htmlContent).toContain(recipientName);
          expect(notification.htmlContent).toContain(categoryName);
          expect(notification.htmlContent).toContain(currentHours.toFixed(1));
          expect(notification.htmlContent).toContain(thresholdHours.toString());

          // Verify HTML is well-formed
          expect(notification.htmlContent).toContain('<html>');
          expect(notification.htmlContent).toContain('</html>');
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should include excess/shortfall hours in notification', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryNameArb,
        hoursArb,
        hoursArb,
        recipientNameArb,
        async (categoryName, currentHours, thresholdHours, recipientName) => {
          fc.pre(currentHours > thresholdHours); // Ensure max violation

          const violation: ThresholdViolation = {
            type: 'max_exceeded',
            thresholdId: uuidv4(),
            categoryId: uuidv4(),
            categoryName,
            familyMemberId: uuidv4(),
            currentHours,
            thresholdHours,
            violationTime: new Date(),
          };

          const notification = notificationBuilder.buildMaxThresholdNotification(violation, recipientName);
          const excessHours = currentHours - thresholdHours;

          // Verify excess hours are included
          expect(notification.plainText).toContain(excessHours.toFixed(1));
          expect(notification.htmlContent).toContain(excessHours.toFixed(1));
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should build weekly summary notification with required content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 50 }),
        fc.array(categoryNameArb, { minLength: 1, maxLength: 5 }),
        categoryNameArb,
        hoursArb,
        fc.array(fc.string({ minLength: 5, maxLength: 100 }), { minLength: 1, maxLength: 3 }),
        recipientNameArb,
        async (totalEvents, categories, topCategory, topHours, insights, recipientName) => {
          const weekStartDate = new Date('2024-01-01');
          const weekEndDate = new Date('2024-01-07');

          const summaryData = {
            totalEvents,
            categoriesTracked: categories,
            topCategory: { name: topCategory, hours: topHours },
            insights,
          };

          const notification = notificationBuilder.buildWeeklySummaryNotification(
            weekStartDate,
            weekEndDate,
            summaryData,
            recipientName
          );

          // Verify required content
          expect(notification.subject).toBeTruthy();
          expect(notification.plainText).toBeTruthy();
          expect(notification.htmlContent).toBeTruthy();

          // Verify content contains key information
          expect(notification.plainText).toContain(recipientName);
          expect(notification.plainText).toContain(totalEvents.toString());
          expect(notification.plainText).toContain(topCategory);

          // Verify HTML content contains key information
          expect(notification.htmlContent).toContain(recipientName);
          expect(notification.htmlContent).toContain(totalEvents.toString());
          expect(notification.htmlContent).toContain(topCategory);

          // Verify insights are included
          for (const insight of insights) {
            expect(notification.plainText).toContain(insight);
            expect(notification.htmlContent).toContain(insight);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should build conflict alert notification with required content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 50 }),
        fc.string({ minLength: 5, maxLength: 50 }),
        fc.string({ minLength: 5, maxLength: 50 }),
        fc.string({ minLength: 5, maxLength: 50 }),
        recipientNameArb,
        async (event1Title, event1Time, event2Title, event2Time, recipientName) => {
          const conflictDetails = {
            event1Title,
            event1Time,
            event2Title,
            event2Time,
            familyMemberName: 'John Doe',
          };

          const notification = notificationBuilder.buildConflictAlertNotification(conflictDetails, recipientName);

          // Verify required content
          expect(notification.subject).toBeTruthy();
          expect(notification.plainText).toBeTruthy();
          expect(notification.htmlContent).toBeTruthy();

          // Verify content contains key information
          expect(notification.plainText).toContain(recipientName);
          expect(notification.plainText).toContain(event1Title);
          expect(notification.plainText).toContain(event2Title);

          // Verify HTML content contains key information
          expect(notification.htmlContent).toContain(recipientName);
          expect(notification.htmlContent).toContain(event1Title);
          expect(notification.htmlContent).toContain(event2Title);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should build event update notification with required content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 50 }),
        fc.oneof(fc.constant('created' as const), fc.constant('updated' as const), fc.constant('deleted' as const)),
        fc.string({ minLength: 5, maxLength: 50 }),
        fc.string({ minLength: 5, maxLength: 50 }),
        recipientNameArb,
        async (eventTitle, updateType, eventDate, eventTime, recipientName) => {
          const eventDetails = {
            date: eventDate,
            time: eventTime,
            location: 'Test Location',
            description: 'Test Description',
          };

          const notification = notificationBuilder.buildEventUpdateNotification(
            eventTitle,
            updateType,
            eventDetails,
            recipientName
          );

          // Verify required content
          expect(notification.subject).toBeTruthy();
          expect(notification.plainText).toBeTruthy();
          expect(notification.htmlContent).toBeTruthy();

          // Verify content contains key information
          expect(notification.plainText).toContain(recipientName);
          expect(notification.plainText).toContain(eventTitle);
          expect(notification.plainText).toContain(eventDate);
          expect(notification.plainText).toContain(eventTime);

          // Verify HTML content contains key information
          expect(notification.htmlContent).toContain(recipientName);
          expect(notification.htmlContent).toContain(eventTitle);
          expect(notification.htmlContent).toContain(eventDate);
          expect(notification.htmlContent).toContain(eventTime);
        }
      ),
      { numRuns: 30 }
    );
  });
});

describe('Property 19: Notification Delivery Channels', () => {
  let notificationBuilder: NotificationBuilder;

  beforeAll(() => {
    notificationBuilder = new NotificationBuilder();
  });

  // Arbitrary for category names
  const categoryNameArb = fc.oneof(
    fc.constant('Work'),
    fc.constant('Family Time'),
    fc.constant('Health/Fitness'),
    fc.constant('Upskilling'),
    fc.constant('Relaxation')
  );

  // Arbitrary for hours
  const hoursArb = fc.float({ min: Math.fround(0.1), max: Math.fround(168) });

  // Arbitrary for recipient names
  const recipientNameArb = fc.string({ minLength: 2, maxLength: 50 });

  it('should support email channel for threshold notifications', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryNameArb,
        hoursArb,
        hoursArb,
        recipientNameArb,
        async (categoryName, currentHours, thresholdHours, recipientName) => {
          fc.pre(currentHours > thresholdHours);

          const violation: ThresholdViolation = {
            type: 'max_exceeded',
            thresholdId: uuidv4(),
            categoryId: uuidv4(),
            categoryName,
            familyMemberId: uuidv4(),
            currentHours,
            thresholdHours,
            violationTime: new Date(),
          };

          const notification = notificationBuilder.buildMaxThresholdNotification(violation, recipientName);

          // Verify email-compatible content
          expect(notification.plainText).toBeTruthy();
          expect(notification.plainText.length).toBeGreaterThan(0);

          // Verify HTML email content
          expect(notification.htmlContent).toBeTruthy();
          expect(notification.htmlContent).toContain('<html>');
          expect(notification.htmlContent).toContain('</html>');
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should support in-app channel for threshold notifications', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryNameArb,
        hoursArb,
        hoursArb,
        recipientNameArb,
        async (categoryName, currentHours, thresholdHours, recipientName) => {
          fc.pre(currentHours > thresholdHours);

          const violation: ThresholdViolation = {
            type: 'max_exceeded',
            thresholdId: uuidv4(),
            categoryId: uuidv4(),
            categoryName,
            familyMemberId: uuidv4(),
            currentHours,
            thresholdHours,
            violationTime: new Date(),
          };

          const notification = notificationBuilder.buildMaxThresholdNotification(violation, recipientName);

          // Verify in-app compatible content (plain text)
          expect(notification.plainText).toBeTruthy();
          expect(notification.plainText.length).toBeGreaterThan(0);

          // Verify subject for in-app display
          expect(notification.subject).toBeTruthy();
          expect(notification.subject.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should provide both plain text and HTML for multi-channel delivery', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryNameArb,
        hoursArb,
        hoursArb,
        recipientNameArb,
        async (categoryName, currentHours, thresholdHours, recipientName) => {
          fc.pre(currentHours > thresholdHours);

          const violation: ThresholdViolation = {
            type: 'max_exceeded',
            thresholdId: uuidv4(),
            categoryId: uuidv4(),
            categoryName,
            familyMemberId: uuidv4(),
            currentHours,
            thresholdHours,
            violationTime: new Date(),
          };

          const notification = notificationBuilder.buildMaxThresholdNotification(violation, recipientName);

          // Verify both formats are available
          expect(notification.plainText).toBeTruthy();
          expect(notification.htmlContent).toBeTruthy();

          // Verify they contain similar information
          expect(notification.plainText).toContain(categoryName);
          expect(notification.htmlContent).toContain(categoryName);

          expect(notification.plainText).toContain(recipientName);
          expect(notification.htmlContent).toContain(recipientName);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should include subject line for all notification types', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryNameArb,
        hoursArb,
        hoursArb,
        recipientNameArb,
        async (categoryName, currentHours, thresholdHours, recipientName) => {
          fc.pre(currentHours > thresholdHours);

          const violation: ThresholdViolation = {
            type: 'max_exceeded',
            thresholdId: uuidv4(),
            categoryId: uuidv4(),
            categoryName,
            familyMemberId: uuidv4(),
            currentHours,
            thresholdHours,
            violationTime: new Date(),
          };

          const notification = notificationBuilder.buildMaxThresholdNotification(violation, recipientName);

          // Verify subject is present and meaningful
          expect(notification.subject).toBeTruthy();
          expect(notification.subject.length).toBeGreaterThan(5);
          expect(notification.subject.length).toBeLessThan(200);

          // Verify subject contains relevant information
          expect(notification.subject).toContain(categoryName);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should format HTML content properly for email clients', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryNameArb,
        hoursArb,
        hoursArb,
        recipientNameArb,
        async (categoryName, currentHours, thresholdHours, recipientName) => {
          fc.pre(currentHours > thresholdHours);

          const violation: ThresholdViolation = {
            type: 'max_exceeded',
            thresholdId: uuidv4(),
            categoryId: uuidv4(),
            categoryName,
            familyMemberId: uuidv4(),
            currentHours,
            thresholdHours,
            violationTime: new Date(),
          };

          const notification = notificationBuilder.buildMaxThresholdNotification(violation, recipientName);

          // Verify HTML structure
          expect(notification.htmlContent).toContain('<html>');
          expect(notification.htmlContent).toContain('</html>');
          expect(notification.htmlContent).toContain('<body');
          expect(notification.htmlContent).toContain('</body>');

          // Verify inline styles for email compatibility
          expect(notification.htmlContent).toContain('style=');

          // Verify tables for data presentation
          expect(notification.htmlContent).toContain('<table');
          expect(notification.htmlContent).toContain('</table>');
        }
      ),
      { numRuns: 30 }
    );
  });
});
