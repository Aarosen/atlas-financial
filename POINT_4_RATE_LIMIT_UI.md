# Point 4: Rate Limit Remaining Count — Display in UI

**Objective**: Show users how many messages they have remaining before hitting the daily rate limit.

**What's being tested**: Rate limit visibility:
1. Rate limit headers are sent in response (`X-RateLimit-Remaining`)
2. Frontend reads the header value
3. UI displays remaining count below the text input
4. Users see "47 messages remaining today" instead of guessing

---

## Current Status

### What's Already Implemented
- ✅ Rate limit checking in KV: `checkRateLimitKv()` returns `remaining` count
- ✅ Rate limit headers: `getRateLimitHeaders()` includes `X-RateLimit-Remaining`
- ✅ Headers sent in response: `applyRateLimit()` includes headers in 429 response
- ✅ Backend: All infrastructure is in place

### What Needs Implementation
- ⏳ Frontend: Read `X-RateLimit-Remaining` header from response
- ⏳ UI: Display remaining count below text input
- ⏳ Update on each message: Decrement count after each successful message

---

## Implementation Steps

### Step 1: Read rate limit header in AtlasApp.tsx
In the chat streaming function, capture the remaining count from response headers:

```typescript
// After receiving response from /api/chat
const remaining = response.headers.get('X-RateLimit-Remaining');
if (remaining) {
  setRateLimitRemaining(parseInt(remaining, 10));
}
```

### Step 2: Add state to AtlasApp.tsx
```typescript
const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);
```

### Step 3: Display in Conversation.tsx
Below the text input, show:
```typescript
{rateLimitRemaining !== null && (
  <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
    {rateLimitRemaining} messages remaining today
  </div>
)}
```

### Step 4: Update on each message
After each successful message, update the remaining count from the response header.

---

## Success Criteria

✅ **PASS**: 
- After sending a message, the UI shows "29 messages remaining today" (or similar)
- Count decrements by 1 after each message
- Count is visible below the text input
- Count is accurate (matches server-side limit)

❌ **FAIL**:
- Count doesn't appear
- Count doesn't update
- Count is always the same
- Count is inaccurate

---

## Testing

### Test 1: Send 5 messages
1. Start a new conversation
2. Send 5 messages
3. After each message, verify the count decrements by 1
4. Expected: 25, 24, 23, 22, 21 (if limit is 30)

### Test 2: Verify accuracy
1. Check the KV rate limit in Vercel KV dashboard
2. Verify the UI count matches the server count

### Test 3: Rate limit hit
1. Send messages until you hit the limit (30 for guests, higher for authenticated)
2. Verify you get a 429 error
3. Verify the UI shows "0 messages remaining"

---

## Files to Modify

1. **app/ui/AtlasApp.tsx**
   - Add `rateLimitRemaining` state
   - Read `X-RateLimit-Remaining` header after each response
   - Pass to Conversation component

2. **src/screens/Conversation.tsx**
   - Display remaining count below text input
   - Show message: "{remaining} messages remaining today"

---

## Notes

- Rate limit is per-user (authenticated) or per-IP (guest)
- Limit resets every 60 seconds (sliding window)
- Authenticated users have higher limit than guests
- Header is sent on every response (success and failure)

---

## Implementation Priority

**High**: This directly impacts UX for heavy users who approach the limit
**Effort**: 30 minutes (read header, add state, display in UI)
**Impact**: Users no longer surprised by rate limit errors
