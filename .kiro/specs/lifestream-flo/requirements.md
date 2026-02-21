# Requirements Document: Consolidated Weekly Family Calendar with Time Tracking Dashboard

## Introduction

Flo is a Progressive Web App (PWA) that helps families organize their weekly schedules by consolidating multiple calendar sources into a unified view. The system aggregates calendar events from multiple family members' external calendars (Google Calendar, Outlook, Kids School Newsletter, school apps like SeeSaw/Connect Now/SEQTA, Extracurricular Activities) and environmental data (weather, AQI, UV rating) into a unified weekly view. 

The system uses an AI agent orchestration layer to coordinate multiple specialized AI agents that query external calendar sources, parse and extract event information, classify events, gather environmental data, and aggregate information. The system provides real-time visibility into family schedules and includes a time tracking dashboard that monitors time spent across customizable activity categories. Users can define their ideal time allocation preferences across categories, and the system notifies family members when time allocation deviates from preferences, provides proactive time booking suggestions, offers conflict resolution recommendations, and distributes consolidated calendar summaries weekly or upon event updates.

As a PWA, Flo works seamlessly across desktop and mobile devices with offline capabilities and can send push notifications to mobile devices (with explicit user permission). The system retains historical data for 3 months to maintain performance and relevance.

## Glossary

- **Family Member**: A person registered in the system with calendar access permissions
- **Consolidated Calendar**: A unified view combining events from all family members' calendars
- **Weekly View**: A calendar display showing a 7-day period (Monday-Sunday)
- **Time Tracking Dashboard**: A visual analytics interface displaying time allocation across activity categories
- **Activity Category**: A customizable classification for tracked time (default: Work, Family Time, Health/Fitness, Upskilling, Relaxation)
- **Ideal Time Allocation**: User-defined preferences for how they want to spend time across activity categories each week
- **External Calendar Source**: Third-party calendar systems (Google Calendar, Outlook, Kids School Newsletter, school apps like SeeSaw/Connect Now/SEQTA, Extracurricular Activities platforms)
- **Event**: A scheduled activity with start time, end time, title, and optional description
- **Calendar Sync**: The process of retrieving and updating events from external calendar sources
- **Notification**: An alert sent to family members via push notification (mobile) or email about system events or threshold violations
- **Consolidated Summary**: A weekly report of all family calendar events and time tracking metrics
- **AI Agent**: An autonomous software component that performs specific tasks such as querying calendar sources, parsing data, classifying events, or gathering environmental data
- **Agent Orchestrator**: A coordination layer that manages multiple AI agents, assigns tasks, and aggregates results
- **Calendar Query Agent**: An AI agent responsible for querying and retrieving information from a specific external calendar source
- **Event Parser Agent**: An AI agent that extracts and structures event information from various data formats including natural language messages from teachers
- **Event Classifier Agent**: An AI agent that categorizes events into activity categories using intelligent analysis
- **Weather Agent**: An AI agent that retrieves environmental data including weather forecasts, AQI, UV ratings, and precipitation probability
- **Extracurricular Activity**: Scheduled activities for children including sports, music lessons, clubs, and other after-school programs
- **Onboarding Wizard**: A guided setup process that helps new users configure their calendar sources and preferences
- **Conflict Resolution**: Automated suggestions for resolving scheduling conflicts between family members
- **Progressive Web App (PWA)**: A web application that works seamlessly across desktop and mobile devices with offline capabilities and push notification support
- **Data Retention Period**: The system retains historical data for 3 months

## Requirements

### Requirement 1: AI Agent-Based Multi-Source Calendar Integration

**User Story:** As a family administrator, I want AI agents to query and integrate multiple external calendar sources including extracurricular activities, so that all family members' schedules are visible in one place without traditional API integrations.

#### Acceptance Criteria

1. WHEN a family member connects a Google Calendar account, THE Calendar_Query_Agent SHALL use AI capabilities to retrieve all events from that account
2. WHEN a family member connects an Outlook Calendar account, THE Calendar_Query_Agent SHALL use AI capabilities to retrieve all events from that account
3. WHEN a family member provides Kids School Newsletter credentials, THE Event_Parser_Agent SHALL use AI capabilities to parse and extract calendar events from the newsletter
4. WHEN a family member provides credentials for school apps (SeeSaw, Connect Now, SEQTA, or similar platforms), THE Event_Parser_Agent SHALL use AI capabilities to parse natural language messages from teachers and extract calendar events including homework due dates, form return dates, and event booking deadlines
5. WHEN a family member adds extracurricular activities (sports, music lessons, clubs), THE System SHALL store and display these activities in the consolidated calendar
6. THE System SHALL support manual entry of extracurricular activities with date, time, location, and activity type
7. WHEN an external calendar source is updated, THE Agent_Orchestrator SHALL coordinate Calendar_Query_Agents to refresh the consolidated calendar within 5 minutes
8. IF a calendar query agent fails, THEN THE Agent_Orchestrator SHALL log the error and retry the agent task every 15 minutes for up to 2 hours
9. THE Agent_Orchestrator SHALL support adding, updating, and removing calendar sources without losing existing event data

### Requirement 1a: Weather and Environmental Data Integration

**User Story:** As a family member, I want the system to gather weather and environmental data, so that I can receive contextual reminders for outdoor activities.

#### Acceptance Criteria

1. THE Weather_Agent SHALL retrieve weather forecasts for the family's location for the next 7 days
2. THE Weather_Agent SHALL retrieve Air Quality Index (AQI) data for the family's location
3. THE Weather_Agent SHALL retrieve UV rating information for the family's location
4. THE Weather_Agent SHALL retrieve precipitation probability (chance of rain/snow) for the family's location
5. THE System SHALL refresh weather data every 6 hours
6. THE System SHALL associate weather data with calendar events based on event date, time, and location
7. WHEN weather data indicates rain and an outdoor event is scheduled, THE System SHALL include a reminder to bring an umbrella in the event notification
8. WHEN weather data indicates high UV rating and an outdoor event is scheduled, THE System SHALL include a reminder to apply sunscreen in the event notification
9. THE System SHALL display weather icons and key metrics (temperature, precipitation chance) alongside calendar events

### Requirement 1b: User Onboarding and Setup Wizard

**User Story:** As a new user, I want a guided setup process, so that I can easily configure my calendar sources, activity categories, and time allocation preferences.

#### Acceptance Criteria

1. WHEN a new user first logs in, THE System SHALL display an onboarding wizard
2. THE Onboarding_Wizard SHALL ask the user which calendar sources they want to consolidate (Google Calendar, Outlook, School Newsletter, school apps like SeeSaw/Connect Now/SEQTA, Extracurricular Activities)
3. FOR EACH selected calendar source, THE Onboarding_Wizard SHALL prompt the user to provide necessary credentials or connection information
4. THE Onboarding_Wizard SHALL guide the user through connecting each selected calendar source
5. THE Onboarding_Wizard SHALL allow users to skip optional calendar sources
6. AFTER calendar source setup, THE Onboarding_Wizard SHALL ask users if they want to use activity category tracking
7. IF the user enables category tracking, THE Onboarding_Wizard SHALL allow users to customize activity categories (add, rename, or use defaults)
8. IF the user enables category tracking, THE Onboarding_Wizard SHALL ask users to define their ideal time allocation preferences for each activity category (percentage or hours per week)
9. THE Onboarding_Wizard SHALL allow users to set threshold values (max/min hours) for each activity category
10. THE System SHALL save all onboarding preferences and mark the user as onboarded
11. THE System SHALL allow users to re-run the onboarding wizard from settings at any time

### Requirement 2: Consolidated Weekly Calendar View

**User Story:** As a family member, I want to see all family members' events in a single weekly view, so that I can understand the family's schedule at a glance.

#### Acceptance Criteria

1. THE Consolidated_Calendar_View SHALL display a 7-day week (Monday through Sunday) in a grid format
2. WHEN the system loads, THE Consolidated_Calendar_View SHALL display the current week by default
3. WHEN a family member navigates to a different week, THE Consolidated_Calendar_View SHALL update to show events for that week
4. THE Consolidated_Calendar_View SHALL display each family member's events in a distinct visual lane or color
5. WHEN an event is displayed, THE Consolidated_Calendar_View SHALL show event title, start time, end time, and assigned family member
6. WHEN a family member clicks on an event, THE System SHALL display event details including description, location, and source calendar
7. THE Consolidated_Calendar_View SHALL be responsive and display correctly on desktop browsers (1024px and wider)

### Requirement 3: AI Agent-Based Activity Category Classification

**User Story:** As a family member, I want AI agents to automatically classify events into customizable activity categories using intelligent analysis, so that time tracking reflects my personal priorities and preferences.

#### Acceptance Criteria

1. THE System SHALL provide five default activity categories: Work, Family Time, Health/Fitness, Upskilling, and Relaxation
2. THE System SHALL allow users to add custom activity categories with name, color, and icon
3. THE System SHALL allow users to rename existing activity categories
4. THE System SHALL allow users to delete custom activity categories (default categories cannot be deleted)
5. THE System SHALL allow users to disable activity category tracking entirely if they choose not to use this feature
6. WHEN an event is created or imported, THE Event_Classifier_Agent SHALL use AI capabilities to categorize it based on event title, description, and contextual understanding
7. WHEN the Event_Classifier_Agent cannot confidently categorize an event, THE System SHALL prompt the family member to manually select a category
8. WHEN a family member manually assigns a category to an event, THE Event_Classifier_Agent SHALL learn from this feedback and improve future classifications
9. WHERE a family member has permission to edit events, THE System SHALL allow changing an event's activity category
10. THE System SHALL store the activity category assignment with the event record
11. WHEN a user disables category tracking, THE System SHALL not require category assignment for events and hide time tracking features

### Requirement 4: Time Tracking Dashboard

**User Story:** As a family member, I want to see how much time the family is spending on different activities compared to my ideal allocation preferences, so that I can understand time allocation patterns and make adjustments.

#### Acceptance Criteria

1. THE Time_Tracking_Dashboard SHALL display total hours spent in each activity category for the current week
2. THE Time_Tracking_Dashboard SHALL display a visual breakdown (pie chart or bar chart) showing percentage of time per activity category
3. THE System SHALL allow users to define their ideal time allocation preferences for each activity category (e.g., "I want to spend 20% of my time on Health/Fitness")
4. THE Time_Tracking_Dashboard SHALL display actual time allocation compared to ideal allocation preferences
5. THE Time_Tracking_Dashboard SHALL highlight categories where actual time significantly deviates from ideal allocation (more than 20% difference)
6. WHEN a family member selects a specific family member, THE Time_Tracking_Dashboard SHALL filter and display only that person's time allocation
7. WHEN a family member selects a date range, THE Time_Tracking_Dashboard SHALL recalculate and display time allocation for that range
8. THE Time_Tracking_Dashboard SHALL display comparative metrics (e.g., average time per activity across all family members)
9. THE Time_Tracking_Dashboard SHALL update in real-time when new events are added or modified
10. THE Time_Tracking_Dashboard SHALL be accessible from the main navigation and load within 3 seconds
11. WHEN category tracking is disabled, THE Time_Tracking_Dashboard SHALL be hidden from navigation

### Requirement 5: Activity Threshold Notifications

**User Story:** As a family member, I want to receive notifications via push or email when someone spends excessive time on a particular activity, so that I can help maintain healthy time balance.

#### Acceptance Criteria

1. THE System SHALL allow family administrators to set time thresholds for each activity category (e.g., maximum 40 hours/week for Work)
2. WHEN a family member's tracked time in an activity exceeds the configured threshold, THE Notification_Engine SHALL send an alert to designated family members
3. WHEN a threshold is exceeded, THE Notification_Engine SHALL include the activity name, current time, threshold value, and family member name in the alert
4. THE System SHALL send threshold notifications via push notification (if permission granted) and/or email based on user preferences
5. WHEN a threshold is exceeded, THE System SHALL log the notification event with timestamp and recipient information
6. WHERE a family member has disabled notifications for a specific activity, THE System SHALL not send notifications for that activity

### Requirement 5a: Minimum Activity Time Threshold Notifications and Proactive Booking

**User Story:** As a family member, I want to receive notifications when someone hasn't spent enough time on important activities and get suggestions to book time, so that I can encourage healthy habits and ensure key activities receive adequate attention.

#### Acceptance Criteria

1. THE System SHALL allow family administrators to set minimum time thresholds for each activity category (e.g., minimum 3 hours/week for Health/Fitness)
2. WHEN a family member's tracked time in an activity falls below the configured minimum threshold at the end of the week, THE Notification_Engine SHALL send an alert to designated family members
3. WHEN a minimum threshold is not met, THE Notification_Engine SHALL include the activity name, current time, minimum threshold value, and family member name in the alert
4. THE System SHALL send minimum threshold notifications via push notification (if permission granted) and/or email based on user preferences
5. WHERE a family member has disabled notifications for a specific activity, THE System SHALL not send minimum threshold notifications for that activity
6. WHEN a minimum threshold notification is sent, THE System SHALL log the notification event with timestamp and recipient information
7. THE System SHALL calculate minimum threshold compliance on a weekly basis (Monday-Sunday)
8. WHEN the Sunday weekly summary is generated, THE System SHALL identify activity categories with insufficient allocated time for the upcoming week
9. FOR EACH activity category with insufficient time, THE System SHALL prompt the user to book time slots in the calendar
10. THE System SHALL suggest available time slots based on the family's existing schedule
11. THE User SHALL be able to accept, modify, or dismiss the suggested time bookings
12. WHEN a user accepts a suggested time booking, THE System SHALL create the event in the consolidated calendar

### Requirement 6: Weekly Consolidated Summary Distribution

**User Story:** As a family member, I want to receive a weekly summary of the family's calendar and time tracking via push notification or email, so that I stay informed about family schedules and time patterns.

#### Acceptance Criteria

1. EVERY Sunday at 6:00 PM, THE Summary_Generator SHALL create a consolidated calendar summary for the upcoming week
2. THE Consolidated_Summary SHALL include all events for each family member organized by day
3. THE Consolidated_Summary SHALL include time tracking metrics (total hours per activity category for the past week)
4. THE Consolidated_Summary SHALL include comparative insights (e.g., "Family spent 15% more time on Family Time this week")
5. WHEN an event is added, updated, or deleted, THE System SHALL generate and distribute an updated consolidated summary to all family members
6. THE Consolidated_Summary SHALL be delivered via push notification (if permission granted) and/or email based on user preferences
7. WHERE a family member has opted out of summary notifications, THE System SHALL not send summaries to that member

### Requirement 7: Event Management and Synchronization

**User Story:** As a family member, I want to create, edit, and delete events in the consolidated calendar, so that I can manage family schedules directly.

#### Acceptance Criteria

1. WHEN a family member creates a new event in the consolidated calendar, THE Event_Manager SHALL store the event and sync it to the primary calendar source
2. WHEN a family member edits an event, THE Event_Manager SHALL update the event in both the consolidated calendar and the source calendar
3. WHEN a family member deletes an event, THE Event_Manager SHALL remove it from both the consolidated calendar and the source calendar
4. IF an event is modified in an external calendar source, THE Calendar_Sync_Engine SHALL detect the change and update the consolidated calendar within 5 minutes
5. WHEN a conflict is detected (same family member with overlapping events), THE System SHALL display a warning but allow the event creation
6. THE Event_Manager SHALL maintain an audit log of all event changes including timestamp, user, and change details

### Requirement 7a: Intelligent Conflict Detection and Resolution

**User Story:** As a family member, I want the system to detect scheduling conflicts and suggest resolutions via push notification or email, so that I can quickly resolve double-bookings and logistical issues.

#### Acceptance Criteria

1. WHEN a new event is created that overlaps with an existing event for the same family member, THE Conflict_Detector SHALL identify the conflict
2. THE System SHALL send a push notification (if permission granted) and/or email to affected family members when a conflict is detected
3. THE Conflict_Resolution_Engine SHALL analyze the conflicting events and generate resolution suggestions
4. FOR conflicts involving child pickup/dropoff, THE System SHALL suggest alternative family members who are available
5. FOR conflicts involving overlapping meetings, THE System SHALL suggest rescheduling options based on available time slots
6. THE System SHALL present resolution suggestions in order of feasibility (based on family member availability and event priority)
7. THE User SHALL be able to select a resolution suggestion and apply it with one click
8. WHEN a resolution is applied, THE System SHALL update all affected events and notify relevant family members
9. THE System SHALL allow users to manually resolve conflicts if automated suggestions are not suitable
10. THE System SHALL log all conflict detections and resolutions for audit purposes

### Requirement 8: User Authentication and Access Control

**User Story:** As a system administrator, I want to manage user access and permissions, so that only authorized family members can view and modify calendar data.

#### Acceptance Criteria

1. THE Authentication_System SHALL require all users to log in with email and password
2. WHEN a user logs in with valid credentials, THE Authentication_System SHALL create a session token valid for 30 days
3. WHEN a user logs out, THE Authentication_System SHALL invalidate the session token immediately
4. THE System SHALL store passwords using bcrypt hashing with a minimum of 12 rounds
5. WHERE a user's session token expires, THE System SHALL require re-authentication
6. THE System SHALL allow family administrators to add or remove family members from the calendar
7. WHEN a family member is removed, THE System SHALL revoke their access to the consolidated calendar immediately

### Requirement 8a: Progressive Web App and Notification Permissions

**User Story:** As a user, I want to install Flo as a Progressive Web App on my mobile device and control notification permissions, so that I can access my calendar offline and receive timely alerts.

#### Acceptance Criteria

1. THE System SHALL be implemented as a Progressive Web App (PWA) that works on desktop and mobile browsers
2. THE System SHALL provide an install prompt for users to add Flo to their home screen
3. THE System SHALL work offline with cached calendar data for the current week
4. THE System SHALL sync changes when connectivity is restored
5. WHEN a user first accesses notification features, THE System SHALL request explicit permission to send push notifications
6. THE System SHALL clearly explain what types of notifications will be sent before requesting permission
7. THE System SHALL allow users to enable/disable push notifications at any time in settings
8. THE System SHALL support push notifications to mobile devices (when permission granted)
9. THE System SHALL support email notifications as an alternative to push notifications
10. WHEN push notification permission is denied, THE System SHALL default to email notifications only
11. THE System SHALL respect the user's notification channel preferences (push, email, or both)

### Requirement 9: Data Persistence and Backup

**User Story:** As a system administrator, I want calendar data to be reliably stored and backed up with appropriate retention policies, so that the system remains performant while protecting recent family schedule information.

#### Acceptance Criteria

1. THE Data_Store SHALL persist all calendar events, user data, and configuration settings in DynamoDB tables
2. THE System SHALL enable DynamoDB Point-in-Time Recovery (PITR) for continuous backup
3. THE System SHALL enable DynamoDB on-demand backups for long-term retention
4. THE System SHALL retain on-demand backups for a minimum of 30 days
5. THE System SHALL automatically delete calendar events and related data older than 3 months to maintain performance
6. THE System SHALL retain user accounts, preferences, and configuration settings indefinitely (not subject to 3-month deletion)
7. THE System SHALL notify users 7 days before their data reaches the 3-month retention limit
8. IF data corruption is detected, THE System SHALL restore from the most recent valid backup using DynamoDB restore functionality
9. THE System SHALL log all backup operations including timestamp and verification status
10. THE System SHALL use DynamoDB's built-in encryption at rest for all tables
11. THE System SHALL implement appropriate DynamoDB access patterns for efficient data retrieval

### Requirement 10: Error Handling and Resilience

**User Story:** As a user, I want the system to handle errors gracefully, so that temporary issues don't disrupt my access to calendar information.

#### Acceptance Criteria

1. IF a calendar source connection fails, THEN THE System SHALL display a user-friendly error message and continue operating with cached data
2. WHEN a network error occurs during event synchronization, THE Sync_Engine SHALL queue the operation and retry when connectivity is restored
3. IF DynamoDB becomes temporarily unavailable, THEN THE System SHALL serve cached data to users and queue write operations
4. WHEN an unexpected error occurs, THE Error_Handler SHALL log the error with full stack trace and context information to CloudWatch Logs
5. THE System SHALL display a generic error message to users without exposing sensitive technical details
6. WHEN a critical error occurs, THE System SHALL alert administrators via SNS notification within 5 minutes
7. THE System SHALL implement exponential backoff for DynamoDB throttling errors
8. THE System SHALL use DynamoDB's conditional writes to prevent data conflicts

