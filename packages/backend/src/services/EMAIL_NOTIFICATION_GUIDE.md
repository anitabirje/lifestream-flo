# Email Notification Service Implementation Guide

## Overview

The Email Notification Service provides reliable email delivery for Flo Family Calendar notifications including threshold alerts, weekly summaries, conflict alerts, and event updates. The service integrates with SendGrid for production email delivery and includes comprehensive retry logic with exponential backoff.

## Features

- **SendGrid Integration**: Production-ready email delivery via SendGrid API
- **Retry Logic**: Exponential backoff retry strategy for failed sends
- **Email Validation**: Built-in email address validation
- **Batch Sending**: Support for sending multiple emails efficiently
- **HTML & Plain Text**: Support for both HTML and plain text email formats
- **Error Handling**: Comprehensive error handling and logging
- **Configuration**: Flexible configuration for different environments

## Installation

The service requires the SendGrid mail package:

```bash
npm install @sendgrid/mail
```

## Configuration

### Environment Variables

Add the following to your `.env` file:

```env
# SendGrid Configuration
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
EMAIL_FROM_ADDRESS=noreply@floapp.com
EMAIL_FROM_NAME=Flo Family Calendar
EMAIL_MAX_RETRIES=3
EMAIL_RETRY_DELAY_MS=1000
```

### Configuration Object

```typescript
interface EmailConfig {
  sendGridApiKey: string;      // SendGrid API key (required)
  fromEmail: string;           // From email address (required)
  fromName?: string;           // From name (optional, defaults to "Flo Family Calendar")
  maxRetries?: number;         // Max retry attempts (optional, defaults to 3)
  retryDelayMs?: number;       // Initial retry delay in ms (optional, defaults to 1000)
}
```

## Usage

### Basic Email Sending

```typescript
import { EmailNotificationService } from './services/email-notification-service';

// Initialize the service
const emailService = new EmailNotificationService({
  sendGridApiKey: process.env.SENDGRID_API_KEY!,
  fromEmail: process.env.EMAIL_FROM_ADDRESS!,
  fromName: process.env.EMAIL_FROM_NAME,
  maxRetries: parseInt(process.env.EMAIL_MAX_RETRIES || '3'),
  retryDelayMs: parseInt(process.env.EMAIL_RETRY_DELAY_MS || '1000'),
});

// Send an email
const result = await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Threshold Alert: Work exceeded',
  plainText: 'You have exceeded your work time threshold...',
  htmlContent: '<html><body>You have exceeded your work time threshold...</body></html>',
});

if (result.success) {
  console.log(`Email sent successfully. Message ID: ${result.messageId}`);
} else {
  console.error(`Failed to send email: ${result.error}`);
}
```

### Integration with NotificationDispatcher

The NotificationDispatcher has been updated to use the EmailNotificationService:

```typescript
import { NotificationDispatcher } from './services/notification-dispatcher';
import { EmailNotificationService } from './services/email-notification-service';

// Create email service
const emailService = new EmailNotificationService({
  sendGridApiKey: process.env.SENDGRID_API_KEY!,
  fromEmail: process.env.EMAIL_FROM_ADDRESS!,
});

// Create dispatcher with email service
const dispatcher = new NotificationDispatcher(dataAccess, emailService);

// Queue and dispatch notifications
const payload = {
  recipientId: 'user-123',
  familyId: 'family-456',
  type: 'threshold_alert' as const,
  subject: 'Threshold Alert',
  content: 'You have exceeded your threshold',
  htmlContent: '<html><body>You have exceeded your threshold</body></html>',
  channels: ['email', 'in_app'],
};

const result = await dispatcher.queueNotification(payload);
```

### Batch Email Sending

```typescript
const payloads = [
  {
    to: 'user1@example.com',
    subject: 'Weekly Summary',
    plainText: 'Your weekly summary...',
  },
  {
    to: 'user2@example.com',
    subject: 'Weekly Summary',
    plainText: 'Your weekly summary...',
  },
];

const results = await emailService.sendBatchEmails(payloads);
results.forEach((result, index) => {
  if (result.success) {
    console.log(`Email ${index + 1} sent successfully`);
  } else {
    console.error(`Email ${index + 1} failed: ${result.error}`);
  }
});
```

### Email Address Validation

```typescript
// Validate email addresses
const isValid = EmailNotificationService.isValidEmail('user@example.com');
console.log(isValid); // true

const isInvalid = EmailNotificationService.isValidEmail('not-an-email');
console.log(isInvalid); // false
```

### Service Status

```typescript
const status = emailService.getStatus();
console.log(status);
// Output:
// {
//   initialized: true,
//   fromEmail: 'noreply@floapp.com',
//   maxRetries: 3
// }
```

## Email Templates

### Threshold Alert Email

```typescript
const htmlContent = `
  <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        .header { background-color: #f0f0f0; padding: 20px; }
        .content { padding: 20px; }
        .alert { color: #d32f2f; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Threshold Alert</h1>
      </div>
      <div class="content">
        <p>Hi John,</p>
        <p class="alert">You have exceeded your Work time threshold!</p>
        <p>Current hours: 45 hours</p>
        <p>Threshold: 40 hours</p>
        <p>Excess: 5 hours</p>
      </div>
    </body>
  </html>
`;
```

### Weekly Summary Email

```typescript
const htmlContent = `
  <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f0f0f0; }
      </style>
    </head>
    <body>
      <h1>Weekly Summary - Jan 1-7, 2024</h1>
      <table>
        <tr>
          <th>Category</th>
          <th>Hours</th>
          <th>Target</th>
          <th>Status</th>
        </tr>
        <tr>
          <td>Work</td>
          <td>40</td>
          <td>40</td>
          <td>✓ On Target</td>
        </tr>
        <tr>
          <td>Health/Fitness</td>
          <td>2</td>
          <td>5</td>
          <td>⚠ Below Target</td>
        </tr>
      </table>
    </body>
  </html>
`;
```

## Retry Logic

The service implements exponential backoff retry logic:

- **Initial Delay**: 1000ms (configurable)
- **Backoff Multiplier**: 2x per attempt
- **Max Delay**: 30 seconds
- **Max Retries**: 3 (configurable)

Example retry sequence:
1. First attempt: Immediate
2. First retry: 1000ms delay
3. Second retry: 2000ms delay
4. Third retry: 4000ms delay

### Retryable Errors

The service automatically retries on these errors:
- Network timeouts
- Connection refused
- Connection reset
- Rate limiting (429, 503, 502, 504)

### Non-Retryable Errors

The service does not retry on:
- Invalid email address
- Authentication failure
- Invalid API key
- Permanent delivery failures

## Error Handling

```typescript
const result = await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Test',
  plainText: 'Test content',
});

if (!result.success) {
  console.error(`Email failed after ${result.retryCount} retries: ${result.error}`);
  
  // Log to monitoring system
  // Send alert to administrators
  // Queue for manual retry
}
```

## Integration with NotificationDispatcher

The NotificationDispatcher now supports email delivery:

```typescript
// Dispatch a notification with email channel
const dispatchResult = await dispatcher.dispatchNotification(
  notificationId,
  recipientId,
  'user@example.com',
  'Threshold Alert',
  '<html>...</html>',
  'Plain text version',
  ['email', 'in_app']
);

console.log(dispatchResult);
// Output:
// {
//   notificationId: 'notif-123',
//   status: 'sent',
//   channels: {
//     email: { status: 'sent', messageId: 'msg-456' },
//     in_app: { status: 'sent' }
//   },
//   createdAt: Date,
//   sentAt: Date
// }
```

## Testing

The service includes comprehensive tests covering:

- Email address validation
- Email payload structure
- Service configuration
- Batch email sending
- Email formatting (HTML and plain text)
- Subject line validation
- Content validation
- Retry configuration

Run tests:

```bash
npm test -- email-notification-service.test.ts
```

## Production Deployment

### SendGrid Setup

1. Create a SendGrid account at https://sendgrid.com
2. Generate an API key with Mail Send permissions
3. Add the API key to your environment variables
4. Verify your sender email address in SendGrid

### Environment Configuration

```env
# Production
SENDGRID_API_KEY=SG.your_production_api_key
EMAIL_FROM_ADDRESS=noreply@floapp.com
EMAIL_FROM_NAME=Flo Family Calendar
EMAIL_MAX_RETRIES=5
EMAIL_RETRY_DELAY_MS=2000
```

### Monitoring

Monitor email delivery:

```typescript
// Log email metrics
const result = await emailService.sendEmail(payload);
if (result.success) {
  metrics.increment('email.sent', { type: payload.type });
} else {
  metrics.increment('email.failed', { type: payload.type });
  alerts.send(`Email delivery failed: ${result.error}`);
}
```

## Troubleshooting

### "API key does not start with SG."

**Issue**: Invalid SendGrid API key format

**Solution**: Ensure your SendGrid API key starts with "SG." and is correctly set in environment variables

### "Invalid email address"

**Issue**: Email address validation failed

**Solution**: Verify the email address format is valid (user@domain.com)

### "Rate limit exceeded"

**Issue**: Too many emails sent too quickly

**Solution**: The service will automatically retry with exponential backoff. Consider implementing rate limiting at the application level.

### "Authentication failed"

**Issue**: SendGrid API key is invalid or expired

**Solution**: Regenerate your SendGrid API key and update environment variables

## Future Enhancements

- [ ] Support for email templates in SendGrid
- [ ] Delivery tracking and bounce handling
- [ ] Unsubscribe link management
- [ ] A/B testing support
- [ ] Email scheduling
- [ ] Attachment support
- [ ] Multi-language email templates
- [ ] Email preference center integration

## References

- [SendGrid Documentation](https://docs.sendgrid.com/)
- [SendGrid Node.js Library](https://github.com/sendgrid/sendgrid-nodejs)
- [Email Best Practices](https://docs.sendgrid.com/for-developers/sending-email/email-best-practices)
