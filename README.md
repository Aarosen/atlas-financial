# Atlas AI — Orchestration Fix

## The Diagnosis (from reading your actual route.ts)

Your codebase has two problems:

### Problem 1: Dead imports
You import 12+ engines but use exactly 1 of them in the chat response path:
```
detectCrisisSignals ✅ used
generateCrisisResponse ✅ used

processUserMessageAdaptively ❌ imported, never called
extractConversationContext ❌ imported, never called
enhanceWithContextAwareness ❌ imported, never called
buildConversationArc ❌ imported, never called
detectObjections ❌ imported, never called
generatePersonalityPrompt ❌ imported, never called
generateContextAwareActions ❌ imported, never called
injectPersonality ❌ imported, never called
```

### Problem 2: No session state injected
Claude receives the last 10 raw messages + your system prompt. 
No knowledge of: what goal is being pursued, what data is collected, what's 
still missing, what phase the conversation is in, or how urgent the situation is.
So it free-roams as a knowledgeable chatbot instead of driving toward a resolution.

---

## The Fix: 2 files, 4 changes

### File 1: `src/lib/ai/conversationOrchestrator.ts` (NEW)
The missing wiring layer. Runs before every Claude call and:
- Detects the conversation goal (affordability check, debt payoff, etc.)
- Determines what financial data is still missing
- Tracks conversation phase (greeting → discovery → analysis → guidance → action)
- Detects urgency level from the profile data
- Builds a structured SESSION STATE BLOCK that gets injected first into every prompt

### File 2: `PATCH_INSTRUCTIONS.ts` (shows changes to route.ts)
Four targeted changes to your existing route.ts:

1. Add the orchestrator import
2. Accept `sessionState` from the request body
3. Replace the chat response block with `handleChatRequest()` 
4. Update frontend to send `sessionState` back on each turn

---

## How to apply

### Step 1
Copy `conversationOrchestrator.ts` to `src/lib/ai/conversationOrchestrator.ts`

### Step 2
In your `route.ts`, make these changes from `PATCH_INSTRUCTIONS.ts`:

**Add import (top of file):**
```typescript
import { orchestrate } from '@/lib/ai/conversationOrchestrator';
```

**Update body destructuring:**
```typescript
const { type, messages, missing, question, memorySummary, fin, sessionState } = body as { ... }
// add: fin?: Record<string, any>; sessionState?: Record<string, any>;
```

**Replace the chat block:**
Find the comment `// For chat responses, use Claude's natural generation...`
Replace the entire `if (type === 'chat' && text)` block with:
```typescript
if (type === 'chat' && text) {
  return handleChatRequest({
    apiKey,
    modelCandidates,
    messages,
    fin: (body as any)?.fin || {},
    sessionState: (body as any)?.sessionState,
    memorySummary,
    tier,
    body,
  });
}
```

Note: Move the `callAnthropicStream` call for chat inside `handleChatRequest` — 
the function handles its own API call with the enriched prompt.

### Step 3
Update your frontend conversation component to:
1. Store `sessionState` in React state (starts as `{}`)
2. Send `sessionState` in the request body with each message
3. Watch for `type: 'session_state'` SSE events and update state

---

## What changes in practice

**Before:**
```
User: Can I afford a $700 car payment?
Atlas: That depends on your income and expenses. Generally, financial experts 
       recommend keeping car payments under 15% of take-home pay...
```

**After:**
```
User: Can I afford a $700 car payment?
Atlas: Let's figure that out together — I want to give you an actual answer, 
       not a rule of thumb.

       What's your monthly take-home pay? 
       (This tells me what we're actually working with.)
```

Three messages later:
```
Atlas: Here's where you stand:

       Monthly income: $5,200
       Essential expenses: $3,400
       Current surplus: $1,800

       A $700 payment leaves you $1,100/month.
       That's workable — though tighter than I'd like for you.

       Want to see what happens if rates are higher and the payment is $820?
```

---

## Why the existing engines aren't wired in (and whether to wire them)

Looking at your imports, you have engines for:
- `conversationArcEngine` — builds the session arc (now replaced by orchestrator)
- `contextAwarenessEngine` — extracts context signals (partially overlaps orchestrator)
- `objectionHandlingEngine` — handles pushback (still valuable, wire it in discovery/guidance phases)
- `tonePersonalityEngine` — generates tone-aware personality (wire it into the emotion context block)
- `directAnswerEngine` — for quick factual questions (keep for answer/answer_stream types)

The orchestrator in this PR handles arc, goal, phase, and state. The tone/objection 
engines are worth wiring in as post-processing on Claude's output. That's Phase 2.

---

## Phase 2 (after this works)

Once conversations feel guided:
1. Wire `detectObjections` + `buildObjectionAwareRecommendation` into the response path
2. Wire `detectAppropriateTone` + `generatePersonalityPrompt` as supplementary prompt sections
3. Consider persisting `sessionState` to a lightweight store (Redis/Upstash) so returning 
   users pick up where they left off — this is what turns Atlas from a session into a relationship
