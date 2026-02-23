# Flo Family Calendar - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying Flo to AWS. The system uses AWS Secrets Manager to securely store sensitive credentials, and environment variables for configuration.

**Important**: Before uploading to a public repository, ensure all `.env` files are in `.gitignore` (they are by default).

---

## Part 1: Security Audit Results

### ✅ Secrets Management Status

**No hardcoded secrets found in codebase** ✅

All sensitive information is properly externalized:
- AWS credentials → Environment variables
- OAuth secrets → Environment variables  
- API keys → Environment variables
- Session secrets → Environment variables
- Encryption keys → Environment variables

**Files with placeholder values only:**
- `packages/backend/.env.example` - Template with `your_*_here` placeholders
- `packages/frontend/.env.example` - Template with placeholder values
- `.gitignore` - Properly excludes `.env`, `.env.local`, `.env.*.local`

**Safe to upload to public repository** ✅

---

## Part 2: Required AWS Account Setup

### Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **Node.js 18+** and npm installed
4. **Git** installed

### AWS Services Required

- **DynamoDB** - Data persistence
- **Lambda** - Serverless compute
- **API Gateway** - REST API routing
- **Cognito** - User authentication (optional, currently using session-based auth)
- **Secrets Manager** - Credential storage
- **S3** - Frontend hosting
- **CloudFront** - CDN for frontend
- **CloudWatch** - Logging and monitoring
- **SNS** - Event notifications
- **IAM** - Access control

### IAM Permissions Required

Create an IAM user or role with the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:*",
        "lambda:*",
        "apigateway:*",
        "s3:*",
        "cloudfront:*",
        "cloudwatch:*",
        "logs:*",
        "sns:*",
        "secretsmanager:*",
        "iam:*",
        "ec2:*"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## Part 3: Environment Variables

### Backend Environment Variables

**Location**: `packages/backend/.env`

```bash
# AWS Configuration
AWS_REGION=ap-southeast-2                    # Your AWS region
AWS_ACCESS_KEY_ID=AKIA...                    # AWS IAM user access key
AWS_SECRET_ACCESS_KEY=...                    # AWS IAM user secret key

# DynamoDB Configuration
DYNAMODB_TABLE_NAME=FamilyCalendar           # DynamoDB table name
DYNAMODB_ENDPOINT=                           # Leave empty for production (uses AWS)

# Application Configuration
NODE_ENV=production                          # Set to 'production' for deployment
PORT=3001                                    # API server port

# Session Configuration
SESSION_SECRET=<generate-random-string>      # Generate with: openssl rand -base64 32
SESSION_EXPIRY_DAYS=30                       # Session expiration in days

# Password Hashing
BCRYPT_ROUNDS=12                             # Bcrypt hashing rounds (12+ recommended)

# OAuth Configuration - Google Calendar
GOOGLE_OAUTH_CLIENT_ID=...                   # From Google Cloud Console
GOOGLE_OAUTH_CLIENT_SECRET=...               # From Google Cloud Console
GOOGLE_OAUTH_REDIRECT_URI=https://api.yourdomain.com/api/oauth/google/callback

# OAuth Configuration - Outlook/Microsoft Graph
OUTLOOK_OAUTH_CLIENT_ID=...                  # From Azure Portal
OUTLOOK_OAUTH_CLIENT_SECRET=...              # From Azure Portal
OUTLOOK_OAUTH_REDIRECT_URI=https://api.yourdomain.com/api/oauth/outlook/callback

# Encryption Configuration
ENCRYPTION_KEY=<generate-random-string>      # Generate with: openssl rand -base64 32

# Email Notification Configuration
SENDGRID_API_KEY=SG.xxxxx                    # From SendGrid dashboard
EMAIL_FROM_ADDRESS=noreply@yourdomain.com    # Verified sender email
EMAIL_FROM_NAME=Flo Family Calendar          # Display name for emails
EMAIL_MAX_RETRIES=3                          # Email retry attempts
EMAIL_RETRY_DELAY_MS=1000                    # Delay between retries (ms)
```

### Frontend Environment Variables

**Location**: `packages/frontend/.env`

```bash
# API Configuration
VITE_API_ENDPOINT=https://api.yourdomain.com # Backend API URL

# Environment
VITE_ENV=production                          # Set to 'production' for deployment

# Feature Flags
VITE_ENABLE_ANALYTICS=true                   # Enable analytics
VITE_ENABLE_ERROR_REPORTING=true             # Enable error reporting

# Optional: Cognito Configuration (if using Cognito instead of session auth)
VITE_COGNITO_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxx
VITE_COGNITO_CLIENT_ID=xxxxx
VITE_COGNITO_DOMAIN=flo-auth.auth.us-east-1.amazoncognito.com
```

---

## Part 4: AWS Secrets Manager Setup

### Option A: Using AWS CLI

```bash
# Create secrets for backend
aws secretsmanager create-secret \
  --name flo/backend/aws-credentials \
  --secret-string '{
    "AWS_ACCESS_KEY_ID": "AKIA...",
    "AWS_SECRET_ACCESS_KEY": "..."
  }' \
  --region ap-southeast-2

aws secretsmanager create-secret \
  --name flo/backend/oauth \
  --secret-string '{
    "GOOGLE_OAUTH_CLIENT_ID": "...",
    "GOOGLE_OAUTH_CLIENT_SECRET": "...",
    "OUTLOOK_OAUTH_CLIENT_ID": "...",
    "OUTLOOK_OAUTH_CLIENT_SECRET": "..."
  }' \
  --region ap-southeast-2

aws secretsmanager create-secret \
  --name flo/backend/email \
  --secret-string '{
    "SENDGRID_API_KEY": "SG.xxxxx"
  }' \
  --region ap-southeast-2

aws secretsmanager create-secret \
  --name flo/backend/encryption \
  --secret-string '{
    "ENCRYPTION_KEY": "...",
    "SESSION_SECRET": "..."
  }' \
  --region ap-southeast-2
```

### Option B: Using AWS Console

1. Navigate to **AWS Secrets Manager**
2. Click **Store a new secret**
3. Choose **Other type of secret**
4. Enter secret name: `flo/backend/aws-credentials`
5. Enter secret value as JSON
6. Click **Store**
7. Repeat for other secrets

---

## Part 5: DynamoDB Setup

### Create DynamoDB Table

```bash
# Using AWS CLI
aws dynamodb create-table \
  --table-name FamilyCalendar \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI1SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --global-secondary-indexes \
    IndexName=GSI1,Keys=[{AttributeName=GSI1PK,KeyType=HASH},{AttributeName=GSI1SK,KeyType=RANGE}],Projection={ProjectionType=ALL},ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5} \
  --billing-mode PAY_PER_REQUEST \
  --region ap-southeast-2
```

### Enable Point-in-Time Recovery (PITR)

```bash
aws dynamodb update-continuous-backups \
  --table-name FamilyCalendar \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true \
  --region ap-southeast-2
```

### Enable On-Demand Backups

```bash
aws dynamodb create-backup \
  --table-name FamilyCalendar \
  --backup-name FamilyCalendar-backup-$(date +%Y%m%d-%H%M%S) \
  --region ap-southeast-2
```

---

## Part 6: Backend Deployment

### Option A: Deploy to Lambda

```bash
# 1. Build backend
cd packages/backend
npm install
npm run build

# 2. Create Lambda function
aws lambda create-function \
  --function-name flo-api \
  --runtime nodejs18.x \
  --role arn:aws:iam::ACCOUNT_ID:role/lambda-execution-role \
  --handler dist/index.handler \
  --zip-file fileb://dist.zip \
  --environment Variables={NODE_ENV=production,AWS_REGION=ap-southeast-2} \
  --region ap-southeast-2

# 3. Create API Gateway
aws apigateway create-rest-api \
  --name flo-api \
  --description "Flo Family Calendar API" \
  --region ap-southeast-2
```

### Option B: Deploy to EC2 or ECS

```bash
# 1. Build Docker image
cd packages/backend
docker build -t flo-api:latest .

# 2. Push to ECR
aws ecr get-login-password --region ap-southeast-2 | \
  docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.ap-southeast-2.amazonaws.com

docker tag flo-api:latest ACCOUNT_ID.dkr.ecr.ap-southeast-2.amazonaws.com/flo-api:latest
docker push ACCOUNT_ID.dkr.ecr.ap-southeast-2.amazonaws.com/flo-api:latest

# 3. Deploy to ECS or EC2
# (Follow AWS documentation for your chosen service)
```

---

## Part 7: Frontend Deployment

### Deploy to S3 + CloudFront

```bash
# 1. Build frontend
cd packages/frontend
npm install
npm run build

# 2. Create S3 bucket
aws s3 mb s3://flo-app-frontend --region ap-southeast-2

# 3. Upload build files
aws s3 sync dist/ s3://flo-app-frontend/ --delete

# 4. Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name flo-app-frontend.s3.ap-southeast-2.amazonaws.com \
  --default-root-object index.html \
  --region ap-southeast-2
```

### Enable HTTPS

```bash
# Request SSL certificate from ACM
aws acm request-certificate \
  --domain-name flo.example.com \
  --validation-method DNS \
  --region us-east-1  # ACM must be in us-east-1 for CloudFront
```

---

## Part 8: OAuth Configuration

### Google Calendar OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable **Google Calendar API**
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URI: `https://api.yourdomain.com/api/oauth/google/callback`
6. Copy **Client ID** and **Client Secret** to `.env`

### Outlook/Microsoft Graph OAuth

1. Go to [Azure Portal](https://portal.azure.com)
2. Register a new application
3. Add **Microsoft Graph** API permissions
4. Create a client secret
5. Add redirect URI: `https://api.yourdomain.com/api/oauth/outlook/callback`
6. Copy **Client ID** and **Client Secret** to `.env`

---

## Part 9: Email Service Setup

### SendGrid Configuration

1. Create [SendGrid account](https://sendgrid.com)
2. Create API key with **Mail Send** permission
3. Verify sender email address
4. Copy API key to `SENDGRID_API_KEY` in `.env`

### Alternative: AWS SES

```bash
# Verify email address
aws ses verify-email-identity \
  --email-address noreply@yourdomain.com \
  --region ap-southeast-2

# Request production access (if in sandbox)
aws ses put-account-sending-attributes \
  --sending-pool-name default \
  --region ap-southeast-2
```

---

## Part 10: Monitoring & Logging

### CloudWatch Logs

```bash
# Create log group
aws logs create-log-group \
  --log-group-name /aws/lambda/flo-api \
  --region ap-southeast-2

# Set retention policy (30 days)
aws logs put-retention-policy \
  --log-group-name /aws/lambda/flo-api \
  --retention-in-days 30 \
  --region ap-southeast-2
```

### CloudWatch Alarms

```bash
# Create alarm for Lambda errors
aws cloudwatch put-metric-alarm \
  --alarm-name flo-api-errors \
  --alarm-description "Alert when Lambda errors exceed threshold" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --region ap-southeast-2
```

---

## Part 11: Pre-Deployment Checklist

- [ ] AWS account created and configured
- [ ] IAM user/role created with appropriate permissions
- [ ] DynamoDB table created with PITR enabled
- [ ] Secrets Manager secrets created
- [ ] Google OAuth credentials obtained
- [ ] Outlook OAuth credentials obtained
- [ ] SendGrid API key obtained
- [ ] SSL certificate requested from ACM
- [ ] Domain name configured
- [ ] `.env` files created (not committed to git)
- [ ] Backend built and tested locally
- [ ] Frontend built and tested locally
- [ ] Security audit completed
- [ ] All tests passing

---

## Part 12: Post-Deployment Verification

### Test Backend API

```bash
# Test health endpoint
curl https://api.yourdomain.com/api/health

# Test authentication
curl -X POST https://api.yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123"}'
```

### Test Frontend

1. Navigate to `https://flo.yourdomain.com`
2. Verify page loads
3. Test login/signup flow
4. Test calendar view
5. Test dashboard
6. Test notifications

### Monitor Logs

```bash
# View Lambda logs
aws logs tail /aws/lambda/flo-api --follow --region ap-southeast-2

# View DynamoDB metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedWriteCapacityUnits \
  --dimensions Name=TableName,Value=FamilyCalendar \
  --start-time 2026-02-23T00:00:00Z \
  --end-time 2026-02-24T00:00:00Z \
  --period 3600 \
  --statistics Sum \
  --region ap-southeast-2
```

---

## Part 13: Cost Optimization

### DynamoDB

- Use **on-demand billing** for variable workloads (recommended for MVP)
- Use **provisioned capacity** for predictable workloads
- Enable **TTL** for automatic data expiration (3-month retention)

### Lambda

- Set **memory** to 512 MB (balance between cost and performance)
- Set **timeout** to 30 seconds
- Use **reserved concurrency** if needed

### S3 + CloudFront

- Enable **S3 versioning** for rollback capability
- Use **CloudFront caching** to reduce S3 requests
- Enable **S3 lifecycle policies** to archive old versions

### Estimated Monthly Costs (1,000 active users)

| Service | Estimated Cost |
|---------|-----------------|
| DynamoDB (on-demand) | $50-100 |
| Lambda | $20-40 |
| API Gateway | $10-20 |
| S3 + CloudFront | $10-20 |
| SNS | $10-20 |
| CloudWatch | $30-50 |
| Secrets Manager | $5 |
| **Total** | **$135-255/month** |

---

## Part 14: Troubleshooting

### Common Issues

**Issue**: Lambda timeout
- **Solution**: Increase timeout in Lambda configuration, optimize code

**Issue**: DynamoDB throttling
- **Solution**: Switch to on-demand billing or increase provisioned capacity

**Issue**: CORS errors
- **Solution**: Configure API Gateway CORS settings

**Issue**: OAuth redirect URI mismatch
- **Solution**: Verify redirect URI matches exactly in OAuth provider settings

**Issue**: Email not sending
- **Solution**: Check SendGrid API key, verify sender email, check logs

---

## Part 15: Security Best Practices

1. **Rotate credentials regularly** - Update AWS keys, OAuth secrets, API keys every 90 days
2. **Use IAM roles** - Avoid using root account credentials
3. **Enable MFA** - Multi-factor authentication for AWS console access
4. **Monitor access** - Review CloudTrail logs for unauthorized access
5. **Encrypt data** - Use TLS for all communications, AES-256 for data at rest
6. **Backup regularly** - Enable DynamoDB PITR and on-demand backups
7. **Update dependencies** - Keep npm packages up to date
8. **Security headers** - Configure CORS, CSP, X-Frame-Options
9. **Rate limiting** - Implement API rate limiting to prevent abuse
10. **Audit logging** - Log all user actions for compliance

---

## Support

For issues or questions:
1. Check CloudWatch logs
2. Review AWS documentation
3. Contact AWS support
4. Open GitHub issue

