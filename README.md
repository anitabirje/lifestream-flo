# Flo - Family Calendar - Progressive Web App

AI-powered family calendar with time tracking and agent orchestration.

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

1. Install dependencies and build packages (backend and frontend):
```bash
npm run install:all

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
