# OAuth Implementation Guide

## Overview

This document describes the OAuth 2.0 implementation for Google Calendar and Outlook/Microsoft Graph integration in the Flo Family Calendar application.

## Features Implemented

### 1. OAuth Service (`oauth-service.ts`)

The `OAuthService` class handles all OAuth 2.0 operations:

- **Google Calendar OAuth 2.0 Flow**
  - Authorization URL generation with proper scopes
  - Authorization code exchange for access tokens
  - Token refresh mechanism for offline access
  - Automatic token expiration handling

- **Outlook/Microsoft Graph OAuth 2.0 Flow**
  - Authorization URL generation with Microsoft Graph scopes
  - Authorization code exchange for access tokens
  - Token refresh mechanism for offline access
  - Automatic token expiration handling

- **State Management**
  - CSRF protection using state parameter
  - State validation and expiration (10 minutes)
  - State storage in DynamoDB
  - State reuse prevention

### 2. OAuth Routes (`oauth.ts`)

Four main API endpoints for OAuth flow:

#### `GET /api/oauth/google/authorize`
- Generates Google OAuth authorization URL
- Requires authentication and `canManageSources` permission
- Query parameter: `familyMemberId`
- Returns: `{ authUrl: string }`

#### `GET /api/oauth/google/callback`
- Handles Google OAuth callback
- Exchanges authorization code for access token
- Query parameters: `code`, `state`, `error`
- Returns: OAuth token response with family member ID

#### `GET /api/oauth/outlook/authorize`
- Generates Outlook OAuth authorization URL
- Requires authentication and `canManageSources` permission
- Query parameter: `familyMemberId`
- Returns: `{ authUrl: string }`

#### `GET /api/oauth/outlook/callback`
- Handles Outlook OAuth callback
- Exchanges authorization code for access token
- Query parameters: `code`, `state`, `error`
- Returns: OAuth token response with family member ID

#### `POST /api/oauth/complete`
- Completes OAuth flow by storing token in calendar source registry
- Requires authentication and `canManageSources` permission
- Request body:
  ```json
  {
    "provider": "google" | "outlook",
    "familyMemberId": "string",
    "accessToken": "string",
    "refreshToken": "string",
    "expiresAt": "ISO 8601 date"
  }
  ```
- Returns: Calendar source object with sanitized credentials

### 3. Frontend OAuth Service (`oauth-service.ts`)

The `OAuthService` class on the frontend handles:

- **OAuth Flow Initiation**
  - `startGoogleOAuth()` - Redirects to Google OAuth consent screen
  - `startOutlookOAuth()` - Redirects to Outlook OAuth consent screen

- **Callback Handling**
  - `extractCallbackParams()` - Extracts code and state from URL
  - `handleCallback()` - Processes OAuth callback and completes flow

- **Token Management**
  - `completeOAuth()` - Stores token in backend

## Configuration

### Environment Variables

Add the following to `.env`:

```env
# Google OAuth Configuration
GOOGLE_OAUTH_CLIENT_ID=your_google_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3001/api/oauth/google/callback

# Outlook OAuth Configuration
OUTLOOK_OAUTH_CLIENT_ID=your_outlook_client_id
OUTLOOK_OAUTH_CLIENT_SECRET=your_outlook_client_secret
OUTLOOK_OAUTH_REDIRECT_URI=http://localhost:3001/api/oauth/outlook/callback

# Encryption Configuration
ENCRYPTION_KEY=your_encryption_key
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs:
   - `http://localhost:3001/api/oauth/google/callback` (development)
   - `https://yourdomain.com/api/oauth/google/callback` (production)
6. Copy Client ID and Client Secret to `.env`

### Outlook OAuth Setup

1. Go to [Azure Portal](https://portal.azure.com/)
2. Register a new application
3. Add platform: Web
4. Add redirect URIs:
   - `http://localhost:3001/api/oauth/outlook/callback` (development)
   - `https://yourdomain.com/api/oauth/outlook/callback` (production)
5. Create a client secret
6. Copy Application ID and Client Secret to `.env`

## Security Features

### CSRF Protection
- State parameter is generated for each authorization request
- State is validated before token exchange
- State expires after 10 minutes
- State is stored in DynamoDB with TTL

### Token Security
- Refresh tokens are never exposed in API responses
- Access tokens are encrypted before storage
- Tokens are stored in DynamoDB with encryption
- Token expiration is automatically tracked

### HTTPS Enforcement
- All OAuth endpoints use HTTPS
- Redirect URIs must use HTTPS in production
- OAuth provider endpoints use HTTPS

### Credential Encryption
- Credentials are encrypted using the `ENCRYPTION_KEY` environment variable
- Encrypted credentials are stored in DynamoDB
- Decryption only happens when needed for API calls

## Usage Flow

### Frontend Flow

1. User clicks "Connect Google Calendar" button
2. Frontend calls `OAuthService.startGoogleOAuth(familyMemberId, sessionToken)`
3. User is redirected to Google OAuth consent screen
4. User grants permissions
5. Google redirects to `/api/oauth/google/callback?code=...&state=...`
6. Frontend extracts callback parameters
7. Frontend calls `OAuthService.handleCallback(sessionToken)`
8. Backend exchanges code for token
9. Backend stores token in calendar source registry
10. User is redirected to dashboard with success message

### Backend Flow

1. Frontend requests authorization URL: `GET /api/oauth/google/authorize?familyMemberId=...`
2. Backend generates state and authorization URL
3. Backend returns authorization URL to frontend
4. Frontend redirects user to authorization URL
5. User grants permissions on OAuth provider
6. OAuth provider redirects to callback URL with code and state
7. Frontend receives callback and extracts parameters
8. Frontend calls `POST /api/oauth/complete` with token
9. Backend validates state and exchanges code for token
10. Backend stores token in calendar source registry
11. Backend returns calendar source object

## Testing

### Property-Based Tests

The implementation includes comprehensive property-based tests:

- **Property 67: OAuth Authorization URL Generation**
  - Validates Google and Outlook authorization URLs
  - Verifies required parameters are present
  - Tests CSRF protection with state parameter

- **Property 68: OAuth Token Exchange**
  - Validates authorization code format
  - Tests token response structure
  - Verifies refresh token inclusion

- **Property 69: OAuth Token Refresh**
  - Tests token refresh mechanism
  - Validates token expiration handling
  - Verifies refresh token preservation

- **Property 70: OAuth State Validation**
  - Tests state format validation
  - Verifies state expiration
  - Tests state reuse prevention

Run tests with:
```bash
npm test -- oauth-flows.test.ts
```

## Error Handling

### Common Errors

1. **Missing OAuth Configuration**
   - Error: "Google OAuth is not configured"
   - Solution: Set `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` in `.env`

2. **Invalid State**
   - Error: "Invalid state format"
   - Solution: State must be in format `provider:familyMemberId:randomstring`

3. **Expired State**
   - Error: "State has expired"
   - Solution: State expires after 10 minutes; user must restart OAuth flow

4. **Token Exchange Failed**
   - Error: "Failed to exchange authorization code"
   - Solution: Verify redirect URI matches configuration in OAuth provider

5. **Network Error**
   - Error: "Failed to complete OAuth flow"
   - Solution: Check network connectivity and OAuth provider status

## Integration with Calendar Sources

Once OAuth flow is complete, the token is stored as a calendar source:

```typescript
{
  id: "source-123",
  familyMemberId: "member-456",
  type: "google" | "outlook",
  credentials: {
    accessToken: "encrypted-token",
    refreshToken: "encrypted-refresh-token",
    expiresAt: "2024-01-01T12:00:00Z",
    tokenType: "Bearer"
  },
  lastSyncTime: "2024-01-01T11:00:00Z",
  syncStatus: "active",
  retryCount: 0,
  createdAt: "2024-01-01T10:00:00Z",
  updatedAt: "2024-01-01T10:00:00Z"
}
```

The calendar source can then be used by the agent orchestration layer to query events from Google Calendar or Outlook.

## Future Enhancements

1. **Token Refresh Automation**
   - Implement background job to refresh tokens before expiration
   - Store refresh token expiration time

2. **Multiple Calendar Support**
   - Allow users to connect multiple calendars from same provider
   - Support calendar selection during OAuth flow

3. **Incremental Authorization**
   - Request additional scopes as needed
   - Support scope-based permission management

4. **OAuth Provider Rotation**
   - Support additional calendar providers (iCloud, Yahoo, etc.)
   - Implement provider-agnostic OAuth flow

5. **Token Revocation**
   - Implement token revocation when calendar source is deleted
   - Support user-initiated token revocation

## References

- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [Microsoft Graph Calendar API](https://docs.microsoft.com/en-us/graph/api/resources/calendar)
- [OAuth 2.0 Authorization Framework](https://tools.ietf.org/html/rfc6749)
- [OWASP OAuth 2.0 Security Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/OAuth_2_Cheat_Sheet.html)
