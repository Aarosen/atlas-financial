# Atlas: Three Signals to Watch in First 2 Weeks

**Version:** 1.0  
**Status:** Monitoring Framework  
**Date:** 2026-03-10

---

## Overview

These three signals matter more than any architecture metric.

They will tell you exactly what to fix next.

---

## Signal 1: Missing Data Friction

### What to Track

How often users hit missing required fields:

```
missing_income
missing_housing
missing_debt
missing_savings
missing_spending
```

### Why It Matters

If users resist answering, the system must adapt.

If 30% of users abandon after "What's your income?", you have a friction problem.

### How to Measure

```typescript
interface FrictionEvent {
  type: "missing_field_requested";
  field: string;
  userResponded: boolean;
  timeToRespond: number; // seconds
  responseQuality: "clear" | "vague" | "refused";
}
```

### What to Watch For

**Red flags:**
- >20% of users refuse to answer income question
- >30% of users give vague answers ("about $5000")
- >15% of users abandon after 2 questions

**Green flags:**
- <10% refusal rate
- <20% vague answers
- <5% abandonment

### What to Do If Red Flag

If users resist income question:
- Make it optional ("We can estimate if you prefer")
- Offer ranges instead of exact numbers
- Explain why you need it

If users give vague answers:
- Accept ranges ("between $4500 and $5500")
- Calculate midpoint
- Lower confidence score
- Explain impact of uncertainty

### Example Instrumentation

```typescript
async function askForField(field: string, userId: string): Promise<{
  value: number | null;
  quality: "clear" | "vague" | "refused";
  timeToRespond: number;
}> {
  const startTime = Date.now();
  
  // Ask user
  const response = await getUserInput(`What's your ${field}?`);
  
  const timeToRespond = Date.now() - startTime;
  
  // Track friction
  await trackFriction({
    userId,
    field,
    timeToRespond,
    quality: detectQuality(response)
  });
  
  return {
    value: parseValue(response),
    quality: detectQuality(response),
    timeToRespond
  };
}
```

---

## Signal 2: Parser Accuracy

### What to Track

How often numbers are parsed incorrectly:

```
parsed_correctly
parsed_incorrectly
ambiguous_parse
failed_to_parse
```

### Why It Matters

Parser errors cascade through the entire system.

If you parse $5200 as $52, the decision is completely wrong.

### How to Measure

```typescript
interface ParserEvent {
  userInput: string;
  fieldDetected: string;
  valueParsed: number;
  valueCorrect: boolean;
  confidence: number;
}
```

### What to Watch For

**Red flags:**
- >5% parse errors
- Consistent misparse patterns (e.g., always dropping zeros)
- Users correcting parser ("No, that's $5200 not $520")

**Green flags:**
- <1% parse errors
- Users accepting parsed values without correction
- Parser handles all common formats

### Common Parser Failures

These will appear immediately:

```
User: "I make 5200 yearly"
Parser: 5200 (wrong, should be ~433/month)

User: "About $5200"
Parser: 5200 (correct, but confidence should be 70 not 90)

User: "Between $4500 and $5500"
Parser: 4500 (wrong, should be 5000 midpoint)

User: "5.2k per month"
Parser: 5200 (correct)

User: "I make roughly $5200"
Parser: 5200 (correct value, but should mark provisional)
```

### What to Do If Red Flag

If parser misses "yearly":
- Add pattern: `(\d+)\s*(?:yearly|per year|annual)`
- Convert to monthly: `value / 12`

If parser misses ranges:
- Add pattern: `between\s*\$?([\d,]+)\s*and\s*\$?([\d,]+)`
- Calculate midpoint

If parser misses provisional language:
- Track "about", "roughly", "approximately"
- Lower confidence score

### Example Instrumentation

```typescript
async function parseAndTrack(userMessage: string, userId: string): Promise<Partial<FinancialProfile>> {
  const parsed = parser.parse(userMessage);
  
  // Track what was parsed
  for (const [field, value] of Object.entries(parsed)) {
    if (value !== undefined) {
      await trackParserEvent({
        userId,
        userInput: userMessage,
        field,
        valueParsed: value,
        // User will confirm/correct in next message
      });
    }
  }
  
  return parsed;
}

// Later, when user confirms or corrects:
async function confirmParsedValue(field: string, userCorrection: number | null): Promise<void> {
  const originalValue = getOriginalParsedValue(field);
  
  if (userCorrection && userCorrection !== originalValue) {
    // Parser was wrong
    await trackParserError({
      field,
      valueParsed: originalValue,
      valueCorrect: userCorrection,
      error: userCorrection - originalValue
    });
  }
}
```

---

## Signal 3: Decision Disagreement

### What to Track

Cases where shadow mode shows:

```
legacy_answer ≠ reasoning_engine_answer
```

### Why It Matters

These are the most valuable examples.

They show where your reasoning differs from current behavior.

Feed them directly into your eval system.

### How to Measure

```typescript
interface DecisionDisagreement {
  userId: string;
  userMessage: string;
  profile: FinancialProfile;
  legacyDecision: string;
  reasoningDecision: string;
  agreement: boolean;
  traceId: string;
}
```

### What to Watch For

**Red flags:**
- >10% disagreement rate
- Consistent disagreement patterns (e.g., reasoning always says "yes", legacy says "maybe")
- Disagreements on high-confidence decisions

**Green flags:**
- <5% disagreement rate
- Disagreements are edge cases
- Reasoning engine is more conservative (safer)

### Example Disagreements

```
Case 1: Emergency fund check
Legacy: "Yes, you can afford this"
Reasoning: "No, emergency fund too low"
→ Reasoning is more conservative (good)

Case 2: Tight budget
Legacy: "Maybe, consider alternatives"
Reasoning: "Yes, affordable"
→ Reasoning is more optimistic (investigate)

Case 3: High debt
Legacy: "No, too risky"
Reasoning: "No, too risky"
→ Agreement (good)
```

### What to Do If Red Flag

If reasoning is too conservative:
- Check emergency fund threshold (maybe $3000 is too high)
- Check surplus percentage threshold (maybe 5% is too strict)
- Adjust rules, not architecture

If reasoning is too optimistic:
- Check if you're missing safety rules
- Check if confidence scoring is wrong
- Add guardrails

If disagreements are random:
- Check if legacy chat is inconsistent
- Check if reasoning rules are unclear
- Clarify decision logic

### Example Instrumentation

```typescript
async function compareDecisions(
  userMessage: string,
  proposedPayment: number,
  userId: string
): Promise<void> {
  // Run legacy chat
  const legacyResponse = await runLegacyChat(userMessage);
  const legacyDecision = extractDecision(legacyResponse); // "yes", "no", "maybe"

  // Run reasoning engine
  const engine = new ReasoningEngine();
  const result = await engine.reason(userMessage, proposedPayment);
  const reasoningDecision = result.decision.decision;

  // Track disagreement
  const agreement = legacyDecision === reasoningDecision;
  
  await trackDisagreement({
    userId,
    userMessage,
    profile: result.profile,
    legacyDecision,
    reasoningDecision,
    agreement,
    traceId: result.traceId
  });

  // If disagreement, log for investigation
  if (!agreement) {
    console.warn(`Disagreement: legacy=${legacyDecision}, reasoning=${reasoningDecision}`);
    await addToEvalQueue({
      type: "decision_disagreement",
      traceId: result.traceId,
      priority: "high"
    });
  }
}
```

---

## Monitoring Dashboard

Create a simple dashboard showing:

```
Signal 1: Missing Data Friction
├─ Income refusal rate: X%
├─ Housing refusal rate: X%
├─ Debt refusal rate: X%
├─ Average vague answers: X%
└─ Abandonment rate: X%

Signal 2: Parser Accuracy
├─ Parse success rate: X%
├─ Common failures: [list]
├─ Patterns to fix: [list]
└─ Confidence calibration: [graph]

Signal 3: Decision Disagreement
├─ Agreement rate: X%
├─ Disagreement patterns: [list]
├─ Reasoning more conservative: X%
├─ Reasoning more optimistic: X%
└─ Cases to investigate: [list]
```

---

## Daily Review Checklist

**Every morning, check:**

1. **Missing Data Friction**
   - [ ] Any field with >20% refusal rate?
   - [ ] Any field with >30% vague answers?
   - [ ] Abandonment rate trending up?

2. **Parser Accuracy**
   - [ ] Any parse errors in last 24h?
   - [ ] New failure patterns?
   - [ ] Confidence scores calibrated?

3. **Decision Disagreement**
   - [ ] Agreement rate >90%?
   - [ ] Any systematic disagreement patterns?
   - [ ] New cases to add to evals?

---

## What These Signals Tell You

### If Signal 1 is Red
→ Your profile is too heavy  
→ Make fields optional  
→ Offer defaults and estimates  
→ Explain why you need data

### If Signal 2 is Red
→ Your parser is too simple  
→ Add more patterns  
→ Handle edge cases  
→ Improve confidence scoring

### If Signal 3 is Red
→ Your decision rules are unclear  
→ Reasoning differs from legacy  
→ Adjust thresholds  
→ Add to evals for investigation

---

## The Most Important Rule

**These signals are more valuable than any metric.**

They tell you exactly what users are struggling with.

Listen to them.

Adjust based on them.

Iterate based on them.

---

**Status:** Ready to monitor  
**Start:** Day 1 of shadow mode  
**Review:** Daily for first 2 weeks
