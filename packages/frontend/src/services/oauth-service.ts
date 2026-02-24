/**
 * OAuth Service
 * Handles OAuth 2.0 flows for Google Calendar and Outlook/Microsoft Graph
 */

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  tokenType: string;
}

export interface OAuthResponse {
  success: boolean;
  provider: 'google' | 'outlook';
  familyMemberId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  message: string;
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export class OAuthService {
  /**
   * Start Google OAuth flow
   */
  static async startGoogleOAuth(familyMemberId: string, sessionToken: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/oauth/google/authorize?familyMemberId=${familyMemberId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get Google OAuth URL');
      }

      const data = await response.json();
      window.location.href = data.authUrl;
    } catch (error: any) {
      console.error('Google OAuth error:', error);
      throw error;
    }
  }

  /**
   * Start Outlook OAuth flow
   */
  static async startOutlookOAuth(familyMemberId: string, sessionToken: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/oauth/outlook/authorize?familyMemberId=${familyMemberId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get Outlook OAuth URL');
      }

      const data = await response.json();
      window.location.href = data.authUrl;
    } catch (error: any) {
      console.error('Outlook OAuth error:', error);
      throw error;
    }
  }

  /**
   * Complete OAuth flow by storing the token
   */
  static async completeOAuth(
    provider: 'google' | 'outlook',
    familyMemberId: string,
    accessToken: string,
    refreshToken: string | undefined,
    expiresAt: Date,
    sessionToken: string
  ): Promise<OAuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/oauth/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          familyMemberId,
          accessToken,
          refreshToken,
          expiresAt,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete OAuth flow');
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('OAuth complete error:', error);
      throw error;
    }
  }

  /**
   * Extract OAuth callback parameters from URL
   */
  static extractCallbackParams(): { code?: string; state?: string; error?: string } {
    const params = new URLSearchParams(window.location.search);
    return {
      code: params.get('code') || undefined,
      state: params.get('state') || undefined,
      error: params.get('error') || undefined,
    };
  }

  /**
   * Handle OAuth callback
   */
  static async handleCallback(sessionToken: string): Promise<OAuthResponse> {
    const { code, state, error } = this.extractCallbackParams();

    if (error) {
      throw new Error(`OAuth error: ${error}`);
    }

    if (!code || !state) {
      throw new Error('Missing code or state parameter');
    }

    // Extract provider and family member ID from state
    const stateParts = state.split(':');
    if (stateParts.length !== 3) {
      throw new Error('Invalid state format');
    }

    const [provider, familyMemberId] = stateParts;

    // Determine which callback endpoint to use
    const callbackUrl = provider === 'google' 
      ? `${API_BASE_URL}/api/oauth/google/callback?code=${code}&state=${state}`
      : `${API_BASE_URL}/api/oauth/outlook/callback?code=${code}&state=${state}`;

    const response = await fetch(callbackUrl);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to complete OAuth callback');
    }

    const data = await response.json();

    // Complete the OAuth flow by storing the token
    return this.completeOAuth(
      provider as 'google' | 'outlook',
      familyMemberId,
      data.accessToken,
      data.refreshToken,
      new Date(data.expiresAt),
      sessionToken
    );
  }
}
