# Atlas Financial — Deployment Checklist

## Current Status
- **Companion Layer**: ✅ Fully wired and functional
- **Build**: ✅ Compiles successfully
- **Code Quality**: ✅ All TypeScript errors resolved
- **Readiness**: 52% with Supabase configured, 32% as deployed today

---

## Pre-Deployment Setup (Required)

### Step 1: Vercel Environment Variables
Set these five variables in your Vercel project settings:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=your-resend-api-key
CRON_SECRET=your-secret-string-for-cron-authorization
```

**Where to find these:**
- Supabase URL & Keys: Supabase Dashboard → Project Settings → API
- Resend API Key: Resend Dashboard → API Keys
- CRON_SECRET: Generate a random string (e.g., `openssl rand -hex 32`)

### Step 2: Supabase Database Setup
1. Create a Supabase project at https://supabase.com
2. Run the schema migration:
   - Go to SQL Editor in Supabase Dashboard
   - Create a new query
   - Copy contents of `/src/lib/supabase/schema.sql`
   - Execute the query
3. Verify 8 tables are created:
   - `users`
   - `financial_profiles`
   - `conversation_sessions`
   - `user_actions`
   - `financial_snapshots`
   - `user_goals`
   - `behavior_profiles`
   - `cron_logs`

### Step 3: Enable Magic Link Authentication in Supabase
1. Go to Authentication → Providers
2. Enable Email provider
3. Configure email templates (optional but recommended)
4. Set redirect URL to: `https://your-domain.vercel.app/auth/callback`

---

## Deployment Steps

### Step 1: Verify Build
```bash
npm run build
```
Expected: ✓ Compiled successfully, ✓ Generating static pages

### Step 2: Run Tests
```bash
npm test
```
Expected: All tests passing

### Step 3: Commit Changes
```bash
git add -A
git commit -m "Deploy: Companion layer fully activated"
git push origin main
```

### Step 4: Vercel Deployment
1. Push to main branch (auto-deploys)
2. Monitor build in Vercel Dashboard
3. Wait for deployment to complete
4. Verify deployment URL is live

---

## Post-Deployment Testing

### Test 1: Magic Link Authentication
1. Open app at your Vercel URL
2. Click "Sign in with email" on landing page
3. Enter test email address
4. Check email for magic link
5. Click link and verify redirect to `/auth/callback`
6. Verify user is authenticated in conversation

**Expected**: User can authenticate and see "Signed in as [email]"

### Test 2: Session Initialization
1. Authenticate as a user
2. Start a conversation
3. Open browser DevTools → Network tab
4. Send a message
5. Check `/api/chat` request payload
6. Verify `userId` and `sessionId` are included

**Expected**: Both userId and sessionId present in request

### Test 3: Session Finalization
1. Authenticate and have a conversation
2. Close the browser tab
3. Check Supabase → `conversation_sessions` table
4. Verify session has `ended_at` timestamp

**Expected**: Session marked as ended with timestamp

### Test 4: Multi-Goal Context
1. Authenticate and mention multiple goals
2. Send message about debt payoff
3. Send message about emergency fund
4. Verify Atlas responds with context about both goals

**Expected**: Atlas acknowledges both goals in responses

### Test 5: Nudge Injection
1. Authenticate and have 10+ message conversation
2. Reach message 10 or 20
3. Verify nudge appears in response (if applicable)

**Expected**: Nudge appears at strategic points without disrupting conversation

### Test 6: Cron Job Execution
1. Wait until 9 AM UTC or manually trigger
2. Check Supabase → `cron_logs` table
3. Verify execution logged with status

**Expected**: Cron job runs and logs execution

### Test 7: Email Notifications
1. Create an action with due date in past
2. Wait for cron job to run (or manually trigger)
3. Check email for overdue notification

**Expected**: Email received with overdue action details

---

## Monitoring & Troubleshooting

### Common Issues

**Issue: Magic link email not received**
- Check Supabase email settings
- Verify SMTP configuration
- Check spam folder
- Verify email address is correct

**Issue: Session not persisting across conversations**
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel
- Check Supabase connection in browser console
- Verify `conversation_sessions` table exists

**Issue: Cron job not running**
- Verify `CRON_SECRET` is set in Vercel
- Check `vercel.json` has correct cron schedule
- Verify `/api/cron/check-overdue-commitments` route exists
- Check Vercel logs for errors

**Issue: Nudges not appearing**
- Verify `injectNudgeIfAppropriate` is called in chat route
- Check message count is at injection point (3, 10, 20, 50, 100)
- Verify user has goals in Supabase

### Monitoring Checklist
- [ ] Check Vercel deployment logs daily
- [ ] Monitor Supabase query performance
- [ ] Track cron job execution in `cron_logs`
- [ ] Monitor email delivery via Resend dashboard
- [ ] Review user authentication success rate
- [ ] Track session finalization reliability

---

## Rollback Plan

If issues arise after deployment:

1. **Revert to previous commit**:
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Disable specific features**:
   - Remove `RESEND_API_KEY` to disable emails
   - Remove `SUPABASE_SERVICE_ROLE_KEY` to disable companion features
   - Comment out nudge injection in chat route

3. **Contact Support**:
   - Supabase: https://supabase.com/support
   - Vercel: https://vercel.com/support
   - Resend: https://resend.com/support

---

## Success Criteria

Deployment is successful when:
- ✅ App loads without errors
- ✅ Users can authenticate via magic link
- ✅ Sessions persist across conversations
- ✅ Multi-goal context injects correctly
- ✅ Nudges appear at strategic points
- ✅ Cron job runs daily at 9 AM UTC
- ✅ Email notifications send successfully
- ✅ No TypeScript errors in console
- ✅ All tests pass

---

## Next Steps After Deployment

1. **Monitor for 24 hours**: Watch for any issues
2. **Gather user feedback**: Test with real users
3. **Optimize performance**: Monitor response times
4. **Expand features**: Add more nudge types, improve goal tracking
5. **Scale infrastructure**: Prepare for growth

---

## Support & Questions

For questions or issues:
1. Check this checklist first
2. Review error logs in Vercel Dashboard
3. Check Supabase logs and query performance
4. Contact support for your respective services
