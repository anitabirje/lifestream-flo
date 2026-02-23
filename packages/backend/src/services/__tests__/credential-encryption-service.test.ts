/**
 * Tests for Credential Encryption Service
 * Property-based tests for credential encryption and storage
 * Requirements: 1.2, 1.4
 */

import fc from 'fast-check';
import { CredentialEncryptionService, CalendarCredentials, EncryptedCredential } from '../credential-encryption-service';

describe('CredentialEncryptionService', () => {
  describe('encryptCredentials', () => {
    test('should encrypt credentials', () => {
      const credentials: CalendarCredentials = {
        type: 'google',
        accessToken: 'test-access-token-12345',
        refreshToken: 'test-refresh-token-67890',
        expiresAt: new Date(Date.now() + 3600000),
      };

      const encrypted = CredentialEncryptionService.encryptCredentials(credentials);

      expect(encrypted).toBeDefined();
      expect(encrypted.encrypted).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.salt).toBeDefined();
      expect(encrypted.algorithm).toBe('aes-256-cbc');
      expect(encrypted.encrypted).not.toContain('test-access-token');
    });

    /**
     * Property 70: Credential Encryption
     * **Validates: Requirements 1.2, 1.4**
     *
     * For any valid calendar credentials, the service should:
     * 1. Encrypt the credentials using AES-256-CBC
     * 2. Generate a unique IV for each encryption
     * 3. Return encrypted data with IV and salt
     * 4. Ensure encrypted data is not readable without decryption
     */
    test('Property 70: Credential Encryption', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('google'),
            fc.constant('outlook'),
            fc.constant('kids_school'),
            fc.constant('kids_connect')
          ),
          fc.string({ minLength: 10, maxLength: 100 }),
          fc.string({ minLength: 10, maxLength: 100 }),
          async (type, accessToken, refreshToken) => {
            const credentials: CalendarCredentials = {
              type: type as any,
              accessToken,
              refreshToken,
              expiresAt: new Date(Date.now() + 3600000),
            };

            const encrypted = CredentialEncryptionService.encryptCredentials(credentials);

            // Verify encryption properties
            expect(encrypted.encrypted).toBeDefined();
            expect(encrypted.iv).toBeDefined();
            expect(encrypted.salt).toBeDefined();
            expect(encrypted.algorithm).toBe('aes-256-cbc');

            // Verify encrypted data doesn't contain plaintext
            expect(encrypted.encrypted).not.toContain(accessToken);
            expect(encrypted.encrypted).not.toContain(refreshToken);

            // Verify IV is unique (different for each encryption)
            const encrypted2 = CredentialEncryptionService.encryptCredentials(credentials);
            expect(encrypted.iv).not.toBe(encrypted2.iv);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('decryptCredentials', () => {
    test('should decrypt credentials correctly', () => {
      const originalCredentials: CalendarCredentials = {
        type: 'google',
        accessToken: 'test-access-token-12345',
        refreshToken: 'test-refresh-token-67890',
        expiresAt: new Date(Date.now() + 3600000),
      };

      const encrypted = CredentialEncryptionService.encryptCredentials(originalCredentials);
      const decrypted = CredentialEncryptionService.decryptCredentials(encrypted);

      expect(decrypted.type).toBe(originalCredentials.type);
      expect(decrypted.accessToken).toBe(originalCredentials.accessToken);
      expect(decrypted.refreshToken).toBe(originalCredentials.refreshToken);
    });

    /**
     * Property 71: Credential Decryption Round Trip
     * **Validates: Requirements 1.2, 1.4**
     *
     * For any encrypted credentials, the service should:
     * 1. Decrypt the credentials correctly
     * 2. Return the original credentials unchanged
     * 3. Support round-trip encryption/decryption
     */
    test('Property 71: Credential Decryption Round Trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('google'),
            fc.constant('outlook'),
            fc.constant('kids_school'),
            fc.constant('kids_connect')
          ),
          fc.string({ minLength: 10, maxLength: 100 }),
          fc.string({ minLength: 10, maxLength: 100 }),
          async (type, accessToken, refreshToken) => {
            const originalCredentials: CalendarCredentials = {
              type: type as any,
              accessToken,
              refreshToken,
              expiresAt: new Date(Date.now() + 3600000),
            };

            // Encrypt and decrypt
            const encrypted = CredentialEncryptionService.encryptCredentials(originalCredentials);
            const decrypted = CredentialEncryptionService.decryptCredentials(encrypted);

            // Verify round-trip
            expect(decrypted.type).toBe(originalCredentials.type);
            expect(decrypted.accessToken).toBe(originalCredentials.accessToken);
            expect(decrypted.refreshToken).toBe(originalCredentials.refreshToken);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('encryptSensitiveFields', () => {
    test('should encrypt sensitive fields', () => {
      const credentials: CalendarCredentials = {
        type: 'google',
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        password: 'test-password',
        apiKey: 'test-api-key',
      };

      const encrypted = CredentialEncryptionService.encryptSensitiveFields(credentials);

      expect(encrypted.type).toBe('google');
      expect(typeof encrypted.accessToken).toBe('string');
      expect(typeof encrypted.refreshToken).toBe('string');
      expect(typeof encrypted.password).toBe('string');
      expect(typeof encrypted.apiKey).toBe('string');

      // Verify fields are encrypted (contain JSON)
      expect(encrypted.accessToken).toContain('{');
      expect(encrypted.refreshToken).toContain('{');
    });
  });

  describe('decryptSensitiveFields', () => {
    test('should decrypt sensitive fields', () => {
      const originalCredentials: CalendarCredentials = {
        type: 'google',
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        password: 'test-password',
      };

      const encrypted = CredentialEncryptionService.encryptSensitiveFields(originalCredentials);
      const decrypted = CredentialEncryptionService.decryptSensitiveFields(encrypted);

      expect(decrypted.type).toBe('google');
      expect(decrypted.accessToken).toBe('test-access-token');
      expect(decrypted.refreshToken).toBe('test-refresh-token');
      expect(decrypted.password).toBe('test-password');
    });
  });

  describe('maskCredentials', () => {
    test('should mask sensitive credentials', () => {
      const credentials: CalendarCredentials = {
        type: 'google',
        accessToken: 'test-access-token-12345',
        refreshToken: 'test-refresh-token-67890',
      };

      const masked = CredentialEncryptionService.maskCredentials(credentials);

      expect(masked.type).toBe('google');
      expect(masked.accessToken).toMatch(/^test\.\.\.\d{4}$/);
      expect(masked.refreshToken).toMatch(/^test\.\.\.\d{4}$/);
      expect(masked.accessToken).not.toContain('token-12345');
    });
  });

  describe('validateCredentials', () => {
    test('should validate google credentials', () => {
      const validCredentials: CalendarCredentials = {
        type: 'google',
        accessToken: 'test-token',
      };

      expect(CredentialEncryptionService.validateCredentials(validCredentials)).toBe(true);
    });

    test('should validate outlook credentials', () => {
      const validCredentials: CalendarCredentials = {
        type: 'outlook',
        refreshToken: 'test-token',
      };

      expect(CredentialEncryptionService.validateCredentials(validCredentials)).toBe(true);
    });

    test('should validate kids_school credentials', () => {
      const validCredentials: CalendarCredentials = {
        type: 'kids_school',
        email: 'test@example.com',
        password: 'test-password',
      };

      expect(CredentialEncryptionService.validateCredentials(validCredentials)).toBe(true);
    });

    test('should reject invalid credentials', () => {
      const invalidCredentials: CalendarCredentials = {
        type: 'google',
      };

      expect(CredentialEncryptionService.validateCredentials(invalidCredentials)).toBe(false);
    });
  });

  describe('isCredentialExpired', () => {
    test('should detect expired credentials', () => {
      const expiredCredentials: CalendarCredentials = {
        type: 'google',
        accessToken: 'test-token',
        expiresAt: new Date(Date.now() - 1000),
      };

      expect(CredentialEncryptionService.isCredentialExpired(expiredCredentials)).toBe(true);
    });

    test('should detect valid credentials', () => {
      const validCredentials: CalendarCredentials = {
        type: 'google',
        accessToken: 'test-token',
        expiresAt: new Date(Date.now() + 3600000),
      };

      expect(CredentialEncryptionService.isCredentialExpired(validCredentials)).toBe(false);
    });
  });

  describe('needsRefresh', () => {
    test('should detect credentials needing refresh', () => {
      const credentialsNeedingRefresh: CalendarCredentials = {
        type: 'google',
        accessToken: 'test-token',
        expiresAt: new Date(Date.now() + 60000), // Expires in 1 minute
      };

      expect(CredentialEncryptionService.needsRefresh(credentialsNeedingRefresh)).toBe(true);
    });

    test('should detect credentials not needing refresh', () => {
      const validCredentials: CalendarCredentials = {
        type: 'google',
        accessToken: 'test-token',
        expiresAt: new Date(Date.now() + 3600000), // Expires in 1 hour
      };

      expect(CredentialEncryptionService.needsRefresh(validCredentials)).toBe(false);
    });
  });
});
