# Point 2: Live Memory Test — Cross-Session Memory Injection

**Objective**: Verify that user context persists across sessions and is injected into the system prompt for subsequent conversations.

**What's being tested**: The memory persistence pipeline:
1. Session is created and stored in `conversation_sessions` table
2. Messages are persisted in `conversation_messages` table
3. On next session, prior session is loaded and injected as `[MEMORY_CONTEXT]` block in system prompt
4. Claude references prior context without user repeating it

---

## Step-by-Step Procedure (15 minutes)

### 1. Sign in with a real account
- Open `https://atlas-financial.vercel.app` in an incognito/private window
- Enter your email address
- Click the magic link in your inbox
- Confirm you're signed in (email visible in top right)

### 2. Have a conversation with specific financial context
Start a new conversation and provide specific, memorable details:

**Say this to Atlas:**
```
I earn $85,000 per year, which is about $7,083 per month. 
I have $12,000 in high-interest credit card debt at 18% APR.
I have $3,500 in savings.
My main goal is to pay off the credit card debt in the next 12 months.
My essential expenses are about $4,200 per month.
```

**Let Atlas respond fully.** Continue the conversation for 3-5 more messages to establish context. Ask follow-up questions like:
- "What's my first step?"
- "How long will it take to pay off the debt?"
- "Should I focus on debt or savings first?"

**Note the exact details you mentioned:**
- Income: $85,000/year ($7,083/month)
- Credit card debt: $12,000 at 18% APR
- Savings: $3,500
- Essential expenses: $4,200/month
- Goal: Pay off debt in 12 months

### 3. Close the tab completely
- Close the browser tab (not just navigate away)
- This simulates a real session end
- Session should be finalized and stored in Supabase

### 4. Wait at least 30 seconds
- This ensures the session finalization completes
- Allows any async operations to finish

### 5. Open a new tab and return to the app
- Go to `https://atlas-financial.vercel.app` again
- Sign in again with the same email
- You should see your previous session in the sidebar

### 6. Start a new conversation
- Click "New Conversation" or start typing a new message
- In your first message, ask: **"What do you remember about my financial situation from our last conversation?"**

### 7. Verify memory injection
Read Atlas's response carefully.

**✅ PASS**: Atlas mentions:
- Your income ($85,000/year or $7,083/month)
- Your credit card debt ($12,000 at 18% APR)
- Your savings ($3,500)
- Your essential expenses ($4,200/month)
- Your goal (pay off debt in 12 months)

Without you repeating any of this information, Atlas should reference it naturally. Example response:
```
From our last conversation, I remember you earn $85,000 per year with $4,200 in monthly 
expenses. You have $12,000 in credit card debt at 18% APR and $3,500 in savings. Your goal 
is to eliminate that debt within 12 months. Based on those numbers, here's what I'd recommend...
```

**❌ FAIL**: Atlas says:
- "I don't have any prior context"
- "I don't remember our last conversation"
- Asks you to repeat your financial details
- Makes up numbers that don't match what you said

---

## What's Being Tested

### Memory Persistence Layer
- `conversation_sessions` table: Stores session metadata (user_id, created_at, ended_at)
- `conversation_messages` table: Stores all messages (session_id, role, content)
- Session finalization: `useSessionFinalization.ts` calls `endConversationSession()`

### Memory Injection Layer
- `buildCompanionSystemPromptContext()` in `companionIntegration.ts`
- Loads prior sessions: `loadUserContext(userId)` → `recentSessions`
- Builds memory summary: `buildMemorySummary(recentSessions)`
- Injects as `[MEMORY_CONTEXT]` block in system prompt

### Memory Retrieval
- On new session start, `buildCompanionSystemPromptContext()` is called
- It queries `conversation_sessions` for prior sessions
- Extracts key facts from prior messages
- Injects summary into Claude's system prompt

---

## Debugging If It Fails

### Check 1: Session was created
```sql
SELECT id, user_id, created_at, ended_at 
FROM conversation_sessions 
WHERE user_id = '<your-user-id>' 
ORDER BY created_at DESC 
LIMIT 2;
```

**Expected**: Two rows (old and new session)
**If only 1 row**: Session creation is broken

### Check 2: Messages were persisted
```sql
SELECT id, session_id, role, content 
FROM conversation_messages 
WHERE session_id = '<old-session-id>' 
LIMIT 5;
```

**Expected**: Your messages from the first conversation
**If empty**: Message persistence is broken

### Check 3: Memory context is being built
Add console.log to `buildCompanionSystemPromptContext()`:
```typescript
console.log('[memory] Prior sessions:', userContext.recentSessions);
console.log('[memory] Memory summary:', memorySummary);
```

**Expected**: Prior sessions array populated, memory summary contains your details
**If empty**: Memory loading is broken

### Check 4: Memory is in system prompt
In `chat/route.ts`, log the enriched system prompt:
```typescript
console.log('[prompt] System prompt includes memory:', enrichedSystemPrompt.includes('MEMORY_CONTEXT'));
```

**Expected**: true
**If false**: Memory injection is broken

---

## Success Criteria

✅ **PASS**: Atlas references at least 3 of your 5 specific details (income, debt, savings, expenses, goal) without you repeating them

❌ **FAIL**: Atlas doesn't reference any prior context or asks you to repeat information

---

## Next Steps

- If **PASS**: Memory persistence is working. Move to Point 3 (cron test).
- If **FAIL**: Check debugging steps above. Most likely issue is `userId` mismatch or session finalization not completing.
