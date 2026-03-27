# Email Notification Testing Guide

## Overview
Complete testing procedures for the email notification system including CRON job, Resend integration, and unsubscribe flow.

---

## Pre-Testing Checklist

Before running tests, verify:
- [ ] RESEND_API_KEY is set in Vercel environment variables
- [ ] CRON_SECRET is set in Vercel environment variables
- [ ] email_notifications column exists in users table
- [ ] Resend account is active and has available credits
- [ ] Test user email is configured and accessible

---

## Test 1: Database Setup for Testing

### Create Test User and Action

Run in Supabase SQL Editor:

```sql
-- Create test user (if not exists)
INSERT INTO users (user_id, email, email_notifications, created_at)
VALUES ('test-user-' || NOW()::text, 'your-test-email@example.com', true, NOW())
ON CONFLICT (user_id) DO NOTHING;

-- Get the test user ID
SELECT user_id FROM users WHERE email = 'your-test-email@example.com' LIMIT 1;

-- Create overdue action for test user
INSERT INTO user_actions (
  user_id,
  session_id,
  action_text,
  action_category,
  status,
  check_in_due_at,
  created_at
) VALUES (
  'test-user-YOUR_ID_HERE',
  'test-session-' || NOW()::text,
  'Complete your emergency fund setup - target $5,000',
  'savings',
  'committed',
  NOW() - INTERVAL '2 days',  -- Due 2 days ago
  NOW()
);

-- Verify the action was created
SELECT id, user_id, action_text, check_in_due_at, status 
FROM user_actions 
WHERE user_id = 'test-user-YOUR_ID_HERE' 
ORDER BY created_at DESC 
LIMIT 1;
```

---

## Test 2: Manual CRON Trigger

### Trigger CRON Endpoint

```bash
# Set your variables
VERCEL_URL="https://your-domain.vercel.app"
CRON_SECRET="your-cron-secret-here"

# Trigger CRON job
curl -X GET "${VERCEL_URL}/api/cron/check-overdue-commitments" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  -v

# Expected response (200 OK):
# {
#   "message": "Overdue commitment check completed",
#   "overdueCount": 1,
#   "emailsSent": 1,
#   "emailsFailed": 0
# }
```

### Verify Email Sent

1. **Check Resend Dashboard:**
   - Go to https://resend.com/dashboard
   - Navigate to "Emails" section
   - Look for email sent to your test email address
   - Verify status is "Delivered" or "Opened"

2. **Check Your Email:**
   - Check inbox for email from "Atlas <notifications@atlas.financial>"
   - Subject should contain: "You have 1 overdue financial commitment"
   - Email should contain:
     - Action title: "Complete your emergency fund setup - target $5,000"
     - Days overdue: "2 days overdue"
     - Link to Atlas conversation

3. **Check Vercel Logs:**
   ```bash
   vercel logs --tail /api/cron/check-overdue-commitments
   
   # Look for:
   # [cron] Starting overdue commitment check
   # [cron] Found 1 overdue commitments
   # [cron] Sent overdue notification to your-test-email@example.com
   # [cron] Completed: Processed 1 overdue commitments. Emails sent: 1, failed: 0
   ```

---

## Test 3: Unsubscribe Flow

### Test Unsubscribe Endpoint

```bash
# Get your test user ID from previous test
USER_ID="test-user-YOUR_ID_HERE"
VERCEL_URL="https://your-domain.vercel.app"

# Trigger unsubscribe
curl -X GET "${VERCEL_URL}/api/email/unsubscribe?userId=${USER_ID}" \
  -v

# Expected response: Redirect to /conversation?unsubscribed=true
# Status: 307 (Temporary Redirect)
```

### Verify Unsubscribe in Database

```sql
-- Check that email_notifications is now false
SELECT user_id, email, email_notifications 
FROM users 
WHERE user_id = 'test-user-YOUR_ID_HERE';

-- Should show: email_notifications = false
```

### Verify CRON Respects Opt-Out

```bash
# Create another overdue action for the same user
INSERT INTO user_actions (
  user_id,
  session_id,
  action_text,
  action_category,
  status,
  check_in_due_at,
  created_at
) VALUES (
  'test-user-YOUR_ID_HERE',
  'test-session-2-' || NOW()::text,
  'Another test action',
  'savings',
  'committed',
  NOW() - INTERVAL '1 day',
  NOW()
);

# Trigger CRON again
curl -X GET "${VERCEL_URL}/api/cron/check-overdue-commitments" \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -v

# Expected response:
# {
#   "message": "Overdue commitment check completed",
#   "overdueCount": 1,
#   "emailsSent": 0,  # <-- Should be 0 because user unsubscribed
#   "emailsFailed": 0
# }
```

---

## Test 4: Deep Link Check-In Flow

### Test Check-In from Email

1. **Get Action ID:**
   ```sql
   SELECT id FROM user_actions 
   WHERE user_id = 'test-user-YOUR_ID_HERE' 
   LIMIT 1;
   ```

2. **Test Check-In Link:**
   ```bash
   ACTION_ID="your-action-id-here"
   VERCEL_URL="https://your-domain.vercel.app"
   
   # Test with result=yes (completed)
   curl -X GET "${VERCEL_URL}/conversation?checkin=${ACTION_ID}&result=yes" \
     -v
   
   # Expected: Redirect to /conversation
   # Status: 307
   ```

3. **Verify Action Status Updated:**
   ```sql
   SELECT id, status, completed_at, user_reported_outcome 
   FROM user_actions 
   WHERE id = 'your-action-id-here';
   
   -- Should show:
   -- status = 'completed'
   -- completed_at = NOW() (approximately)
   ```

4. **Test with result=no (not completed):**
   ```bash
   # Create another action
   INSERT INTO user_actions (
     user_id,
     session_id,
     action_text,
     action_category,
     status,
     check_in_due_at,
     created_at
   ) VALUES (
     'test-user-YOUR_ID_HERE',
     'test-session-3-' || NOW()::text,
     'Test action for no result',
     'savings',
     'committed',
     NOW() - INTERVAL '1 day',
     NOW()
   );
   
   # Get new action ID and test with result=no
   curl -X GET "${VERCEL_URL}/conversation?checkin=${NEW_ACTION_ID}&result=no" \
     -v
   
   # Verify status = 'skipped' in database
   ```

---

## Test 5: Rate Limiting

### Test Guest Rate Limit (20 req/min)

```bash
VERCEL_URL="https://your-domain.vercel.app"

# Make 21 requests as guest (no userId)
for i in {1..21}; do
  curl -X POST "${VERCEL_URL}/api/chat" \
    -H "Content-Type: application/json" \
    -d '{"type":"chat","messages":[{"role":"user","content":"Hello"}]}' \
    -w "\nRequest $i: %{http_code}\n"
done

# Expected: First 20 return 200, 21st returns 429
```

### Test Authenticated Rate Limit (100 req/min)

```bash
VERCEL_URL="https://your-domain.vercel.app"
USER_ID="test-user-YOUR_ID_HERE"

# Make 101 requests as authenticated user
for i in {1..101}; do
  curl -X POST "${VERCEL_URL}/api/chat" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"chat\",\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}],\"userId\":\"${USER_ID}\"}" \
    -w "\nRequest $i: %{http_code}\n"
done

# Expected: First 100 return 200, 101st returns 429
```

---

## Test 6: Multi-Goal Serialization

### Verify Goals Flow to Backend

```bash
VERCEL_URL="https://your-domain.vercel.app"
USER_ID="test-user-YOUR_ID_HERE"

# Send message with goals in sessionState
curl -X POST "${VERCEL_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "chat",
    "messages": [{"role": "user", "content": "What should I do about my debt?"}],
    "userId": "'${USER_ID}'",
    "sessionState": {
      "goals": [
        {
          "id": "goal-1",
          "type": "debt_payoff",
          "title": "Pay off credit card",
          "targetAmount": 5000,
          "currentAmount": 2000,
          "status": "active"
        }
      ]
    }
  }' \
  -v

# Expected: 200 OK with response that references the debt goal
# Check Vercel logs to confirm goals were received
```

---

## Test 7: Compliance Screening

### Test Investment Advice Detection

```bash
VERCEL_URL="https://your-domain.vercel.app"

# Test message that should trigger compliance screening
curl -X POST "${VERCEL_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "chat",
    "messages": [
      {"role": "user", "content": "Should I buy Tesla stock?"}
    ]
  }' \
  -v

# Expected: Response should include compliance disclaimer
# Should NOT recommend specific stocks
```

### Test Tax Advice Detection

```bash
curl -X POST "${VERCEL_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "chat",
    "messages": [
      {"role": "user", "content": "How do I do a Roth conversion?"}
    ]
  }' \
  -v

# Expected: Response should acknowledge need for professional advice
# Should NOT provide specific tax filing guidance
```

---

## Test 8: Session Finalization

### Test Session Snapshot Creation

```bash
# Open Atlas in browser and have a conversation
# Then close the browser tab or navigate away

# Check Supabase for new session snapshot:
SELECT 
  id,
  user_id,
  session_id,
  total_debt,
  net_worth,
  created_at
FROM financial_snapshots
WHERE user_id = 'test-user-YOUR_ID_HERE'
ORDER BY created_at DESC
LIMIT 1;

# Should show recent snapshot with financial data
```

---

## Monitoring Checklist

After all tests pass:

- [ ] CRON job runs daily at 9 AM UTC
- [ ] Emails are delivered successfully
- [ ] Unsubscribe flow works correctly
- [ ] Deep links from emails work
- [ ] Rate limiting is enforced
- [ ] Goals flow to backend
- [ ] Compliance screening catches risky requests
- [ ] Session snapshots are created
- [ ] No errors in Vercel logs
- [ ] No errors in Supabase logs

---

## Troubleshooting

### Email Not Sent

1. Check RESEND_API_KEY is set:
   ```bash
   vercel env list
   ```

2. Check Resend dashboard for errors:
   - https://resend.com/dashboard
   - Look for failed deliveries

3. Check Vercel logs:
   ```bash
   vercel logs --tail /api/cron/check-overdue-commitments --error
   ```

### CRON Not Running

1. Verify CRON_SECRET is set:
   ```bash
   vercel env list
   ```

2. Check vercel.json has correct schedule:
   ```json
   {
     "crons": [{
       "path": "/api/cron/check-overdue-commitments",
       "schedule": "0 9 * * *"
     }]
   }
   ```

3. Check Vercel Cron Logs:
   - Go to Vercel Dashboard → Project → Cron Jobs
   - Look for execution history

### Rate Limiting Not Working

1. Verify rate limit code is deployed:
   ```bash
   git log --oneline | grep "Task 17"
   ```

2. Check that userId is being passed:
   ```bash
   vercel logs --tail --grep "RATE_LIMIT"
   ```

### Goals Not Serializing

1. Verify multiGoalState is being passed:
   ```bash
   vercel logs --tail --grep "MULTI_GOAL"
   ```

2. Check that sessionState includes goals:
   ```bash
   # Add logging to chat route to verify
   console.log('sessionState:', sessionStateWithGoals);
   ```

---

## Performance Benchmarks

Expected performance metrics:

- CRON job execution: <5 seconds
- Email delivery: <2 seconds
- Unsubscribe endpoint: <1 second
- Rate limit check: <10ms
- Session finalization: <3 seconds

If any metric exceeds expected time, check:
- Supabase query performance
- Resend API latency
- Network connectivity
- Database indexes
