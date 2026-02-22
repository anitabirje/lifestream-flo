/**
 * Security Utilities
 * Handles JWT token management, input sanitization, and security best practices
 */

const TOKEN_KEY = 'authToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const TOKEN_EXPIRY_KEY = 'tokenExpiry';

/**
 * Store JWT token securely in localStorage
 */
export const storeToken = (token: string, expiresIn: number): void => {
  localStorage.setItem(TOKEN_KEY, token);
  const expiryTime = Date.now() + expiresIn * 1000;
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
};

/**
 * Store refresh token securely in localStorage
 */
export const storeRefreshToken = (token: string): void => {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
};

/**
 * Retrieve JWT token from localStorage
 */
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Retrieve refresh token from localStorage
 */
export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (): boolean => {
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!expiry) return true;
  return Date.now() > parseInt(expiry, 10);
};

/**
 * Clear all tokens from localStorage
 */
export const clearTokens = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
};

/**
 * Sanitize user input to prevent XSS attacks
 */
export const sanitizeInput = (input: string): string => {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
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

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Add JWT token to request headers
 */
export const addAuthHeader = (headers: Record<string, string>): Record<string, string> => {
  const token = getToken();
  if (token) {
    return {
      ...headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return headers;
};

/**
 * Decode JWT token (without verification - for client-side use only)
 */
export const decodeToken = (token: string): Record<string, any> | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const decoded = JSON.parse(atob(parts[1]));
    return decoded;
  } catch (err) {
    console.error('Failed to decode token:', err);
    return null;
  }
};

/**
 * Check if token is valid and not expired
 */
export const isTokenValid = (): boolean => {
  const token = getToken();
  if (!token) return false;

  const decoded = decodeToken(token);
  if (!decoded) return false;

  if (decoded.exp) {
    const expiryTime = decoded.exp * 1000;
    return Date.now() < expiryTime;
  }

  return true;
};

/**
 * Rate limiting helper - track failed login attempts
 */
export const trackFailedLogin = (email: string): number => {
  const key = `failed_login_${email}`;
  const attempts = parseInt(localStorage.getItem(key) || '0', 10);
  const newAttempts = attempts + 1;

  localStorage.setItem(key, newAttempts.toString());

  // Reset after 15 minutes
  setTimeout(() => {
    localStorage.removeItem(key);
  }, 15 * 60 * 1000);

  return newAttempts;
};

/**
 * Check if account is locked due to too many failed attempts
 */
export const isAccountLocked = (email: string): boolean => {
  const key = `failed_login_${email}`;
  const attempts = parseInt(localStorage.getItem(key) || '0', 10);
  return attempts >= 5;
};

/**
 * Clear failed login attempts
 */
export const clearFailedLoginAttempts = (email: string): void => {
  const key = `failed_login_${email}`;
  localStorage.removeItem(key);
};

/**
 * Generate CSRF token (for forms)
 */
export const generateCSRFToken = (): string => {
  const token = Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
  sessionStorage.setItem('csrf_token', token);
  return token;
};

/**
 * Verify CSRF token
 */
export const verifyCSRFToken = (token: string): boolean => {
  const storedToken = sessionStorage.getItem('csrf_token');
  return storedToken === token;
};

/**
 * Never log sensitive data
 */
export const safeLog = (message: string, data?: any): void => {
  if (process.env.NODE_ENV === 'development') {
    // Remove sensitive fields before logging
    const safData = data ? { ...data } : undefined;
    if (safData) {
      delete safData.password;
      delete safData.token;
      delete safData.accessToken;
      delete safData.refreshToken;
      delete safData.idToken;
    }
    console.log(message, safData);
  }
};
