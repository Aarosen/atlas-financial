# Atlas Phase 1a Execution Plan: The 10 Engineering Moves

**Version:** 1.0  
**Status:** Ready for Implementation  
**Date:** 2026-03-10  
**Duration:** 2 weeks  
**Goal:** Ship vertical slice: "Can I afford this?" using deterministic reasoning

---

## The Core Insight

80% of financial conversations revolve around only ~6 variables:
- Income
- Housing cost
- Debt payments
- Savings
- Monthly spending
- Dependents

**Start with the smallest usable profile. Everything else grows later.**

---

## The 10 Engineering Moves

### Move 1: Create FinancialProfile v0 Schema

**Objective:** Minimal profile that powers affordability decisions

**File:** `src/lib/reasoning/types/FinancialProfileV0.ts`

```typescript
export interface FinancialProfileV0 {
  // Core fields only
  incomeMonthly?: number;
  housingCostMonthly?: number;
  debtPaymentsMonthly?: number;
  savingsBalance?: number;
  monthlySpendingEstimate?: number;
  dependents?: number;

  // Metadata
  metadata: {
    lastUpdated: string;
    confidence: {
      incomeMonthly: number; // 0-100
      housingCostMonthly: number;
      debtPaymentsMonthly: number;
      savingsBalance: number;
      monthlySpendingEstimate: number;
    };
    assumptions: string[];
  };
}
```

**Done Criteria:**
- [ ] TypeScript compiles
- [ ] All fields optional (users don't need to fill all)
- [ ] Confidence tracking on each field
- [ ] Assumptions documented

**Time:** 1 hour

**Why this works:**
- Users can answer 6 questions instead of 50
- System can still make good decisions
- Room to grow without redesign
- Feels lightweight, not heavy

---

### Move 2: Implement InputParser

**Objective:** Parse natural language into structured numbers

**File:** `src/lib/reasoning/reliability/InputParser.ts`

**Patterns to detect:**
```
$5200
5200
5200/month
5.2k
about 5000
around 5k
roughly 5000
approximately 5200
between 4500 and 5500
```

```typescript
export interface ParsedInput {
  field: string; // "incomeMonthly", "housingCostMonthly", etc
  value: number;
  confidence: number; // 0-100
  isProvisional: boolean; // "about", "roughly", "approximately"
  isRange: boolean; // "between X and Y"
  rangeMin?: number;
  rangeMax?: number;
  assumptions: string[];
}

export class InputParser {
  parse(userMessage: string): ParsedInput[] {
    // Detect field type (income, housing, debt, etc)
    // Extract number(s)
    // Normalize to monthly
    // Detect provisional language
    // Return structured data
  }
}
```

**Test cases:**
```typescript
describe("InputParser", () => {
  it("should parse '$5200'", () => {
    const result = parser.parse("My income is $5200");
    expect(result[0].value).toBe(5200);
    expect(result[0].confidence).toBe(90);
  });

  it("should parse '5.2k'", () => {
    const result = parser.parse("I make about 5.2k per month");
    expect(result[0].value).toBe(5200);
    expect(result[0].isProvisional).toBe(true);
    expect(result[0].confidence).toBe(70);
  });

  it("should parse ranges", () => {
    const result = parser.parse("Between $4500 and $5500");
    expect(result[0].rangeMin).toBe(4500);
    expect(result[0].rangeMax).toBe(5500);
    expect(result[0].value).toBe(5000); // midpoint
    expect(result[0].isRange).toBe(true);
  });

  it("should detect provisional language", () => {
    const result = parser.parse("About $5200");
    expect(result[0].isProvisional).toBe(true);
    expect(result[0].confidence).toBe(70);
  });
});
```

**Done Criteria:**
- [ ] Parse all common formats
- [ ] Detect provisional language
- [ ] Handle ranges
- [ ] All tests passing
- [ ] 100% test coverage

**Time:** 4 hours

**Why this matters:**
Good parsing makes the system feel magical. Users can say things naturally instead of filling forms.

---

### Move 3: Implement MonthlySurplus Tool

**Objective:** Calculate income minus expenses

**File:** `src/lib/reasoning/tools/calculateMonthlySurplus.ts`

```typescript
export interface MonthlySurplusResult {
  income: number;
  housing: number;
  debt: number;
  spending: number;
  totalExpenses: number;
  surplus: number;
  surplusRate: number; // percentage
  assumptions: string[];
  confidence: number; // 0-100
  missingFields: string[];
}

export async function calculateMonthlySurplus(
  profile: FinancialProfileV0
): Promise<MonthlySurplusResult> {
  // Validate income present
  if (!profile.incomeMonthly) {
    return {
      success: false,
      missingFields: ["incomeMonthly"],
      assumptions: [],
      confidence: 0
    };
  }

  // Calculate expenses
  const housing = profile.housingCostMonthly || 0;
  const debt = profile.debtPaymentsMonthly || 0;
  const spending = profile.monthlySpendingEstimate || 300; // default estimate

  const totalExpenses = housing + debt + spending;
  const surplus = profile.incomeMonthly - totalExpenses;

  // Build assumptions
  const assumptions: string[] = [];
  if (!profile.monthlySpendingEstimate) {
    assumptions.push("Estimated spending at $300 (you can refine this)");
  }

  // Calculate confidence
  let confidence = 90;
  if (!profile.monthlySpendingEstimate) confidence -= 20;
  if (profile.metadata.confidence.incomeMonthly < 80) confidence -= 10;

  return {
    income: profile.incomeMonthly,
    housing,
    debt,
    spending,
    totalExpenses,
    surplus,
    surplusRate: (surplus / profile.incomeMonthly) * 100,
    assumptions,
    confidence,
    missingFields: []
  };
}
```

**Test cases:**
```typescript
describe("calculateMonthlySurplus", () => {
  it("should calculate surplus", () => {
    const profile = {
      incomeMonthly: 5200,
      housingCostMonthly: 2200,
      debtPaymentsMonthly: 400,
      monthlySpendingEstimate: 600
    };
    const result = calculateMonthlySurplus(profile);
    expect(result.surplus).toBe(2000);
  });

  it("should estimate spending if missing", () => {
    const profile = {
      incomeMonthly: 5200,
      housingCostMonthly: 2200,
      debtPaymentsMonthly: 400
    };
    const result = calculateMonthlySurplus(profile);
    expect(result.assumptions).toContain("Estimated spending");
  });

  it("should return missing fields if income missing", () => {
    const profile = {};
    const result = calculateMonthlySurplus(profile);
    expect(result.missingFields).toContain("incomeMonthly");
  });
});
```

**Done Criteria:**
- [ ] Calculate surplus correctly
- [ ] Return assumptions
- [ ] Return confidence score
- [ ] Return missing fields
- [ ] All tests passing
- [ ] 100% test coverage

**Time:** 2 hours

**Why this matters:**
This is the most important primitive. Almost every decision depends on it.

---

### Move 4: Implement AffordabilityDecision

**Objective:** Answer "Can I afford this?"

**File:** `src/lib/reasoning/decisions/AffordabilityDecision.ts`

```typescript
export interface AffordabilityDecisionResult {
  decision: "yes" | "no" | "maybe";
  confidence: "high" | "medium" | "low";
  reasoning: string;
  remainingSurplus: number;
  remainingPercent: number;
  riskLevel: "safe" | "moderate" | "risky" | "dangerous";
  nextSteps: string[];
}

export async function checkAffordability(
  profile: FinancialProfileV0,
  proposedExpense: number
): Promise<AffordabilityDecisionResult> {
  // Get surplus
  const surplusResult = await calculateMonthlySurplus(profile);
  if (!surplusResult.success) {
    return {
      decision: "maybe",
      confidence: "low",
      reasoning: "Need more information about your income",
      remainingSurplus: 0,
      remainingPercent: 0,
      riskLevel: "risky",
      nextSteps: ["Tell me your monthly income"]
    };
  }

  const remainingSurplus = surplusResult.surplus - proposedExpense;
  const remainingPercent = (remainingSurplus / surplusResult.income) * 100;

  // Decision logic
  let decision: "yes" | "no" | "maybe" = "yes";
  let confidence: "high" | "medium" | "low" = "high";
  let riskLevel: "safe" | "moderate" | "risky" | "dangerous" = "safe";
  let reasoning = "";

  // Check emergency fund
  if ((profile.savingsBalance || 0) < 3000) {
    decision = "no";
    confidence = "high";
    riskLevel = "dangerous";
    reasoning = "Your emergency fund is too low. Build it first.";
  }
  // Check remaining surplus
  else if (remainingPercent < 5) {
    decision = "no";
    confidence = "high";
    riskLevel = "risky";
    reasoning = "This would leave you with less than 5% buffer.";
  } else if (remainingPercent < 10) {
    decision = "maybe";
    confidence = "medium";
    riskLevel = "moderate";
    reasoning = "Affordable, but tight. Consider a lower payment.";
  } else {
    decision = "yes";
    confidence = "high";
    riskLevel = "safe";
    reasoning = "Affordable with good buffer.";
  }

  return {
    decision,
    confidence,
    reasoning,
    remainingSurplus,
    remainingPercent,
    riskLevel,
    nextSteps: [
      decision === "yes" ? "You can afford this" : "Consider alternatives"
    ]
  };
}
```

**Test cases:**
```typescript
describe("AffordabilityDecision", () => {
  it("should say yes for affordable payment", () => {
    const profile = {
      incomeMonthly: 5200,
      housingCostMonthly: 2200,
      debtPaymentsMonthly: 400,
      monthlySpendingEstimate: 600,
      savingsBalance: 8000
    };
    const result = checkAffordability(profile, 700);
    expect(result.decision).toBe("yes");
    expect(result.confidence).toBe("high");
  });

  it("should say no if emergency fund too low", () => {
    const profile = {
      incomeMonthly: 5200,
      housingCostMonthly: 2200,
      debtPaymentsMonthly: 400,
      monthlySpendingEstimate: 600,
      savingsBalance: 1000 // too low
    };
    const result = checkAffordability(profile, 700);
    expect(result.decision).toBe("no");
    expect(result.reasoning).toContain("emergency fund");
  });

  it("should say maybe for tight budget", () => {
    const profile = {
      incomeMonthly: 5200,
      housingCostMonthly: 2200,
      debtPaymentsMonthly: 400,
      monthlySpendingEstimate: 1800, // high spending
      savingsBalance: 8000
    };
    const result = checkAffordability(profile, 700);
    expect(result.decision).toBe("maybe");
    expect(result.confidence).toBe("medium");
  });
});
```

**Done Criteria:**
- [ ] Correct decision logic
- [ ] Confidence scoring
- [ ] Risk level assessment
- [ ] Clear reasoning
- [ ] All tests passing
- [ ] 100% test coverage

**Time:** 2 hours

**Why this matters:**
This is the most common financial question users ask. Nailing this unlocks everything else.

---

### Move 5: Implement Trace Logs Immediately

**Objective:** Immutable audit trail from day one

**File:** `src/lib/reasoning/trace/DecisionTraceLog.ts`

```typescript
export interface DecisionTraceLog {
  traceId: string;
  timestamp: string;
  userMessage: string;
  profile: FinancialProfileV0;
  decision: AffordabilityDecisionResult;
  toolOutputs: {
    surplus: MonthlySurplusResult;
  };
  explanation: string;
  metadata: {
    latencyMs: number;
    model: string;
  };
}

export class TraceLogWriter {
  async write(trace: DecisionTraceLog): Promise<void> {
    const line = JSON.stringify(trace) + "\n";
    await fs.appendFile("src/evals/trace-logs.jsonl", line);
  }

  async read(traceId: string): Promise<DecisionTraceLog | null> {
    const content = await fs.readFile("src/evals/trace-logs.jsonl", "utf-8");
    const lines = content.split("\n").filter(l => l.trim());
    for (const line of lines) {
      const trace = JSON.parse(line) as DecisionTraceLog;
      if (trace.traceId === traceId) {
        return trace;
      }
    }
    return null;
  }
}
```

**Done Criteria:**
- [ ] Trace written for every decision
- [ ] Append-only format
- [ ] Read by trace ID working
- [ ] All tests passing

**Time:** 1 hour

**Why this matters:**
Trace logs will save you weeks of debugging. Don't delay this.

---

### Move 6: Run in Shadow Mode

**Objective:** Compare reasoning engine vs legacy chat before user exposure

**File:** `src/lib/reasoning/ShadowMode.ts`

```typescript
export async function runInShadowMode(
  userMessage: string,
  userId: string
): Promise<{
  legacyResponse: string;
  reasoningResponse: AffordabilityDecisionResult;
  comparison: {
    agreement: boolean;
    legacyDecision: string;
    reasoningDecision: string;
  };
}> {
  // Run legacy chat flow
  const legacyResponse = await runLegacyChat(userMessage);

  // Run reasoning engine
  const profile = await extractProfileFromMessage(userMessage);
  const reasoningResponse = await checkAffordability(profile, proposedExpense);

  // Compare
  const agreement = legacyDecision === reasoningResponse.decision;

  // Log comparison (don't show to user)
  await logShadowModeComparison(userId, {
    userMessage,
    legacyDecision,
    reasoningDecision: reasoningResponse.decision,
    agreement
  });

  // Return ONLY legacy response to user
  return {
    legacyResponse,
    reasoningResponse,
    comparison: { agreement, legacyDecision, reasoningDecision: reasoningResponse.decision }
  };
}
```

**Done Criteria:**
- [ ] Shadow mode running
- [ ] Comparisons being logged
- [ ] Agreement rate tracked
- [ ] No user-facing changes yet

**Time:** 2 hours

**Why this matters:**
This is extremely valuable. You'll see where reasoning engine differs from legacy chat before any user exposure.

---

### Move 7: Build Internal Trace Viewer

**Objective:** Debug tool for iteration

**File:** `app/api/debug/trace/[id]/route.ts`

```typescript
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const trace = await traceLogWriter.read(params.id);

  if (!trace) {
    return Response.json({ error: "Trace not found" }, { status: 404 });
  }

  return Response.json({
    traceId: trace.traceId,
    timestamp: trace.timestamp,
    userMessage: trace.userMessage,
    profile: trace.profile,
    decision: trace.decision,
    toolOutputs: trace.toolOutputs,
    explanation: trace.explanation,
    metadata: trace.metadata
  });
}
```

**UI:** Simple HTML page showing:
```
User Message: [message]
Profile: [JSON]
Tool Outputs: [JSON]
Decision: [decision]
Explanation: [text]
```

**Done Criteria:**
- [ ] Route working
- [ ] Trace readable
- [ ] All fields visible
- [ ] Easy to navigate

**Time:** 1 hour

**Why this matters:**
This will massively accelerate iteration. You'll spot issues immediately.

---

### Move 8: Add Confidence Field to Responses

**Objective:** Make system honesty explicit

**Response format:**
```json
{
  "decision": "yes",
  "confidence": "high",
  "reasoning": "Affordable with good buffer",
  "remainingSurplus": 1300,
  "riskLevel": "safe"
}
```

**Claude explanation:**
```
High confidence:
"Yes, a $700 car payment is affordable."

Medium confidence:
"Based on the numbers you shared (some are estimates), 
a $700 payment looks affordable."

Low confidence:
"Based on limited data, this appears affordable. 
But I'd recommend confirming your income first."
```

**Done Criteria:**
- [ ] Confidence in every response
- [ ] Claude adapts explanation based on confidence
- [ ] Users understand data quality

**Time:** 1 hour

**Why this matters:**
This makes the system feel honest. Users know when decisions are based on complete vs partial data.

---

### Move 9: Instrument User Friction

**Objective:** Track where users struggle

**File:** `src/lib/reasoning/instrumentation/FrictionTracking.ts`

Track when users:
```typescript
export interface FrictionEvent {
  userId: string;
  timestamp: string;
  type: "abandoned_flow" | "vague_answer" | "contradiction" | "refused_question";
  details: string;
  context: FinancialProfileV0;
}

export async function trackFriction(event: FrictionEvent): Promise<void> {
  await fs.appendFile("src/evals/friction-logs.jsonl", JSON.stringify(event) + "\n");
}
```

**Examples:**
```
User says: "about $5,000" (vague)
Track: vague_answer, field: income, confidence: 60

User abandons after 2 questions
Track: abandoned_flow, questions_answered: 2

User says: "I make $5,200" then later "I make $4,800"
Track: contradiction, field: income, values: [5200, 4800]
```

**Done Criteria:**
- [ ] Friction tracking working
- [ ] Logs being collected
- [ ] Dashboard showing friction points

**Time:** 2 hours

**Why this matters:**
This will inform the reliability layer and missing data orchestration. You'll see exactly where users struggle.

---

### Move 10: Ship Vertical Slice

**Objective:** Deploy "Can I afford this?" using deterministic reasoning

**What ships:**
- ✅ InputParser (parse natural language)
- ✅ MonthlySurplus tool (calculate surplus)
- ✅ AffordabilityDecision (make decision)
- ✅ Trace logs (audit trail)
- ✅ Confidence field (honesty)
- ✅ Claude explanation (constrained)

**What doesn't ship yet:**
- ❌ Budgeting decision
- ❌ Debt prioritization
- ❌ Scenario simulation
- ❌ Missing data orchestration
- ❌ Safety guardrails (v1 only)

**Deployment:**
```
Feature flag: ENABLE_REASONING_ENGINE = false (default)
Shadow mode: 100% of users (no exposure)
Visible: 0% (not yet)
```

**Success criteria:**
- [ ] All tests passing
- [ ] Shadow mode agreement >90%
- [ ] Numeric truth 100%
- [ ] Trace logs immutable
- [ ] Zero crashes
- [ ] Latency <500ms

**Time:** 2 hours (integration + testing)

**Why this matters:**
This is the moment you prove the architecture works. Everything else builds on this.

---

## Timeline

**Week 1:**
- Move 1: FinancialProfile v0 (1h)
- Move 2: InputParser (4h)
- Move 3: MonthlySurplus (2h)
- Move 4: AffordabilityDecision (2h)
- Move 5: Trace logs (1h)
- Move 6: Shadow mode (2h)
- Move 7: Trace viewer (1h)
- Move 8: Confidence field (1h)
- Move 9: Friction tracking (2h)
- Move 10: Ship vertical slice (2h)

**Total: ~18 hours**

**Week 2:**
- Testing and iteration
- Shadow mode analysis
- Bug fixes
- Prepare for visible rollout

---

## Success Metrics

### Numeric Truth
```
Invented numbers: 0%
All numbers from tools: 100%
```

### Decision Consistency
```
Explanation matches decision: >99%
```

### Shadow Mode
```
Agreement with legacy: >90%
Numeric truth: 100%
```

### Performance
```
Latency: <500ms
Error rate: <0.1%
```

---

## The Key Principle

**Start small. Ship fast. Learn from real users.**

Don't build the full system before shipping.

Build the smallest thing that proves the concept, then iterate based on real feedback.

---

## What Happens After

Once "Can I afford this?" is working:

**Week 3:**
- Add budgeting decision
- Add emergency fund decision
- Expand to 3 decision types

**Week 4:**
- Add scenario simulation
- Show "what if" analysis
- Users start exploring tradeoffs

**Week 5+:**
- Add missing data orchestration
- Smart questioning
- Expand to 5+ decision types

---

## The Honest Truth

This is where most systems fail or succeed.

Not in the design (you nailed that).

But in the execution.

The teams that ship small, iterate fast, and listen to users win.

The teams that try to build the perfect system before shipping lose.

You have the architecture right.

Now execute the 10 moves.

Ship the vertical slice.

Watch what users do.

Iterate.

That's how you build a real product.

---

**Status:** Ready for execution  
**Start:** Immediately  
**Target:** Ship vertical slice in 2 weeks
