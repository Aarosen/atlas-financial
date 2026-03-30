# Fix F: Live End-to-End Conversation Memory Test

## Objective
Verify that Atlas remembers user financial context across sessions and injects it into system prompt.

## Test Procedure

### Step 1: First Session - Establish Financial Context
1. Open Atlas at `https://atlas-financial.vercel.app`
2. Click "Get Started" or navigate to `/conversation`
3. Send first message: **"I make $5000 a month, spend $2000 on essentials, and have $500 in savings"**
4. Verify Atlas responds with specific numbers (not generic advice)
5. Continue conversation with 2-3 more messages about your financial situation
6. Close the tab or navigate away (session ends)

### Step 2: Second Session - Verify Memory Injection
1. Open Atlas again at `https://atlas-financial.vercel.app`
2. Click "Get Started" or navigate to `/conversation`
3. Send message: **"What should I do next?"**
4. **Expected behavior**: Atlas should reference your prior financial data ($5000 income, $2000 expenses, $500 savings) WITHOUT you repeating it
5. **Verify in browser console**: Check Network tab → `/api/chat` request → Response should contain your financial data in system prompt

### Step 3: Verify Memory Injection in System Prompt
1. Open browser DevTools (F12)
2. Go to Network tab
3. Send a message in conversation
4. Find the `/api/chat` POST request
5. Click on it and view the Request body
6. Search for `USER MEMORY SUMMARY` or `financial_profiles`
7. **Expected**: Should see your prior financial data injected into system prompt

### Step 4: Verify Conversation History in Sidebar
1. Look at left sidebar under "Conversations"
2. **Expected**: Should see your previous conversation session listed
3. Click on it to load previous conversation
4. **Expected**: Should see all prior messages and Atlas responses

## Success Criteria

✅ **Memory Injection Works If**:
- Atlas references your prior financial data in second session without you repeating it
- System prompt contains `USER MEMORY SUMMARY` block with your data
- Conversation sidebar shows previous sessions

❌ **Memory Injection Fails If**:
- Atlas asks "What's your income?" again in second session
- System prompt has no `USER MEMORY SUMMARY` block
- Conversation sidebar is empty
- Previous session data not visible

## Troubleshooting

### Issue: Sidebar shows no conversations
- Check browser console for errors
- Verify user is authenticated (check localStorage for `atlas_auth_session`)
- Check Supabase: `conversation_sessions` table should have rows for your user_id

### Issue: Memory not injected into system prompt
- Check `/api/chat` request in Network tab
- Look for `memoryContext` or `USER MEMORY SUMMARY` in request body
- If missing, check `src/lib/db/userContext.ts` - may not be loading profile

### Issue: Previous session not loading
- Check Supabase: `conversation_messages` table should have rows
- Verify `session_id` matches between sessions table and messages table
- Check RLS policies - user should have SELECT access to own data

## Code Locations for Verification

**Memory Injection**:
- `src/lib/db/userContext.ts` - `loadUserContext()` function loads profile
- `app/api/chat/route.ts` - Lines 462, 501 - memory context injected into system prompt

**Conversation History**:
- `src/lib/session/useSessionFinalization.ts` - Saves session on close
- `src/components/ConversationSidebar.tsx` - Displays conversation history

**Session Management**:
- `src/lib/auth/useAuth.ts` - Manages authentication state
- `src/lib/session/useSessionId.ts` - Tracks sessionId across messages

## Expected System Prompt Structure

After Fix F verification, system prompt should contain:

```
[ATLAS_SYSTEM_PROMPT]

USER MEMORY SUMMARY:
Monthly Income: $5000
Essential Expenses: $2000
Total Savings: $500
...

[MULTI_GOAL_CONTEXT]
...

[CALCULATION_RESULTS]
...
```

## Sign-Off

Once all 4 success criteria are met, Fix F is complete:
- [ ] Memory injection works in second session
- [ ] System prompt contains USER MEMORY SUMMARY
- [ ] Conversation sidebar shows previous sessions
- [ ] Previous session data loads correctly

**Status**: Ready for manual testing
