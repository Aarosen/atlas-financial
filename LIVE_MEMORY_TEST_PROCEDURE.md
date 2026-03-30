# Live End-to-End Memory Test Procedure

## Objective
Verify that Atlas remembers user financial context across sessions and injects it into system prompt for returning users.

## Prerequisites
- Access to deployed Atlas at https://atlas-financial.vercel.app
- A real email address for testing
- Browser DevTools (F12)

## Test Procedure

### Session 1: Establish Financial Context

1. **Open Atlas** at https://atlas-financial.vercel.app
2. **Start conversation** as guest (no sign-in yet)
3. **Send message 1**: "I make $5000 a month, spend $2000 on essentials, and have $500 in savings"
   - Verify: Atlas responds with specific numbers, not generic advice
4. **Send message 2**: "I have $15,000 in credit card debt at 18% APR"
   - Verify: Atlas references your prior income and expenses
5. **Send message 3**: "I want to build an emergency fund"
   - Verify: AI detects goal, calls `/api/goals/save`
6. **Open DevTools** (F12) → Network tab
7. **Send message 4**: "What should I do first?"
   - Find the `/api/goals/save` request in Network tab
   - Verify: Request body contains your goal data
   - Verify: Response is `{ ok: true }`
8. **Sign in** when prompted after 3 messages
   - Request magic link to your test email
   - Click link in email
   - Verify: Authenticated session established
9. **Continue conversation** with 2-3 more messages about your financial situation
10. **Close the tab** (session ends)

### Session 2: Verify Memory Injection

1. **Open Atlas again** at https://atlas-financial.vercel.app
2. **Sign in** with the same email (should show "Already signed in" or skip to conversation)
3. **Check sidebar** on the left
   - Verify: Your previous conversation session appears in the list
   - Click on it to load the previous messages
   - Verify: All prior messages and responses load correctly
4. **Start new conversation** (or continue in same session)
5. **Send message**: "What should I do next?"
   - **Critical check**: Does Atlas reference your prior financial data ($5000 income, $2000 expenses, $500 savings, $15,000 debt) WITHOUT you repeating it?
   - If YES → Memory injection works ✅
   - If NO → Memory injection failed ❌

### Session 2 Deep Dive: Verify System Prompt Injection

1. **Open DevTools** (F12) → Network tab
2. **Send a message** in the conversation
3. **Find the `/api/chat` POST request**
4. **Click on it** and view the Request body
5. **Search for** `USER MEMORY SUMMARY` or `financial_profiles` or your income amount
6. **Expected**: System prompt should contain your prior financial context
   - Example: `"Monthly Income: $5000"`, `"Essential Expenses: $2000"`, etc.
7. If present → Memory injection confirmed ✅
8. If absent → Memory injection failed ❌

### Session 2 Sidebar Verification

1. **Look at left sidebar** under "Conversations" or "History"
2. **Verify**: Your Session 1 conversation is listed with a timestamp
3. **Click on it**
4. **Verify**: All messages from Session 1 load correctly
5. **Verify**: Clicking back to it shows the same conversation thread

## Success Criteria

All 4 must be true:

✅ **Memory Injection Works**: Atlas references prior financial data in Session 2 without you repeating it
✅ **System Prompt Contains Context**: `/api/chat` request body includes `USER MEMORY SUMMARY` with your data
✅ **Conversation Sidebar Works**: Previous session appears in sidebar and loads correctly
✅ **Conversation History Loads**: Clicking previous session shows all prior messages

## Troubleshooting

### Issue: Sidebar shows no conversations
- **Check**: Are you signed in? (Look for email in top-right)
- **Check**: Did you complete Session 1 and sign in before closing?
- **Check**: Browser console for errors (F12 → Console tab)
- **Check**: Supabase: `conversation_sessions` table should have rows for your user_id

### Issue: Memory not injected into system prompt
- **Check**: `/api/chat` request in Network tab
- **Check**: Request body for `memoryContext` or `USER MEMORY SUMMARY`
- **Check**: If missing, the `loadUserContext()` function in `src/lib/db/userContext.ts` may not be loading profile
- **Check**: Supabase: `user_profiles` table should have a row for your user_id

### Issue: Previous session not loading
- **Check**: Supabase: `conversation_messages` table should have rows
- **Check**: Verify `session_id` matches between `conversation_sessions` and `conversation_messages`
- **Check**: RLS policies - user should have SELECT access to own data

## Sign-Off

Once all 4 success criteria are met, Fix 3 is complete:

- [ ] Memory injection works (AI references prior context)
- [ ] System prompt contains USER MEMORY SUMMARY
- [ ] Conversation sidebar shows previous sessions
- [ ] Previous session data loads correctly

**Status**: Ready for manual testing by user
