# Cron Live Test Procedure

## Objective
Verify that the daily cron job detects overdue actions and sends email notifications via Resend.

## Prerequisites
- Access to Supabase dashboard
- CRON_SECRET environment variable set in Vercel
- Test email address (can use your own email)
- curl command available in terminal

## Test Procedure

### Step 1: Create a Test Action in Supabase

1. **Open Supabase dashboard** for your Atlas Financial project
2. **Go to SQL Editor**
3. **Run this query** to create a test action with a past due date:

```sql
INSERT INTO user_actions (
  user_id,
  action_title,
  action_description,
  status,
  check_in_due_at,
  email_notifications,
  created_at
) VALUES (
  'YOUR_USER_ID_HERE',
  'Test Action for Cron',
  'This is a test action to verify cron email notifications',
  'committed',
  NOW() - INTERVAL '1 day',
  true,
  NOW()
)
RETURNING id, action_title, check_in_due_at;
```

**Replace `YOUR_USER_ID_HERE`** with an actual user ID from your `auth.users` table.

4. **Note the returned `id`** - you'll need it for verification

### Step 2: Verify Action in Table

1. **Go to Table Editor** in Supabase
2. **Select `user_actions` table**
3. **Verify** your test action appears with:
   - `status = 'committed'`
   - `check_in_due_at` in the past (1 day ago)
   - `email_notifications = true`

### Step 3: Trigger Cron Endpoint Manually

1. **Open terminal**
2. **Run this curl command**:

```bash
curl -X GET https://atlas-financial.vercel.app/api/cron/check-overdue-commitments \
  -H "Authorization: Bearer YOUR_CRON_SECRET_HERE"
```

**Replace `YOUR_CRON_SECRET_HERE`** with the CRON_SECRET from your Vercel environment variables.

3. **Expected response**: `{ "ok": true }` or similar success message
4. **Check logs**: Go to Vercel dashboard → Logs to see cron execution details

### Step 4: Verify Email Received

1. **Check your email inbox** (the email associated with the user_id from Step 1)
2. **Look for email from**: `onboarding@resend.dev` (or your verified Resend domain)
3. **Subject should contain**: "You have 1 overdue financial commitment" or similar
4. **Email body should include**:
   - The action title: "Test Action for Cron"
   - Days overdue: "1 days overdue"
   - Link to Atlas: "Log in to Atlas"

### Step 5: Verify in Supabase Logs

1. **Go to Supabase SQL Editor**
2. **Run this query** to see cron execution logs:

```sql
SELECT * FROM cron_execution_logs
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 10;
```

3. **Verify**: Logs show successful execution with action count

## Success Criteria

All 4 must be true:

✅ **Cron endpoint responds**: Returns `{ "ok": true }`
✅ **Email received**: Email arrives from Resend with correct action details
✅ **Email content correct**: Includes action title, days overdue, and login link
✅ **Logs show execution**: Cron execution logs record the job run

## Troubleshooting

### Issue: Cron endpoint returns 401 Unauthorized
- **Check**: CRON_SECRET is set correctly in Vercel environment variables
- **Check**: Authorization header format is exactly `Bearer YOUR_SECRET`
- **Check**: No extra spaces or quotes in the secret

### Issue: Email not received
- **Check**: `email_notifications = true` in user_actions table
- **Check**: User email is correct in auth.users table
- **Check**: Resend API key is set in Vercel environment variables
- **Check**: Resend domain is verified (onboarding@resend.dev works by default)
- **Check**: Check spam/junk folder

### Issue: Cron endpoint returns 500 error
- **Check**: Vercel logs for error details
- **Check**: Supabase connection string is correct
- **Check**: user_id exists in auth.users table
- **Check**: user_actions table has email_notifications column (run migration if needed)

## Cleanup

After testing, delete the test action:

```sql
DELETE FROM user_actions
WHERE action_title = 'Test Action for Cron'
AND user_id = 'YOUR_USER_ID_HERE';
```

## Sign-Off

Once all 4 success criteria are met, Fix 6 is complete:

- [ ] Cron endpoint responds with success
- [ ] Email received from Resend
- [ ] Email content is correct
- [ ] Logs show execution

**Status**: Ready for manual testing by user
