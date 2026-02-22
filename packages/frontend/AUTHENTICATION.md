# Authentication Guide

## Overview

Flo uses AWS Cognito for secure user authentication with email/password credentials and optional MFA support. The frontend integrates with Cognito through the AuthProvider context and useAuth hook.

## Setup

### AWS Cognito Configuration

1. Create a User Pool in AWS Cognito
2. Configure email verification
3. Set password policy (minimum 8 characters)
4. Create an App Client for the frontend
5. Configure redirect URIs:
   - Development: `http://localhost:5173`
   - Production: `https://flo.example.com`

### Environment Variables

Create a `.env` file in `packages/frontend/`:

```env
VITE_COGNITO_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxx
VITE_COGNITO_CLIENT_ID=xxxxx
VITE_COGNITO_DOMAIN=flo-auth.auth.us-east-1.amazoncognito.com
VITE_API_ENDPOINT=https://api.flo.example.com
```

## Usage

### AuthProvider

Wrap your app with the AuthProvider to enable authentication:

```tsx
import { AuthProvider } from './services/auth-context';

function App() {
  return (
    <AuthProvider>
      {/* Your app components */}
    </AuthProvider>
  );
}
```

### useAuth Hook

Use the useAuth hook to access authentication state and methods:

```tsx
import { useAuth } from './services/auth-context';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Welcome, {user?.email}</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <p>Please log in</p>
      )}
    </div>
  );
}
```

### Protected Routes

Use the ProtectedRoute component to protect routes:

```tsx
import { ProtectedRoute } from './components/ProtectedRoute';

<Route
  path="/app"
  element={
    <ProtectedRoute>
      <AppDashboard />
    </ProtectedRoute>
  }
/>
```

## Authentication Flow

### Login Flow

1. User enters email and password
2. Frontend validates input
3. Frontend calls `/api/auth/login` with credentials
4. Backend validates credentials with Cognito
5. Backend returns JWT token
6. Frontend stores token in localStorage
7. Frontend redirects to onboarding or dashboard

### Signup Flow

1. User enters email and password
2. Frontend validates input
3. Frontend calls `/api/auth/signup` with credentials
4. Backend creates user in Cognito
5. Cognito sends verification email
6. Frontend redirects to email verification page
7. User enters verification code
8. Frontend calls `/api/auth/confirm-signup`
9. Backend confirms signup with Cognito
10. Frontend redirects to login

### Password Reset Flow

1. User clicks "Forgot password?"
2. User enters email
3. Frontend calls `/api/auth/forgot-password`
4. Backend initiates password reset with Cognito
5. Cognito sends reset email
6. User enters reset code and new password
7. Frontend calls `/api/auth/confirm-password`
8. Backend confirms password reset with Cognito
9. Frontend redirects to login

## Security

### Token Management

- JWT tokens are stored in localStorage
- Tokens are included in all API requests via Authorization header
- Tokens are cleared on logout
- Expired tokens trigger redirect to login

### Input Validation

- Email format is validated
- Password length is validated (minimum 8 characters)
- Passwords are confirmed on signup
- User input is sanitized to prevent XSS

### Rate Limiting

- Failed login attempts are tracked
- Account is locked after 5 failed attempts
- Lock is cleared after 15 minutes

### HTTPS

- All authentication requests use HTTPS
- Tokens are never transmitted over HTTP
- Secure cookies are used for session management

## Error Handling

### Common Errors

- **Invalid Email Format**: "Please enter a valid email"
- **Password Too Short**: "Password must be at least 8 characters"
- **Email Already Exists**: "This email is already registered"
- **Invalid Credentials**: "Email or password is incorrect"
- **Account Locked**: "Too many failed login attempts. Please try again later."

### Error Recovery

- Users can retry login after fixing errors
- Users can reset password if they forget it
- Users can resend verification email if needed

## Best Practices

1. **Never Store Passwords**: Never store passwords in localStorage or state
2. **Use HTTPS**: Always use HTTPS for authentication
3. **Validate Input**: Always validate user input on the client and server
4. **Handle Errors**: Provide clear error messages to users
5. **Clear Tokens**: Always clear tokens on logout
6. **Refresh Tokens**: Implement token refresh before expiration
7. **Secure Storage**: Use secure storage for sensitive data

## Troubleshooting

### Token Not Stored

- Check browser localStorage is enabled
- Check for CORS errors in console
- Verify API endpoint is correct

### Login Fails

- Check email and password are correct
- Check Cognito User Pool is configured
- Check API endpoint is accessible
- Check network tab for errors

### Redirect Loop

- Check ProtectedRoute is configured correctly
- Check authentication state is being set
- Check localStorage for token

## Support

For authentication issues, check:
1. Browser console for errors
2. Network tab for API responses
3. AWS Cognito console for user status
4. Environment variables are set correctly
