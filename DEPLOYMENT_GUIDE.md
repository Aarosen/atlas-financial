# Atlas Financial - Production Deployment Guide

**Version**: 1.0  
**Last Updated**: February 25, 2026  
**Status**: Ready for Production Deployment

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Authentication Configuration](#authentication-configuration)
4. [Database Setup](#database-setup)
5. [Deployment Steps](#deployment-steps)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Monitoring & Alerting](#monitoring--alerting)
8. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Code Quality
- [ ] All unit tests passing (870/870)
- [ ] All e2e tests passing or snapshot updates reviewed
- [ ] TypeScript strict mode compliant
- [ ] ESLint passing
- [ ] No console errors or warnings
- [ ] No security vulnerabilities (npm audit)

### Documentation
- [ ] README.md updated
- [ ] API documentation complete
- [ ] Environment variables documented
- [ ] Deployment guide reviewed

### Infrastructure
- [ ] Vercel account created and configured
- [ ] Supabase project created
- [ ] Clerk or NextAuth.js configured
- [ ] Redis instance available (optional)
- [ ] Monitoring tools configured

### Secrets Management
- [ ] All secrets stored in Vercel environment variables
- [ ] No secrets committed to repository
- [ ] .env.local added to .gitignore
- [ ] Backup of secrets created

---

## Environment Setup

### 1. Vercel Configuration

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link project to Vercel
vercel link

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add ANTHROPIC_API_KEY
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
```

### 2. Local Development Setup

```bash
# Copy environment template
cp .env.example .env.local

# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

---

## Authentication Configuration

### Option A: Clerk Setup

1. **Create Clerk Account**
   - Go to https://dashboard.clerk.com
   - Create new application
   - Copy publishable and secret keys

2. **Configure Environment Variables**
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   CLERK_WEBHOOK_SECRET=whsec_...
   ```

3. **Update Middleware**
   - Clerk middleware is already configured in `middleware.ts`
   - No additional changes needed

### Option B: NextAuth.js Setup

1. **Generate NEXTAUTH_SECRET**
   ```bash
   openssl rand -base64 32
   ```

2. **Configure OAuth Providers**
   - Google: https://console.cloud.google.com
   - GitHub: https://github.com/settings/developers

3. **Set Environment Variables**
   ```
   NEXTAUTH_SECRET=your_generated_secret
   NEXTAUTH_URL=https://your-domain.com
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GITHUB_ID=...
   GITHUB_SECRET=...
   ```

---

## Database Setup

### 1. Supabase Project Creation

1. **Create Project**
   - Go to https://supabase.com
   - Create new project
   - Choose region closest to users
   - Save database password securely

2. **Initialize Database**
   ```bash
   # Run migrations
   npx supabase migration up
   ```

3. **Create Tables**
   - Users table
   - Profiles table
   - Conversations table
   - Messages table
   - Quotas table

4. **Set Up Indexes**
   - Run database optimization script
   - Verify indexes are created

### 2. Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## Deployment Steps

### Step 1: Pre-Deployment Testing

```bash
# Run full test suite
npm test

# Run e2e tests
npm run e2e

# Build production bundle
npm run build

# Check bundle size
npm run build -- --analyze
```

### Step 2: Deploy to Vercel

```bash
# Deploy to production
vercel --prod

# Or use GitHub integration for automatic deployments
# Push to main branch and Vercel will auto-deploy
```

### Step 3: Verify Deployment

```bash
# Check deployment status
vercel status

# View logs
vercel logs

# Test API endpoints
curl https://your-domain.com/api/health
```

### Step 4: Database Migration

```bash
# Run any pending migrations
npm run db:migrate

# Seed initial data if needed
npm run db:seed
```

---

## Post-Deployment Verification

### 1. Health Checks

- [ ] Application loads without errors
- [ ] Authentication works (login/logout)
- [ ] API endpoints respond correctly
- [ ] Database connections working
- [ ] Caching layer operational
- [ ] CDN assets loading

### 2. Performance Verification

```bash
# Run Lighthouse audit
npm run lighthouse

# Check Core Web Vitals
npm run vitals

# Run load test
npm run load-test
```

### 3. Security Verification

- [ ] HTTPS enabled
- [ ] Security headers present
- [ ] CORS configured correctly
- [ ] Rate limiting active
- [ ] No sensitive data in logs

### 4. Monitoring Setup

- [ ] Vercel Analytics enabled
- [ ] Sentry error tracking active
- [ ] Database monitoring configured
- [ ] Performance monitoring running
- [ ] Alerts configured

---

## Monitoring & Alerting

### 1. Vercel Analytics

- Real User Monitoring (RUM)
- Performance metrics
- Error tracking
- Deployment analytics

### 2. Sentry Configuration

```bash
# Initialize Sentry
npm install @sentry/nextjs

# Configure in next.config.js
# Already configured in project
```

### 3. Custom Monitoring

- Performance metrics via `/api/metrics`
- Health checks via `/api/health`
- Database query monitoring
- Cache hit rate tracking

### 4. Alert Configuration

Set up alerts for:
- High error rate (>1%)
- Slow API responses (>500ms)
- Database connection issues
- Cache failures
- Rate limit violations

---

## Troubleshooting

### Common Issues

#### 1. Authentication Not Working

**Problem**: Users cannot log in

**Solution**:
- Verify environment variables are set correctly
- Check Clerk/NextAuth configuration
- Review authentication logs in Vercel
- Test with test user account

#### 2. Database Connection Issues

**Problem**: Database queries failing

**Solution**:
- Verify Supabase connection string
- Check database credentials
- Verify network access rules
- Check connection pool status

#### 3. Slow API Responses

**Problem**: API endpoints responding slowly

**Solution**:
- Check database query performance
- Verify indexes are created
- Enable caching layer
- Review CDN configuration
- Check for N+1 queries

#### 4. High Memory Usage

**Problem**: Application using excessive memory

**Solution**:
- Check cache size limits
- Verify connection pool size
- Review memory leaks in code
- Implement garbage collection
- Scale up instance size

#### 5. Rate Limiting Issues

**Problem**: Users being rate limited incorrectly

**Solution**:
- Verify rate limit configuration
- Check rate limit database
- Review rate limit logic
- Adjust limits if needed

---

## Rollback Procedure

If deployment has critical issues:

```bash
# Revert to previous deployment
vercel rollback

# Or redeploy previous commit
git revert HEAD
git push origin main
```

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Page Load Time | <3s | TBD |
| API Response Time | <500ms | TBD |
| Lighthouse Score | >85 | TBD |
| Error Rate | <0.1% | TBD |
| Uptime | 99.9% | TBD |

---

## Support & Escalation

### Critical Issues
- Contact Vercel support
- Check Supabase status page
- Review application logs

### Performance Issues
- Check Vercel Analytics
- Review database metrics
- Analyze cache hit rates

### Security Issues
- Review Sentry alerts
- Check security headers
- Verify rate limiting

---

## Post-Deployment Checklist

- [ ] All tests passing in production
- [ ] Monitoring and alerts active
- [ ] Performance metrics within targets
- [ ] Error rate below threshold
- [ ] User feedback positive
- [ ] No critical issues reported
- [ ] Documentation updated
- [ ] Team trained on deployment process

---

**Deployment Status**: Ready for Production  
**Last Deployment**: [To be filled in]  
**Next Review Date**: [To be scheduled]
