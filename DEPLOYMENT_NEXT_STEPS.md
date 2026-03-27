# Atlas Financial - Deployment Next Steps

## Overview
All 18 core tasks have been implemented. This guide covers the final configuration steps needed for production deployment.

---

## Step 1: Configure RESEND_API_KEY in Vercel

### What is RESEND_API_KEY?
- API key for Resend email service
- Required for CRON job to send email notifications
- Used by `/api/cron/check-overdue-commitments` endpoint

### How to Configure

1. **Get your Resend API key:**
   - Go to https://resend.com
   - Sign in to your account
   - Navigate to API Keys section
   - Create a new API key (or use existing one)
   - Copy the key (format: `re_xxxxxxxxxxxxx`)

2. **Add to Vercel:**
   - Go to https://vercel.com/dashboard
   - Select your Atlas Financial project
   - Go to Settings → Environment Variables
   - Click "Add New"
   - Name: `RESEND_API_KEY`
   - Value: `re_xxxxxxxxxxxxx` (your actual key)
   - Select environments: Production, Preview, Development
   - Click "Save"

3. **Verify in code:**
   - File: `/app/api/cron/check-overdue-commitments/route.ts` (line 125)
   - Uses: `process.env.RESEND_API_KEY`
   - Fallback: Logs warning if not configured, doesn't block execution

### Testing
```bash
# After deployment, check logs for:
# "[cron] Sent overdue notification to user@example.com"
# or
# "RESEND_API_KEY not configured, skipping email"
```

---

## Step 2: Ensure CRON_SECRET is Set in Vercel

### What is CRON_SECRET?
- Security token to verify CRON job requests are from Vercel
- Prevents unauthorized calls to CRON endpoint
- Required by `/api/cron/check-overdue-commitments` (line 211)

### How to Configure

1. **Generate a secure token:**
   ```bash
   # Option 1: Use OpenSSL
   openssl rand -base64 32
   
   # Option 2: Use Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   
   # Example output: "abc123def456ghi789jkl012mno345pqr678stu901vwx"
   ```

2. **Add to Vercel:**
   - Go to https://vercel.com/dashboard
   - Select your Atlas Financial project
   - Go to Settings → Environment Variables
   - Click "Add New"
   - Name: `CRON_SECRET`
   - Value: `abc123def456ghi789jkl012mno345pqr678stu901vwx` (your generated token)
   - Select environments: Production, Preview, Development
   - Click "Save"

3. **Verify in code:**
   - File: `/app/api/cron/check-overdue-commitments/route.ts` (line 211)
   - Uses: `process.env.CRON_SECRET`
   - Returns 401 if token doesn't match

### Testing
```bash
# Test CRON endpoint manually:
curl -X GET "https://your-domain.vercel.app/api/cron/check-overdue-commitments" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Expected response (if no overdue commitments):
# {"message": "No overdue commitments", "count": 0}
```

---

## Step 3: Verify email_notifications Column in Users Table

### What is email_notifications?
- Boolean column in `users` table
- Tracks whether user has opted in/out of email notifications
- Used by `/api/email/unsubscribe` endpoint to disable emails

### How to Verify

1. **Check Supabase:**
   - Go to https://supabase.com/dashboard
   - Select your Atlas Financial project
   - Go to SQL Editor
   - Run this query:
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'users' AND column_name = 'email_notifications';
   ```

2. **If column doesn't exist, create it:**
   ```sql
   ALTER TABLE users
   ADD COLUMN email_notifications BOOLEAN DEFAULT true;
   ```

3. **Verify the column:**
   - Should show: `email_notifications | boolean | true`
   - Default value should be `true` (users opt-in by default)

### Code References
- File: `/app/api/email/unsubscribe/route.ts` (line 31)
- Uses: `UPDATE users SET email_notifications = false WHERE user_id = ?`
- File: `/app/api/cron/check-overdue-commitments/route.ts` (line 64)
- Filters: `.in('status', ['committed', 'recommended'])`

---

## Step 4: Test Email Notification Flow End-to-End

### Test Scenario 1: Manual CRON Trigger

1. **Create a test overdue action:**
   ```sql
   INSERT INTO user_actions (
     user_id,
     session_id,
     action_text,
     action_category,
     status,
     check_in_due_at,
     created_at
   ) VALUES (
     'test-user-id',
     'test-session-id',
     'Test action for email notification',
     'savings',
     'committed',
     NOW() - INTERVAL '1 day',  -- Due yesterday
     NOW()
   );
   ```

2. **Trigger CRON manually:**
   ```bash
   curl -X GET "https://your-domain.vercel.app/api/cron/check-overdue-commitments" \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

3. **Check response:**
   - Should return: `{"message": "Overdue commitment check completed", "overdueCount": 1, "emailsSent": 1, "emailsFailed": 0}`
   - Check Resend dashboard for sent email

4. **Verify email received:**
   - Check test user's email inbox
   - Should contain: action title, days overdue, link to Atlas

### Test Scenario 2: Unsubscribe Flow

1. **Test unsubscribe endpoint:**
   ```bash
   curl -X GET "https://your-domain.vercel.app/api/email/unsubscribe?userId=test-user-id"
   ```

2. **Verify in database:**
   ```sql
   SELECT email_notifications FROM users WHERE user_id = 'test-user-id';
   ```
   - Should return: `false`

3. **Verify CRON respects opt-out:**
   - Run CRON again
   - Should not send email to unsubscribed user

### Test Scenario 3: Deep Link from Email

1. **Test check-in deep link:**
   ```bash
   # Simulate clicking "Check in with Atlas" from email
   curl -X GET "https://your-domain.vercel.app/conversation?checkin=ACTION_ID&result=yes"
   ```

2. **Verify in browser:**
   - Should redirect to `/conversation`
   - ActionCompletionCard should appear (if action is due)
   - Or current mission banner should show (if action is not yet due)

---

## Step 5: Monitor Deployment for Issues

### Key Metrics to Monitor

1. **CRON Job Execution:**
   - Check Vercel Function Logs
   - Look for: `[cron] Starting overdue commitment check`
   - Verify runs daily at 9 AM UTC

2. **Email Delivery:**
   - Check Resend dashboard for delivery status
   - Monitor bounce rates
   - Verify unsubscribe link clicks

3. **Error Tracking:**
   - Monitor Vercel error logs
   - Look for: `Error in getOverdueCommitments`, `Error sending email`
   - Check Supabase query logs for failures

4. **Rate Limiting:**
   - Monitor 429 responses
   - Verify authenticated users get 100 req/min limit
   - Verify guests get 20 req/min limit

### Vercel Logs

```bash
# View real-time logs
vercel logs --tail

# View specific function logs
vercel logs --tail /api/cron/check-overdue-commitments

# View error logs
vercel logs --tail --error
```

### Supabase Monitoring

1. **Query Performance:**
   - Go to Supabase Dashboard → Database → Query Performance
   - Monitor `/api/cron/check-overdue-commitments` queries
   - Ensure queries complete in <2 seconds

2. **Error Logs:**
   - Go to Supabase Dashboard → Logs
   - Filter by: `check-overdue-commitments`
   - Look for connection errors, timeout errors

3. **Function Invocations:**
   - Monitor `user_actions` table for new rows
   - Verify `check_in_due_at` dates are correct
   - Verify `status` transitions are correct

### Alert Setup (Recommended)

1. **Vercel Alerts:**
   - Set up alerts for function errors
   - Set up alerts for high error rates
   - Set up alerts for slow function execution

2. **Resend Alerts:**
   - Set up alerts for bounce rates >5%
   - Set up alerts for delivery failures
   - Set up alerts for unsubscribe spikes

---

## Deployment Checklist

- [ ] RESEND_API_KEY configured in Vercel
- [ ] CRON_SECRET configured in Vercel
- [ ] email_notifications column exists in users table
- [ ] Manual CRON test successful (email sent)
- [ ] Unsubscribe endpoint tested
- [ ] Deep link check-in tested
- [ ] Vercel logs monitored for errors
- [ ] Resend dashboard shows successful deliveries
- [ ] Rate limiting verified (429 responses working)
- [ ] Production deployment verified

---

## Rollback Plan

If issues arise:

1. **Disable CRON job:**
   - Remove from `vercel.json` or set schedule to empty
   - Redeploy

2. **Disable email notifications:**
   - Set `RESEND_API_KEY` to empty string
   - CRON will log warning and continue

3. **Revert to previous commit:**
   ```bash
   git revert HEAD~1
   git push origin main
   ```

---

## Support

For issues:
- Check Vercel Function Logs: https://vercel.com/dashboard
- Check Supabase Logs: https://supabase.com/dashboard
- Check Resend Status: https://resend.com/dashboard
- Review error messages in `/app/api/cron/check-overdue-commitments/route.ts`
