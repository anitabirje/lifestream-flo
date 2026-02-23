# Credential Encryption and Storage Guide

## Overview

The Flo Family Calendar system implements comprehensive credential encryption and storage for calendar source credentials (Google Calendar, Outlook, school apps, etc.). This guide documents the encryption strategy, implementation, and best practices.

## Architecture

### Encryption Strategy

The system uses **AES-256-CBC** encryption for all sensitive credentials:

- **Algorithm**: AES-256-CBC (Advanced Encryption Standard with 256-bit key)
- **Key Derivation**: PBKDF2-like scrypt with 100,000 iterations
- **IV (Initialization Vector)**: Randomly generated for each encryption (16 bytes)
- **Salt**: Randomly generated for each credential (16 bytes)

### Storage Locations

#### Development/Testing
- Credentials stored in DynamoDB with encrypted fields
- Encryption key derived from environment variables
- Suitable for development and testing only

#### Production (Recommended)
- Credentials stored in DynamoDB with encrypted fields
- Encryption keys managed by AWS Secrets Manager
- Automatic key rotation support
- Audit logging via CloudTrail

## Implementation

### CredentialEncryptionService

The `CredentialEncryptionService` class provides the following methods:

#### Encryption

```typescript
// Encrypt entire credentials object
const encrypted = CredentialEncryptionService.encryptCredentials(credentials);
// Returns: { encrypted, iv, salt, algorithm }

// Encrypt only sensitive fields
const encrypted = CredentialEncryptionService.encryptSensitiveFields(credentials);
// Returns: credentials with sensitive fields encrypted
```

#### Decryption

```typescript
// Decrypt entire credentials object
const decrypted = CredentialEncryptionService.decryptCredentials(encryptedData);
// Returns: original credentials object

// Decrypt only sensitive fields
const decrypted = CredentialEncryptionService.decryptSensitiveFields(credentials);
// Returns: credentials with sensitive fields decrypted
```

#### Utilities

```typescript
// Mask credentials for logging
const masked = CredentialEncryptionService.maskCredentials(credentials);
// Returns: credentials with sensitive fields masked (e.g., "test...5678")

// Validate credentials structure
const isValid = CredentialEncryptionService.validateCredentials(credentials);
// Returns: boolean

// Check if credentials are expired
const isExpired = CredentialEncryptionService.isCredentialExpired(credentials);
// Returns: boolean

// Check if credentials need refresh
const needsRefresh = CredentialEncryptionService.needsRefresh(credentials);
// Returns: boolean (true if expiring within 5 minutes)

// Get time remaining until expiration
const timeRemaining = CredentialEncryptionService.getCredentialExpirationTime(credentials);
// Returns: milliseconds until expiration or null
```

## Credential Types

### Google Calendar

```typescript
{
  type: 'google',
  accessToken: 'ya29.a0AfH6SMBx...',
  refreshToken: '1//0gF...',
  expiresAt: new Date('2024-01-15T10:30:00Z'),
  email: 'user@gmail.com'
}
```

### Outlook Calendar

```typescript
{
  type: 'outlook',
  accessToken: 'EwAoA8l6BAAR...',
  refreshToken: 'M.R3_BAY...',
  expiresAt: new Date('2024-01-15T10:30:00Z'),
  email: 'user@outlook.com'
}
```

### School Apps (SeeSaw, Connect Now, SEQTA)

```typescript
{
  type: 'kids_school',
  email: 'parent@example.com',
  password: 'encrypted-password',
  schoolId: 'school-123',
  appType: 'seesaw' | 'connect-now' | 'seqta'
}
```

### Custom API

```typescript
{
  type: 'kids_connect',
  apiKey: 'api-key-12345',
  apiSecret: 'api-secret-67890',
  endpoint: 'https://api.example.com'
}
```

## Environment Configuration

### Development

```bash
# .env file
ENCRYPTION_KEY=your-encryption-key-here
ENCRYPTION_SALT=your-salt-here
```

### Production (AWS Secrets Manager)

```bash
# Store in AWS Secrets Manager
aws secretsmanager create-secret \
  --name flo/encryption-key \
  --secret-string '{"key":"...","salt":"..."}'
```

## Database Schema

### Encrypted Credentials Storage

```typescript
interface CalendarSourceEntity {
  PK: string;                    // FAMILY#<familyId>
  SK: string;                    // CALENDAR_SOURCE#<sourceId>
  EntityType: 'CALENDAR_SOURCE';
  id: string;
  familyId: string;
  familyMemberId: string;
  type: 'google' | 'outlook' | 'kids_school' | 'kids_connect';
  
  // Encrypted credentials
  credentials: {
    encrypted: string;           // Encrypted credential data
    iv: string;                  // Initialization vector (hex)
    salt: string;                // Salt (hex)
    algorithm: string;           // 'aes-256-cbc'
  };
  
  // Metadata
  lastSyncTime: string;          // ISO 8601
  syncStatus: 'active' | 'failed' | 'disconnected';
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
  
  // Expiration tracking
  credentialExpiresAt?: string;  // ISO 8601
  needsRefresh?: boolean;
}
```

## Security Best Practices

### 1. Key Management

- **Never hardcode encryption keys** in source code
- **Use environment variables** for development
- **Use AWS Secrets Manager** for production
- **Rotate keys regularly** (at least annually)
- **Audit key access** via CloudTrail

### 2. Credential Handling

- **Encrypt at rest**: All credentials encrypted in DynamoDB
- **Encrypt in transit**: Use HTTPS/TLS for all API calls
- **Mask in logs**: Never log unencrypted credentials
- **Validate on load**: Check credential structure and expiration
- **Refresh proactively**: Refresh tokens before expiration

### 3. Access Control

- **Principle of least privilege**: Only services that need credentials access them
- **IAM policies**: Restrict DynamoDB access to specific tables/items
- **Audit logging**: Log all credential access and modifications
- **Session management**: Invalidate sessions on credential changes

### 4. Credential Lifecycle

```
1. User connects calendar source
   ↓
2. Credentials received and validated
   ↓
3. Credentials encrypted with AES-256-CBC
   ↓
4. Encrypted credentials stored in DynamoDB
   ↓
5. Periodic refresh checks (daily)
   ↓
6. Proactive refresh if expiring soon (< 5 minutes)
   ↓
7. Automatic re-encryption on key rotation
   ↓
8. Secure deletion on source disconnection
```

## Integration Examples

### Storing Credentials

```typescript
import { CredentialEncryptionService } from './credential-encryption-service';
import { DynamoDBDataAccess } from '../data-access/dynamodb-client';

async function storeCalendarCredentials(
  familyId: string,
  familyMemberId: string,
  credentials: CalendarCredentials
) {
  // Validate credentials
  if (!CredentialEncryptionService.validateCredentials(credentials)) {
    throw new Error('Invalid credentials');
  }

  // Encrypt credentials
  const encrypted = CredentialEncryptionService.encryptCredentials(credentials);

  // Store in database
  const entity = {
    PK: `FAMILY#${familyId}`,
    SK: `CALENDAR_SOURCE#${sourceId}`,
    EntityType: 'CALENDAR_SOURCE',
    credentials: encrypted,
    createdAt: new Date().toISOString(),
  };

  await dataAccess.putItem(entity);
}
```

### Retrieving Credentials

```typescript
async function getCalendarCredentials(
  familyId: string,
  sourceId: string
): Promise<CalendarCredentials> {
  // Retrieve from database
  const entity = await dataAccess.getItem(
    `FAMILY#${familyId}`,
    `CALENDAR_SOURCE#${sourceId}`
  );

  if (!entity) {
    throw new Error('Calendar source not found');
  }

  // Decrypt credentials
  const credentials = CredentialEncryptionService.decryptCredentials(
    entity.credentials
  );

  // Check if refresh needed
  if (CredentialEncryptionService.needsRefresh(credentials)) {
    // Trigger refresh flow
    await refreshCalendarCredentials(familyId, sourceId, credentials);
  }

  return credentials;
}
```

### Logging Credentials Safely

```typescript
// Always mask credentials before logging
const masked = CredentialEncryptionService.maskCredentials(credentials);
console.log('Credentials:', masked);
// Output: { type: 'google', accessToken: 'ya29...5678', ... }
```

## Testing

The credential encryption service includes comprehensive property-based tests:

```bash
# Run tests
npm test -- credential-encryption-service.test.ts

# Property 70: Credential Encryption
# - Verifies AES-256-CBC encryption
# - Validates unique IV generation
# - Ensures encrypted data is not readable

# Property 71: Credential Decryption Round Trip
# - Verifies round-trip encryption/decryption
# - Validates data integrity
# - Tests with various credential types
```

## Troubleshooting

### Decryption Failures

**Problem**: "Failed to decrypt credentials"

**Solutions**:
1. Verify encryption key matches (check `ENCRYPTION_KEY` environment variable)
2. Verify salt matches (check `ENCRYPTION_SALT` environment variable)
3. Check if credentials were encrypted with different key
4. Verify IV and salt are valid hex strings

### Expired Credentials

**Problem**: Calendar sync fails with "Unauthorized"

**Solutions**:
1. Check credential expiration: `CredentialEncryptionService.isCredentialExpired()`
2. Trigger refresh: `refreshCalendarCredentials()`
3. Verify refresh token is valid
4. Re-authenticate if refresh fails

### Performance Issues

**Problem**: Slow credential encryption/decryption

**Solutions**:
1. Reduce iteration count (currently 100,000) - trade-off with security
2. Cache decrypted credentials in memory (with TTL)
3. Use connection pooling for DynamoDB
4. Consider AWS KMS for key management

## Migration Guide

### Migrating from Unencrypted to Encrypted Storage

```typescript
async function migrateCredentialsToEncrypted() {
  // 1. Retrieve all unencrypted credentials
  const sources = await dataAccess.query('FAMILY#*', 'CALENDAR_SOURCE#');

  // 2. Encrypt each credential
  for (const source of sources) {
    if (!source.credentials.encrypted) {
      // Old format - encrypt it
      const encrypted = CredentialEncryptionService.encryptCredentials(
        source.credentials
      );

      // 3. Update in database
      source.credentials = encrypted;
      await dataAccess.putItem(source);
    }
  }
}
```

## References

- [NIST Cryptographic Standards](https://csrc.nist.gov/projects/cryptographic-standards-and-guidelines/)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [AWS Secrets Manager Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
