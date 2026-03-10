# Atlas Phase 1a Production Safety Corrections

**Version:** 1.0  
**Status:** Critical Implementation Details  
**Date:** 2026-03-10

---

## Overview

Five critical corrections that make Phase 1a production-safe:

1. **NumericClaimExtractor** — catch invented numbers
2. **Decision Confidence Scoring** — expose decision quality
3. **Safety Guardrails** — block unsafe recommendations
4. **Shadow Mode Rollout** — safe baseline comparison
5. **Simplified Claude Adapter** — constrained prompts

These are subtle but essential for fintech credibility.

---

## Correction 1: NumericClaimExtractor

### Problem

Claude might generate:

```
"You could save about $1,000 per month"
```

Even though the tool output was `$1,127`.

The self-check validator alone won't catch this subtle drift.

### Solution

Add a module that:
1. Extracts every number from Claude output
2. Normalizes formats ($1,200, 1200, 1.2k)
3. Compares against tool results
4. Blocks if number cannot be traced

### Implementation

```typescript
export interface NumericClaim {
  original: string; // "$1,000"
  normalized: number; // 1000
  context: string; // surrounding text
  source: "tool_result" | "profile_field" | "invented";
  tolerance: number; // acceptable variance %
}

export class NumericClaimExtractor {
  /**
   * Extract all numeric claims from Claude output
   */
  extractClaims(explanation: string): NumericClaim[] {
    const claims: NumericClaim[] = [];

    // Pattern 1: $X,XXX
    const dollarPattern = /\$[\d,]+(?:\.\d{2})?/g;
    for (const match of explanation.matchAll(dollarPattern)) {
      claims.push({
        original: match[0],
        normalized: this.normalize(match[0]),
        context: this.getContext(explanation, match.index!),
        source: "invented", // will be verified below
        tolerance: 5 // 5% tolerance for rounding
      });
    }

    // Pattern 2: X,XXX (plain number)
    const numberPattern = /\b[\d,]+(?:\.\d{2})?\b/g;
    for (const match of explanation.matchAll(numberPattern)) {
      const num = this.normalize(match[0]);
      if (num > 100) { // only track significant numbers
        claims.push({
          original: match[0],
          normalized: num,
          context: this.getContext(explanation, match.index!),
          source: "invented",
          tolerance: 5
        });
      }
    }

    // Pattern 3: X.Xk (shorthand)
    const shorthandPattern = /\b\d+\.?\d*k\b/gi;
    for (const match of explanation.matchAll(shorthandPattern)) {
      claims.push({
        original: match[0],
        normalized: this.normalize(match[0]),
        context: this.getContext(explanation, match.index!),
        source: "invented",
        tolerance: 5
      });
    }

    return claims;
  }

  /**
   * Verify each claim against tool results
   */
  verifyClaims(
    claims: NumericClaim[],
    toolResults: Record<string, number | undefined>,
    profileFields: Record<string, number | undefined>
  ): {
    verified: NumericClaim[];
    invented: NumericClaim[];
  } {
    const verified: NumericClaim[] = [];
    const invented: NumericClaim[] = [];

    for (const claim of claims) {
      let found = false;

      // Check tool results
      for (const [key, value] of Object.entries(toolResults)) {
        if (value !== undefined && this.isWithinTolerance(claim.normalized, value, claim.tolerance)) {
          claim.source = "tool_result";
          verified.push(claim);
          found = true;
          break;
        }
      }

      // Check profile fields
      if (!found) {
        for (const [key, value] of Object.entries(profileFields)) {
          if (value !== undefined && this.isWithinTolerance(claim.normalized, value, claim.tolerance)) {
            claim.source = "profile_field";
            verified.push(claim);
            found = true;
            break;
          }
        }
      }

      // Not found = invented
      if (!found) {
        claim.source = "invented";
        invented.push(claim);
      }
    }

    return { verified, invented };
  }

  /**
   * Normalize various number formats
   */
  private normalize(value: string): number {
    // Remove $, commas
    let cleaned = value.replace(/[$,]/g, "");

    // Handle shorthand (1.2k = 1200)
    if (cleaned.toLowerCase().endsWith("k")) {
      const num = parseFloat(cleaned.slice(0, -1));
      return num * 1000;
    }

    return parseFloat(cleaned);
  }

  /**
   * Check if two numbers are within tolerance
   */
  private isWithinTolerance(claimed: number, actual: number, tolerancePercent: number): boolean {
    const tolerance = (actual * tolerancePercent) / 100;
    return Math.abs(claimed - actual) <= tolerance;
  }

  /**
   * Get surrounding context for debugging
   */
  private getContext(text: string, index: number, chars: number = 50): string {
    const start = Math.max(0, index - chars);
    const end = Math.min(text.length, index + chars);
    return text.substring(start, end).trim();
  }
}
```

### Integration into SelfCheckValidator

```typescript
export async function validateResponse(
  decision: DecisionResult,
  explanation: string,
  toolOutputs: Record<string, ToolResult<any>>
): Promise<SelfCheckResult> {
  const checks: Array<any> = [];
  const issues: string[] = [];

  // ... existing checks ...

  // NEW: Check numeric claims
  const extractor = new NumericClaimExtractor();
  const claims = extractor.extractClaims(explanation);
  
  const toolResults: Record<string, number | undefined> = {};
  for (const [toolName, output] of Object.entries(toolOutputs)) {
    if (output.result && typeof output.result === "object") {
      for (const [key, value] of Object.entries(output.result)) {
        if (typeof value === "number") {
          toolResults[`${toolName}.${key}`] = value;
        }
      }
    }
  }

  const { verified, invented } = extractor.verifyClaims(claims, toolResults, {});

  checks.push({
    name: "numeric_claim_verification",
    passed: invented.length === 0,
    details: `${verified.length} verified claims, ${invented.length} invented claims`
  });

  if (invented.length > 0) {
    issues.push(`Invented numbers detected: ${invented.map(c => c.original).join(", ")}`);
  }

  return {
    passed: issues.length === 0,
    checks,
    issues
  };
}
```

### Test Cases

```typescript
describe("NumericClaimExtractor", () => {
  const extractor = new NumericClaimExtractor();

  it("should extract dollar amounts", () => {
    const claims = extractor.extractClaims("Your surplus is $1,800 per month");
    expect(claims).toHaveLength(1);
    expect(claims[0].normalized).toBe(1800);
  });

  it("should extract plain numbers", () => {
    const claims = extractor.extractClaims("You have 8000 in savings");
    expect(claims).toHaveLength(1);
    expect(claims[0].normalized).toBe(8000);
  });

  it("should extract shorthand (1.2k)", () => {
    const claims = extractor.extractClaims("That's about 1.2k per month");
    expect(claims).toHaveLength(1);
    expect(claims[0].normalized).toBe(1200);
  });

  it("should verify claims against tool results", () => {
    const claims = [
      { original: "$1,800", normalized: 1800, source: "invented" as const, tolerance: 5 }
    ];
    const toolResults = { monthlySurplus: 1800 };
    const { verified, invented } = extractor.verifyClaims(claims, toolResults, {});
    expect(verified).toHaveLength(1);
    expect(invented).toHaveLength(0);
  });

  it("should catch invented numbers", () => {
    const claims = [
      { original: "$2,000", normalized: 2000, source: "invented" as const, tolerance: 5 }
    ];
    const toolResults = { monthlySurplus: 1800 };
    const { verified, invented } = extractor.verifyClaims(claims, toolResults, {});
    expect(verified).toHaveLength(0);
    expect(invented).toHaveLength(1);
  });

  it("should allow tolerance for rounding", () => {
    const claims = [
      { original: "$1,810", normalized: 1810, source: "invented" as const, tolerance: 5 }
    ];
    const toolResults = { monthlySurplus: 1800 };
    const { verified, invented } = extractor.verifyClaims(claims, toolResults, {});
    // 1810 is within 5% of 1800 (tolerance = 90)
    expect(verified).toHaveLength(1);
    expect(invented).toHaveLength(0);
  });
});
```

---

## Correction 2: Decision Confidence Scoring

### Problem

Decisions are binary (yes/no) but confidence varies:

- Income confirmed, expenses confirmed → high confidence
- Income estimated, expenses rough → low confidence

Users should know this.

### Solution

Add confidence scoring to decision output.

### Implementation

```typescript
export type DecisionConfidence = "high" | "medium" | "low";

export interface DecisionWithConfidence extends DecisionResult {
  decisionConfidence: DecisionConfidence;
  confidenceFactors: {
    profileCompleteness: number; // 0-100
    dataReliability: number; // 0-100
    toolAssumptions: number; // 0-100 (higher = fewer assumptions)
    missingOptionalFields: number; // count
  };
  confidenceExplanation: string;
}

export function calculateDecisionConfidence(
  profile: FinancialProfile,
  toolOutputs: Record<string, ToolResult<any>>
): DecisionWithConfidence {
  // Factor 1: Profile completeness
  const profileCompleteness = profile.completeness.completenessScore;

  // Factor 2: Data reliability (average confidence of used fields)
  const usedFields = profile.completeness.providedFields;
  let reliabilitySum = 0;
  for (const field of usedFields) {
    const value = getFieldByPath(profile, field);
    if (value && typeof value === "object" && "confidence" in value) {
      reliabilitySum += value.confidence;
    }
  }
  const dataReliability = usedFields.length > 0 
    ? reliabilitySum / usedFields.length 
    : 50;

  // Factor 3: Tool assumptions (fewer assumptions = higher confidence)
  let assumptionCount = 0;
  for (const output of Object.values(toolOutputs)) {
    if (output.assumptions) {
      assumptionCount += output.assumptions.length;
    }
  }
  const toolAssumptions = Math.max(0, 100 - (assumptionCount * 10));

  // Factor 4: Missing optional fields
  const missingOptionalFields = profile.completeness.missingCriticalFields.length;

  // Calculate overall confidence
  const overallScore = 
    (profileCompleteness * 0.3) +
    (dataReliability * 0.4) +
    (toolAssumptions * 0.2) +
    ((100 - (missingOptionalFields * 10)) * 0.1);

  let confidence: DecisionConfidence;
  if (overallScore >= 80) {
    confidence = "high";
  } else if (overallScore >= 60) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  const explanation = buildConfidenceExplanation(
    profileCompleteness,
    dataReliability,
    toolAssumptions,
    missingOptionalFields
  );

  return {
    decisionConfidence: confidence,
    confidenceFactors: {
      profileCompleteness,
      dataReliability,
      toolAssumptions,
      missingOptionalFields
    },
    confidenceExplanation: explanation,
    // ... rest of decision fields ...
  };
}

function buildConfidenceExplanation(
  completeness: number,
  reliability: number,
  assumptions: number,
  missing: number
): string {
  const factors: string[] = [];

  if (completeness < 70) {
    factors.push("some data is missing");
  }
  if (reliability < 70) {
    factors.push("some numbers are estimates");
  }
  if (assumptions < 70) {
    factors.push("we made some assumptions");
  }
  if (missing > 0) {
    factors.push(`${missing} optional fields not provided`);
  }

  if (factors.length === 0) {
    return "Based on complete and reliable data";
  }

  return `Based on the numbers you shared (${factors.join(", ")})`;
}
```

### Claude Integration

Claude receives confidence and can explain naturally:

```typescript
interface ExplanationInput {
  // ... existing fields ...
  decisionConfidence: "high" | "medium" | "low";
  confidenceExplanation: string;
}
```

Claude's response:

```
High confidence:
"Yes, a $700 car payment is affordable."

Medium confidence:
"Based on the numbers you shared (some expenses are estimates), 
a $700 car payment looks affordable. The margin may shift a bit 
if your actual expenses are different."

Low confidence:
"Based on limited data, a $700 car payment appears affordable. 
But I'd recommend confirming your income and expenses first 
to be sure."
```

---

## Correction 3: Safety Guardrails

### Problem

Even with good decision logic, some outputs are too risky:

- DTI > 45% is dangerous
- Remaining surplus < 5% is risky
- Emergency fund < 20% of target blocks affordability

These need hard caps.

### Solution

Add guardrails that downgrade or block recommendations.

### Implementation

```typescript
export interface SafetyGuardrail {
  name: string;
  condition: (decision: DecisionResult, profile: FinancialProfile, toolOutputs: Record<string, ToolResult<any>>) => boolean;
  action: "block" | "downgrade" | "warn";
  newDecision?: string;
  reason: string;
}

export const AFFORDABILITY_GUARDRAILS: SafetyGuardrail[] = [
  {
    name: "emergency_fund_critical",
    condition: (decision, profile, tools) => {
      const emergencyFund = profile.assets.emergencyFund || 0;
      const target = getEmergencyFundTarget(profile);
      return emergencyFund < (target * 0.2); // < 20% of target
    },
    action: "block",
    newDecision: "no",
    reason: "Emergency fund is critically low"
  },
  {
    name: "dti_dangerous",
    condition: (decision, profile, tools) => {
      const affordability = tools.checkAffordability?.result;
      return affordability && affordability.dtiAfter > 0.50;
    },
    action: "block",
    newDecision: "no",
    reason: "DTI would exceed safe limits (>50%)"
  },
  {
    name: "surplus_too_tight",
    condition: (decision, profile, tools) => {
      const affordability = tools.checkAffordability?.result;
      return affordability && affordability.remainingPercent < 0.05;
    },
    action: "downgrade",
    newDecision: "maybe",
    reason: "Remaining surplus is too tight (<5%)"
  },
  {
    name: "dti_concerning",
    condition: (decision, profile, tools) => {
      const affordability = tools.checkAffordability?.result;
      return affordability && affordability.dtiAfter > 0.43;
    },
    action: "warn",
    reason: "DTI is concerning (>43%)"
  }
];

export const BUDGETING_GUARDRAILS: SafetyGuardrail[] = [
  {
    name: "negative_surplus_severe",
    condition: (decision, profile, tools) => {
      const surplus = tools.calculateMonthlySurplus?.result?.monthlySurplus;
      return surplus !== undefined && surplus < -500;
    },
    action: "block",
    newDecision: "no",
    reason: "Spending exceeds income by >$500"
  }
];

export function applyGuardrails(
  decision: DecisionResult,
  profile: FinancialProfile,
  toolOutputs: Record<string, ToolResult<any>>,
  guardrails: SafetyGuardrail[]
): {
  decision: DecisionResult;
  guardrailsTriggered: SafetyGuardrail[];
} {
  const triggered: SafetyGuardrail[] = [];

  for (const guardrail of guardrails) {
    if (guardrail.condition(decision, profile, toolOutputs)) {
      triggered.push(guardrail);

      if (guardrail.action === "block") {
        decision.decisionResult = guardrail.newDecision as any;
        decision.reasoning = guardrail.reason;
      } else if (guardrail.action === "downgrade") {
        if (decision.decisionResult === "yes") {
          decision.decisionResult = "maybe";
        }
        decision.reasoning = guardrail.reason;
      } else if (guardrail.action === "warn") {
        decision.nextSteps.unshift(`⚠️ Warning: ${guardrail.reason}`);
      }
    }
  }

  return { decision, guardrailsTriggered: triggered };
}
```

### Integration into ReasoningEngine

```typescript
async function reason(request: ReasoningRequest): Promise<ReasoningResponse> {
  // ... earlier steps ...

  // Apply guardrails BEFORE explanation
  const guardrails = 
    decision.decisionType === "affordability" 
      ? AFFORDABILITY_GUARDRAILS 
      : BUDGETING_GUARDRAILS;

  const { decision: guardedDecision, guardrailsTriggered } = 
    applyGuardrails(decision, profile, toolOutputs, guardrails);

  // Continue with guardedDecision
  // ...
}
```

---

## Correction 4: Shadow Mode Rollout

### Problem

Current rollout:
```
0% → 5% → 25% → 100%
```

No baseline comparison before exposure.

### Solution

Add shadow mode phase:
```
0% shadow mode (no user exposure)
↓
5% visible (real users)
↓
25% visible
↓
100% visible
```

### Implementation

```typescript
export interface RolloutConfig {
  phase: "shadow" | "visible";
  percentageOfUsers: number; // 0-100
  decisionTypes: string[]; // ["budgeting", "affordability"]
}

export const ROLLOUT_SCHEDULE: RolloutConfig[] = [
  {
    phase: "shadow",
    percentageOfUsers: 100,
    decisionTypes: ["budgeting", "affordability"]
  },
  {
    phase: "visible",
    percentageOfUsers: 5,
    decisionTypes: ["budgeting", "affordability"]
  },
  {
    phase: "visible",
    percentageOfUsers: 25,
    decisionTypes: ["budgeting", "affordability"]
  },
  {
    phase: "visible",
    percentageOfUsers: 100,
    decisionTypes: ["budgeting", "affordability"]
  }
];

export async function shouldUseReasoningEngine(
  userId: string,
  decisionType: string,
  config: RolloutConfig
): Promise<boolean> {
  // Check if decision type is enabled
  if (!config.decisionTypes.includes(decisionType)) {
    return false;
  }

  // Check if user is in rollout percentage
  const userHash = hashUserId(userId);
  const userPercentile = (userHash % 100);
  return userPercentile < config.percentageOfUsers;
}

export async function runInShadowMode(
  request: ReasoningRequest,
  config: RolloutConfig
): Promise<{
  legacyResponse: string;
  reasoningResponse: ReasoningResponse;
  comparison: ShadowModeComparison;
}> {
  if (config.phase !== "shadow") {
    throw new Error("Shadow mode only available in shadow phase");
  }

  // Run legacy chat flow
  const legacyResponse = await runLegacyChat(request.userMessage);

  // Run reasoning engine
  const reasoningResponse = await reasoningEngine.reason(request);

  // Compare
  const comparison = compareResponses(legacyResponse, reasoningResponse);

  // Log for analysis (don't show to user)
  await logShadowModeComparison(request.userId, comparison);

  // Return ONLY legacy response to user
  return {
    legacyResponse,
    reasoningResponse,
    comparison
  };
}

export interface ShadowModeComparison {
  userId: string;
  timestamp: string;
  decisionType: string;
  legacyDecision: string;
  reasoningDecision: string;
  agreement: boolean;
  numericTruthScore: number; // 0-100
  confidenceScore: number; // 0-100
  safetyScore: number; // 0-100
}
```

### Monitoring Dashboard

Track during shadow mode:

```
Agreement Rate: [target: >90%]
  = (legacy agrees with reasoning) / (total decisions)

Numeric Truth Score: [target: 100%]
  = (reasoning numbers from tools) / (total numbers)

Safety Score: [target: 100%]
  = (no guardrails triggered) / (total decisions)

Confidence Distribution:
  - High: X%
  - Medium: Y%
  - Low: Z%
```

---

## Correction 5: Simplified Claude Adapter

### Problem

Current approach sends raw trace log to Claude.

Too much information, too much freedom.

### Solution

Send only structured decision data.

### Implementation

```typescript
export interface StructuredDecisionPrompt {
  decisionType: "budgeting" | "affordability";
  decisionResult: "yes" | "no" | "maybe" | "defer";
  decisionConfidence: "high" | "medium" | "low";
  
  // Numeric facts only
  numbers: {
    grossMonthlyIncome?: number;
    totalMonthlyExpenses?: number;
    monthlySurplus?: number;
    emergencyFundTarget?: number;
    emergencyFundCurrent?: number;
    proposedExpense?: number;
    remainingSurplus?: number;
    dtiAfter?: number;
  };
  
  // Rules that triggered
  rulesTriggered: string[];
  
  // What to do next
  nextAction: "explain" | "ask_question" | "defer";
  nextQuestion?: string;
  
  // Tone
  tone: {
    emotion: "anxious" | "analytical" | "motivated" | "uncertain";
    riskLevel: "safe" | "moderate" | "risky" | "dangerous";
  };
}

export async function callClaudeWithStructuredPrompt(
  prompt: StructuredDecisionPrompt
): Promise<string> {
  const systemPrompt = `You are Atlas, a financial reasoning system.

DECISION ALREADY MADE: ${prompt.decisionResult}
CONFIDENCE: ${prompt.decisionConfidence}

Numeric facts (use these, never recompute):
${Object.entries(prompt.numbers)
  .filter(([_, v]) => v !== undefined)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n")}

Rules that triggered:
${prompt.rulesTriggered.map(r => `- ${r}`).join("\n")}

Your job:
${
  prompt.nextAction === "explain"
    ? "Explain why this decision was made. Use the numbers provided."
    : prompt.nextAction === "ask_question"
    ? `Ask this question: "${prompt.nextQuestion}"`
    : "Explain why we need more data."
}

Tone: ${prompt.tone.emotion}, Risk level: ${prompt.tone.riskLevel}`;

  const response = await anthropic.messages.create({
    model: "claude-3-opus-20250219",
    max_tokens: 400,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: "Provide the explanation."
      }
    ]
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}
```

### Example Prompts

**Affordability - High Confidence:**
```
DECISION ALREADY MADE: yes
CONFIDENCE: high

Numbers:
- grossMonthlyIncome: 5200
- totalMonthlyExpenses: 3200
- monthlySurplus: 2000
- proposedExpense: 700
- remainingSurplus: 1300
- dtiAfter: 0.32

Rules triggered:
- surplus_positive
- payment_less_than_surplus
- dti_acceptable

Your job: Explain why this decision was made.
Tone: analytical, Risk level: safe
```

**Affordability - Medium Confidence:**
```
DECISION ALREADY MADE: yes
CONFIDENCE: medium

Numbers:
- grossMonthlyIncome: 5200
- totalMonthlyExpenses: 3200 (estimated)
- monthlySurplus: 2000
- proposedExpense: 700
- remainingSurplus: 1300
- dtiAfter: 0.32

Rules triggered:
- surplus_positive
- payment_less_than_surplus
- dti_acceptable

Your job: Explain why this decision was made.
Note: Some expenses are estimates, so the margin may shift.
Tone: analytical, Risk level: moderate
```

---

## Integration Checklist

### Week 2 Additions

- [ ] Task 2.7: NumericClaimExtractor (3 hours)
  - Extract numbers from text
  - Verify against tool results
  - 100% test coverage

- [ ] Task 2.8: Decision Confidence Scoring (2 hours)
  - Calculate confidence from profile + tools
  - Build confidence explanation
  - 100% test coverage

- [ ] Task 2.9: Safety Guardrails (3 hours)
  - Define guardrails for affordability
  - Define guardrails for budgeting
  - Apply guardrails in ReasoningEngine
  - 100% test coverage

### Week 3 Modifications

- [ ] Task 3.3 (modified): Claude Adapter
  - Use StructuredDecisionPrompt instead of raw trace
  - Simplified, constrained prompts
  - 100% test coverage

- [ ] Task 3.4 (modified): Feature Flag Route
  - Add shadow mode logic
  - Add comparison logging
  - Add rollout config

---

## Success Metrics (Updated)

### Numeric Truth
- Invented numbers: **0%**
- All numbers traceable to tools: **100%**

### Decision Confidence
- High confidence decisions: **>60%**
- Medium confidence decisions: **30-40%**
- Low confidence decisions: **<10%**

### Safety Guardrails
- Guardrails triggered: **<5%** (indicates good decision logic)
- Guardrails prevented unsafe recommendations: **100%**

### Shadow Mode
- Agreement rate (legacy vs reasoning): **>90%**
- Numeric truth in shadow: **100%**
- Safety score in shadow: **100%**

---

## Summary

These five corrections make Phase 1a production-safe:

1. ✅ **NumericClaimExtractor** — catch invented numbers
2. ✅ **Decision Confidence** — expose decision quality
3. ✅ **Safety Guardrails** — block unsafe recommendations
4. ✅ **Shadow Mode** — safe baseline comparison
5. ✅ **Simplified Adapter** — constrained Claude prompts

Together, they ensure Atlas is a serious financial reasoning system, not a chatbot.
