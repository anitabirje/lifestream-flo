/**
 * Property-based tests for password hashing
 * Property 33: Password Hashing
 * Validates: Requirements 8.4
 */

import * as fc from 'fast-check';
import { PasswordManager } from '../auth/password-manager';
import bcrypt from 'bcrypt';

describe('Property 33: Password Hashing', () => {
  const passwordManager = new PasswordManager();

  it('should hash any password using bcrypt with minimum 12 rounds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (password) => {
          const hash = await passwordManager.hash(password);
          
          // Verify hash is not empty
          expect(hash).toBeTruthy();
          expect(hash.length).toBeGreaterThan(0);
          
          // Verify hash is different from original password
          expect(hash).not.toBe(password);
          
          // Verify hash starts with bcrypt identifier
          expect(hash).toMatch(/^\$2[aby]\$/);
          
          // Extract rounds from hash and verify >= 12
          const rounds = bcrypt.getRounds(hash);
          expect(rounds).toBeGreaterThanOrEqual(12);
          
          // Verify the hashed password can be verified
          const isValid = await passwordManager.verify(password, hash);
          expect(isValid).toBe(true);
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  it('should produce different hashes for the same password (salt)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (password) => {
          const hash1 = await passwordManager.hash(password);
          const hash2 = await passwordManager.hash(password);
          
          // Hashes should be different due to salt
          expect(hash1).not.toBe(hash2);
          
          // But both should verify correctly
          expect(await passwordManager.verify(password, hash1)).toBe(true);
          expect(await passwordManager.verify(password, hash2)).toBe(true);
        }
      ),
      { numRuns: 10 }
    );
  }, 30000);

  it('should reject incorrect passwords', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (password, wrongPassword) => {
          fc.pre(password !== wrongPassword); // Only test when passwords are different
          
          const hash = await passwordManager.hash(password);
          const isValid = await passwordManager.verify(wrongPassword, hash);
          
          expect(isValid).toBe(false);
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  it('should handle empty password gracefully', async () => {
    await expect(passwordManager.hash('')).rejects.toThrow('Password cannot be empty');
  });

  it('should return false for empty password verification', async () => {
    const hash = await passwordManager.hash('validPassword');
    const isValid = await passwordManager.verify('', hash);
    expect(isValid).toBe(false);
  });

  it('should return false for empty hash verification', async () => {
    const isValid = await passwordManager.verify('password', '');
    expect(isValid).toBe(false);
  });
});
