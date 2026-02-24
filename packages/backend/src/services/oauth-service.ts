/**
 * OAuth Service
 * Handles OAuth 2.0 flows for Google Calendar and Outlook/Microsoft Graph
 */

import { randomBytes } from 'crypto';
import { DynamoDBClientWrapper } from '../data-access/dynamodb-client';

export interface OAuthConfig {
  google: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  outlook: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
}

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  tokenType: string;
}

export interface OAuthState {
  state: string;
  familyMemberId: string;
  provider: 'google' | 'outlook';
  createdAt: Date;
  expiresAt: Date;
}

export class OAuthService {
  private config: OAuthConfig;
  private dynamodbClient: DynamoDBClientWrapper;

  constructor(dynamodbClient: DynamoDBClientWrapper, config: OAuthConfig) {
    this.dynamodbClient = dynamodbClient;
    this.config = config;
  }

  /**
   * Generate OAuth authorization URL for Google Calendar
   */
  generateGoogleAuthUrl(familyMemberId: string, familyId: string): string {
    const state = this.generateState(familyMemberId, 'google', familyId);
    const scope = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: this.config.google.clientId,
      redirect_uri: this.config.google.redirectUri,
      response_type: 'code',
      scope,
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Generate OAuth authorization URL for Outlook/Microsoft Graph
   */
  generateOutlookAuthUrl(familyMemberId: string, familyId: string): string {
    const state = this.generateState(familyMemberId, 'outlook', familyId);
    const scope = [
      'Calendars.Read',
      'Calendars.ReadWrite',
      'offline_access',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: this.config.outlook.clientId,
      redirect_uri: this.config.outlook.redirectUri,
      response_type: 'code',
      scope,
      state,
      prompt: 'consent',
    });

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token (Google)
   */
  async exchangeGoogleCode(code: string, state: string): Promise<OAuthToken> {
    // Validate state
    await this.validateState(state, 'google');

    const params = new URLSearchParams({
      code,
      client_id: this.config.google.clientId,
      client_secret: this.config.google.clientSecret,
      redirect_uri: this.config.google.redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Google OAuth error: ${error.error_description || error.error}`);
    }

    const data = await response.json() as any;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      tokenType: data.token_type,
    };
  }

  /**
   * Exchange authorization code for access token (Outlook)
   */
  async exchangeOutlookCode(code: string, state: string): Promise<OAuthToken> {
    // Validate state
    await this.validateState(state, 'outlook');

    const params = new URLSearchParams({
      code,
      client_id: this.config.outlook.clientId,
      client_secret: this.config.outlook.clientSecret,
      redirect_uri: this.config.outlook.redirectUri,
      grant_type: 'authorization_code',
      scope: 'Calendars.Read Calendars.ReadWrite offline_access',
    });

    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Outlook OAuth error: ${error.error_description || error.error}`);
    }

    const data = await response.json() as any;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      tokenType: data.token_type,
    };
  }

  /**
   * Refresh Google access token
   */
  async refreshGoogleToken(refreshToken: string): Promise<OAuthToken> {
    const params = new URLSearchParams({
      client_id: this.config.google.clientId,
      client_secret: this.config.google.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Google token refresh error: ${error.error_description || error.error}`);
    }

    const data = await response.json() as any;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      tokenType: data.token_type,
    };
  }

  /**
   * Refresh Outlook access token
   */
  async refreshOutlookToken(refreshToken: string): Promise<OAuthToken> {
    const params = new URLSearchParams({
      client_id: this.config.outlook.clientId,
      client_secret: this.config.outlook.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'Calendars.Read Calendars.ReadWrite offline_access',
    });

    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Outlook token refresh error: ${error.error_description || error.error}`);
    }

    const data = await response.json() as any;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      tokenType: data.token_type,
    };
  }

  /**
   * Generate a random state string for CSRF protection
   */
  private generateState(familyMemberId: string, provider: 'google' | 'outlook', familyId: string): string {
    const randomString = randomBytes(32).toString('hex');
    const state = `${provider}:${familyMemberId}:${randomString}`;

    // Store state in DynamoDB for validation
    const stateData: OAuthState = {
      state,
      familyMemberId,
      provider,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    };

    // Store in DynamoDB (using a simple approach - in production, use a dedicated table or cache)
    this.storeOAuthState(familyId, stateData).catch((err) => {
      console.error('Failed to store OAuth state:', err);
    });

    return state;
  }

  /**
   * Validate OAuth state for CSRF protection
   */
  private async validateState(state: string, expectedProvider: 'google' | 'outlook'): Promise<void> {
    const parts = state.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid state format');
    }

    const [provider] = parts;

    if (provider !== expectedProvider) {
      throw new Error('State provider mismatch');
    }

    // In production, retrieve and validate from DynamoDB
    // For now, we'll do basic validation
  }

  /**
   * Store OAuth state in DynamoDB
   */
  private async storeOAuthState(familyId: string, state: OAuthState): Promise<void> {
    try {
      await this.dynamodbClient.put({
        PK: `FAMILY#${familyId}`,
        SK: `OAUTH_STATE#${state.state}`,
        EntityType: 'OAUTH_STATE',
        state: state.state,
        familyMemberId: state.familyMemberId,
        provider: state.provider,
        createdAt: state.createdAt.toISOString(),
        expiresAt: state.expiresAt.toISOString(),
        TTL: Math.floor(state.expiresAt.getTime() / 1000),
      } as any);
    } catch (error) {
      console.error('Failed to store OAuth state:', error);
      throw error;
    }
  }

  /**
   * Retrieve and validate OAuth state from DynamoDB
   */
  async retrieveAndValidateState(familyId: string, state: string): Promise<OAuthState | null> {
    try {
      const result = await this.dynamodbClient.get({
        PK: `FAMILY#${familyId}`,
        SK: `OAUTH_STATE#${state}`,
      });

      if (!result) {
        return null;
      }

      const resultAny = result as any;
      const expiresAt = new Date(resultAny.expiresAt);
      if (expiresAt < new Date()) {
        // State has expired
        return null;
      }

      return {
        state: resultAny.state,
        familyMemberId: resultAny.familyMemberId,
        provider: resultAny.provider,
        createdAt: new Date(resultAny.createdAt),
        expiresAt,
      };
    } catch (error) {
      console.error('Failed to retrieve OAuth state:', error);
      return null;
    }
  }

  /**
   * Delete OAuth state after validation
   */
  async deleteOAuthState(familyId: string, state: string): Promise<void> {
    try {
      await this.dynamodbClient.delete({
        PK: `FAMILY#${familyId}`,
        SK: `OAUTH_STATE#${state}`,
      });
    } catch (error) {
      console.error('Failed to delete OAuth state:', error);
    }
  }
}
