# Atlas Financial — Live Verification Tests to Reach 100/100

This document provides step-by-step procedures to verify the two remaining critical features that require manual end-to-end testing.

---

## Fix 5: Live Memory Test — Cross-Session Memory Injection

**What it tests**: Verifies that user context persists across sessions and is injected into the system prompt for subsequent conversations.

**Current status**: Code is complete. Memory persistence, session tracking, and injection pipeline are all implemented. This test confirms they work end-to-end in production.

### Step-by-step procedure (10 minutes)

1. **Open the app in an incognito/private window**
   - Go to `https://atlas-financial.vercel.app`
   - This ensures no cached session data

2. **Sign in with Magic Link**
   - Enter your email address
   - Click the magic link in your inbox
   - Confirm you're signed in (you should see your email in the top right)

3. **Have a conversation with specific financial context**
   - Start a new conversation
   - Say something like: **"I earn $6,000 per month and I want to save for a house down payment. I have $15,000 in high-interest credit card debt."**
   - Let Atlas respond fully
   - Continue the conversation for 2-3 more messages to establish context
   - **Note the exact details you mentioned** (income, goals, debt)

4. **Close the tab completely**
   - Close the browser tab (not just navigate away)
   - This simulates a real session end

5. **Open a new tab and return to the app**
   - Go to `https://atlas-financial.vercel.app` again
   - Sign in again with the same email
   - You should see your previous session in the sidebar

6. **Start a new conversation**
   - Click "New Conversation" or start typing a new message
   - In your first message, ask: **"What did I tell you about my financial situation last time?"**

7. **Verify memory injection**
   - ✅ **PASS**: Atlas mentions your income ($6,000/month), your goal (house down payment), and your debt ($15,000 credit card debt) without you repeating it
   - ❌ **FAIL**: Atlas says "I don't have any prior context" or doesn't reference your previous conversation

### What's being tested

- **Session persistence**: Previous session is stored in `conversation_sessions` table
- **Message history**: Your messages are stored in `conversation_messages` table
- **Memory injection**: System prompt includes `[MEMORY_CONTEXT]` block with prior session summary
- **Context retrieval**: `buildCompanionSystemPromptContext()` loads prior sessions and injects them

### If it fails

1. Check Supabase:
   - Go to Supabase dashboard → SQL Editor
   - Run: `SELECT * FROM conversation_sessions WHERE user_id = '<your-user-id>' ORDER BY created_at DESC LIMIT 2;`
   - You should see 2 sessions (old and new)
   - If only 1 session exists: session creation is broken

2. Check message history:
   - Run: `SELECT * FROM conversation_messages WHERE session_id = '<old-session-id>' LIMIT 5;`
   - You should see your messages from the first conversation
   - If empty: message persistence is broken

3. Check memory injection:
   - Add console.log in `buildCompanionSystemPromptContext()` to verify it's being called
   - Verify `recentSessions` array is populated with prior sessions
   - Verify `buildMemorySummary()` is generating the memory block

---

## Fix 6: Live Cron Test — Email Notifications for Overdue Actions

**What it tests**: Verifies that the daily cron job detects overdue commitments and sends email notifications via Resend.

**Current status**: Code is complete. Cron job is configured, email templates are built, and Resend integration is ready. This test confirms emails are actually sent.

### Step-by-step procedure (5 minutes)

1. **Get your user ID from Supabase**
   - Go to Supabase dashboard → SQL Editor
   - Run: `SELECT id FROM auth.users WHERE email = '<your-email>' LIMIT 1;`
   - Copy the user ID (it's a UUID like `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

2. **Create an overdue action in Supabase**
   - In SQL Editor, run:
   ```sql
   UPDATE user_actions 
   SET check_in_due_at = NOW() - INTERVAL '1 day',
       status = 'recommended'
   WHERE user_id = '<your-user-id>'
   LIMIT 1;
   ```
   - This marks an action as overdue (due yesterday)
   - If you have no actions, create one first:
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
     '<any-session-id>',
     'Test overdue action',
     'other',
     'recommended',
     NOW() - INTERVAL '1 day',
     NOW(),
     NOW()
   );
   ```

3. **Trigger the cron job manually**
   - Get your `CRON_SECRET` from Vercel environment variables
   - Run this curl command in your terminal:
   ```bash
   curl -X GET https://atlas-financial.vercel.app/api/cron/check-overdue-commitments \
     -H "Authorization: Bearer <CRON_SECRET>"
   ```
   - You should get a 200 response with JSON: `{"ok":true,"processed":1}`

4. **Check your email**
   - Wait up to 60 seconds
   - Check your inbox for an email from `onboarding@resend.dev`
   - Subject should be: **"You have overdue commitments — Atlas Financial"**
   - Email should list the overdue action

5. **Verify email content**
   - ✅ **PASS**: Email arrives within 60 seconds with your action listed
   - ❌ **FAIL**: No email arrives, or email is from a different sender

### What's being tested

- **Cron job execution**: `/api/cron/check-overdue-commitments` runs and queries overdue actions
- **Action detection**: Query finds actions with `check_in_due_at < NOW()` and `status = 'recommended'`
- **Email sending**: Resend API successfully sends email to user's email address
- **Email template**: `buildOverdueCommitmentEmail()` generates proper HTML email
- **Error handling**: Cron job logs execution and handles failures gracefully

### If it fails

1. Check cron endpoint:
   - Go to Vercel dashboard → Functions → check-overdue-commitments
   - Look for recent invocations and logs
   - If no invocations: endpoint wasn't called

2. Check Resend:
   - Go to Resend dashboard → Logs
   - Look for send attempts to your email address
   - If no attempts: email sending failed
   - Check error message for details (rate limit, invalid email, etc.)

3. Check database query:
   - In Supabase SQL Editor, run:
   ```sql
   SELECT id, action_text, check_in_due_at, status 
   FROM user_actions 
   WHERE check_in_due_at < NOW() 
   AND status = 'recommended'
   AND user_id = '<your-user-id>';
   ```
   - If empty: your action wasn't marked as overdue (check the UPDATE statement)

4. Check environment variables:
   - Verify `CRON_SECRET` is set in Vercel
   - Verify `RESEND_API_KEY` is set in Vercel
   - Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set

---

## Summary: What Reaches 100/100

| Fix | Type | Status | Verification |
|---|---|---|---|
| 1 | Production reliability | ✅ Implemented | Supabase errors now return proper 500 responses |
| 2 | Production reliability | ✅ Implemented | Anthropic API errors handled gracefully |
| 3 | Production reliability | ✅ Implemented | Rate limit headers passed in responses |
| 4 | Feature | ✅ Implemented | Milestones fire mid-session on goal create/update |
| 5 | Live test | ⏳ Manual | Memory injection verified end-to-end |
| 6 | Live test | ⏳ Manual | Cron email delivery verified end-to-end |

Once both live tests pass, Atlas reaches **100/100** with:
- ✅ Production-hardened error handling
- ✅ Mid-session milestone celebrations
- ✅ Cross-session memory persistence
- ✅ Automated email notifications
- ✅ All 8 critical features from initial assessment

---

## Troubleshooting

### General debugging

1. **Enable detailed logging**
   - Add `console.log()` statements in:
     - `/api/cron/check-overdue-commitments` to log query results
     - `/lib/notifications/emailService.ts` to log send attempts
     - `/lib/ai/companionIntegration.ts` to log memory injection

2. **Check Vercel logs**
   - Go to Vercel dashboard → Deployments → Latest → Logs
   - Filter by function name or error message
   - Look for recent invocations

3. **Check Supabase logs**
   - Go to Supabase dashboard → Logs → Edge Functions
   - Look for any errors in function execution

4. **Test locally**
   - Run `npm run dev` to start local server
   - Test memory injection by manually calling `buildCompanionSystemPromptContext()`
   - Test cron by manually calling the endpoint at `http://localhost:3000/api/cron/check-overdue-commitments`

---

## Next Steps After Verification

1. **If both tests pass**: Atlas is at 100/100. Ready for production deployment.
2. **If one test fails**: Debug using the troubleshooting guide above, fix the issue, and re-test.
3. **If both tests fail**: Check environment variables and database configuration first.

---

## Contact & Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the relevant source files mentioned in "What's being tested"
3. Check Vercel and Supabase dashboards for logs and error messages
