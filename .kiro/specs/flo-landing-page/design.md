# Technical Design Document: Flo Landing Page, Login/Signup, and Design System

## Overview

The Flo Landing Page, Login/Signup Pages, and Design System provide the critical frontend UI layer for the Flo family calendar PWA. The landing page serves as the primary entry point for new users, featuring a modern dark theme with purple, pink, and teal accents. The authentication pages provide secure login/signup via AWS Cognito. The design system establishes a cohesive visual language with reusable tokens, ensuring consistency across the application and matching the demo design.

**Architecture:**
- **Frontend Hosting:** AWS Amplify (React PWA with auto-deployment from git)
- **Authentication:** AWS Cognito (email/password, MFA support, JWT tokens)
- **Backend API:** API Gateway + Lambda (Express API)
- **Push Notifications:** AWS Amplify Push Notifications (via SNS)
- **Data Persistence:** DynamoDB

## Architecture

### Component Structure

```
App (Root)
├── Router (React Router v6)
│   ├── LandingPage
│   │   ├── Navigation
│   │   ├── HeroSection
│   │   ├── FeaturesGrid
│   │   ├── HowItWorks
│   │   ├── Testimonials
│   │   ├── CTASection
│   │   └── Footer
│   ├── LoginPage
│   │   ├── AuthLeft (desktop only)
│   │   └── AuthForm (Login/Signup tabs)
│   ├── OnboardingPage
│   │   ├── ProgressIndicator
│   │   └── OnboardingSteps (4 steps)
│   └── AppDashboard
│       ├── Navigation
│       ├── CalendarView
│       ├── TimeTrackingCards
│       ├── ConflictAlerts
│       ├── WeatherSection
│       └── UpcomingEvents
└── DesignSystem (CSS + TypeScript tokens)
    ├── colors.ts
    ├── typography.ts
    ├── spacing.ts
    ├── shadows.ts
    ├── transitions.ts
    └── design-system.css
```

### Data Flow

```
User Visit
    ↓
Landing Page (Public)
    ↓
Login/Signup (AWS Cognito)
    ↓
JWT Token (stored in localStorage)
    ↓
Onboarding (if first time)
    ↓
App Dashboard (Protected Route)
    ↓
API Requests (with JWT in Authorization header)
    ↓
Backend API (API Gateway + Lambda)
    ↓
DynamoDB
```

## Components and Interfaces

### Landing Page Components

#### Navigation Component
- **Purpose:** Fixed header with logo, navigation links, and auth buttons
- **Props:** None (uses React Router for navigation)
- **State:** `mobileMenuOpen` (boolean for hamburger menu)
- **Responsive:** Hamburger menu on mobile (<768px)
- **Styling:** Semi-transparent dark background with blur effect

#### Hero Section Component
- **Purpose:** Engaging entry point with headline, CTA, and animated visuals
- **Props:** None
- **State:** None (animations via CSS keyframes)
- **Features:**
  - Gradient text effect on headline
  - Animated floating cards (3 cards with different animation timings)
  - Hero statistics display
  - Responsive: cards hidden on mobile
- **Animations:** CSS keyframes (float1, float2) at 60fps

#### Features Grid Component
- **Purpose:** Display 6 key features in responsive grid
- **Props:** `features` (array of feature objects)
- **State:** None
- **Responsive:** 1 column on mobile, 2-3 columns on tablet, 3 columns on desktop
- **Hover Effects:** Elevation and border color change

#### How It Works Component
- **Purpose:** Display 4-step setup process
- **Props:** `steps` (array of step objects)
- **State:** None
- **Animations:** Hover effect with upward translation
- **Styling:** Step numbers with gradient background

#### Testimonials Component
- **Purpose:** Display 3 user testimonials for social proof
- **Props:** `testimonials` (array of testimonial objects)
- **State:** None
- **Responsive:** 1 column on mobile, 3 columns on desktop
- **Content:** Avatar, name, role, rating, testimonial text

#### CTA Section Component
- **Purpose:** Final call-to-action before footer
- **Props:** None
- **State:** None
- **Styling:** Radial gradient background with primary color

#### Footer Component
- **Purpose:** Display company info and AWS badge
- **Props:** None
- **State:** None
- **Content:** Logo, copyright, AWS badge

### Authentication Components

#### Login Page Component
- **Purpose:** Secure login via AWS Cognito
- **Props:** None
- **State:**
  - `email` (string)
  - `password` (string)
  - `rememberMe` (boolean)
  - `loading` (boolean)
  - `error` (string | null)
- **Layout:** Split (left: features, right: form) on desktop, full-width on mobile
- **Features:**
  - Email/password form
  - Remember me checkbox
  - Forgot password link
  - Login/Signup tabs
  - AWS Cognito integration

#### Signup Page Component
- **Purpose:** User registration via AWS Cognito
- **Props:** None
- **State:**
  - `email` (string)
  - `password` (string)
  - `confirmPassword` (string)
  - `loading` (boolean)
  - `error` (string | null)
- **Validation:**
  - Email format validation
  - Password length (min 8 characters)
  - Password confirmation match
- **Features:**
  - AWS Cognito registration
  - Email confirmation flow
  - Error handling

### Design System Components

#### Color Palette
```typescript
const colors = {
  primary: '#6C63FF',      // Purple
  accent: '#FF6584',       // Pink
  teal: '#43C6AC',         // Teal
  dark: '#1a1a2e',         // Dark background
  card: '#16213e',         // Card background
  card2: '#0f3460',        // Card background 2
  text: '#e0e0e0',         // Light text
  muted: '#888',           // Muted text
  
  // Category colors
  family: '#FF6584',       // Pink
  health: '#43C6AC',       // Teal
  work: '#6C63FF',         // Purple
  school: '#FFD166',       // Yellow
  activities: '#F77F00',   // Orange
  wellbeing: '#A8DADC',    // Light blue
};
```

#### Typography Scale
```typescript
const typography = {
  h1: {
    size: 'clamp(2.8rem, 5.5vw, 4.8rem)',
    weight: 900,
    lineHeight: 1.08,
  },
  h2: {
    size: 'clamp(1.8rem, 3.5vw, 2.6rem)',
    weight: 900,
    lineHeight: 1.2,
  },
  h3: {
    size: '1.4rem',
    weight: 800,
    lineHeight: 1.3,
  },
  h4: {
    size: '1rem',
    weight: 700,
    lineHeight: 1.4,
  },
  body: {
    large: { size: '1.1rem', weight: 400, lineHeight: 1.75 },
    regular: { size: '0.9rem', weight: 400, lineHeight: 1.6 },
    small: { size: '0.85rem', weight: 400, lineHeight: 1.6 },
    xsmall: { size: '0.78rem', weight: 400, lineHeight: 1.5 },
  },
  weights: {
    regular: 400,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
};
```

#### Spacing Tokens
```typescript
const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.2rem',
  xxl: '1.5rem',
  xxxl: '2rem',
  huge: '2.5rem',
  massive: '3rem',
};
```

#### Shadow Tokens
```typescript
const shadows = {
  small: '0 2px 8px rgba(0,0,0,0.2)',
  medium: '0 4px 16px rgba(0,0,0,0.3)',
  large: '0 8px 32px rgba(0,0,0,0.4)',
};
```

#### Transition Tokens
```typescript
const transitions = {
  fast: '0.2s ease-in-out',
  normal: '0.3s ease-in-out',
  slow: '0.5s ease-in-out',
};
```

#### Responsive Breakpoints
```typescript
const breakpoints = {
  mobile: '480px',
  tablet: '768px',
  desktop: '1024px',
  large: '1400px',
};
```

## Data Models

### User Model (AWS Cognito)
```typescript
interface User {
  id: string;                    // Cognito User ID
  email: string;
  emailVerified: boolean;
  name?: string;
  attributes?: {
    given_name?: string;
    family_name?: string;
    phone_number?: string;
  };
  mfaEnabled: boolean;
  createdAt: Date;
  lastLogin?: Date;
}
```

### Authentication Token
```typescript
interface AuthToken {
  accessToken: string;           // JWT access token
  idToken: string;               // JWT ID token
  refreshToken: string;          // Refresh token
  expiresIn: number;             // Seconds until expiration
  tokenType: 'Bearer';
}
```

### Feature Card Model
```typescript
interface FeatureCard {
  id: string;
  icon: string;                  // Emoji or icon name
  title: string;
  description: string;
}
```

### Testimonial Model
```typescript
interface Testimonial {
  id: string;
  avatar: string;                // Avatar initials or image URL
  name: string;
  role: string;
  rating: number;                // 1-5 stars
  text: string;
}
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Navigation Bar Remains Fixed During Scroll
*For any* scroll position on the landing page, the navigation bar SHALL remain at the top of the viewport with position: fixed and maintain its visibility.
**Validates: Requirements 1.1, 1.2**

### Property 2: Hero Section Displays Correct Headline Text
*For any* landing page load, the hero section SHALL display the exact headline text "Go with the flow of family life" with gradient text effect applied.
**Validates: Requirements 2.1**

### Property 3: Animated Cards Run at 60fps
*For any* animation frame during hero card floating, the animation SHALL maintain 60 frames per second without jank or stuttering.
**Validates: Requirements 2.3, 19.1**

### Property 4: Features Grid Contains Exactly 6 Cards
*For any* features grid render, the grid SHALL contain exactly 6 feature cards in a responsive layout.
**Validates: Requirements 3.1**

### Property 5: Feature Cards Respond to Hover
*For any* feature card hover state, the card SHALL display elevation effect and border color change.
**Validates: Requirements 3.2**

### Property 6: How It Works Section Contains 4 Steps
*For any* how it works section render, the section SHALL display exactly 4 step cards.
**Validates: Requirements 4.1**

### Property 7: Testimonials Section Contains 3 Cards
*For any* testimonials section render, the section SHALL display exactly 3 testimonial cards.
**Validates: Requirements 5.1**

### Property 8: Login Form Validates Email Format
*For any* invalid email format entered in the login form, the form SHALL display an error message "Please enter a valid email".
**Validates: Requirements 20.1**

### Property 9: Login Form Validates Password Length
*For any* password with less than 8 characters entered in the signup form, the form SHALL display an error message "Password must be at least 8 characters".
**Validates: Requirements 20.2**

### Property 10: AWS Cognito Authentication Returns JWT Token
*For any* valid login credentials submitted to AWS Cognito, the authentication SHALL return a valid JWT access token.
**Validates: Requirements 8.2, 9.5**

### Property 11: JWT Token Stored in LocalStorage
*For any* successful authentication, the JWT token SHALL be stored in browser localStorage with key "authToken".
**Validates: Requirements 9.5**

### Property 12: Design System Colors Are CSS Variables
*For any* design system color, the color SHALL be defined as a CSS custom property (--variable-name) in the root element.
**Validates: Requirements 10.1**

### Property 13: Responsive Layout Changes at Breakpoints
*For any* viewport width less than 768px, the layout SHALL change to single-column and display hamburger menu.
**Validates: Requirements 17.1**

### Property 14: Semantic HTML Elements Used
*For any* page render, the page SHALL use semantic HTML elements (header, nav, main, section, footer) instead of generic divs.
**Validates: Requirements 18.1**

### Property 15: Dashboard Uses Design System Colors
*For any* dashboard component render, the component SHALL use CSS variables from the design system for colors.
**Validates: Requirements 21.1**

### Property 16: Form Validation Error Messages Display
*For any* form validation error, an error message SHALL be displayed in red accent color (#FF6584) with clear visibility.
**Validates: Requirements 20.1-20.7**

### Property 17: Navigation Links Scroll to Sections
*For any* navigation link click on the landing page, the page SHALL scroll to the corresponding section smoothly.
**Validates: Requirements 1.4**

### Property 18: Mobile Menu Toggles on Hamburger Click
*For any* hamburger menu click on mobile, the mobile menu SHALL toggle open/closed state.
**Validates: Requirements 1.8**

### Property 19: Onboarding Redirects After Signup
*For any* successful signup, the application SHALL redirect to the Onboarding_Page.
**Validates: Requirements 9.6, 15.1**

### Property 20: Unauthenticated Users Redirect to Login
*For any* unauthenticated user attempting to access the app dashboard, the application SHALL redirect to the Login_Page.
**Validates: Requirements 16.2**

## Error Handling

### Authentication Errors
- **Invalid Email Format:** Display "Please enter a valid email" error message
- **Password Too Short:** Display "Password must be at least 8 characters" error message
- **Email Already Exists:** Display "This email is already registered" error message
- **Invalid Credentials:** Display "Email or password is incorrect" error message
- **AWS Cognito Errors:** Display user-friendly error message from Cognito error code

### Network Errors
- **Connection Timeout:** Display "Connection timeout. Please check your internet connection" error message
- **API Error:** Display "An error occurred. Please try again later" error message
- **CORS Error:** Log to console, display generic error message to user

### Validation Errors
- **Empty Email:** Display "Email is required" error message
- **Empty Password:** Display "Password is required" error message
- **Password Mismatch:** Display "Passwords do not match" error message

## Testing Strategy

### Unit Tests
- Test individual components (Navigation, Hero, Features, etc.)
- Test form validation logic
- Test color palette CSS variables
- Test responsive breakpoints
- Test authentication flow with mocked AWS Cognito

### Property-Based Tests
- **Property 1:** Navigation bar remains fixed during scroll (100+ iterations)
- **Property 3:** Animated cards run at 60fps (50+ iterations)
- **Property 4:** Features grid always contains 6 cards (100+ iterations)
- **Property 8:** Email validation rejects invalid formats (100+ iterations)
- **Property 9:** Password validation enforces 8-character minimum (100+ iterations)
- **Property 10:** JWT token returned on valid login (100+ iterations)
- **Property 13:** Responsive layout changes at breakpoints (100+ iterations)
- **Property 14:** Semantic HTML elements used (100+ iterations)

### Integration Tests
- Test complete login flow (signup → email verification → login → dashboard)
- Test navigation between pages (landing → login → onboarding → app)
- Test responsive design on multiple viewport sizes
- Test AWS Cognito integration
- Test JWT token refresh on expiration

### Performance Tests
- Measure page load time (<3 seconds on 4G)
- Measure animation frame rate (60fps)
- Measure CSS animation performance
- Measure bundle size

### Accessibility Tests
- Test keyboard navigation (Tab key)
- Test screen reader compatibility
- Test color contrast (WCAG AA standard)
- Test form label associations
- Test ARIA labels on interactive elements

## Deployment

### AWS Amplify Configuration
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

### Environment Variables
```
VITE_API_ENDPOINT=https://api.flo.example.com
VITE_COGNITO_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxx
VITE_COGNITO_CLIENT_ID=xxxxx
VITE_COGNITO_DOMAIN=flo-auth.auth.us-east-1.amazoncognito.com
```

### AWS Cognito Setup
- Create User Pool with email/password authentication
- Enable MFA (optional)
- Configure email verification
- Set password policy (min 8 characters)
- Create App Client for frontend
- Configure redirect URIs (localhost:5173, https://flo.example.com)

### AWS Amplify Hosting
- Connect GitHub repository
- Enable auto-deployment on main branch
- Configure custom domain
- Enable HTTPS
- Configure cache behavior

## Security Considerations

### Authentication Security
- Store JWT tokens in localStorage (not cookies, to prevent CSRF)
- Include JWT token in Authorization header for API requests
- Implement token refresh logic before expiration
- Clear tokens on logout
- Validate JWT token signature on backend

### Form Security
- Sanitize user input to prevent XSS attacks
- Use HTTPS for all authentication requests
- Implement rate limiting on login attempts
- Implement CSRF protection on forms

### Data Security
- Never log sensitive data (passwords, tokens)
- Use environment variables for API endpoints
- Implement Content Security Policy (CSP) headers
- Implement X-Frame-Options header to prevent clickjacking

## Performance Optimization

### Code Splitting
- Lazy load landing page components
- Lazy load authentication pages
- Lazy load dashboard components

### Image Optimization
- Use WebP format with fallbacks
- Implement responsive images with srcset
- Lazy load images below the fold

### CSS Optimization
- Use CSS custom properties for theming
- Minimize CSS bundle size
- Use CSS Grid and Flexbox for layouts
- Avoid CSS-in-JS for performance

### JavaScript Optimization
- Minimize JavaScript bundle size
- Use tree-shaking to remove unused code
- Implement code splitting for routes
- Use async/await for cleaner async code

## Accessibility Compliance

### WCAG AA Compliance
- Semantic HTML elements (header, nav, main, section, footer)
- ARIA labels on interactive elements
- Color contrast ratio ≥ 4.5:1 for text
- Keyboard navigation support (Tab key)
- Focus indicators on interactive elements
- Form labels associated with inputs
- Error messages announced to screen readers

### Mobile Accessibility
- Touch targets minimum 44px × 44px
- Readable text without zooming
- Responsive design for all screen sizes
- Accessible mobile navigation

