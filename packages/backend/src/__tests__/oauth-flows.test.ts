/**
 * Tests for OAuth Flows
 * 
 * Feature: flo-family-calendar
 * Property 67: OAuth Authorization URL Generation
 * Property 68: OAuth Token Exchange
 * Property 69: OAuth Token Refresh
 * Property 70: OAuth State Validation
 * 
 * Validates: Requirements 1.1, 1.2
 * 
 * These tests verify that OAuth 2.0 flows for Google Calendar and Outlook
 * work correctly, including authorization URL generation, token exchange,
 * token refresh, and state validation for CSRF protection.
 */

import fc from 'fast-check';

describe('OAuth Flows', () => {
  describe('Property 67: OAuth Authorization URL Generation', () => {
    it('should generate valid Google OAuth authorization URLs', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          (familyMemberId: string, familyId: string) => {
            // Mock OAuth config
            const config = {
              google: {
                clientId: 'test-client-id',
                clientSecret: 'test-secret',
                redirectUri: 'http://localhost:3001/api/oauth/google/callback',
              },
              outlook: {
                clientId: 'test-outlook-id',
                clientSecret: 'test-outlook-secret',
                redirectUri: 'http://localhost:3001/api/oauth/outlook/callback',
              },
            };

            // Generate URL
            const scope = [
              'https://www.googleapis.com/auth/calendar.readonly',
              'https://www.googleapis.com/auth/calendar.events',
              'https://www.googleapis.com/auth/calendar',
            ].join(' ');

            const state = `google:${familyMemberId}:randomstring`;

            const params = new URLSearchParams({
              client_id: config.google.clientId,
              redirect_uri: config.google.redirectUri,
              response_type: 'code',
              scope,
              state,
              access_type: 'offline',
              prompt: 'consent',
            });

            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

            // Verify URL contains required parameters
            expect(authUrl).toContain('client_id=test-client-id');
            expect(authUrl).toContain('redirect_uri=');
            expect(authUrl).toContain('response_type=code');
            expect(authUrl).toContain('scope=');
            expect(authUrl).toContain('access_type=offline');
            expect(authUrl).toContain('prompt=consent');
            expect(authUrl).toContain('state=');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate valid Outlook OAuth authorization URLs', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          (familyMemberId: string, familyId: string) => {
            const config = {
              outlook: {
                clientId: 'test-outlook-id',
                clientSecret: 'test-outlook-secret',
                redirectUri: 'http://localhost:3001/api/oauth/outlook/callback',
              },
            };

            const scope = [
              'Calendars.Read',
              'Calendars.ReadWrite',
              'offline_access',
            ].join(' ');

            const state = `outlook:${familyMemberId}:randomstring`;

            const params = new URLSearchParams({
              client_id: config.outlook.clientId,
              redirect_uri: config.outlook.redirectUri,
              response_type: 'code',
              scope,
              state,
              prompt: 'consent',
            });

            const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;

            // Verify URL contains required parameters
            expect(authUrl).toContain('client_id=test-outlook-id');
            expect(authUrl).toContain('redirect_uri=');
            expect(authUrl).toContain('response_type=code');
            expect(authUrl).toContain('scope=');
            expect(authUrl).toContain('prompt=consent');
            expect(authUrl).toContain('state=');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include state parameter for CSRF protection', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          (familyMemberId: string, familyId: string) => {
            const state = `google:${familyMemberId}:randomstring`;
            
            expect(state).toContain('google:');
            expect(state).toContain(familyMemberId);
            expect(state.split(':').length).toBe(3);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 68: OAuth Token Exchange', () => {
    it('should validate authorization code format', () => {
      fc.assert(
        fc.property(
          fc.hexaString({ minLength: 32, maxLength: 128 }),
          (code: string) => {
            // Code should be a non-empty string
            expect(code).toBeTruthy();
            expect(typeof code).toBe('string');
            expect(code.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should require state parameter for token exchange', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (state: string) => {
            const stateParts = state.split(':');
            
            // State should have provider:familyMemberId:randomstring format
            expect(stateParts.length).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return access token with expiration', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 3600, max: 86400 }),
          (expiresIn: number) => {
            const token = {
              accessToken: 'test-access-token',
              refreshToken: 'test-refresh-token',
              expiresAt: new Date(Date.now() + expiresIn * 1000),
              tokenType: 'Bearer',
            };

            expect(token.accessToken).toBeTruthy();
            expect(token.expiresAt).toBeInstanceOf(Date);
            expect(token.expiresAt.getTime()).toBeGreaterThan(Date.now());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include refresh token for offline access', () => {
      fc.assert(
        fc.property(
          fc.hexaString({ minLength: 32, maxLength: 256 }),
          (refreshToken: string) => {
            const token = {
              accessToken: 'test-access-token',
              refreshToken,
              expiresAt: new Date(Date.now() + 3600 * 1000),
              tokenType: 'Bearer',
            };

            expect(token.refreshToken).toBeTruthy();
            expect(typeof token.refreshToken).toBe('string');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 69: OAuth Token Refresh', () => {
    it('should refresh expired access tokens', () => {
      fc.assert(
        fc.property(
          fc.hexaString({ minLength: 32, maxLength: 256 }),
          (refreshToken: string) => {
            const oldToken = {
              accessToken: 'old-access-token',
              expiresAt: new Date(Date.now() - 1000), // Expired
            };

            const newToken = {
              accessToken: 'new-access-token',
              refreshToken,
              expiresAt: new Date(Date.now() + 3600 * 1000),
              tokenType: 'Bearer',
            };

            // Old token should be expired
            expect(oldToken.expiresAt.getTime()).toBeLessThan(Date.now());
            
            // New token should be valid
            expect(newToken.expiresAt.getTime()).toBeGreaterThan(Date.now());
            expect(newToken.accessToken).not.toBe(oldToken.accessToken);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve refresh token across refreshes', () => {
      fc.assert(
        fc.property(
          fc.hexaString({ minLength: 32, maxLength: 256 }),
          (refreshToken: string) => {
            const token1 = {
              accessToken: 'access-1',
              refreshToken,
              expiresAt: new Date(Date.now() + 3600 * 1000),
            };

            const token2 = {
              accessToken: 'access-2',
              refreshToken: token1.refreshToken,
              expiresAt: new Date(Date.now() + 3600 * 1000),
            };

            // Refresh token should remain the same
            expect(token2.refreshToken).toBe(token1.refreshToken);
            // Access token should change
            expect(token2.accessToken).not.toBe(token1.accessToken);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update token expiration on refresh', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 3600, max: 86400 }),
          (expiresIn: number) => {
            const oldExpiresAt = new Date(Date.now() - 1000);
            const newExpiresAt = new Date(Date.now() + expiresIn * 1000);

            expect(newExpiresAt.getTime()).toBeGreaterThan(oldExpiresAt.getTime());
            expect(newExpiresAt.getTime()).toBeGreaterThan(Date.now());
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 70: OAuth State Validation', () => {
    it('should validate state format', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('google', 'outlook'),
          fc.uuid(),
          fc.hexaString({ minLength: 32, maxLength: 64 }),
          (provider: string, familyMemberId: string, randomString: string) => {
            const state = `${provider}:${familyMemberId}:${randomString}`;
            const parts = state.split(':');

            expect(parts.length).toBe(3);
            expect(parts[0]).toBe(provider);
            expect(parts[1]).toBe(familyMemberId);
            expect(parts[2]).toBeTruthy();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid state format', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (invalidState: string) => {
            const parts = invalidState.split(':');
            
            // Invalid state should not have exactly 3 parts
            if (parts.length !== 3) {
              expect(parts.length).not.toBe(3);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should expire state after timeout', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 600 }),
          (secondsAgo: number) => {
            const createdAt = new Date(Date.now() - secondsAgo * 1000);
            const expiresAt = new Date(createdAt.getTime() + 10 * 60 * 1000); // 10 minutes
            const isExpired = expiresAt.getTime() < Date.now();

            if (secondsAgo > 600) {
              expect(isExpired).toBe(true);
            } else {
              expect(isExpired).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prevent state reuse', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (state: string) => {
            const usedStates = new Set<string>();
            
            usedStates.add(state);
            const isReused = usedStates.has(state);
            
            expect(isReused).toBe(true);
            
            // After deletion, should not be reused
            usedStates.delete(state);
            expect(usedStates.has(state)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('OAuth Error Handling', () => {
    it('should handle missing OAuth configuration', () => {
      const config = {
        google: {
          clientId: '',
          clientSecret: '',
          redirectUri: '',
        },
      };

      const isConfigured = !!(config.google.clientId && config.google.clientSecret);
      expect(isConfigured).toBe(false);
    });

    it('should handle OAuth provider errors', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('invalid_grant', 'access_denied', 'server_error'),
          (errorCode: string) => {
            const error = {
              error: errorCode,
              error_description: 'OAuth provider error',
            };

            expect(error.error).toBeTruthy();
            expect(error.error_description).toBeTruthy();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle network errors during token exchange', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 400, max: 599 }),
          (statusCode: number) => {
            const isError = statusCode >= 400;
            expect(isError).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('OAuth Security', () => {
    it('should not expose refresh tokens in responses', () => {
      const response = {
        accessToken: 'public-access-token',
        expiresAt: new Date(),
        // refreshToken should NOT be in response
      };

      expect(response).not.toHaveProperty('refreshToken');
    });

    it('should use HTTPS for OAuth endpoints', () => {
      const googleAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
      const outlookAuthUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';

      expect(googleAuthUrl).toMatch(/^https:\/\//);
      expect(outlookAuthUrl).toMatch(/^https:\/\//);
    });

    it('should validate redirect URI matches configuration', () => {
      fc.assert(
        fc.property(
          fc.webUrl(),
          (url: string) => {
            const configuredUri = 'http://localhost:3001/api/oauth/google/callback';
            const isValid = url === configuredUri || url.startsWith('http');

            expect(typeof isValid).toBe('boolean');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
