# Flo - Family Calendar - Progressive Web App

AI-powered family calendar with time tracking and agent orchestration.

## Overview

Flo is an intelligent family calendar and time management Progressive Web Application designed to help modern families coordinate schedules, track time allocation, and maintain work-life balance. By consolidating multiple calendar sources into a unified view and providing AI-powered insights, Flo transforms chaotic family scheduling into an organized, proactive system.


## Project Structure

```
lifestream-flo/
├── packages/
│   ├── backend/          # Node.js + Express API
│   └── frontend/         # React PWA
└── .kiro/
    └── specs/            # Feature specifications
```

## Prerequisites

- Node.js 18+ and npm
- AWS Account with DynamoDB access
- AWS CLI configured (optional, for production)

## Setup

1. Install dependencies and build all packages:
```bash
npm run install:all
npm run build

```
1a. Install dependencies and build changes to individual packages (backend and frontend):
```bash
cd packages/backend
npm i
npm run build

cd ../../packages/frontend
npm i
mpm run build 
```

2. Configure environment variables:
```bash
cd packages/backend
cp .env.example .env
# Edit .env with your AWS credentials
```

3. Set up DynamoDB table:
```bash
cd packages/backend
npm run build
node dist/scripts/setup-dynamodb.js
```

## Development

Run backend:
```bash
npm run dev:backend
```

Run frontend:
```bash
npm run dev:frontend
```

## Testing

Run all tests:
```bash
npm test
```

Run backend tests:
```bash
npm run test:backend
```

Run frontend tests:
```bash
npm run test:frontend
```

## Build

Build all packages:
```bash
npm run build
```

## Features

- Multi-source calendar integration (Google, Outlook, School apps)
- AI agent orchestration for intelligent event processing
- Customizable activity categories
- Time tracking dashboard
- Progressive Web App with offline support
- Push notifications (with user permission)
- 3-month data retention policy

## Target Users

Flo serves busy families who struggle with:

    Coordinating multiple schedules across family members
    Tracking time allocation against personal and family goals
    Detecting and resolving scheduling conflicts proactively
    Maintaining work-life balance with data-driven insights
    Managing children's extracurricular activities and school events

## Key Benefits

Efficiency: Reduces time spent on schedule coordination by 70% Visibility: Provides complete family schedule transparency in one view Proactivity: Detects conflicts and suggests solutions before they become problems Balance: Enables data-driven decisions about time allocation and priorities Accessibility: Works offline as a PWA, accessible on any device anywhere

Flo transforms family scheduling from a reactive, chaotic process into a proactive, organized system that helps families spend less time coordinating and more time together.
