# Developer Setup Guide

## Prerequisites

- Node.js 18+ and npm 9+
- Git
- A code editor (VS Code recommended)
- AWS Account (for Cognito configuration)

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/your-org/lifestream-flo.git
cd lifestream-flo
```

### 2. Install Dependencies

```bash
cd packages/frontend
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in `packages/frontend/`:

```bash
cp .env.example .env
```

Update the values with your AWS Cognito configuration:

```env
VITE_COGNITO_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxx
VITE_COGNITO_CLIENT_ID=xxxxx
VITE_COGNITO_DOMAIN=flo-auth.auth.us-east-1.amazoncognito.com
VITE_API_ENDPOINT=http://localhost:3000
```

## Development

### Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

Output will be in `dist/` directory

### Preview Production Build

```bash
npm run preview
```

## Testing

### Run Tests

```bash
npm run test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Specific Test File

```bash
npm run test -- src/components/Navigation.test.ts
```

## Code Quality

### TypeScript Compilation

```bash
npx tsc --noEmit
```

### Linting (if configured)

```bash
npm run lint
```

### Format Code (if configured)

```bash
npm run format
```

## Project Structure

```
packages/frontend/
├── src/
│   ├── components/          # React components
│   ├── pages/               # Page components
│   ├── services/            # Business logic services
│   ├── design-system/       # Design tokens and utilities
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   ├── __tests__/           # Test files
│   ├── App.tsx              # Root component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── dist/                    # Build output (generated)
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Component Development

### Creating a New Component

1. Create component file: `src/components/MyComponent.tsx`
2. Create styles file: `src/components/MyComponent.css`
3. Create test file: `src/components/MyComponent.test.ts`

### Component Template

```tsx
import React from 'react';
import './MyComponent.css';

interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({
  title,
  onAction,
}) => {
  return (
    <div className="my-component">
      <h2>{title}</h2>
      {onAction && (
        <button onClick={onAction} className="btn btn-primary">
          Action
        </button>
      )}
    </div>
  );
};
```

## Using Design System

### Import Design Tokens

```tsx
import { colors, spacing, typography } from '../design-system';

// Use in component
const myColor = colors.primary;
const mySpacing = spacing.lg;
```

### Use CSS Variables

```css
.my-component {
  color: var(--color-text);
  padding: var(--spacing-lg);
  font-size: var(--font-size-body-regular);
}
```

## Authentication Development

### Mock Authentication

For development without AWS Cognito:

1. Update `auth-context.tsx` to use mock data
2. Store mock token in localStorage
3. Test authentication flows locally

### Test with Real Cognito

1. Configure AWS Cognito User Pool
2. Set environment variables
3. Create test user account
4. Test login/signup flows

## Debugging

### Browser DevTools

1. Open DevTools (F12)
2. Check Console for errors
3. Check Network tab for API calls
4. Check Application tab for localStorage

### VS Code Debugging

1. Install "Debugger for Chrome" extension
2. Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/packages/frontend/src"
    }
  ]
}
```

3. Press F5 to start debugging

### Console Logging

```tsx
import { safeLog } from '../services/security';

// Safe logging (doesn't log sensitive data)
safeLog('User logged in', { email: user.email });
```

## Common Tasks

### Add New Page

1. Create page component in `src/pages/`
2. Add route in `App.tsx`
3. Add navigation link if needed

### Add New Service

1. Create service file in `src/services/`
2. Export functions and types
3. Import in components as needed

### Update Design System

1. Update token in `src/design-system/`
2. Update CSS variable in `design-system.css`
3. Update documentation in `DESIGN_SYSTEM.md`

### Add New Test

1. Create test file with `.test.ts` suffix
2. Import testing utilities
3. Write test cases
4. Run tests with `npm run test`

## Performance Tips

### Code Splitting

- Use React.lazy() for route-based code splitting
- Import heavy libraries dynamically

### Bundle Analysis

```bash
npm run build -- --analyze
```

### Lighthouse Audit

1. Open DevTools
2. Go to Lighthouse tab
3. Run audit
4. Fix issues

## Git Workflow

### Create Feature Branch

```bash
git checkout -b feature/my-feature
```

### Commit Changes

```bash
git add .
git commit -m "feat: add my feature"
```

### Push to Remote

```bash
git push origin feature/my-feature
```

### Create Pull Request

1. Go to GitHub
2. Click "New Pull Request"
3. Select your branch
4. Add description
5. Request review

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Module Not Found

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

```bash
# Check for type errors
npx tsc --noEmit
```

### Build Fails

```bash
# Check for build errors
npm run build
```

## Resources

- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vitejs.dev)
- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [Design System Guide](./DESIGN_SYSTEM.md)
- [Authentication Guide](./AUTHENTICATION.md)

## Support

For questions or issues:
1. Check documentation
2. Search GitHub issues
3. Ask in team chat
4. Create GitHub issue
