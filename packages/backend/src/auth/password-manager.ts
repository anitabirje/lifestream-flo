/**
 * Password Manager for secure password hashing and verification
 * Uses bcrypt with minimum 12 rounds as per requirements
 */

import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

export class PasswordManager {
  /**
   * Hash a plain text password using bcrypt
   * @param password - Plain text password to hash
   * @returns Promise resolving to hashed password
   */
  async hash(password: string): Promise<string> {
    if (!password || password.length === 0) {
      throw new Error('Password cannot be empty');
    }
    
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  /**
   * Verify a plain text password against a hashed password
   * @param password - Plain text password to verify
   * @param hash - Hashed password to compare against
   * @returns Promise resolving to true if password matches, false otherwise
   */
  async verify(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }
    
    return bcrypt.compare(password, hash);
  }

  /**
   * Get the number of bcrypt rounds used for hashing
   * @returns Number of bcrypt rounds
   */
  getRounds(): number {
    return BCRYPT_ROUNDS;
  }
}
