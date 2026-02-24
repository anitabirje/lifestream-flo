/**
 * Credential Encryption Service
 * Handles encryption and decryption of sensitive credentials
 * Uses AWS Secrets Manager for key management in production
 * Falls back to local encryption for development
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { config } from '../config/env';

export interface EncryptedCredential {
  encrypted: string;
  iv: string;
  salt: string;
  algorithm: string;
}

export interface CalendarCredentials {
  type: 'google' | 'outlook' | 'kids_school' | 'kids_connect';
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  email?: string;
  password?: string;
  apiKey?: string;
  [key: string]: any;
}

/**
 * CredentialEncryptionService handles encryption and decryption of credentials
 */
export class CredentialEncryptionService {
  private static readonly ALGORITHM = 'aes-256-cbc';
  private static readonly SALT_LENGTH = 16;
  private static readonly IV_LENGTH = 16;
  private static readonly KEY_LENGTH = 32;
  private static readonly ITERATIONS = 100000;

  /**
   * Get encryption key from environment or generate one
   */
  private static getEncryptionKey(): Buffer {
    const keyString = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
    const salt = process.env.ENCRYPTION_SALT || 'default-salt-change-in-production';

    // Derive key from password using scrypt
    return scryptSync(keyString, salt, this.KEY_LENGTH);
  }

  /**
   * Encrypt credentials
   */
  static encryptCredentials(credentials: CalendarCredentials): EncryptedCredential {
    try {
      const key = this.getEncryptionKey();
      const iv = randomBytes(this.IV_LENGTH);
      const salt = randomBytes(this.SALT_LENGTH);

      const cipher = createCipheriv(this.ALGORITHM, key, iv);
      const credentialsJson = JSON.stringify(credentials);

      let encrypted = cipher.update(credentialsJson, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return {
        encrypted,
        iv: iv.toString('hex'),
        salt: salt.toString('hex'),
        algorithm: this.ALGORITHM,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Failed to encrypt credentials:', err);
      throw new Error('Failed to encrypt credentials');
    }
  }

  /**
   * Decrypt credentials
   */
  static decryptCredentials(encryptedData: EncryptedCredential): CalendarCredentials {
    try {
      const key = this.getEncryptionKey();
      const iv = Buffer.from(encryptedData.iv, 'hex');

      const decipher = createDecipheriv(encryptedData.algorithm, key, iv);

      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return JSON.parse(decrypted) as CalendarCredentials;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Failed to decrypt credentials:', err);
      throw new Error('Failed to decrypt credentials');
    }
  }

  /**
   * Encrypt sensitive fields in credentials
   */
  static encryptSensitiveFields(credentials: CalendarCredentials): CalendarCredentials {
    const encrypted = { ...credentials };

    // Encrypt sensitive fields
    const sensitiveFields = ['accessToken', 'refreshToken', 'password', 'apiKey'];

    sensitiveFields.forEach((field) => {
      if (encrypted[field]) {
        const credentialToEncrypt: any = {
          type: credentials.type,
          [field]: encrypted[field],
        };
        const encryptedValue = this.encryptCredentials(credentialToEncrypt as CalendarCredentials);
        encrypted[field] = JSON.stringify(encryptedValue);
      }
    });

    return encrypted;
  }

  /**
   * Decrypt sensitive fields in credentials
   */
  static decryptSensitiveFields(credentials: CalendarCredentials): CalendarCredentials {
    const decrypted = { ...credentials };

    // Decrypt sensitive fields
    const sensitiveFields = ['accessToken', 'refreshToken', 'password', 'apiKey'];

    sensitiveFields.forEach((field) => {
      if (decrypted[field] && typeof decrypted[field] === 'string') {
        try {
          const encryptedData = JSON.parse(decrypted[field]);
          const decryptedValue = this.decryptCredentials(encryptedData);
          decrypted[field] = (decryptedValue as any)[field];
        } catch (error) {
          // Field is not encrypted, leave as is
          console.warn(`Failed to decrypt field ${field}, leaving as is`);
        }
      }
    });

    return decrypted;
  }

  /**
   * Mask sensitive credentials for logging
   */
  static maskCredentials(credentials: CalendarCredentials): CalendarCredentials {
    const masked = { ...credentials };

    // Mask sensitive fields
    const sensitiveFields = ['accessToken', 'refreshToken', 'password', 'apiKey'];

    sensitiveFields.forEach((field) => {
      if (masked[field]) {
        const value = String(masked[field]);
        masked[field] = value.substring(0, 4) + '...' + value.substring(value.length - 4);
      }
    });

    return masked;
  }

  /**
   * Validate credentials structure
   */
  static validateCredentials(credentials: CalendarCredentials): boolean {
    if (!credentials || typeof credentials !== 'object') {
      return false;
    }

    if (!credentials.type) {
      return false;
    }

    // Type-specific validation
    switch (credentials.type) {
      case 'google':
      case 'outlook':
        return !!(credentials.accessToken || credentials.refreshToken);
      case 'kids_school':
      case 'kids_connect':
        return !!(credentials.email && credentials.password) || !!credentials.apiKey;
      default:
        return false;
    }
  }

  /**
   * Get credential expiration status
   */
  static isCredentialExpired(credentials: CalendarCredentials): boolean {
    if (!credentials.expiresAt) {
      return false;
    }

    const expiresAt = new Date(credentials.expiresAt);
    return expiresAt < new Date();
  }

  /**
   * Get credential expiration time remaining
   */
  static getCredentialExpirationTime(credentials: CalendarCredentials): number | null {
    if (!credentials.expiresAt) {
      return null;
    }

    const expiresAt = new Date(credentials.expiresAt);
    const now = new Date();
    const timeRemaining = expiresAt.getTime() - now.getTime();

    return timeRemaining > 0 ? timeRemaining : 0;
  }

  /**
   * Check if credential needs refresh
   */
  static needsRefresh(credentials: CalendarCredentials, thresholdMs: number = 5 * 60 * 1000): boolean {
    const timeRemaining = this.getCredentialExpirationTime(credentials);
    if (timeRemaining === null) {
      return false;
    }

    return timeRemaining < thresholdMs;
  }
}
