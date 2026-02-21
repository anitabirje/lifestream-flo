# Implementation Plan: Flo - Family Calendar Progressive Web App

## Overview

This implementation plan breaks down the Flo Progressive Web App into discrete, incremental coding tasks. Flo is an AI agent-based system that helps families organize their weekly schedules by consolidating multiple calendar sources (Google Calendar, Outlook, school newsletters, school apps like SeeSaw/Connect Now/SEQTA, and extracurricular activities) into a unified weekly view. The system uses an agent orchestration layer to coordinate specialized AI agents that query external sources, parse natural language messages, classify events into customizable categories, and gather environmental data (weather, AQI, UV rating).

Key features include:
- Progressive Web App with offline capabilities and push notifications (with explicit user permission)
- Customizable activity categories with ideal time allocation preferences
- Time tracking dashboard comparing actual vs ideal time allocation
- Proactive time booking suggestions
- Intelligent conflict resolution
- Contextual weather reminders
- 3-month data retention policy

Each task builds incrementally with property-based tests to catch errors early.

## Tasks

- [x] 1. Set up project infrastructure and DynamoDB
  - Create TypeScript project with Node.js backend and React frontend as Progressive Web App
  - Set up DynamoDB tables with appropriate indexes
  - Configure AWS SDK and credentials
  - Configure environment variables and secrets management
  - Set up testing framework (Jest for unit tests, fast-check for property tests)
  - Configure PWA manifest and service worker
  - _Requirements: 9.1, 8a.1, 8a.2_

- [x] 2. Implement DynamoDB schema and data access patterns
  - [x] 2.1 Design DynamoDB single-table schema
    - Define partition key (PK) and sort key (SK) structure
    - Plan access patterns for all queries
    - Design GSI1 for date range queries
    - Design GSI2 for status/type queries
    - _Requirements: 9.1, 9.8_
  
  - [x] 2.2 Create DynamoDB table and indexes
    - Create main table: FamilyCalendar
    - Configure Global Secondary Indexes (GSI1 and GSI2)
    - Enable Point-in-Time Recovery (PITR)
    - Enable encryption at rest
    - Configure TTL attribute for auto-expiring items
    - Enable DynamoDB Streams for audit logging
    - _Requirements: 9.1, 9.2, 9.7_
  
  - [x] 2.3 Implement DynamoDB data access layer
    - Create DynamoDBClient wrapper
    - Implement batch read/write operations
    - Implement conditional writes for conflict prevention
    - Implement exponential backoff for throttling
    - _Requirements: 9.1, 9.8, 10.7, 10.8_
  
  - [x] 2.4 Write property test for data persistence
    - **Property 36: Data Persistence Round Trip**
    - **Validates: Requirements 9.1**

- [x] 3. Implement authentication and session management
  - [x] 3.1 Create User and Session data models
    - Implement TypeScript interfaces and DynamoDB mappings
    - _Requirements: 8.1, 8.2_
  
  - [x] 3.2 Implement password hashing with bcrypt
    - Create PasswordManager with hash and verify methods
    - Use minimum 12 rounds for bcrypt
    - _Requirements: 8.4_
  
  - [x] 3.3 Write property test for password hashing
    - **Property 33: Password Hashing**
    - **Validates: Requirements 8.4**
  
  - [x] 3.4 Implement session token creation and validation
    - Create SessionManager with 30-day token expiration
    - Implement token generation and validation logic
    - _Requirements: 8.2, 8.3_
  
  - [x] 3.5 Write property tests for session management
    - **Property 31: Session Token Validity**
    - **Property 32: Session Token Invalidation**
    - **Property 34: Token Expiration Re-authentication**
    - **Validates: Requirements 8.2, 8.3, 8.5**
  
  - [x] 3.6 Create authentication API endpoints
    - Implement POST /api/auth/register
    - Implement POST /api/auth/login
    - Implement POST /api/auth/logout
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 4. Implement access control and user management
  - [x] 4.1 Create AccessControl model and middleware
    - Implement permission checking for calendar operations
    - _Requirements: 8.6, 8.7_
  
  - [x] 4.2 Implement user management endpoints
    - Implement POST /api/family-members (add member)
    - Implement DELETE /api/family-members/:id (remove member)
    - Implement GET /api/family-members (list members)
    - _Requirements: 8.6, 8.7_
  
  - [x] 4.3 Write property test for access revocation
    - **Property 35: User Access Revocation**
    - **Validates: Requirements 8.6, 8.7**

- [x] 5. Checkpoint - Ensure authentication tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement agent orchestration layer
  - [x] 6.1 Create agent base interfaces and types
    - Define IAgent interface with execute, healthCheck methods
    - Define AgentTask, AgentResult, AgentOrchestrationConfig types
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 6.2 Implement AgentRegistry
    - Track available agents and their capabilities
    - Register and unregister agents dynamically
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 6.3 Implement TaskQueue
    - Priority-based task queue with scheduling
    - Support for task retry and timeout
    - _Requirements: 1.5, 1.6_
  
  - [x] 6.4 Implement AgentOrchestrator
    - Central coordinator for all AI agents
    - Task assignment based on agent capabilities
    - Load balancing across available agents
    - _Requirements: 1.5, 1.7_
  
  - [x] 6.5 Implement ResultAggregator
    - Collect and normalize results from multiple agents
    - Handle partial successes and failures
    - _Requirements: 1.5_
  
  - [x] 6.6 Implement AgentHealthMonitor
    - Monitor agent performance and availability
    - Automatic agent recovery and restart
    - _Requirements: 1.6_
  
  - [x] 6.7 Write property tests for agent orchestration
    - **Property 47: Agent Task Assignment**
    - **Property 48: Agent Result Aggregation**
    - **Validates: Requirements 1.5, 1.7**

- [x] 6a. Implement weather and environmental data agent
  - [x] 6a.1 Create WeatherAgent interface and base implementation
    - Implement IWeatherAgent extending IAgent
    - Define weather data structures (forecast, AQI, UV, precipitation)
    - _Requirements: 1a.1, 1a.2, 1a.3, 1a.4_
  
  - [x] 6a.2 Integrate weather API service
    - Connect to weather data provider API
    - Implement data retrieval for 7-day forecast
    - Retrieve AQI, UV rating, and precipitation probability
    - _Requirements: 1a.1, 1a.2, 1a.3, 1a.4_
  
  - [x] 6a.3 Implement weather data refresh scheduler
    - Schedule weather data updates every 6 hours
    - Cache weather data for performance
    - _Requirements: 1a.5_
  
  - [x] 6a.4 Associate weather data with calendar events
    - Match weather data to events by date, time, and location
    - Store weather associations in DynamoDB with TTL
    - _Requirements: 1a.6_
  
  - [x] 6a.5 Implement contextual weather reminders
    - Generate umbrella reminders for rainy outdoor events
    - Generate sunscreen reminders for high UV outdoor events
    - _Requirements: 1a.7, 1a.8_
  
  - [x] 6a.6 Display weather information in calendar view
    - Show weather icons alongside events
    - Display temperature and precipitation chance
    - _Requirements: 1a.9_
  
  - [x] 6a.7 Write property tests for weather agent
    - **Property 51: Weather Data Retrieval**
    - **Property 52: Weather-Event Association**
    - **Validates: Requirements 1a.1-1a.9**

- [-] 6b. Implement extracurricular activities management
  - [x] 6b.1 Create ExtracurricularActivity data model
    - Define activity types (sports, music, clubs, etc.)
    - Include date, time, location, and activity type fields
    - _Requirements: 1.5, 1.6_
  
  - [x] 6b.2 Implement extracurricular activity API endpoints
    - Implement POST /api/extracurricular-activities (create)
    - Implement PUT /api/extracurricular-activities/:id (update)
    - Implement DELETE /api/extracurricular-activities/:id (delete)
    - Implement GET /api/extracurricular-activities (list)
    - _Requirements: 1.5, 1.6_
  
  - [x] 6b.3 Integrate extracurricular activities into consolidated calendar
    - Display activities alongside other calendar events
    - Apply activity classification to extracurricular events
    - _Requirements: 1.5, 1.6_
  
  - [-] 6b.4 Write property tests for extracurricular activities
    - **Property 53: Extracurricular Activity CRUD Operations**
    - **Validates: Requirements 1.5, 1.6**

- [-] 6c. Implement user onboarding wizard
  - [x] 6c.1 Create onboarding wizard UI flow
    - Design multi-step wizard interface
    - Implement navigation between wizard steps
    - _Requirements: 1b.1_
  
  - [x] 6c.2 Implement calendar source selection step
    - Display available calendar sources (Google, Outlook, School Newsletter, school apps like SeeSaw/Connect Now/SEQTA, Extracurricular)
    - Allow users to select which sources to connect
    - _Requirements: 1b.2_
  
  - [x] 6c.3 Implement calendar source connection steps
    - For each selected source, prompt for credentials
    - Guide user through OAuth or credential entry
    - Allow skipping optional sources
    - _Requirements: 1b.3, 1b.4, 1b.5_
  
  - [x] 6c.4 Implement activity category customization step
    - Ask if user wants to use category tracking
    - Allow users to add, rename, or use default categories
    - _Requirements: 1b.6, 1b.7, 3.2, 3.3, 3.4_
  
  - [x] 6c.5 Implement ideal time allocation preferences step
    - Collect ideal time allocation for each enabled category
    - Set threshold values (max/min hours)
    - _Requirements: 1b.8, 1b.9, 4.3_
  
  - [x] 6c.6 Save onboarding state and allow re-run
    - Mark user as onboarded after completion
    - Provide settings option to re-run wizard
    - _Requirements: 1b.10, 1b.11_
  
  - [x] 6c.7 Write property tests for onboarding wizard
    - **Property 54: Onboarding Completion State**
    - **Validates: Requirements 1b.1-1b.11**

- [-] 6d. Implement PWA features and notification permissions
  - [x] 6d.1 Configure PWA manifest and service worker
    - Create manifest.json with app metadata
    - Implement service worker for offline caching
    - Cache current week's calendar data
    - _Requirements: 8a.1, 8a.2, 8a.3_
  
  - [x] 6d.2 Implement offline sync functionality
    - Queue changes made offline
    - Sync when connectivity restored
    - _Requirements: 8a.4_
  
  - [x] 6d.3 Implement push notification permission flow
    - Request permission with clear explanation
    - Show what types of notifications will be sent
    - _Requirements: 8a.5, 8a.6_
  
  - [x] 6d.4 Implement notification preferences management
    - Allow enable/disable push notifications in settings
    - Support email as alternative channel
    - Handle permission denied gracefully
    - _Requirements: 8a.7, 8a.8, 8a.9, 8a.10, 8a.11_
  
  - [x] 6d.5 Write property tests for PWA features
    - **Property 60: Offline Data Availability**
    - **Property 61: Notification Permission Handling**
    - **Validates: Requirements 8a.1-8a.11**

- [x] 6e. Implement customizable activity categories
  - [x] 6e.1 Create ActivityCategory data model
    - Support custom categories with name, color, icon
    - Include default categories
    - _Requirements: 3.1, 3.2_
  
  - [x] 6e.2 Implement category management API endpoints
    - Implement POST /api/categories (create custom category)
    - Implement PUT /api/categories/:id (rename category)
    - Implement DELETE /api/categories/:id (delete custom category)
    - Implement GET /api/categories (list all categories)
    - _Requirements: 3.2, 3.3, 3.4_
  
  - [x] 6e.3 Implement category tracking toggle
    - Allow users to disable category tracking entirely
    - Hide time tracking features when disabled
    - _Requirements: 3.5, 3.11_
  
  - [x] 6e.4 Update event classifier for custom categories
    - Extend AI classifier to learn custom categories
    - Update classification logic
    - _Requirements: 3.6, 3.8_
  
  - [x] 6e.5 Write property tests for custom categories
    - **Property 62: Custom Category CRUD Operations**
    - **Property 63: Category Tracking Toggle**
    - **Validates: Requirements 3.1-3.11**

- [x] 6f. Implement ideal time allocation and comparison
  - [x] 6f.1 Create IdealTimeAllocation data model
    - Store user preferences for each category
    - Support percentage or hours per week
    - _Requirements: 4.3_
  
  - [x] 6f.2 Implement ideal allocation API endpoints
    - Implement PUT /api/ideal-allocation (set preferences)
    - Implement GET /api/ideal-allocation (get preferences)
    - _Requirements: 4.3_
  
  - [x] 6f.3 Update dashboard to show actual vs ideal comparison
    - Display actual time allocation
    - Display ideal allocation preferences
    - Highlight significant deviations (>20%)
    - _Requirements: 4.4, 4.5_
  
  - [x] 6f.4 Write property tests for ideal allocation
    - **Property 64: Ideal vs Actual Time Comparison**
    - **Property 65: Deviation Highlighting**
    - **Validates: Requirements 4.3, 4.4, 4.5**

- [x] 7. Implement calendar query agents
    - Load balancing across available agents
    - _Requirements: 1.5, 1.7_
  
  - [x] 6.5 Implement ResultAggregator
    - Collect and normalize results from multiple agents
    - Handle partial successes and failures
    - _Requirements: 1.5_
  
  - [x] 6.6 Implement AgentHealthMonitor
    - Monitor agent performance and availability
    - Automatic agent recovery and restart
    - _Requirements: 1.6_
  
  - [x] 6.7 Write property tests for agent orchestration
    - **Property 47: Agent Task Assignment**
    - **Property 48: Agent Result Aggregation**
    - **Validates: Requirements 1.5, 1.7**

- [ ] 7. Implement calendar query agents
  - [x] 7.1 Create base CalendarQueryAgent class
    - Implement ICalendarQueryAgent interface
    - Common authentication and error handling
    - _Requirements: 1.1, 1.2, 1.4_
  
  - [x] 7.2 Implement GoogleCalendarQueryAgent
    - AI-powered querying of Google Calendar
    - OAuth 2.0 authentication
    - Intelligent event retrieval with filtering
    - _Requirements: 1.1_
  
  - [x] 7.3 Implement OutlookCalendarQueryAgent
    - AI-powered querying of Outlook Calendar
    - Microsoft Graph API integration
    - Intelligent event retrieval with filtering
    - _Requirements: 1.2_
  
  - [x] 7.4 Implement SchoolAppQueryAgent
    - AI-powered querying of school apps (SeeSaw, Connect Now, SEQTA)
    - Parse natural language messages from teachers
    - Extract homework due dates, form return dates, event booking deadlines
    - _Requirements: 1.4_
  
  - [x] 7.5 Write property test for multi-source event retrieval
    - **Property 1: Multi-Source Event Retrieval**
    - **Validates: Requirements 1.1, 1.2, 1.4**

- [x] 8. Implement event parser agents
  - [x] 8.1 Create base EventParserAgent class
    - Implement IEventParserAgent interface
    - Common parsing utilities and validation
    - _Requirements: 1.3_
  
  - [x] 8.2 Implement SchoolNewsletterParserAgent
    - AI-powered parsing of school newsletter emails
    - Extract event details from unstructured text
    - Handle various newsletter formats
    - _Requirements: 1.3_
  
  - [x] 8.3 Implement DataNormalizer
    - Normalize parsed data into standard event format
    - Validate and clean extracted data
    - _Requirements: 1.3_
  
  - [x] 8.4 Write property tests for event parsing
    - **Property 49: Event Parser Accuracy**
    - **Property 50: Data Normalization Consistency**
    - **Validates: Requirements 1.3**

- [x] 9. Implement event classifier agents
  - [x] 9.1 Create AIEventClassifier agent
    - Implement IEventClassifierAgent interface
    - AI-powered event classification with contextual understanding
    - Confidence scoring for classifications
    - _Requirements: 3.1, 3.2_
  
  - [x] 9.2 Implement ContextAnalyzer
    - Analyze event context for better classification
    - Consider time, location, attendees, and description
    - _Requirements: 3.2_
  
  - [x] 9.3 Implement FeedbackLearner
    - Learn from user classification corrections
    - Improve classification accuracy over time
    - _Requirements: 3.4_
  
  - [x] 9.4 Implement CategoryPredictor
    - Predict activity categories with confidence scores
    - Provide reasoning for classifications
    - _Requirements: 3.2, 3.3_
  
  - [x] 9.5 Write property tests for event classification
    - **Property 8: Automatic Event Classification**
    - **Property 9: Manual Classification Learning**
    - **Property 10: Category Persistence**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.6**

- [x] 10. Checkpoint - Ensure agent tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement agent-based synchronization engine
  - [x] 11.1 Create AgentSyncCoordinator
    - Coordinate multiple agents for parallel synchronization
    - Manage sync tasks and agent assignments
    - _Requirements: 1.5_
  
  - [x] 11.2 Implement SyncScheduler with agent integration
    - Trigger sync operations every 5 minutes
    - Create agent tasks for each calendar source
    - _Requirements: 1.5_
  
  - [x] 11.3 Implement ChangeDetector with agent results
    - Process agent results to detect changes
    - Identify new, updated, and deleted events
    - _Requirements: 1.5, 7.4_
  
  - [x] 11.4 Implement SyncQueue with agent retry logic
    - Queue failed agent tasks
    - Retry every 15 minutes for up to 2 hours
    - _Requirements: 1.6_
  
  - [x] 11.5 Implement ConflictDetector
    - Detect overlapping events for same family member
    - Generate conflict warnings
    - _Requirements: 7.5_
  
  - [x] 11.6 Write property tests for synchronization
    - **Property 2: Synchronization Timeliness**
    - **Property 3: Connection Retry Logic**
    - **Property 4: Data Preservation During Source Management**
    - **Validates: Requirements 1.5, 1.6, 1.7, 7.4**
  
  - [x] 11.7 Write property test for conflict detection
    - **Property 29: Conflict Detection and Warning**
    - **Validates: Requirements 7.5**

- [x] 12. Implement calendar source management with agents
  - [x] 12.1 Create CalendarSourceRegistry
    - Manage calendar source connections
    - Assign agents to calendar sources
    - Store encrypted credentials securely
    - _Requirements: 1.7_
  
  - [x] 12.2 Create AgentTaskDispatcher
    - Dispatch calendar operations to appropriate agents
    - Handle agent selection and load balancing
    - _Requirements: 1.5, 1.7_
  
  - [x] 12.3 Write property test for data preservation
    - **Property 4: Data Preservation During Source Management**
    - **Validates: Requirements 1.7**

- [-] 13. Implement event management service
  - [x] 13.1 Create Event model and validation
    - Implement Event interface with all required fields
    - Add validation for event data (dates, required fields)
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [x] 13.2 Implement event CRUD endpoints
    - Implement POST /api/events (create event)
    - Implement PUT /api/events/:id (update event)
    - Implement DELETE /api/events/:id (delete event)
    - Implement GET /api/events (list events with filters)
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [x] 13.3 Implement bidirectional sync with external calendars via agents
    - Use agents to sync created/updated/deleted events back to source calendars
    - Handle sync failures gracefully
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [x] 13.4 Implement audit logging
    - Create AuditLogger to log all event changes
    - Store audit logs in DynamoDB with TTL (1 year retention)
    - Use DynamoDB Streams for real-time audit tracking
    - _Requirements: 7.6_
  
  - [x] 13.5 Write property tests for event management
    - **Property 26: Event Creation and Sync**
    - **Property 27: Event Update Synchronization**
    - **Property 28: Event Deletion Synchronization**
    - **Property 30: Event Audit Logging**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.6**

- [x] 14. Implement analytics and dashboard service
  - [x] 14.1 Create TimeAggregator
    - Calculate total hours per activity category
    - Filter by family member and date range
    - _Requirements: 4.1, 4.2_
  
  - [x] 14.2 Implement MetricsCalculator
    - Calculate comparative metrics (averages, percentages)
    - Generate insights comparing weeks
    - _Requirements: 4.5_
  
  - [x] 14.3 Create DashboardDataBuilder with caching
    - Build dashboard data structure
    - Implement Redis caching for performance
    - _Requirements: 4.1, 4.2, 4.7_
  
  - [x] 14.4 Implement dashboard query endpoints
    - Implement GET /api/dashboard/metrics (with filters)
    - Support filtering by family member and date range
    - _Requirements: 4.3, 4.4_
  
  - [x] 14.5 Write property tests for dashboard calculations
    - **Property 11: Dashboard Time Calculation**
    - **Property 12: Dashboard Filtering by Family Member**
    - **Property 13: Dashboard Date Range Filtering**
    - **Property 14: Comparative Metrics Accuracy**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

- [x] 15. Implement notification engine
  - [x] 15.1 Create ActivityThreshold model and management
    - Implement threshold configuration (max/min hours per category)
    - Create endpoints for threshold management
    - _Requirements: 5.1, 5a.1_
  
  - [x] 15.2 Implement ThresholdMonitor
    - Monitor time against configured thresholds
    - Detect maximum threshold violations in real-time
    - Detect minimum threshold violations at end of week
    - _Requirements: 5.2, 5a.2_
  
  - [x] 15.3 Write property tests for threshold detection
    - **Property 16: Maximum Threshold Violation Detection**
    - **Property 17: Minimum Threshold Violation Detection**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5a.1, 5a.2, 5a.3**
  
  - [x] 15.4 Create NotificationBuilder
    - Build notification messages with required content
    - Support email and in-app notification formats
    - _Requirements: 5.3, 5a.3_
  
  - [x] 15.5 Write property tests for notification content
    - **Property 18: Threshold Notification Content**
    - **Property 19: Notification Delivery Channels**
    - **Validates: Requirements 5.3, 5.4, 5a.3, 5a.4**
  
  - [x] 15.6 Implement NotificationDispatcher
    - Send notifications via email (using SendGrid or similar)
    - Send in-app notifications
    - Queue notifications for async delivery
    - _Requirements: 5.4, 5a.4_
  
  - [x] 15.7 Implement notification preferences
    - Create NotificationPreference model
    - Respect user opt-out preferences
    - _Requirements: 5.6, 5a.5_
  
  - [x] 15.8 Write property test for notification preferences
    - **Property 20: Notification Preference Respect**
    - **Validates: Requirements 5.6, 5a.5**
  
  - [x] 15.9 Implement proactive time booking suggestions
    - Identify activity categories with insufficient allocated time
    - Suggest available time slots based on existing schedule
    - _Requirements: 5a.8, 5a.9, 5a.10_
  
  - [x] 15.10 Create time booking acceptance workflow
    - Allow users to accept, modify, or dismiss suggestions
    - Create calendar events when suggestions are accepted
    - _Requirements: 5a.11, 5a.12_
  
  - [x] 15.11 Write property tests for proactive booking
    - **Property 55: Time Booking Suggestion Generation**
    - **Property 56: Time Booking Acceptance**
    - **Validates: Requirements 5a.8-5a.12**

- [x] 15a. Implement conflict detection and resolution
  - [x] 15a.1 Create ConflictDetector service
    - Detect overlapping events for same family member
    - Identify conflicts on event creation
    - _Requirements: 7a.1_
  
  - [x] 15a.2 Implement conflict notification system
    - Send push notifications when conflicts detected
    - Notify all affected family members
    - _Requirements: 7a.2_
  
  - [x] 15a.3 Create ConflictResolutionEngine
    - Analyze conflicting events for resolution options
    - Generate context-aware resolution suggestions
    - _Requirements: 7a.3_
  
  - [x] 15a.4 Implement pickup/dropoff conflict resolution
    - Identify alternative family members for child events
    - Check availability of alternative family members
    - _Requirements: 7a.4_
  
  - [x] 15a.5 Implement meeting conflict resolution
    - Suggest rescheduling options for overlapping meetings
    - Find available time slots for all participants
    - _Requirements: 7a.5_
  
  - [x] 15a.6 Rank and present resolution suggestions
    - Order suggestions by feasibility
    - Consider family member availability and event priority
    - _Requirements: 7a.6_
  
  - [x] 15a.7 Implement one-click resolution application
    - Allow users to apply resolution with single action
    - Update all affected events automatically
    - Notify relevant family members of changes
    - _Requirements: 7a.7, 7a.8_
  
  - [x] 15a.8 Support manual conflict resolution
    - Provide interface for custom resolution
    - Allow users to override automated suggestions
    - _Requirements: 7a.9_
  
  - [x] 15a.9 Log conflict resolutions for audit
    - Record all conflict detections
    - Track resolution methods and outcomes
    - _Requirements: 7a.10_
  
  - [x] 15a.10 Write property tests for conflict resolution
    - **Property 57: Conflict Detection Accuracy**
    - **Property 58: Resolution Suggestion Generation**
    - **Property 59: Resolution Application**
    - **Validates: Requirements 7a.1-7a.10**

- [x] 16. Implement weekly summary generation
  - [x] 16.1 Create SummaryGenerator
    - Generate consolidated summary with events by day
    - Include time tracking metrics for past week
    - Generate comparative insights
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [x] 16.2 Write property tests for summary generation
    - **Property 21: Weekly Summary Generation**
    - **Property 22: Summary Metrics Inclusion**
    - **Property 23: Summary Comparative Insights**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
  
  - [x] 16.3 Schedule weekly summary distribution
    - Schedule summary generation for Sunday 6:00 PM
    - Distribute via email in HTML format
    - _Requirements: 6.1, 6.6_
  
  - [x] 16.4 Implement event-triggered summary distribution
    - Generate and send summary when events change
    - _Requirements: 6.5_
  
  - [x] 16.5 Write property tests for summary distribution
    - **Property 24: Event-Triggered Summary Distribution**
    - **Property 25: Summary Opt-Out Respect**
    - **Validates: Requirements 6.5, 6.7**

- [x] 17. Checkpoint - Ensure notification and summary tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 18. Implement consolidated calendar view frontend
  - [x] 18.1 Create weekly calendar grid component
    - Display 7-day week (Monday-Sunday) in grid format
    - Show current week by default
    - _Requirements: 2.1, 2.2_
  
  - [x] 18.2 Implement week navigation controls
    - Add previous/next week buttons
    - Update calendar view when week changes
    - _Requirements: 2.3_
  
  - [x] 18.3 Write property test for weekly navigation
    - **Property 5: Weekly Calendar Navigation**
    - **Validates: Requirements 2.1, 2.2, 2.3**
  
  - [x] 18.4 Display events with family member lanes/colors
    - Show each family member's events in distinct visual lane
    - Use different colors per family member
    - Display event title, start time, end time, family member
    - _Requirements: 2.4, 2.5_
  
  - [x] 18.5 Write property test for event information display
    - **Property 6: Event Information Completeness**
    - **Validates: Requirements 2.4, 2.5**
  
  - [x] 18.6 Implement event detail modal
    - Show full event details on click
    - Display description, location, source calendar
    - _Requirements: 2.6_
  
  - [x] 18.7 Write property test for event detail retrieval
    - **Property 7: Event Detail Retrieval**
    - **Validates: Requirements 2.6**
  
  - [x] 18.8 Add responsive design for desktop
    - Ensure calendar displays correctly on 1024px+ screens
    - _Requirements: 2.7_

- [x] 19. Implement time tracking dashboard frontend
  - [x] 19.1 Create dashboard layout and navigation
    - Add dashboard route and navigation menu
    - _Requirements: 4.7_
  
  - [x] 19.2 Implement time allocation visualizations
    - Create pie chart or bar chart for category breakdown
    - Display total hours per category
    - _Requirements: 4.1, 4.2_
  
  - [x] 19.3 Add family member filter controls
    - Dropdown to select specific family member
    - Update dashboard when filter changes
    - _Requirements: 4.3_
  
  - [x] 19.4 Add date range filter controls
    - Date picker for custom date ranges
    - Recalculate metrics when range changes
    - _Requirements: 4.4_
  
  - [x] 19.5 Display comparative metrics
    - Show average time per activity across family
    - Display family member comparisons
    - _Requirements: 4.5_
  
  - [x] 19.6 Implement real-time updates via WebSocket
    - Connect to WebSocket for live dashboard updates
    - Update metrics within 1 second of event changes
    - _Requirements: 4.6_
  
  - [x] 19.7 Write property test for real-time updates
    - **Property 15: Real-Time Dashboard Updates**
    - **Validates: Requirements 4.6**

- [x] 20. Implement data backup and recovery system
  - [x] 20.1 Configure DynamoDB backup settings
    - Enable Point-in-Time Recovery (PITR) for continuous backup
    - Configure on-demand backup schedule
    - _Requirements: 9.2, 9.3_
  
  - [x] 20.2 Implement backup monitoring and verification
    - Monitor backup status via CloudWatch
    - Verify PITR is active and healthy
    - _Requirements: 9.2, 9.3_
  
  - [x] 20.3 Write property test for backup integrity
    - **Property 37: Backup Integrity Verification**
    - **Validates: Requirements 9.3_
  
  - [x] 20.4 Implement backup retention policy
    - Configure on-demand backup retention for minimum 30 days
    - Set up automated cleanup of old backups
    - _Requirements: 9.4_
  
  - [x] 20.5 Write property test for backup retention
    - **Property 38: Backup Retention**
    - **Validates: Requirements 9.4**
  
  - [x] 20.6 Implement 3-month data retention policy
    - Create scheduled job to delete events older than 3 months
    - Preserve user accounts and preferences indefinitely
    - Send notification 7 days before data deletion
    - _Requirements: 9.5, 9.6, 9.7**
  
  - [x] 20.7 Write property test for data retention
    - **Property 66: Data Retention Policy Enforcement**
    - **Validates: Requirements 9.5, 9.6, 9.7**
  
  - [x] 20.8 Create RecoveryManager
    - Implement data restoration from DynamoDB backups
    - Handle data corruption detection
    - Test restore procedures
    - _Requirements: 9.8**

- [x] 21. Implement error handling and resilience
  - [x] 21.1 Add graceful error handling for agent failures
    - Display user-friendly error messages when agents fail
    - Continue operating with cached data
    - _Requirements: 10.1_
  
  - [x] 21.2 Implement operation queuing for network errors
    - Queue agent tasks when network fails
    - Retry when connectivity restored
    - _Requirements: 10.2_
  
  - [x] 21.3 Add caching layer for DynamoDB unavailability
    - Serve cached data when DynamoDB unavailable
    - Queue write operations
    - _Requirements: 10.3_
  
  - [x] 21.4 Implement DynamoDB error handling
    - Handle throttling with exponential backoff
    - Use conditional writes to prevent conflicts
    - _Requirements: 10.7, 10.8_
  
  - [x] 21.5 Create comprehensive error logging
    - Log errors to CloudWatch Logs with full context
    - Display generic messages to users (no sensitive details)
    - _Requirements: 10.4, 10.5_
  
  - [x] 21.6 Implement administrator alerting
    - Send SNS notifications for critical errors within 5 minutes
    - _Requirements: 10.6_

- [-] 22. Final checkpoint - Integration testing
  - [x] 22.1 Run all property-based tests
    - Verify all 50 correctness properties pass (including 2 new agent properties)
    - Run with minimum 100 iterations per property test
  
  - [x] 22.2 Write integration tests for end-to-end flows
    - Test complete user workflows
    - Test agent-based calendar sync to dashboard display flow
    - Test notification generation and delivery flow
    - Test agent orchestration and task coordination
  
  - [x] 22.3 Perform load testing
    - Test agent orchestration under load
    - Test dashboard performance with large datasets
  
  - [x] 22.4 Conduct security audit
    - Review authentication and authorization
    - Check for NoSQL injection vulnerabilities in DynamoDB queries
    - Verify credential encryption
    - Review IAM policies for DynamoDB access

- [x] 23. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks start from scratch - this is a new project
- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with minimum 100 iterations
- Integration tests validate end-to-end workflows including agent orchestration
- Checkpoints ensure incremental validation at key milestones
- All property tests should be tagged with: **Feature: flo-family-calendar, Property {number}: {property_text}**
- The system uses AI agents for querying calendar sources, parsing natural language messages, and classifying activities
- Agent orchestration layer coordinates all AI agent operations
- Progressive Web App architecture enables offline functionality and push notifications
- 3-month data retention policy maintains system performance
- Customizable activity categories allow personalization
- Ideal time allocation preferences enable meaningful time tracking insightss multiple agents and manages task distribution
