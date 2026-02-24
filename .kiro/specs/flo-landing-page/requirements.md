# Requirements Document: Flo Landing Page, Login/Signup, and Design System (MVP)

## Introduction

This document specifies the MVP requirements for building the Flo landing page, login/signup authentication pages, and a design system for the Flo family calendar PWA. The landing page serves as the primary entry point for new users, featuring a hero section, feature highlights, testimonials, and calls-to-action. The login/signup pages provide secure authentication with email and password via AWS Cognito. The design system establishes a cohesive visual language with color palettes, typography, and component tokens to ensure consistency across the application and match the demo design.

**Hosting & Authentication Architecture:**
- **Frontend Hosting**: AWS Amplify (React PWA with auto-deployment from git)
- **Frontend Authentication**: AWS Cognito (email/password, MFA support)
- **Backend API**: API Gateway + Lambda (Express API)
- **Push Notifications**: AWS Amplify Push Notifications (via SNS)
- **Data Persistence**: DynamoDB

**Critical MVP Gap:** The current frontend has 15 React components but they do NOT match the modern design shown in the demo HTML. This spec addresses the critical gap by defining the landing page, authentication pages, and design system needed for a polished MVP launch.

## Glossary

- **Landing_Page**: The public-facing homepage that introduces Flo to new visitors
- **Hero_Section**: The prominent top section of the landing page with headline, subheading, and primary CTA
- **Features_Grid**: A grid layout displaying 6 key features of the Flo application
- **Testimonials_Section**: Social proof section with 3 user testimonials and ratings
- **CTA_Section**: Call-to-action section encouraging users to sign up
- **Login_Page**: Authentication page for existing users to enter credentials
- **Signup_Page**: Registration page for new users to create an account
- **Design_System**: Centralized collection of design tokens, colors, typography, and component patterns
- **Color_Palette**: Set of predefined colors used throughout the application
- **Category_Colors**: Color assignments for activity categories (Family, Health, Work, School, Activities, Wellbeing)
- **Typography_Scale**: Hierarchical system of font sizes and weights
- **Component_Tokens**: Reusable design values for spacing, borders, shadows, and animations
- **Responsive_Breakpoints**: Screen size thresholds for mobile, tablet, and desktop layouts
- **Navigation_Bar**: Fixed header with logo, navigation links, and authentication buttons
- **Social_Login**: Third-party authentication via Google and Apple
- **Form_Validation**: Client-side validation of user input with error messaging
- **Accessibility**: Semantic HTML, ARIA labels, and keyboard navigation support

## Requirements

### Requirement 1: Landing Page Navigation Bar

**User Story:** As a visitor, I want to see a clear navigation bar with the Flo logo and links to key sections, so that I can easily navigate the landing page and access authentication options.

#### Acceptance Criteria

1. WHEN the landing page loads THEN the Navigation_Bar SHALL be fixed at the top with a semi-transparent dark background and blur effect
2. WHEN the user scrolls THEN the Navigation_Bar SHALL remain visible and maintain its position
3. THE Navigation_Bar SHALL display the Flo logo on the left side with purple primary color and pink accent
4. THE Navigation_Bar SHALL include navigation links (Features, How It Works, Testimonials) that scroll to corresponding sections
5. THE Navigation_Bar SHALL display "Login" and "Sign Up" buttons on the right side
6. WHEN the user clicks the "Sign Up" button THEN the page SHALL navigate to the Signup_Page
7. WHEN the user clicks the "Login" button THEN the page SHALL navigate to the Login_Page
8. WHEN the viewport width is less than 768px THEN the Navigation_Bar SHALL display a mobile-friendly hamburger menu

### Requirement 2: Hero Section with Animated Visuals

**User Story:** As a new visitor, I want to see an engaging hero section with a compelling headline and animated visual elements, so that I understand what Flo does and am motivated to sign up.

#### Acceptance Criteria

1. WHEN the landing page loads THEN the Hero_Section SHALL display a headline "Go with the flow of family life" with gradient text effect
2. THE Hero_Section SHALL include a subheading describing Flo's core value proposition
3. THE Hero_Section SHALL display a "Get Started" primary button and "Learn More" secondary button
4. WHEN the user clicks the "Get Started" button THEN the page SHALL navigate to the Signup_Page
5. THE Hero_Section SHALL display animated floating cards on the right side showing sample calendar events
6. THE animated cards SHALL float up and down continuously with smooth transitions
7. THE Hero_Section SHALL include hero statistics (e.g., "10K+ families", "50K+ events tracked")
8. THE Hero_Section background SHALL include subtle gradient overlays with primary and accent colors
9. WHEN the viewport width is less than 768px THEN the animated cards SHALL be hidden and the hero content SHALL be centered

### Requirement 3: Features Grid Section

**User Story:** As a visitor, I want to see a clear list of Flo's key features, so that I understand the benefits and capabilities of the application.

#### Acceptance Criteria

1. WHEN the user scrolls to the Features section THEN the Features_Grid SHALL display 6 feature cards in a responsive grid layout
2. EACH feature card SHALL include an icon, title, and description
3. THE feature cards SHALL display the following features:
   - Consolidated Calendar View
   - Time Tracking & Analytics
   - Intelligent Event Classification
   - Conflict Detection & Resolution
   - Proactive Time Booking
   - Weekly Summaries
4. WHEN the user hovers over a feature card THEN the card SHALL have a subtle elevation effect and border color change
5. THE Features_Grid background SHALL include a subtle radial gradient with teal accent color
6. WHEN the viewport width is less than 768px THEN the Features_Grid SHALL display 1 column layout

### Requirement 4: How It Works Section

**User Story:** As a visitor, I want to understand the setup process for Flo, so that I know what to expect during onboarding.

#### Acceptance Criteria

1. WHEN the user scrolls to the How It Works section THEN the section SHALL display 4 step cards in a grid layout
2. EACH step card SHALL include a step number, icon, title, and description
3. THE step cards SHALL display the following steps:
   - Connect your calendars
   - Set activity categories
   - Define time allocation
   - Get insights & suggestions
4. WHEN the user hovers over a step card THEN the card SHALL translate upward with a smooth animation
5. THE step numbers SHALL have a gradient background with primary and accent colors

### Requirement 5: Testimonials Section

**User Story:** As a visitor, I want to see testimonials from other users, so that I can build trust and confidence in Flo.

#### Acceptance Criteria

1. WHEN the user scrolls to the Testimonials section THEN the section SHALL display 3 testimonial cards in a responsive grid
2. EACH testimonial card SHALL include a 5-star rating, testimonial text, user avatar, name, and role
3. THE testimonial cards SHALL display real or realistic user testimonials about Flo's benefits
4. WHEN the viewport width is less than 768px THEN the Testimonials section SHALL display 1 column layout
5. THE testimonial cards SHALL have a subtle border and semi-transparent background

### Requirement 6: Call-to-Action Section

**User Story:** As a visitor, I want to see a prominent call-to-action encouraging me to sign up, so that I'm motivated to create an account.

#### Acceptance Criteria

1. WHEN the user scrolls to the CTA section THEN the section SHALL display a headline "Ready to go with the flow?"
2. THE CTA section SHALL include a subheading describing the benefits of signing up
3. THE CTA section SHALL display a prominent "Get Started" button
4. WHEN the user clicks the "Get Started" button THEN the page SHALL navigate to the Signup_Page
5. THE CTA section background SHALL include a subtle radial gradient with primary color

### Requirement 7: Landing Page Footer

**User Story:** As a visitor, I want to see footer information including company details and AWS badge, so that I know who built Flo and what technology powers it.

#### Acceptance Criteria

1. WHEN the user scrolls to the bottom of the landing page THEN the Footer SHALL display the Flo logo
2. THE Footer SHALL include copyright text and company information
3. THE Footer SHALL display an AWS badge indicating the application is powered by AWS
4. THE Footer background SHALL be a dark card color with a subtle top border

### Requirement 8: Login Page Layout and Design

**User Story:** As an existing user, I want to see a professional login page with email/password form, so that I can securely access my account via AWS Cognito.

#### Acceptance Criteria

1. WHEN the user navigates to the Login_Page THEN the page SHALL display a split layout with left and right sections
2. THE left section SHALL display the Flo logo, tagline, and feature highlights (desktop only)
3. THE right section SHALL display the login form with email and password fields
4. THE Login_Page SHALL include "Login" and "Signup" tabs to switch between authentication modes
5. WHEN the user clicks the "Signup" tab THEN the form SHALL switch to signup mode with additional fields
6. THE login form SHALL include "Remember me" checkbox and "Forgot password?" link
7. THE login form SHALL display a "Login" button that submits the form
8. WHEN the viewport width is less than 800px THEN the left section SHALL be hidden and the form SHALL take full width
9. WHEN the user submits valid credentials THEN AWS Cognito SHALL authenticate the user and return JWT token
10. WHEN the user clicks "Forgot password?" THEN the page SHALL display password reset flow via AWS Cognito
11. WHEN authentication is successful THEN the page SHALL navigate to the Onboarding_Page or App_Dashboard

### Requirement 9: Signup Page Form and Validation

**User Story:** As a new user, I want to create an account with email and password, so that I can access Flo and start managing my family calendar.

#### Acceptance Criteria

1. WHEN the user is on the Signup_Page THEN the form SHALL display email and password input fields
2. THE signup form SHALL include a "Sign Up" button that submits the form
3. WHEN the user enters an invalid email format THEN the form SHALL display an error message
4. WHEN the user enters a password with less than 8 characters THEN the form SHALL display an error message
5. WHEN the user submits the form with valid data THEN the form SHALL call AWS Cognito to register the user
6. WHEN the registration is successful THEN the page SHALL navigate to the Onboarding_Page
7. WHEN the registration fails THEN the form SHALL display an error message from AWS Cognito
8. THE signup form SHALL include a link to switch to login mode
9. WHEN the user signs up THEN AWS Cognito SHALL send a confirmation email with verification code

### Requirement 9.5: AWS Amplify and Cognito Integration

**User Story:** As a developer, I want the frontend to use AWS Amplify for hosting and AWS Cognito for authentication, so that the application is secure, scalable, and easy to deploy.

#### Acceptance Criteria

1. THE frontend SHALL be deployed to AWS Amplify with auto-deployment from git repository
2. THE frontend SHALL use AWS Amplify Auth library for authentication
3. THE frontend SHALL use AWS Cognito for user management and authentication
4. WHEN the user logs in THEN AWS Cognito SHALL validate credentials and return JWT token
5. WHEN the user logs out THEN the JWT token SHALL be cleared from local storage
6. THE frontend SHALL store JWT token securely in browser storage
7. THE frontend SHALL include JWT token in all API requests to the backend
8. WHEN the JWT token expires THEN the frontend SHALL redirect to the Login_Page
9. THE frontend SHALL support AWS Cognito MFA (multi-factor authentication) for enhanced security
10. THE frontend SHALL display loading states during authentication operations

### Requirement 10: Design System Color Palette

**User Story:** As a designer/developer, I want a centralized color palette, so that I can maintain visual consistency across the application.

#### Acceptance Criteria

1. THE Design_System SHALL define a primary color (#6C63FF - purple) for main UI elements
2. THE Design_System SHALL define an accent color (#FF6584 - pink) for highlights and CTAs
3. THE Design_System SHALL define a teal color (#43C6AC) for success states and secondary accents
4. THE Design_System SHALL define a dark background color (#1a1a2e) for the main background
5. THE Design_System SHALL define card background colors (#16213e and #0f3460) for content containers
6. THE Design_System SHALL define text colors (light #e0e0e0 and muted #888) for typography
7. THE Design_System SHALL define category colors:
   - Family: #FF6584 (pink)
   - Health: #43C6AC (teal)
   - Work: #6C63FF (purple)
   - School: #FFD166 (yellow)
   - Activities: #F77F00 (orange)
   - Wellbeing: #A8DADC (light blue)
8. ALL color values SHALL be stored as CSS custom properties (variables) in the root element

### Requirement 11: Design System Button and Form Styles

**User Story:** As a developer, I want predefined button and form styles, so that I can build consistent interactive elements quickly.

#### Acceptance Criteria

1. THE Design_System SHALL define primary button style with gradient background and shadow
2. THE Design_System SHALL define secondary button style with transparent background and border
3. THE Design_System SHALL define ghost button style with no background
4. THE Design_System SHALL define form input styles with focus states and error states
5. THE Design_System SHALL define form label styles with consistent sizing and color
6. ALL buttons SHALL have hover and active states with smooth transitions
7. ALL form inputs SHALL have clear focus indicators for accessibility

### Requirement 12: Design System Typography

**User Story:** As a designer/developer, I want a consistent typography scale, so that text hierarchy is clear and readable across the application.

#### Acceptance Criteria

1. THE Design_System SHALL use "Segoe UI" as the primary font family with sans-serif fallback
2. THE Design_System SHALL define heading sizes using clamp() for responsive scaling:
   - H1: clamp(2.8rem, 5.5vw, 4.8rem)
   - H2: clamp(1.8rem, 3.5vw, 2.6rem)
   - H3: 1.4rem
   - H4: 1rem
3. THE Design_System SHALL define body text sizes:
   - Large: 1.1rem
   - Regular: 0.9rem
   - Small: 0.85rem
   - Extra small: 0.78rem
4. THE Design_System SHALL define font weights: 400 (regular), 600 (semibold), 700 (bold), 800 (extra bold), 900 (black)
5. THE Design_System SHALL define line heights: 1.08 (tight), 1.6 (normal), 1.75 (relaxed)

### Requirement 13: Design System Component Tokens

**User Story:** As a developer, I want reusable component tokens, so that I can build consistent UI components quickly.

#### Acceptance Criteria

1. THE Design_System SHALL define spacing tokens: 0.25rem, 0.5rem, 0.75rem, 1rem, 1.2rem, 1.5rem, 2rem, 2.5rem, 3rem
2. THE Design_System SHALL define border radius tokens: 8px, 10px, 12px, 14px, 16px, 20px, 24px, 30px
3. THE Design_System SHALL define shadow tokens:
   - Small: 0 2px 8px rgba(0,0,0,0.2)
   - Medium: 0 4px 16px rgba(0,0,0,0.3)
   - Large: 0 8px 32px rgba(0,0,0,0.4)
4. THE Design_System SHALL define transition tokens: 0.2s, 0.3s, 0.5s with ease-in-out timing
5. THE Design_System SHALL define button styles (primary, secondary, ghost, social)
6. THE Design_System SHALL define form input styles with focus states

### Requirement 14: Design System Responsive Breakpoints

**User Story:** As a developer, I want defined responsive breakpoints, so that I can build mobile-first responsive layouts consistently.

#### Acceptance Criteria

1. THE Design_System SHALL define mobile breakpoint: max-width 480px
2. THE Design_System SHALL define tablet breakpoint: max-width 768px
3. THE Design_System SHALL define desktop breakpoint: min-width 1024px
4. THE Design_System SHALL define large desktop breakpoint: min-width 1400px
5. ALL responsive layouts SHALL use mobile-first approach with media queries for larger screens

### Requirement 15: Onboarding Page Integration

**User Story:** As a new user, I want to see the onboarding wizard after signup, so that I can configure my calendar sources and preferences.

#### Acceptance Criteria

1. WHEN the user completes signup THEN the page SHALL navigate to the Onboarding_Page
2. THE Onboarding_Page SHALL display a progress indicator showing current step
3. THE Onboarding_Page SHALL include 4 steps: Calendar Sources, Categories, Time Allocation, Notifications
4. EACH step SHALL have a form with relevant inputs and validation
5. WHEN the user completes all steps THEN the page SHALL navigate to the App_Dashboard

### Requirement 16: App Navigation and Routing

**User Story:** As a user, I want seamless navigation between landing page, login, onboarding, and app dashboard, so that I can move through the user journey smoothly.

#### Acceptance Criteria

1. THE application SHALL support client-side routing between pages: Home, Login, Signup, Onboarding, App
2. WHEN the user is not authenticated THEN the app SHALL redirect to the Login_Page
3. WHEN the user is authenticated but not onboarded THEN the app SHALL redirect to the Onboarding_Page
4. WHEN the user is authenticated and onboarded THEN the app SHALL display the App_Dashboard
5. THE app SHALL maintain routing state across page refreshes using browser history API

### Requirement 17: Responsive Design for Mobile

**User Story:** As a mobile user, I want the landing page and authentication pages to work well on small screens, so that I can access Flo from my phone.

#### Acceptance Criteria

1. WHEN the viewport width is less than 480px THEN all pages SHALL display in single-column layout
2. WHEN the viewport width is less than 768px THEN the login page left section SHALL be hidden
3. WHEN the viewport width is less than 768px THEN the hero animated cards SHALL be hidden
4. ALL buttons and form inputs SHALL have minimum 44px height for touch targets
5. ALL text SHALL be readable without zooming on mobile devices
6. THE navigation bar SHALL display a hamburger menu on mobile devices

### Requirement 18: Accessibility and Semantic HTML

**User Story:** As a user with accessibility needs, I want the application to be accessible with keyboard navigation and screen readers, so that I can use Flo regardless of my abilities.

#### Acceptance Criteria

1. ALL pages SHALL use semantic HTML elements (header, nav, main, section, footer)
2. ALL form inputs SHALL have associated label elements
3. ALL buttons SHALL have descriptive text or aria-label attributes
4. ALL interactive elements SHALL be keyboard navigable using Tab key
5. ALL images and icons SHALL have alt text or aria-label attributes
6. THE application SHALL have sufficient color contrast (WCAG AA standard)
7. ALL form errors SHALL be announced to screen readers

### Requirement 19: Performance and Animations

**User Story:** As a user, I want smooth animations and fast page loads, so that the application feels responsive and professional.

#### Acceptance Criteria

1. ALL animations SHALL use CSS transitions and keyframes (no JavaScript animations)
2. THE hero floating cards animation SHALL run at 60fps without jank
3. THE page load time SHALL be less than 3 seconds on 4G connection
4. ALL images and assets SHALL be optimized for web
5. THE application SHALL use lazy loading for below-the-fold content

### Requirement 20: Form Validation and Error Handling

**User Story:** As a user, I want clear error messages when I make mistakes in forms, so that I can correct them and successfully complete authentication.

#### Acceptance Criteria

1. WHEN the user submits an empty email field THEN the form SHALL display "Email is required" error
2. WHEN the user enters an invalid email format THEN the form SHALL display "Please enter a valid email" error
3. WHEN the user submits an empty password field THEN the form SHALL display "Password is required" error
4. WHEN the user enters a password with less than 8 characters THEN the form SHALL display "Password must be at least 8 characters" error
5. WHEN the user submits the form THEN the form SHALL disable the submit button and show a loading state
6. WHEN the server returns an error THEN the form SHALL display the error message and re-enable the submit button
7. ALL error messages SHALL be displayed in red accent color with clear visibility

### Requirement 21: Dashboard Styling to Match Demo

**User Story:** As a user, I want the app dashboard to match the modern design shown in the demo, so that the application feels polished and professional.

#### Acceptance Criteria

1. THE dashboard SHALL use the Design_System colors and typography
2. THE dashboard calendar view SHALL display events with category colors
3. THE dashboard time tracking cards SHALL display load visualization with split bars
4. THE dashboard conflict alerts SHALL display with pink accent color and pulse animation
5. THE dashboard weather section SHALL display weather cards with icons and UV index
6. THE dashboard upcoming events list SHALL display with date chips and category tags
7. ALL dashboard components SHALL be responsive and work on mobile devices
8. THE dashboard navigation bar SHALL match the landing page navigation styling
9. THE dashboard cards SHALL have consistent spacing and border styling
10. THE dashboard SHALL use smooth transitions and hover effects on interactive elements
