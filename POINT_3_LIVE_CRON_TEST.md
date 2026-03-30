# Point 3: Live Cron Test — Email Notifications for Overdue Actions

**Objective**: Verify that the daily cron job detects overdue commitments and sends email notifications via Resend.

**What's being tested**: The cron notification pipeline:
1. Cron job runs at scheduled time (or manually triggered)
2. Queries for actions with `check_in_due_at < NOW()` and `status = 'recommended'`
3. Groups by user
4. Sends email via Resend API
5. Email arrives in user's inbox

---

## Step-by-Step Procedure (10 minutes)

### 1. Get your user ID from Supabase
Go to Supabase dashboard → SQL Editor and run:
```sql
SELECT id FROM auth.users WHERE email = '<your-email>' LIMIT 1;
```

Copy the user ID (UUID like `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

### 2. Create an overdue action in Supabase
Run this SQL to mark an action as overdue (due yesterday):
```sql
UPDATE user_actions 
SET check_in_due_at = NOW() - INTERVAL '1 day',
    status = 'recommended'
WHERE user_id = '<your-user-id>'
LIMIT 1;
```

**If you have no actions**, create one first:
```sql
INSERT INTO user_actions (
  user_id, 
  session_id, 
  action_text, 
  action_category, 
  status, 
  check_in_due_at,
  created_at,
  updated_at
) VALUES (
  '<your-user-id>',
  gen_random_uuid(),
  'Test overdue action for cron verification',
  'other',
  'recommended',
  NOW() - INTERVAL '1 day',
  NOW(),
  NOW()
);
```

Verify the action was created:
```sql
SELECT id, action_text, check_in_due_at, status 
FROM user_actions 
WHERE user_id = '<your-user-id>' 
AND check_in_due_at < NOW()
AND status = 'recommended';
```

**Expected**: One row with a past `check_in_due_at`

### 3. Get your CRON_SECRET
Go to Vercel dashboard → Settings → Environment Variables
Find `CRON_SECRET` and copy its value

### 4. Manually trigger the cron job
Run this curl command in your terminal (replace `<CRON_SECRET>` with the actual value):
```bash
curl -X GET https://atlas-financial.vercel.app/api/cron/check-overdue-commitments \
  -H "Authorization: Bearer <CRON_SECRET>"
```

**Expected response**:
```json
{"ok":true,"processed":1}
```

If you get a 401 error, the `CRON_SECRET` is wrong.
If you get a 500 error, check Vercel logs for the error.

### 5. Check Vercel logs
Go to Vercel dashboard → Deployments → Latest → Logs
Search for `check-overdue-commitments`

**Expected log entries**:
```
[cron] Starting overdue commitment check
[cron] Found 1 overdue actions for user <user-id>
[cron] Sending email to <your-email>
[cron] Email sent successfully
```

### 6. Check Resend dashboard
Go to Resend dashboard → Logs
Search for your email address

**Expected**: One entry showing:
- To: `<your-email>`
- Subject: "You have overdue commitments — Atlas Financial"
- Status: "Delivered" or "Sent"

### 7. Check your inbox
Wait up to 60 seconds and check your email inbox.

**✅ PASS**: Email arrives with:
- Subject: "You have overdue commitments — Atlas Financial"
- From: `onboarding@resend.dev` (or configured sender)
- Body contains: Your overdue action text
- HTML formatting with Atlas branding

**❌ FAIL**: No email arrives, or email is from different sender

---

## What's Being Tested

### Cron Job
- `/api/cron/check-overdue-commitments` endpoint
- Runs on schedule: `0 9 * * *` (9 AM UTC daily)
- Can be manually triggered with `CRON_SECRET` header

### Overdue Detection
- Queries: `check_in_due_at < NOW()` AND `status = 'recommended'`
- Groups by user
- Builds email list

### Email Sending
- Uses Resend API (`sendEmail()` in `emailService.ts`)
- Calls `buildOverdueCommitmentEmail()` to generate HTML
- Sends to user's email address
- Includes action details and Atlas branding

---

## Debugging If It Fails

### Check 1: Overdue action exists
```sql
SELECT id, user_id, action_text, check_in_due_at, status 
FROM user_actions 
WHERE check_in_due_at < NOW() 
AND status = 'recommended'
AND user_id = '<your-user-id>';
```

**Expected**: One row
**If empty**: Action wasn't created or marked as overdue

### Check 2: Cron endpoint is accessible
```bash
curl -X GET https://atlas-financial.vercel.app/api/cron/check-overdue-commitments \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -v
```

**Expected**: 200 response with `{"ok":true,"processed":N}`
**If 401**: `CRON_SECRET` is wrong
**If 500**: Check Vercel logs for error

### Check 3: Resend API key is set
Go to Vercel dashboard → Settings → Environment Variables
Verify `RESEND_API_KEY` is set and not empty

### Check 4: Email was sent
In Resend dashboard → Logs, search for your email
Look for any errors in the response

**Common errors**:
- "Invalid email address" — email in database is malformed
- "Rate limit exceeded" — too many emails sent in short time
- "API key invalid" — `RESEND_API_KEY` is wrong

### Check 5: Email template is correct
In `src/lib/notifications/emailService.ts`, verify `buildOverdueCommitmentEmail()` returns valid HTML

---

## Success Criteria

✅ **PASS**: Email arrives in your inbox within 60 seconds with:
- Correct subject line
- Your overdue action listed
- Atlas branding visible

❌ **FAIL**: No email arrives, or email has wrong content

---

## Next Steps

- If **PASS**: Cron email delivery is working. Move to Point 4 (rate limit UI).
- If **FAIL**: Check debugging steps above. Most likely issue is `RESEND_API_KEY` not set or overdue action not properly marked.
