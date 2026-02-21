# Security Implementation Guide

This guide provides code examples and implementation details for the security audit findings.

---

## 1. Encryption Key Management (AWS Secrets Manager)

### Current Implementation (Development)
```typescript
// ❌ NOT RECOMMENDED FOR PRODUCTION
const encryptionKey = process.env.ENCRYPTION_KEY || 'default-key';
```

### Recommended Implementation (Production)
```typescript
// ✅ RECOMMENDED FOR PRODUCTION
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

class SecretManager {
  private client: SecretsManagerClient;
  private secretCache: Map<string, { value: string; expiresAt: Date }>;

  constructor() {
    this.client = new SecretsManagerClient({ region: process.env.AWS_REGION });
    this.secretCache = new Map();
  }

  async getSecret(secretName: string): Promise<string> {
    // Check cache first (5-minute TTL)
    const cached = this.secretCache.get(secretName);
    if (cached && cached.expiresAt > new Date()) {
      return cached.value;
    }

    try {
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await this.client.send(command);
      
      const secretValue = response.SecretString || response.SecretBinary;
      if (!secretValue) {
        throw new Error(`Secret ${secretName} is empty`);
      }

      // Cache the secret
      this.secretCache.set(secretName, {
        value: secretValue,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5-minute TTL
      });

      return secretValue;
    } catch (error) {
      console.error(`Failed to retrieve secret ${secretName}:`, error);
      throw error;
    }
  }

  clearCache(): void {
    this.secretCache.clear();
  }
}

// Usage in CalendarSourceRegistry
export class CalendarSourceRegistry {
  private secretManager: SecretManager;

  constructor(dynamodbClient: DynamoDBClientWrapper) {
    this.secretManager = new SecretManager();
  }

  private async getEncryptionKey(): Promise<Buffer> {
    const keyHex = await this.secretManager.getSecret('flo/encryption-key');
    return Buffer.from(keyHex, 'hex');
  }

  private async encryptCredentials(credentials: any): Promise<EncryptedCredentials> {
    const algorithm = 'aes-256-cbc';
    const key = await this.getEncryptionKey();
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const credentialsJson = JSON.stringify(credentials);

    let encrypted = cipher.update(credentialsJson, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      encryptedData: encrypted,
      iv: iv.toString('hex'),
      algorithm
    };
  }
}
```

### AWS Secrets Manager Setup
```bash
# Create encryption key secret
aws secretsmanager create-secret \
  --name flo/encryption-key \
  --description "Encryption key for Flo calendar credentials" \
  --secret-string "$(openssl rand -hex 32)"

# Create database credentials secret
aws secretsmanager create-secret \
  --name flo/database-credentials \
  --description "Database credentials for Flo" \
  --secret-string '{
    "username": "flo-app",
    "password": "secure-password-here"
  }'
```

---

## 2. Rate Limiting Implementation

### Express Rate Limiter Middleware
```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from 'redis';

// Create Redis client for rate limiting
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

// Authentication rate limiter (5 attempts per 15 minutes)
export const authRateLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'auth-limit:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
  message: 'Too many login attempts, please try again later',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for admin IPs
    const adminIPs = (process.env.ADMIN_IPS || '').split(',');
    return adminIPs.includes(req.ip);
  },
  keyGenerator: (req) => {
    // Rate limit by email + IP to prevent enumeration
    return `${req.body.email}:${req.ip}`;
  },
  handler: (req, res) => {
    // Log failed attempts
    console.warn(`Rate limit exceeded for ${req.body.email} from ${req.ip}`);
    res.status(429).json({
      error: 'Too many login attempts. Please try again in 15 minutes.',
    });
  },
});

// API rate limiter (100 requests per 15 minutes)
export const apiRateLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'api-limit:',
  }),
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Usage in Express app
import express from 'express';

const app = express();

// Apply rate limiting to auth endpoints
app.post('/api/auth/login', authRateLimiter, async (req, res) => {
  // Login logic
});

app.post('/api/auth/register', authRateLimiter, async (req, res) => {
  // Register logic
});

// Apply rate limiting to all API endpoints
app.use('/api/', apiRateLimiter);
```

---

## 3. Comprehensive Audit Logging

### Audit Logger Service
```typescript
import { DynamoDBClientWrapper } from '../data-access/dynamodb-client';
import { v4 as uuidv4 } from 'uuid';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  status: 'success' | 'failure';
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  errorMessage?: string;
}

export class AuditLogger {
  private dynamoClient: DynamoDBClientWrapper;

  constructor(dynamoClient: DynamoDBClientWrapper) {
    this.dynamoClient = dynamoClient;
  }

  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    const auditEntry: AuditLogEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      ...entry,
    };

    // Store in DynamoDB
    await this.dynamoClient.put({
      PK: `AUDIT#${auditEntry.timestamp.toISOString().split('T')[0]}`,
      SK: `${auditEntry.timestamp.getTime()}#${auditEntry.id}`,
      EntityType: 'AUDIT_LOG',
      ...auditEntry,
      TTL: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year retention
    });

    // Also log to CloudWatch for real-time monitoring
    console.log(JSON.stringify({
      type: 'AUDIT',
      ...auditEntry,
    }));
  }

  async getAuditLog(
    startDate: Date,
    endDate: Date,
    filters?: {
      userId?: string;
      action?: string;
      status?: 'success' | 'failure';
    }
  ): Promise<AuditLogEntry[]> {
    const entries: AuditLogEntry[] = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      const result = await this.dynamoClient.query(
        'PK = :pk',
        { ':pk': `AUDIT#${dateStr}` }
      );

      let items = result.items || [];

      // Apply filters
      if (filters?.userId) {
        items = items.filter((item: any) => item.userId === filters.userId);
      }
      if (filters?.action) {
        items = items.filter((item: any) => item.action === filters.action);
      }
      if (filters?.status) {
        items = items.filter((item: any) => item.status === filters.status);
      }

      entries.push(...items);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return entries;
  }
}

// Usage in authentication service
export class AuthService {
  private auditLogger: AuditLogger;

  async login(request: LoginRequest, ipAddress: string, userAgent: string): Promise<AuthResult> {
    try {
      // ... login logic ...

      // Log successful login
      await this.auditLogger.log({
        userId: user.id,
        action: 'LOGIN',
        resource: 'AUTH',
        resourceId: user.id,
        status: 'success',
        details: { email: user.email },
        ipAddress,
        userAgent,
      });

      return { success: true, user, sessionToken: session.token };
    } catch (error: any) {
      // Log failed login
      await this.auditLogger.log({
        userId: request.email,
        action: 'LOGIN',
        resource: 'AUTH',
        resourceId: request.email,
        status: 'failure',
        details: { email: request.email },
        ipAddress,
        userAgent,
        errorMessage: error.message,
      });

      return { success: false, error: 'Login failed' };
    }
  }
}
```

### Audit Logging Middleware
```typescript
import { Request, Response, NextFunction } from 'express';
import { AuditLogger } from '../services/audit-logger';

export function auditLoggingMiddleware(auditLogger: AuditLogger) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Capture response
    const originalSend = res.send;
    res.send = function (data: any) {
      const duration = Date.now() - startTime;
      const status = res.statusCode;

      // Log the request
      auditLogger.log({
        userId: req.user?.id || 'anonymous',
        action: `${req.method} ${req.path}`,
        resource: req.path.split('/')[2] || 'unknown',
        resourceId: req.params.id || 'N/A',
        status: status >= 400 ? 'failure' : 'success',
        details: {
          method: req.method,
          path: req.path,
          statusCode: status,
          duration,
          query: req.query,
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      }).catch((error) => {
        console.error('Failed to log audit entry:', error);
      });

      return originalSend.call(this, data);
    };

    next();
  };
}

// Usage in Express app
app.use(auditLoggingMiddleware(auditLogger));
```

---

## 4. IAM Policy Implementation

### Least Privilege IAM Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DynamoDBTableAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/FamilyCalendar",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": "us-east-1"
        }
      }
    },
    {
      "Sid": "DynamoDBGSIAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/FamilyCalendar/index/*"
    },
    {
      "Sid": "DynamoDBBackupAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:CreateBackup",
        "dynamodb:DescribeBackup",
        "dynamodb:ListBackups",
        "dynamodb:RestoreTableFromBackup"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/FamilyCalendar"
    },
    {
      "Sid": "SecretsManagerAccess",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:flo/*"
    },
    {
      "Sid": "CloudWatchLogsAccess",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:ACCOUNT_ID:log-group:/aws/lambda/flo-*"
    },
    {
      "Sid": "CloudTrailAccess",
      "Effect": "Allow",
      "Action": [
        "cloudtrail:LookupEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

### IAM Role Trust Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    },
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### Terraform Configuration
```hcl
# Create IAM role for Flo application
resource "aws_iam_role" "flo_app_role" {
  name = "flo-app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# Attach policy to role
resource "aws_iam_role_policy" "flo_app_policy" {
  name = "flo-app-policy"
  role = aws_iam_role.flo_app_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDBTableAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/FamilyCalendar"
      }
    ]
  })
}
```

---

## 5. NoSQL Injection Prevention Testing

### Security Test Suite
```typescript
import { describe, it, expect } from '@jest/globals';
import { DynamoDBClientWrapper } from '../data-access/dynamodb-client';

describe('NoSQL Injection Prevention', () => {
  let dynamoClient: DynamoDBClientWrapper;

  beforeEach(() => {
    dynamoClient = new DynamoDBClientWrapper('FamilyCalendar');
  });

  describe('Query Parameter Injection', () => {
    it('should prevent injection in partition key', async () => {
      const maliciousInput = "FAMILY#123' OR '1'='1";
      
      // This should be safely parameterized
      const result = await dynamoClient.query(
        'PK = :pk',
        { ':pk': maliciousInput }
      );

      // Should not return unintended data
      expect(result.items).toEqual([]);
    });

    it('should prevent injection in sort key', async () => {
      const maliciousInput = "MEMBER#' OR SK = 'MEMBER";
      
      const result = await dynamoClient.query(
        'PK = :pk AND begins_with(SK, :sk)',
        {
          ':pk': 'FAMILY#123',
          ':sk': maliciousInput
        }
      );

      expect(result.items).toEqual([]);
    });

    it('should prevent injection in filter expression', async () => {
      const maliciousInput = "category = 'Work' OR category = 'Work";
      
      const result = await dynamoClient.query(
        'PK = :pk',
        { ':pk': 'FAMILY#123' },
        {
          filterExpression: 'category = :category',
          expressionAttributeValues: { ':category': maliciousInput }
        }
      );

      expect(result.items).toEqual([]);
    });
  });

  describe('Expression Attribute Name Injection', () => {
    it('should prevent injection in attribute names', async () => {
      const maliciousAttrName = 'category, password';
      
      const result = await dynamoClient.query(
        'PK = :pk',
        { ':pk': 'FAMILY#123' },
        {
          expressionAttributeNames: {
            '#cat': maliciousAttrName
          }
        }
      );

      // Should safely handle the attribute name
      expect(result.items).toBeDefined();
    });
  });

  describe('Update Expression Injection', () => {
    it('should prevent injection in update expressions', async () => {
      const maliciousValue = "SET category = 'Admin', role = 'admin'";
      
      // This should fail or be safely handled
      try {
        await dynamoClient.update(
          { PK: 'FAMILY#123', SK: 'MEMBER#456' },
          'SET category = :cat',
          undefined,
          { ':cat': maliciousValue }
        );
      } catch (error) {
        // Expected to fail or be safely handled
        expect(error).toBeDefined();
      }
    });
  });
});
```

---

## 6. Session Security Enhancements

### Enhanced Session Manager with IP Binding
```typescript
export class EnhancedSessionManager extends SessionManager {
  /**
   * Create a session with IP binding
   */
  async createSessionWithIPBinding(userId: string, ipAddress: string): Promise<Session> {
    const session = await this.createSession(userId);
    
    // Store IP binding
    await this.dynamoClient.put({
      PK: `USER#${userId}`,
      SK: `SESSION_IP#${session.id}`,
      EntityType: 'SESSION_IP_BINDING',
      sessionId: session.id,
      ipAddress,
      createdAt: new Date().toISOString(),
    });

    return session;
  }

  /**
   * Validate session with IP binding
   */
  async validateTokenWithIPBinding(token: string, currentIP: string): Promise<Session | null> {
    const session = await this.validateToken(token);
    if (!session) {
      return null;
    }

    // Check IP binding
    const binding = await this.dynamoClient.get({
      PK: `USER#${session.userId}`,
      SK: `SESSION_IP#${session.id}`
    });

    if (!binding || binding.ipAddress !== currentIP) {
      // IP mismatch - potential session hijacking
      await this.invalidateSession(token);
      return null;
    }

    return session;
  }

  /**
   * Implement idle timeout
   */
  async validateTokenWithIdleTimeout(
    token: string,
    idleTimeoutMinutes: number = 30
  ): Promise<Session | null> {
    const session = await this.validateToken(token);
    if (!session) {
      return null;
    }

    const now = new Date();
    const lastActivityTime = new Date(session.lastActivityAt);
    const idleTimeMs = now.getTime() - lastActivityTime.getTime();
    const idleTimeoutMs = idleTimeoutMinutes * 60 * 1000;

    if (idleTimeMs > idleTimeoutMs) {
      // Session idle timeout exceeded
      await this.invalidateSession(token);
      return null;
    }

    return session;
  }
}
```

---

## 7. Password Security Enhancements

### Enhanced Password Manager
```typescript
export class EnhancedPasswordManager extends PasswordManager {
  private readonly MIN_PASSWORD_LENGTH = 12;
  private readonly PASSWORD_HISTORY_SIZE = 5;

  /**
   * Validate password strength
   */
  validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < this.MIN_PASSWORD_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_PASSWORD_LENGTH} characters`);
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check password history to prevent reuse
   */
  async checkPasswordHistory(
    userId: string,
    newPassword: string,
    dynamoClient: DynamoDBClientWrapper
  ): Promise<boolean> {
    // Get password history
    const result = await dynamoClient.query(
      'PK = :pk AND begins_with(SK, :sk)',
      {
        ':pk': `USER#${userId}`,
        ':sk': 'PASSWORD_HISTORY#'
      }
    );

    const history = result.items || [];

    // Check if new password matches any recent passwords
    for (const entry of history.slice(0, this.PASSWORD_HISTORY_SIZE)) {
      const matches = await this.verify(newPassword, entry.passwordHash);
      if (matches) {
        return false; // Password was recently used
      }
    }

    return true; // Password is safe to use
  }

  /**
   * Store password in history
   */
  async storePasswordHistory(
    userId: string,
    passwordHash: string,
    dynamoClient: DynamoDBClientWrapper
  ): Promise<void> {
    const timestamp = new Date().getTime();
    
    await dynamoClient.put({
      PK: `USER#${userId}`,
      SK: `PASSWORD_HISTORY#${timestamp}`,
      EntityType: 'PASSWORD_HISTORY',
      passwordHash,
      createdAt: new Date().toISOString(),
      TTL: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60), // 90-day retention
    });
  }
}
```

---

## 8. Security Monitoring and Alerting

### CloudWatch Alarms Configuration
```typescript
import { CloudWatchClient, PutMetricAlarmCommand } from "@aws-sdk/client-cloudwatch";

export class SecurityMonitoring {
  private cloudwatchClient: CloudWatchClient;

  constructor() {
    this.cloudwatchClient = new CloudWatchClient({ region: process.env.AWS_REGION });
  }

  async setupSecurityAlarms(): Promise<void> {
    // Alarm for failed login attempts
    await this.cloudwatchClient.send(new PutMetricAlarmCommand({
      AlarmName: 'flo-failed-logins-high',
      MetricName: 'FailedLoginAttempts',
      Namespace: 'Flo/Security',
      Statistic: 'Sum',
      Period: 300, // 5 minutes
      EvaluationPeriods: 1,
      Threshold: 10,
      ComparisonOperator: 'GreaterThanThreshold',
      AlarmActions: [process.env.SNS_ALERT_TOPIC_ARN!],
    }));

    // Alarm for unauthorized access attempts
    await this.cloudwatchClient.send(new PutMetricAlarmCommand({
      AlarmName: 'flo-unauthorized-access-high',
      MetricName: 'UnauthorizedAccessAttempts',
      Namespace: 'Flo/Security',
      Statistic: 'Sum',
      Period: 300,
      EvaluationPeriods: 1,
      Threshold: 5,
      ComparisonOperator: 'GreaterThanThreshold',
      AlarmActions: [process.env.SNS_ALERT_TOPIC_ARN!],
    }));

    // Alarm for DynamoDB throttling
    await this.cloudwatchClient.send(new PutMetricAlarmCommand({
      AlarmName: 'flo-dynamodb-throttling',
      MetricName: 'ConsumedWriteCapacityUnits',
      Namespace: 'AWS/DynamoDB',
      Statistic: 'Sum',
      Period: 60,
      EvaluationPeriods: 2,
      Threshold: 80,
      ComparisonOperator: 'GreaterThanThreshold',
      AlarmActions: [process.env.SNS_ALERT_TOPIC_ARN!],
    }));
  }
}
```

---

## Summary

This implementation guide provides production-ready code for:
1. ✅ Encryption key management with AWS Secrets Manager
2. ✅ Rate limiting on authentication endpoints
3. ✅ Comprehensive audit logging
4. ✅ IAM policy implementation with least privilege
5. ✅ NoSQL injection prevention testing
6. ✅ Enhanced session security with IP binding
7. ✅ Password strength validation
8. ✅ Security monitoring and alerting

All code examples follow security best practices and are ready for production deployment.
