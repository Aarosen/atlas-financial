# Atlas Evals Integration Guide

## Quick Start (5 minutes)

The atlas-evals framework is now integrated into your app at `src/evals/`. All code evals are passing (17/17).

### Step 1: Wire the Online Monitor into Your Atlas Response Handler

Find where Atlas generates responses (typically in your API handler or chat controller):

```typescript
import { checkResponse } from './evals/src/monitoring/onlineMonitor';

// In your Atlas response handler:
app.post('/api/chat', async (req, res) => {
  const { message, sessionId, userProfile, concernType, literacyLevel, topicType } = req.body;
  
  // Generate Atlas response
  const atlasResponse = await atlas.generateResponse(message, userProfile);
  
  // ✅ ADD THIS — runs in background, never slows down the user
  checkResponse(message, atlasResponse, sessionId, userProfile, {
    concernType,
    literacyLevel,
    topicType,
  }).catch(err => console.error('[Eval monitor error]', err));
  
  res.json({ response: atlasResponse });
});
```

### Step 2: Set Environment Variables

```bash
# Required for LLM judges
ANTHROPIC_API_KEY=sk-ant-your-key

# Optional but recommended for alerts
EVAL_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

### Step 3: Run Evals Before Each Deploy

```bash
cd src/evals
npm run eval:offline  # Full offline suite (~5 min)
npm run eval:gate     # Deployment gate (blocks if critical failures)
```

## Current Status

✅ **All Code Evals Passing (17/17)**
- D1: Safety & Compliance (100%)
- D3: Teaching Excellence (100%)
- D4: Personalization (100%)
- D6: Tone & Empathy (100%)
- D8: Domain Accuracy (100%)

## Continuous Improvement Chain

Every Atlas response now gets evaluated on:

1. **Code Evals (< 1ms, free)**
   - Keyword guardrails (compliance phrases, filler)
   - Regulatory limits validation (2025 IRS figures)
   - Session integrity (no repeated questions/concepts)

2. **LLM Judge Evals (sampled)**
   - Safety & compliance (100% on safety-sensitive)
   - Accuracy & grounding (20% sample)
   - Teaching quality (5% sample)
   - Tone & empathy (5% sample)

3. **Alerts & Monitoring**
   - Critical failures block deployment
   - Slack alerts for production issues
   - Observability logging for trends

## Next Steps

1. Integrate `checkResponse()` into your response pipeline
2. Set up Slack webhook for alerts
3. Run `npm run eval:gate` before each production deploy
4. Monitor eval reports weekly to identify improvement areas
5. Add more test cases covering your real user scenarios

## Files Overview

```
src/evals/
├── src/
│   ├── runner.ts              Master orchestrator
│   ├── types.ts               Core interfaces
│   ├── evals/
│   │   ├── code/              Code-based evals (fast, free)
│   │   │   ├── keywordGuardrail.ts
│   │   │   ├── limitsValidator.ts
│   │   │   └── sessionChecker.ts
│   │   └── llm/               LLM judge evals
│   │       └── judgeRunner.ts
│   ├── monitoring/
│   │   └── onlineMonitor.ts   Production monitoring hook
│   └── reports/
│       └── report.ts          Report generation
├── package.json
├── tsconfig.json
└── INTEGRATION_GUIDE.md       This file
```

## Troubleshooting

**LLM judges failing with auth error?**
- Set `ANTHROPIC_API_KEY` in your `.env`
- Use `npm run eval:offline` to run code evals only (no API key needed)

**Getting false positives on limits?**
- Update `src/evals/src/evals/code/limitsValidator.ts` every January with new IRS figures
- Check the LIMITS_2025 object for current values

**Want to add more test cases?**
- Edit `src/evals/src/runner.ts` → `loadTestCases()` function
- Add real scenarios from your beta users
- Aim for 50+ cases covering all concern types

## Deployment Gate

The `eval:gate` command blocks deployment if:
- ❌ Any CRITICAL code eval fails (keyword guardrail, limits)
- ❌ Any CRITICAL LLM judge fails (safety, accuracy)

This ensures Atlas never ships with compliance violations or hallucinations.

---

**Questions?** Check the README.md in this folder for the full implementation guide.
