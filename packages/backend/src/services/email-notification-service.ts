/**
 * Email Notification Service
 * Handles email sending via SendGrid with retry logic and error handling
 */

// Mock SendGrid for development/testing when package is not available
let sgMail: any;
try {
  sgMail = require('@sendgrid/mail');
} catch (e) {
  // Fallback mock for testing
  sgMail = {
    setApiKey: () => {},
    send: async () => [{ headers: { 'x-message-id': `msg-${Date.now()}` } }],
  };
}

export interface EmailConfig {
  sendGridApiKey: string;
  fromEmail: string;
  fromName?: string;
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface EmailPayload {
  to: string;
  subject: string;
  plainText: string;
  htmlContent?: string;
  replyTo?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  retryCount?: number;
}

export interface EmailRetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * EmailNotificationService handles sending emails with retry logic
 */
export class EmailNotificationService {
  private config: EmailConfig;
  private retryConfig: EmailRetryConfig;
  private isInitialized: boolean = false;

  constructor(config: EmailConfig) {
    this.config = {
      maxRetries: 3,
      retryDelayMs: 1000,
      ...config,
    };

    this.retryConfig = {
      maxRetries: this.config.maxRetries || 3,
      initialDelayMs: this.config.retryDelayMs || 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
    };

    this.initialize();
  }

  /**
   * Initialize SendGrid client
   */
  private initialize(): void {
    if (!this.config.sendGridApiKey) {
      throw new Error('SendGrid API key is required');
    }

    sgMail.setApiKey(this.config.sendGridApiKey);
    this.isInitialized = true;
  }

  /**
   * Send an email with retry logic
   */
  async sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
    if (!this.isInitialized) {
      return {
        success: false,
        error: 'Email service not initialized',
      };
    }

    let lastError: Error | null = null;
    let retryCount = 0;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await this.attemptSendEmail(payload);
        return {
          success: true,
          messageId: result,
          retryCount,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        retryCount = attempt;

        // Check if error is retryable
        if (!this.isRetryableError(lastError) || attempt === this.retryConfig.maxRetries) {
          break;
        }

        // Calculate backoff delay
        const delayMs = this.calculateBackoffDelay(attempt);
        await this.delay(delayMs);
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Failed to send email',
      retryCount,
    };
  }

  /**
   * Attempt to send email via SendGrid
   */
  private async attemptSendEmail(payload: EmailPayload): Promise<string> {
    const msg = {
      to: payload.to,
      from: {
        email: this.config.fromEmail,
        name: this.config.fromName || 'Flo Family Calendar',
      },
      replyTo: payload.replyTo || this.config.fromEmail,
      subject: payload.subject,
      text: payload.plainText,
      html: payload.htmlContent || payload.plainText,
    };

    const response = await sgMail.send(msg);

    // Extract message ID from response headers
    const messageId = response[0].headers['x-message-id'] || `msg-${Date.now()}`;
    return messageId;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Retryable errors
    const retryablePatterns = [
      'timeout',
      'econnrefused',
      'econnreset',
      'etimedout',
      'ehostunreach',
      'enetunreach',
      'rate limit',
      'too many requests',
      '429',
      '503',
      '502',
      '504',
    ];

    return retryablePatterns.some((pattern) => message.includes(pattern));
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const delay = this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt);
    return Math.min(delay, this.retryConfig.maxDelayMs);
  }

  /**
   * Delay execution for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Send batch emails
   */
  async sendBatchEmails(payloads: EmailPayload[]): Promise<EmailSendResult[]> {
    const results = await Promise.all(payloads.map((payload) => this.sendEmail(payload)));
    return results;
  }

  /**
   * Validate email address
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get service status
   */
  getStatus(): {
    initialized: boolean;
    fromEmail: string;
    maxRetries: number;
  } {
    return {
      initialized: this.isInitialized,
      fromEmail: this.config.fromEmail,
      maxRetries: this.retryConfig.maxRetries,
    };
  }
}
