# Atlas Financial - Deployment Checklist

**Purpose**: Prevent deployment mismatches by verifying all components are correctly configured before pushing to production.

**Last Updated**: February 27, 2026

---

## Pre-Deployment Verification

### 1. Component Import Verification
- [ ] `app/page.tsx` imports `LandingScreen` from `@/screens/Landing`
- [ ] `app/ui/AtlasApp.tsx` imports screens from `@/screens`
- [ ] `app/api/chat/route.ts` imports AI engines from `@/lib/ai/*`
- [ ] `app/ui/AtlasApp.tsx` imports `ClaudeClient` from `@/lib/api/client`
- [ ] `app/ui/AtlasApp.tsx` imports `AtlasDb` from `@/lib/db/atlasDb`

### 2. Component Existence Verification
- [ ] `src/screens/Landing.tsx` exists and exports `LandingScreen`
- [ ] `src/screens/Conversation.tsx` exists and exports `ConversationScreen`
- [ ] `src/screens/Dashboard.tsx` exists and exports `DashboardScreen`
- [ ] All AI engine files exist in `src/lib/ai/`
- [ ] Database client exists at `src/lib/db/atlasDb.ts`
- [ ] API client exists at `src/lib/api/client.ts`

### 3. Duplicate Component Check
- [ ] No duplicate `Landing.tsx` files (remove `app/ui/Landing.tsx` if it exists)
- [ ] No duplicate screen components in `app/ui/` and `src/screens/`
- [ ] All old component files have been removed

### 4. Build Verification
- [ ] Run `npm run build` - build completes successfully
- [ ] Run `npm test` - all unit tests pass
- [ ] Run `npm run e2e` - e2e tests pass or are reviewed
- [ ] Run `npm run lint` - no linting errors
- [ ] TypeScript strict mode - no type errors

### 5. Deployment Verification Script
- [ ] Run `npm run verify-deployment` - all checks pass
- [ ] No warnings about duplicate components
- [ ] All imports are from correct paths

### 6. Git Verification
- [ ] All changes are committed
- [ ] Branch is up to date with origin/main
- [ ] No uncommitted files
- [ ] Latest commit message is descriptive

### 7. Environment Verification
- [ ] `.env.local` is configured with all required variables
- [ ] Supabase credentials are correct
- [ ] Anthropic API key is set
- [ ] Authentication provider keys are configured

### 8. Final Verification Before Push
- [ ] Run full verification: `npm run verify-deployment && npm run build && npm test`
- [ ] Check Vercel deployment settings point to correct GitHub repository
- [ ] Verify GitHub branch protection rules are in place
- [ ] Confirm Vercel auto-deployment is enabled

---

## Post-Deployment Verification

### 1. Vercel Deployment
- [ ] Check Vercel dashboard for successful deployment
- [ ] Verify deployment preview shows new UI
- [ ] Check deployment logs for any errors

### 2. Production Verification
- [ ] Visit https://atlas-financial.vercel.app
- [ ] Verify landing page shows new design ("The clarity you've always wanted...")
- [ ] Test conversation functionality
- [ ] Test authentication flow
- [ ] Verify AI responses are working

### 3. Component Verification
- [ ] Landing page displays new LandingScreen component
- [ ] Conversation page displays ConversationScreen component
- [ ] Dashboard displays DashboardScreen component
- [ ] All AI engines are responding correctly

### 4. Performance Verification
- [ ] Page load time is acceptable (<3s)
- [ ] API responses are fast (<500ms)
- [ ] No console errors in browser
- [ ] Network requests are successful

---

## Common Issues & Solutions

### Issue: Old UI Still Showing After Deployment
**Solution**: 
1. Check `app/page.tsx` imports correct `LandingScreen`
2. Verify `src/screens/Landing.tsx` exists
3. Remove old `app/ui/Landing.tsx` if it exists
4. Force Vercel rebuild by updating `.deploy-trigger`

### Issue: AI Engines Not Working
**Solution**:
1. Verify `app/api/chat/route.ts` imports from `@/lib/ai/*`
2. Check all AI engine files exist in `src/lib/ai/`
3. Verify Anthropic API key is set
4. Check Vercel environment variables

### Issue: Conversation Not Loading
**Solution**:
1. Verify `src/screens/Conversation.tsx` exists
2. Check `app/ui/AtlasApp.tsx` imports `ConversationScreen`
3. Verify database connection is working
4. Check Supabase credentials

### Issue: Build Fails
**Solution**:
1. Run `npm run verify-deployment` to identify issues
2. Check for duplicate components
3. Verify all imports use correct paths
4. Run `npm test` to identify failing tests

---

## Automation

### GitHub Actions
- [ ] CI/CD pipeline runs on every push
- [ ] Deployment verification script runs before build
- [ ] Tests run automatically
- [ ] Build verification passes

### Vercel
- [ ] Auto-deployment is enabled for main branch
- [ ] Environment variables are configured
- [ ] Build command is correct: `npm run build`
- [ ] Output directory is correct: `.next`

---

## Prevention Strategies

### 1. Component Organization
- Keep new components in `src/screens/`
- Keep old components in `app/ui/` (for reference only)
- Always import from `src/screens/` in production code
- Remove old components after successful deployment

### 2. Import Standards
- Use `@/screens` for screen components
- Use `@/lib/ai/*` for AI engines
- Use `@/lib/api/*` for API clients
- Use `@/lib/db/*` for database clients
- Never use relative imports for core components

### 3. Verification Before Deployment
- Always run `npm run verify-deployment` before pushing
- Always run `npm run build && npm test` before pushing
- Review import paths in modified files
- Check for duplicate components

### 4. Git Workflow
- Create feature branches for component changes
- Use descriptive commit messages
- Require PR review before merging
- Run verification in CI/CD pipeline

---

## Deployment Command Sequence

```bash
# 1. Verify all components are correct
npm run verify-deployment

# 2. Run tests
npm test
npm run e2e

# 3. Build for production
npm run build

# 4. Commit changes
git add -A
git commit -m "feat: [description of changes]"

# 5. Push to GitHub (triggers Vercel auto-deployment)
git push origin main

# 6. Verify deployment
# - Check Vercel dashboard
# - Visit https://atlas-financial.vercel.app
# - Test all functionality
```

---

## Rollback Procedure

If deployment has critical issues:

```bash
# 1. Identify the last good commit
git log --oneline | head -10

# 2. Revert to last good commit
git revert HEAD

# 3. Push to trigger rollback
git push origin main

# 4. Verify rollback on Vercel
```

---

## Sign-Off

- [ ] All checklist items verified
- [ ] Deployment verified on production
- [ ] No critical issues reported
- [ ] Team notified of deployment

**Deployed By**: [Name]  
**Date**: [Date]  
**Commit**: [Commit Hash]  
**Status**: ✅ Successful / ❌ Failed
