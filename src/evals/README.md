# Atlas AI Eval Framework — Implementation Guide
## From Zero to Running in 4 Phases

---

## What This Is

This folder contains the complete eval system for Atlas. Drop it into your repo, wire it into your response pipeline, and you'll have:

- **Code evals** running on every single Atlas response (< 1ms, free)
- **LLM-as-judge evals** running on 100% of safety-sensitive responses and sampled for quality
- **A deployment gate** that blocks any release with a CRITICAL failure
- **Production monitoring** that alerts you within 15 minutes of a live failure

---

## Phase 1 — Install (15 minutes)

```bash
# 1. Copy this folder into your Atlas repo
cp -r atlas-evals /your-atlas-project/

# 2. Install dependencies
cd atlas-evals
npm install

# 3. Add your Anthropic API key to .env
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" > .env

# 4. Add EVAL_WEBHOOK_URL for Slack alerts (optional but recommended)
echo "EVAL_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK" >> .env
```

---

## Phase 2 — Run Your First Eval (5 minutes)

```bash
# Run code-based evals only (no API key needed)
npx ts-node src/runner.ts --mode=offline

# Run everything including LLM judges (needs ANTHROPIC_API_KEY)
npx ts-node src/runner.ts --mode=gate
```

You'll see a report like this:

```
══════════════════════════════════════════════════════════════════════
  ATLAS AI — EVAL REPORT
  Run ID:    run-1708123456789
  Mode:      GATE
══════════════════════════════════════════════════════════════════════

  DEPLOYMENT GATE: ✅  PASS — Safe to deploy
  Total Evals: 28  |  ✅ 26  ❌ 1  ⚠️  1

  DIMENSION SUMMARY:
  ──────────────────────────────────────────────────────────────
  ✅ D1   Safety & Compliance          100% pass
  ❌ D2   Accuracy & Grounding          87% pass  🚨 1 CRITICAL
  ✅ D3   Teaching Excellence           95% pass  Score: 8.2/10
  ✅ D6   Tone & Empathy               100% pass  Score: 9.1/10
```

---

## Phase 3 — Wire Into Your Atlas Pipeline (30 minutes)

This is the most important step. You need the online monitor running on **every real user response**.

### Find where Atlas generates its response

It will look something like this in your codebase:

```typescript
// Your existing Atlas response handler (example)
app.post('/api/chat', async (req, res) => {
  const { message, sessionId, userId } = req.body;
  
  const atlasResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    system: ATLAS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: message }],
    max_tokens: 1000,
  });

  const responseText = atlasResponse.content[0].text;
  res.json({ response: responseText });
});
```

### Add the eval monitor (3 lines)

```typescript
import { checkResponse } from './atlas-evals/src/monitoring/onlineMonitor';

app.post('/api/chat', async (req, res) => {
  const { message, sessionId, userId } = req.body;
  
  const atlasResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    system: ATLAS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: message }],
    max_tokens: 1000,
  });

  const responseText = atlasResponse.content[0].text;

  // ✅ ADD THIS — runs in background, never slows down the user
  checkResponse(message, responseText, sessionId, userProfile, {
    concernType: req.body.concernType,
    literacyLevel: req.body.literacyLevel,
    topicType: req.body.topicType,
  }).catch(err => console.error('[Eval monitor error]', err));
  // Note: no await — fire and forget so user isn't waiting

  res.json({ response: responseText });
});
```

The eval runs **asynchronously** — users never feel it. Failures fire alerts to your Slack webhook immediately.

---

## Phase 4 — Set Up the CI/CD Gate (20 minutes)

This makes evals automatic on every deployment.

### 1. Add your secret to GitHub

```
GitHub repo → Settings → Secrets → Actions → New secret
Name:  ANTHROPIC_API_KEY
Value: sk-ant-your-key
```

### 2. The workflow file is already in place

`.github/workflows/eval-gate.yml` is included. It will:
- Run on every push to `main` or `staging`
- Run on every pull request
- **Block the merge** if any CRITICAL eval fails
- Post results as a PR comment automatically

### 3. Add your golden test cases

Open `src/runner.ts` and replace the starter test cases in `loadTestCases()` with your real Atlas scenarios. Aim for **50+ cases** covering all concern types before your first production launch.

---

## The Right Running Order (Summary)

| When | What to Run | Command | Time |
|------|-------------|---------|------|
| Every Atlas response in production | Code evals (keyword + limits) | Automatic via monitor | < 1ms |
| Every Atlas response in production (sampled) | LLM safety judge | Automatic via monitor (100%) | ~2s |
| Before every git push | Full offline suite | `npm run eval:offline` | ~5 min |
| Before every production deploy | Gate suite (blocks deploy) | `npm run eval:gate` | ~10 min |
| On every PR | Automated via GitHub Actions | Automatic | ~10 min |
| Weekly | Full suite on production logs | `npm run eval:online` | ~30 min |
| Monthly | Human/CFP review | Manual | 2-4 hours |

---

## Adding Your Own Test Cases

Every test case is an `EvalContext` object:

```typescript
{
  userMessage:    "What Atlas user said",
  atlasResponse:  "What Atlas replied",   // ← the response being evaluated
  userProfile: {
    monthlyIncome: 4000,
    debtBalance:   15000,
    debtRate:      0.22,
    literacyLevel: "beginner",
  },
  concernType:    "debt_stress",
  literacyLevel:  "beginner",
  topicType:      "debt",
  emotionalState: "overwhelmed",
}
```

Build your test cases from the four sources in the eval doc:
1. CFP expert-generated scenarios
2. Real user queries from beta (once you have them)
3. LLM-synthesized with the prompt in Section 6 of the eval doc
4. Adversarial edge cases from Section 6.2

---

## Updating the 2025 Limits

Every January, update `src/evals/code/limitsValidator.ts`:

```typescript
export const LIMITS_2025 = {
  k401_employee: 23_500,   // ← update this each year
  ira_limit:      7_000,   // ← and this
  // ... etc
};
```

The IRS releases new limits in October/November for the following year.
Set a calendar reminder: **November 1st — Update Atlas eval limits.**

---

## Files Overview

```
atlas-evals/
├── src/
│   ├── types.ts                          Core interfaces
│   ├── runner.ts                         Master orchestrator
│   ├── evals/
│   │   ├── code/
│   │   │   ├── keywordGuardrail.ts       CODE-01: Compliance + filler phrases
│   │   │   ├── calcVerifier.ts           CODE-02: Math accuracy
│   │   │   ├── limitsValidator.ts        CODE-03: 2025 IRS/IRS limits
│   │   │   └── sessionChecker.ts         CODE-04: Session integrity
│   │   └── llm/
│   │       └── judgeRunner.ts            All 4 LLM judges (Safety/Accuracy/Teaching/Tone)
│   ├── monitoring/
│   │   └── onlineMonitor.ts              Production monitoring hook
│   └── reports/
│       └── report.ts                     Terminal + JSON report output
├── .github/
│   └── workflows/
│       └── eval-gate.yml                 CI/CD gate (blocks bad deploys)
└── package.json
```
