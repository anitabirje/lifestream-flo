# Deployment Guide

## Overview

Flo frontend is deployed to AWS Amplify with automatic deployment from the git repository. This guide covers the deployment process, configuration, and troubleshooting.

## Prerequisites

- AWS Account with Amplify enabled
- GitHub repository connected to Amplify
- AWS Cognito User Pool configured
- Environment variables configured

## Deployment Steps

### 1. Connect Repository to Amplify

1. Go to AWS Amplify Console
2. Click "New app" → "Host web app"
3. Select GitHub as the repository service
4. Authorize Amplify to access your GitHub account
5. Select the repository and branch (main)
6. Click "Next"

### 2. Configure Build Settings

1. Review the build settings
2. Update `amplify.yml` if needed
3. Click "Save and deploy"

### 3. Configure Environment Variables

1. Go to App settings → Environment variables
2. Add the following variables:

```
VITE_API_ENDPOINT=https://api.flo.example.com
VITE_COGNITO_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxx
VITE_COGNITO_CLIENT_ID=xxxxx
VITE_COGNITO_DOMAIN=flo-auth.auth.us-east-1.amazoncognito.com
```

3. Click "Save"

### 4. Configure Custom Domain

1. Go to App settings → Domain management
2. Click "Add domain"
3. Enter your custom domain (e.g., flo.example.com)
4. Follow the DNS configuration steps
5. Click "Save"

### 5. Enable HTTPS

1. HTTPS is automatically enabled by Amplify
2. SSL certificate is automatically provisioned
3. All traffic is redirected to HTTPS

## Build Configuration

The `amplify.yml` file controls the build process:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install
    build:
      commands:
        - cd packages/frontend
        - npm run build
  artifacts:
    baseDirectory: packages/frontend/dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

## Continuous Deployment

### Automatic Deployment

- Every push to the main branch triggers a deployment
- Deployment takes approximately 5-10 minutes
- You can monitor progress in the Amplify Console

### Manual Deployment

1. Go to AWS Amplify Console
2. Click "Deployments"
3. Click "Redeploy this version"

## Performance Optimization

### Code Splitting

The build is configured with code splitting to optimize bundle size:

- Vendor chunk: React, React Router, AWS Amplify
- Landing page chunk: Landing page components
- Auth chunk: Login/signup components
- Dashboard chunk: Dashboard components

### Caching

Amplify automatically caches:
- Static assets (CSS, JS, images)
- API responses (via service worker)
- Offline data (via IndexedDB)

### CDN

Amplify uses CloudFront CDN for:
- Global content distribution
- Automatic compression
- Cache invalidation

## Monitoring

### CloudWatch Logs

1. Go to AWS CloudWatch Console
2. Select "Logs" → "Log groups"
3. Find `/aws/amplify/flo-frontend`
4. View build and deployment logs

### Performance Metrics

1. Go to AWS Amplify Console
2. Click "Analytics"
3. View page load times and user metrics

### Error Tracking

1. Check browser console for errors
2. Check CloudWatch logs for server errors
3. Check Amplify deployment logs for build errors

## Troubleshooting

### Build Fails

1. Check build logs in Amplify Console
2. Verify environment variables are set
3. Check for TypeScript errors: `npm run build`
4. Check for missing dependencies: `npm install`

### Deployment Fails

1. Check deployment logs in Amplify Console
2. Verify git repository is connected
3. Check for merge conflicts
4. Verify branch is correct

### Site Not Loading

1. Check custom domain DNS configuration
2. Verify HTTPS certificate is valid
3. Check CloudFront cache invalidation
4. Clear browser cache and reload

### Performance Issues

1. Check bundle size: `npm run build`
2. Check network tab for slow requests
3. Check CloudWatch metrics for high latency
4. Consider enabling compression

## Rollback

### Rollback to Previous Deployment

1. Go to AWS Amplify Console
2. Click "Deployments"
3. Find the previous deployment
4. Click "Redeploy this version"

### Rollback via Git

1. Revert the commit: `git revert <commit-hash>`
2. Push to main: `git push origin main`
3. Amplify will automatically deploy the reverted version

## Security

### HTTPS

- All traffic is automatically redirected to HTTPS
- SSL certificate is automatically renewed

### Environment Variables

- Environment variables are encrypted at rest
- Never commit `.env` files to git
- Use `.env.example` for documentation

### Access Control

- Use IAM roles to control Amplify access
- Enable MFA for AWS account
- Use branch protection rules on GitHub

## Scaling

### Auto Scaling

Amplify automatically scales based on traffic:
- Compute resources scale automatically
- CDN caches content globally
- No manual scaling required

### Cost Optimization

- Use Amplify's free tier for development
- Monitor usage in AWS Billing Console
- Consider reserved capacity for production

## Support

For deployment issues:
1. Check Amplify Console logs
2. Check CloudWatch logs
3. Check GitHub Actions logs
4. Contact AWS Support

## Next Steps

1. Set up monitoring and alerts
2. Configure backup and disaster recovery
3. Set up CI/CD pipeline for backend
4. Configure custom domain and SSL
5. Set up analytics and error tracking
