# Implementation Plan: Flo Landing Page, Login/Signup, and Design System

## Overview

This implementation plan breaks down the design into discrete coding tasks for building the Flo landing page, login/signup pages, and design system. The tasks are organized to build incrementally with early validation through testing. Each task builds on previous tasks, with no orphaned code. Testing tasks are marked as optional with `*` suffix.

**Implementation Language:** TypeScript + React 18 + CSS

**Key Principles:**
- Mobile-first responsive design
- CSS-based animations (no JavaScript animations)
- AWS Cognito integration for authentication
- Design system tokens for consistency
- Comprehensive testing at each step

## Tasks

- [x] 1. Set up project structure and design system foundation
  - Create design system directory structure
  - Define CSS custom properties for colors, typography, spacing, shadows, transitions
  - Create TypeScript token files (colors.ts, typography.ts, spacing.ts, etc.)
  - Set up global CSS with design system variables
  - Create design-system.css with reusable utility classes
  - _Requirements: 10, 11, 12, 13, 14_

- [ ]* 1.1 Write property tests for design system tokens
  - **Property 12: Design System Colors Are CSS Variables**
  - **Validates: Requirements 10.1**
  - Test that all color tokens are defined as CSS custom properties
  - Test that all typography tokens are properly scaled
  - Test that spacing tokens follow consistent increments

- [x] 2. Create landing page layout and navigation
  - Create Navigation component with fixed positioning
  - Implement logo with gradient text effect
  - Add navigation links (Features, How It Works, Testimonials)
  - Add Login/Sign Up buttons
  - Implement mobile hamburger menu
  - Add responsive styling for mobile (<768px)
  - _Requirements: 1.1-1.8_

- [ ]* 2.1 Write property tests for navigation
  - **Property 1: Navigation Bar Remains Fixed During Scroll**
  - **Property 18: Mobile Menu Toggles on Hamburger Click**
  - **Validates: Requirements 1.1, 1.2, 1.8**
  - Test that navigation bar stays fixed during scroll
  - Test that hamburger menu toggles on click
  - Test that navigation links scroll to sections

- [x] 3. Create hero section with animated visuals
  - Create HeroSection component
  - Implement headline with gradient text effect
  - Add subheading and CTA buttons
  - Create animated floating cards (3 cards with different timings)
  - Add hero statistics display
  - Implement CSS keyframe animations (float1, float2)
  - Hide animated cards on mobile (<768px)
  - _Requirements: 2.1-2.9_

- [ ]* 3.1 Write property tests for hero section
  - **Property 2: Hero Section Displays Correct Headline Text**
  - **Property 3: Animated Cards Run at 60fps**
  - **Validates: Requirements 2.1, 2.3, 19.1**
  - Test that headline text is rendered correctly
  - Test that animations run at 60fps without jank
  - Test that cards are hidden on mobile

- [x] 4. Create features grid section
  - Create FeaturesGrid component
  - Define 6 feature cards with icons, titles, descriptions
  - Implement responsive grid layout (1 col mobile, 2-3 col tablet, 3 col desktop)
  - Add hover effects (elevation and border color change)
  - Add radial gradient background
  - _Requirements: 3.1-3.6_

- [ ]* 4.1 Write property tests for features grid
  - **Property 4: Features Grid Contains Exactly 6 Cards**
  - **Property 5: Feature Cards Respond to Hover**
  - **Validates: Requirements 3.1, 3.2**
  - Test that grid always renders 6 cards
  - Test that hover effects are applied correctly

- [x] 5. Create how it works section
  - Create HowItWorks component
  - Define 4 step cards with step numbers, icons, titles, descriptions
  - Implement grid layout with step progression
  - Add hover animation (upward translation)
  - Add gradient background to step numbers
  - _Requirements: 4.1-4.5_

- [ ]* 5.1 Write property tests for how it works
  - **Property 6: How It Works Section Contains 4 Steps**
  - **Validates: Requirements 4.1**
  - Test that section renders exactly 4 step cards

- [x] 6. Create testimonials section
  - Create Testimonials component
  - Define 3 testimonial cards with avatar, name, role, rating, text
  - Implement responsive grid (1 col mobile, 3 col desktop)
  - Add subtle border and semi-transparent background
  - _Requirements: 5.1-5.5_

- [ ]* 6.1 Write property tests for testimonials
  - **Property 7: Testimonials Section Contains 3 Cards**
  - **Validates: Requirements 5.1**
  - Test that section renders exactly 3 testimonial cards

- [x] 7. Create CTA and footer sections
  - Create CTASection component with headline, subheading, button
  - Add radial gradient background
  - Create Footer component with logo, copyright, AWS badge
  - Implement responsive styling
  - _Requirements: 6.1-7.4_

- [x] 8. Create landing page wrapper and routing
  - Create LandingPage component that combines all sections
  - Implement smooth scroll behavior for navigation links
  - Add page transitions
  - Integrate with React Router
  - _Requirements: 1.4, 1.6, 1.7_

- [ ]* 8.1 Write property tests for landing page routing
  - **Property 17: Navigation Links Scroll to Sections**
  - **Validates: Requirements 1.4**
  - Test that navigation links scroll to correct sections

- [x] 9. Set up AWS Cognito integration
  - Install AWS Amplify and Cognito libraries
  - Configure Amplify with Cognito credentials
  - Create authentication context/hook for managing auth state
  - Implement JWT token storage in localStorage
  - Create protected route wrapper component
  - _Requirements: 9.5_

- [ ]* 9.1 Write property tests for AWS Cognito integration
  - **Property 10: AWS Cognito Authentication Returns JWT Token**
  - **Property 11: JWT Token Stored in LocalStorage**
  - **Validates: Requirements 9.5**
  - Test that valid credentials return JWT token
  - Test that JWT token is stored in localStorage

- [x] 10. Create login page layout
  - Create LoginPage component with split layout
  - Create AuthLeft component (desktop only) with logo, tagline, features
  - Create AuthForm component with email/password fields
  - Implement Login/Signup tabs
  - Add responsive styling (full-width on mobile)
  - _Requirements: 8.1-8.8_

- [ ]* 10.1 Write property tests for login page
  - **Property 8: Login Form Validates Email Format**
  - **Validates: Requirements 20.1**
  - Test that invalid email formats are rejected

- [x] 11. Implement login form functionality
  - Create login form with email and password fields
  - Add "Remember me" checkbox
  - Add "Forgot password?" link
  - Implement form state management
  - Integrate with AWS Cognito signIn method
  - Add loading state during authentication
  - Handle authentication errors
  - Redirect to onboarding/dashboard on success
  - _Requirements: 8.1-8.11_

- [ ]* 11.1 Write property tests for login form
  - **Property 10: AWS Cognito Authentication Returns JWT Token**
  - **Validates: Requirements 8.2, 8.9**
  - Test that valid credentials authenticate successfully
  - Test that invalid credentials show error message

- [x] 12. Create signup page form
  - Create signup form with email, password, confirm password fields
  - Implement form state management
  - Add form validation (email format, password length, password match)
  - Display validation error messages
  - Integrate with AWS Cognito signUp method
  - Add loading state during registration
  - Handle registration errors
  - Redirect to email verification on success
  - _Requirements: 9.1-9.9_

- [ ]* 12.1 Write property tests for signup form
  - **Property 8: Login Form Validates Email Format**
  - **Property 9: Login Form Validates Password Length**
  - **Validates: Requirements 20.1, 20.2**
  - Test that invalid emails are rejected
  - Test that short passwords are rejected
  - Test that password mismatch is detected

- [x] 13. Implement email verification flow
  - Create email verification component
  - Implement verification code input
  - Integrate with AWS Cognito confirmSignUp method
  - Handle verification errors
  - Redirect to login on success
  - _Requirements: 9.9_

- [x] 14. Implement password reset flow
  - Create forgot password component
  - Implement email input for password reset
  - Integrate with AWS Cognito forgotPassword method
  - Create password reset code verification component
  - Implement new password input
  - Integrate with AWS Cognito confirmPassword method
  - Handle reset errors
  - Redirect to login on success
  - _Requirements: 8.10_

- [x] 15. Create app routing and protected routes
  - Set up React Router with all routes (Home, Login, Signup, Onboarding, App)
  - Create ProtectedRoute component that checks authentication
  - Implement redirect logic:
    - Unauthenticated → Login
    - Authenticated but not onboarded → Onboarding
    - Authenticated and onboarded → App Dashboard
  - Implement route guards
  - _Requirements: 16.1-16.5_

- [ ]* 15.1 Write property tests for routing
  - **Property 19: Onboarding Redirects After Signup**
  - **Property 20: Unauthenticated Users Redirect to Login**
  - **Validates: Requirements 16.2, 16.3, 16.4**
  - Test that unauthenticated users redirect to login
  - Test that authenticated users redirect to onboarding
  - Test that onboarded users access dashboard

- [x] 16. Implement responsive design for mobile
  - Test all pages on mobile viewport (<480px)
  - Verify single-column layout on mobile
  - Verify hamburger menu on mobile
  - Verify 44px minimum touch targets
  - Verify text is readable without zooming
  - Test on tablet viewport (480px-768px)
  - Test on desktop viewport (>768px)
  - _Requirements: 17.1-17.6_

- [ ]* 16.1 Write property tests for responsive design
  - **Property 13: Responsive Layout Changes at Breakpoints**
  - **Validates: Requirements 17.1**
  - Test that layout changes at mobile breakpoint
  - Test that layout changes at tablet breakpoint
  - Test that layout changes at desktop breakpoint

- [x] 17. Implement accessibility features
  - Add semantic HTML elements (header, nav, main, section, footer)
  - Add ARIA labels to interactive elements
  - Add form labels associated with inputs
  - Implement keyboard navigation (Tab key)
  - Add focus indicators on interactive elements
  - Verify color contrast (WCAG AA standard)
  - Test with screen reader
  - _Requirements: 18.1-18.7_

- [ ]* 17.1 Write property tests for accessibility
  - **Property 14: Semantic HTML Elements Used**
  - **Validates: Requirements 18.1**
  - Test that semantic HTML elements are used
  - Test that ARIA labels are present
  - Test that form labels are associated

- [x] 18. Implement form validation and error handling
  - Create form validation utility functions
  - Implement email format validation
  - Implement password length validation
  - Implement password match validation
  - Display error messages in red accent color
  - Disable submit button during submission
  - Show loading state during submission
  - Handle server errors gracefully
  - _Requirements: 20.1-20.7_

- [ ]* 18.1 Write property tests for form validation
  - **Property 8: Login Form Validates Email Format**
  - **Property 9: Login Form Validates Password Length**
  - **Property 16: Form Validation Error Messages Display**
  - **Validates: Requirements 20.1-20.7**
  - Test that all validation rules are enforced
  - Test that error messages are displayed correctly

- [x] 19. Update dashboard styling to match demo
  - Update dashboard navigation bar styling
  - Update calendar view styling with category colors
  - Update time tracking cards with load visualization
  - Update conflict alerts with pink accent and pulse animation
  - Update weather section styling
  - Update upcoming events list styling
  - Ensure responsive design on mobile
  - _Requirements: 21.1-21.10_

- [ ]* 19.1 Write property tests for dashboard styling
  - **Property 15: Dashboard Uses Design System Colors**
  - **Validates: Requirements 21.1**
  - Test that dashboard uses design system colors
  - Test that dashboard is responsive

- [x] 20. Checkpoint - Ensure all tests pass
  - Run all unit tests
  - Run all property-based tests (100+ iterations each)
  - Run all integration tests
  - Verify no console errors or warnings
  - Ask the user if questions arise

- [x] 21. Performance optimization
  - Implement code splitting for routes
  - Lazy load landing page components
  - Lazy load authentication pages
  - Lazy load dashboard components
  - Optimize images (WebP with fallbacks)
  - Implement responsive images with srcset
  - Lazy load images below the fold
  - Minimize CSS bundle size
  - Verify page load time <3 seconds on 4G
  - _Requirements: 19.1-19.5_

- [ ]* 21.1 Write performance tests
  - Measure page load time
  - Measure animation frame rate
  - Measure CSS animation performance
  - Measure bundle size

- [x] 22. Security implementation
  - Implement JWT token validation
  - Implement token refresh logic
  - Clear tokens on logout
  - Sanitize user input to prevent XSS
  - Implement HTTPS for all requests
  - Implement rate limiting on login attempts
  - Implement CSRF protection
  - Never log sensitive data
  - _Requirements: 9.5_

- [x] 23. AWS Amplify deployment configuration
  - Create amplify.yml configuration file
  - Configure build commands
  - Configure environment variables
  - Set up auto-deployment from git
  - Configure custom domain
  - Enable HTTPS
  - Configure cache behavior
  - _Requirements: 9.5_

- [x] 24. Final checkpoint - Ensure all tests pass
  - Run all unit tests
  - Run all property-based tests (100+ iterations each)
  - Run all integration tests
  - Run performance tests
  - Run accessibility tests
  - Verify no console errors or warnings
  - Ask the user if questions arise

- [x] 25. Documentation and handoff
  - Create component documentation
  - Document design system usage
  - Document authentication flow
  - Document deployment process
  - Create troubleshooting guide
  - Create developer setup guide

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All code must follow TypeScript strict mode
- All components must be responsive (mobile-first)
- All animations must use CSS (no JavaScript animations)
- All authentication must use AWS Cognito
- All styling must use design system tokens

