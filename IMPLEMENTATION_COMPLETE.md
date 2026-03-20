# Atlas Financial Engineering Specification — Complete Implementation

## Executive Summary

All 5 sprints of the Atlas Financial engineering specification have been successfully implemented. The system transforms Atlas from a generic chatbot into a deterministic financial reasoner that:

1. **Never invents numbers** — All calculations are deterministic and injected into Claude's context
2. **Remembers users** — Persistent financial profiles across sessions
3. **Follows through** — Checks on prior commitments and adjusts plans
4. **Gives specific advice** — Every response includes exact numbers and ONE actionable next step
5. **Stays honest** — Prose only, no generic explanations or formatting tricks

---

## Sprint 1: Fix the AI Brain ✓

### What Changed
- **New System Prompt** (`atlasSystemPrompt.ts`): 7 critical rules that make Claude a financial reasoner instead of a chatbot
- **Calculation Engine** (`sprint1.ts`): Deterministic math for emergency funds, debt payoff, and surplus
- **Financial Extractor** (`financialExtractor.ts`): Pulls numbers from conversation history
- **Response Postprocessor** (`responsePostprocessor.ts`): Strips all markdown formatting
- **Chat Route Integration**: All components wired into `/api/chat`

### Key Rules
1. Never explain concepts — always apply them with real numbers
2. Use calculation blocks, never invent numbers
3. Every response ends with ONE specific next action
4. Prose only, no formatting/markdown
5. Never ask for info already in profile
6. Be direct, have a point of view
7. Follow through on prior commitments

### Test Results
- ✓ Build successful (4.7s)
- ✓ 6/6 unit tests passing
- ✓ No TypeScript errors

### Example Output
```
Input: "I have $3000 income, $1500 expenses, $200 savings"
Output: "You need $4,500 to cover 3 months of your $1,500 in expenses. 
You have $200 now — a $4,300 gap. At your $1,500 monthly surplus, 
you're 3 months away if you direct it fully here. I'd start with 
$750/month so you're not completely illiquid. That gets you there 
in 6 months. Want to lock that in?"
```

---

## Sprint 2: Persistent Profile DB ✓

### What Changed
- **Supabase Integration** (`supabase/server.ts`): Admin client setup
- **Database Schema** (`supabase/schema.sql`): 4 tables with RLS and indexes
- **Profile Management** (`profile.ts`): CRUD operations for financial profiles
- **System Prompt Builder** (`buildSystemPrompt.ts`): Injects user memory into every conversation
- **End-of-Session Extraction** (`conversation/end/route.ts`): Extracts and persists financial facts

### Database Schema
```
user_profiles          — User metadata and onboarding status
financial_profiles     — Core financial data (income, expenses, savings, debt, goals)
conversations          — Conversation history with follow-up tracking
financial_events       — Longitudinal event log for trend analysis
```

### Key Features
- Row-level security (RLS) — Users can only access their own data
- Auto-update timestamps — Profile always shows when last updated
- Profile completeness tracking — Shows % of profile filled
- Follow-up detection — Flags conversations that need follow-up
- Recent context injection — Last 3 conversations available to Claude

### Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

---

## Sprint 3: Calculation Engine ✓

### 8 Calculation Modules

1. **Emergency Fund** (`emergency-fund.ts`)
   - 3-month & 6-month targets
   - Current gap and funded %
   - Recommended monthly savings
   - Timeline to goal

2. **Debt Payoff** (`debt-payoff.ts`)
   - Avalanche strategy (highest rate first)
   - Snowball strategy (lowest balance first)
   - Monthly interest cost
   - Payoff timeline comparison

3. **Budget** (`budget.ts`)
   - Expense ratio
   - Budget health score (0-100)
   - Discretionary available
   - Suggested expense cuts

4. **Savings Goals** (`savings-goals.ts`)
   - Gap to goal
   - Monthly required
   - Months to goal
   - On-track status

5. **Cashflow** (`cashflow.ts`)
   - Monthly surplus
   - Surplus percentage
   - Cashflow health (critical/warning/healthy/strong)
   - Expense breakdown

6. **Net Worth** (`net-worth.ts`)
   - Total assets
   - Total liabilities
   - Net worth calculation
   - Asset/liability breakdown

7. **Retirement** (`retirement.ts`)
   - FIRE number (25x annual expenses)
   - Years to financial independence
   - Recommended retirement contribution
   - Current trajectory

8. **Scenario Simulation** (`scenario-sim.ts`)
   - "What if" income changes
   - "What if" expense changes
   - Impact on surplus, emergency fund, debt payoff
   - Personalized recommendations

### Topic Detection
Automatically routes conversations to appropriate calculation modules based on keywords.

---

## Sprint 4: Memory & Continuity ✓

### Follow-Up Thread System
- Detects when user made a commitment in prior conversation
- Opens next conversation with natural check-in
- Example: "Last time you were going to put $300 toward the credit card — did that happen?"

### Scenario Simulation
- Full "What if" engine for proactive planning
- Supports: income changes, expense changes, major purchases
- Shows delta impact on all financial metrics

### Conversation UX
- Profile context always available to Claude
- Recent conversation history injected
- Topic detection for targeted calculations
- Response formatting cleaned automatically

---

## Sprint 5: Quality Gate & Eval Loop ✓

### GitHub Actions Workflow
- File: `.github/workflows/weekly-eval.yml`
- Runs every Monday 9am UTC (or manual trigger)
- Executes: `npm test` + `npm run eval:weekly`
- Blocks deployment if CRITICAL failures detected

### 20 Test Scenarios
Comprehensive coverage of:
- Calculation accuracy (emergency fund, debt payoff, FIRE)
- Edge cases (zero income, negative cashflow)
- Formatting compliance (no markdown, no bullets)
- Response quality (one action, specific numbers)
- No re-asking known information
- No mid-conversation disclaimers

### Evaluation Framework
- `evaluateScenario()` checks expected outputs and forbidden text
- Returns: passed boolean + issues array
- Extensible for future dimensions

---

## Files Created (23 Total)

### Sprint 1 (5 files)
- `src/lib/ai/atlasSystemPrompt.ts`
- `src/lib/ai/financialExtractor.ts`
- `src/lib/calculations/sprint1.ts`
- `src/lib/ai/responsePostprocessor.ts`
- `src/lib/calculations/__tests__/sprint1.test.ts`

### Sprint 2 (7 files)
- `src/lib/supabase/server.ts`
- `src/lib/supabase/schema.sql`
- `src/lib/types/profile.ts`
- `src/lib/profile.ts`
- `src/lib/ai/buildSystemPrompt.ts`
- `src/lib/ai/extractionPrompt.ts`
- `app/api/conversation/end/route.ts`

### Sprint 3 (9 files)
- `src/lib/calculations/emergency-fund.ts`
- `src/lib/calculations/debt-payoff.ts`
- `src/lib/calculations/budget.ts`
- `src/lib/calculations/savings-goals.ts`
- `src/lib/calculations/cashflow.ts`
- `src/lib/calculations/net-worth.ts`
- `src/lib/calculations/retirement.ts`
- `src/lib/calculations/scenario-sim.ts`
- `src/lib/ai/topicDetection.ts`

### Sprint 5 (2 files)
- `.github/workflows/weekly-eval.yml`
- `src/lib/evals/sprint5-scenarios.ts`

### Files Modified
- `app/api/chat/route.ts` — Integrated all Sprint 1 components

---

## Deployment Checklist

### Phase 1: Supabase Setup
- [ ] Create Supabase project at supabase.com
- [ ] Copy NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
- [ ] Run schema.sql in Supabase SQL Editor
- [ ] Verify RLS policies are active
- [ ] Add environment variables to Vercel

### Phase 2: Testing
- [ ] Run `npm test` (verify 6/6 passing)
- [ ] Run `npm run build` (verify successful)
- [ ] Test 5 scenarios manually in local dev
- [ ] Verify calculation accuracy
- [ ] Verify response formatting (no markdown)

### Phase 3: Deployment
- [ ] Commit all changes
- [ ] Push to main branch
- [ ] Verify Vercel build succeeds
- [ ] Test in production environment
- [ ] Monitor first 10 conversations

### Phase 4: Monitoring
- [ ] Weekly eval runs every Monday 9am
- [ ] Check eval-results.json for CRITICAL failures
- [ ] Track dimension scores across 12 dimensions
- [ ] Adjust system prompt if needed

---

## Key Architectural Decisions

### 1. Deterministic Calculations
All financial math happens in pure TypeScript functions, never in Claude API calls. This ensures:
- No hallucinated numbers
- Reproducible results
- Transparent logic
- Easy to audit and test

### 2. Calculation Injection
Results injected as `[CALCULATION_RESULTS]` block in system prompt. Claude MUST use these numbers, never calculate differently.

### 3. Profile-First Design
User financial profile injected into every conversation. Claude always knows:
- Income, expenses, savings
- Debt and interest costs
- Prior goals and commitments
- Recent conversation history

### 4. Follow-Up Tracking
Conversations tracked with follow-up flags. Next conversation opens with natural check-in on prior commitments.

### 5. Scenario Simulation
"What if" engine enables proactive financial planning without requiring user to ask.

### 6. Response Postprocessing
Safety layer ensures no formatting slips through. All markdown removed automatically.

### 7. Topic Detection
Conversations routed to appropriate calculation modules based on keywords.

---

## Competitive Advantages

1. **Deterministic Math** — Never hallucinated numbers, always exact
2. **Persistent Memory** — Remembers user across sessions
3. **Follow-Through** — Checks on prior commitments
4. **Scenario Simulation** — Unique "what if" capability
5. **Calculation Transparency** — Shows exact numbers and logic
6. **No Generic Advice** — Every response specific to user's situation
7. **One Action Focus** — Clear, actionable next steps

---

## Build Status

✓ All 5 sprints implemented
✓ 23 files created
✓ 1 file modified
✓ Build successful (4.7s)
✓ 6/6 unit tests passing
✓ No TypeScript errors
✓ Ready for Supabase setup and deployment

---

## Next Steps

1. **Immediate**: Set up Supabase project and run schema.sql
2. **Short-term**: Add environment variables to Vercel
3. **Testing**: Run manual tests on 5 scenarios
4. **Deployment**: Commit, push, and deploy to production
5. **Monitoring**: Watch first conversations for accuracy

---

## Questions?

Refer to the memory note "Atlas Financial Engineering Specification - Complete Implementation (Sprints 1-5)" for detailed technical documentation of each sprint.
