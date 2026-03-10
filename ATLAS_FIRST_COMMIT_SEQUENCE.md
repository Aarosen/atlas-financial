# Atlas First Commit Sequence: Ship Vertical Slice in 1 Week

**Version:** 1.0  
**Status:** Ready to Execute  
**Date:** 2026-03-10  
**Goal:** Deterministic "Can I afford this?" working end-to-end

---

## The Rule: Design → Build → Observe → Adjust

**Not:** Design → Design → Design → Design

You have enough architecture. Now build.

---

## Commit 1: Create Reasoning Module Structure

**What:** Create directory structure and base types

**Files to create:**
```
src/lib/reasoning/
├── types.ts
├── profile.ts
├── parser.ts
├── tools.ts
├── decisions.ts
├── engine.ts
├── trace.ts
└── index.ts
```

**types.ts — Minimal types only:**
```typescript
export interface FinancialProfile {
  incomeMonthly?: number;
  housingCostMonthly?: number;
  debtPaymentsMonthly?: number;
  savingsBalance?: number;
  monthlySpendingEstimate?: number;
  dependents?: number;
}

export interface MonthlySurplusResult {
  income: number;
  expenses: number;
  surplus: number;
  confidence: number;
  assumptions: string[];
  missingFields: string[];
}

export interface AffordabilityResult {
  decision: "affordable" | "risky_affordable" | "not_affordable";
  confidence: "high" | "medium" | "low";
  remainingSurplus: number;
  reasoning: string;
}

export interface DecisionTrace {
  traceId: string;
  timestamp: string;
  profile: FinancialProfile;
  surplus: MonthlySurplusResult;
  decision: AffordabilityResult;
  explanation: string;
}
```

**Commit message:**
```
feat: create reasoning module structure with minimal types
```

**Time:** 30 minutes

---

## Commit 2: FinancialProfile v0

**What:** Profile manager for 6 fields

**profile.ts:**
```typescript
export class FinancialProfileManager {
  create(userId: string): FinancialProfile {
    return {
      incomeMonthly: undefined,
      housingCostMonthly: undefined,
      debtPaymentsMonthly: undefined,
      savingsBalance: undefined,
      monthlySpendingEstimate: undefined,
      dependents: undefined
    };
  }

  update(profile: FinancialProfile, field: string, value: any): FinancialProfile {
    return {
      ...profile,
      [field]: value
    };
  }

  isComplete(profile: FinancialProfile): boolean {
    return !!(
      profile.incomeMonthly &&
      profile.housingCostMonthly &&
      profile.debtPaymentsMonthly
    );
  }

  getMissingFields(profile: FinancialProfile): string[] {
    const missing: string[] = [];
    if (!profile.incomeMonthly) missing.push("incomeMonthly");
    if (!profile.housingCostMonthly) missing.push("housingCostMonthly");
    if (!profile.debtPaymentsMonthly) missing.push("debtPaymentsMonthly");
    return missing;
  }
}
```

**Commit message:**
```
feat: implement FinancialProfile v0 with 6 core fields
```

**Time:** 30 minutes

---

## Commit 3: InputParser

**What:** Parse natural language into structured numbers

**parser.ts:**
```typescript
export class InputParser {
  parse(userMessage: string): Partial<FinancialProfile> {
    const profile: Partial<FinancialProfile> = {};

    // Parse income patterns
    const incomeMatch = userMessage.match(/(\$?[\d,]+(?:\.\d{2})?)\s*(?:\/month|per month|monthly)?/i);
    if (incomeMatch) {
      profile.incomeMonthly = this.parseNumber(incomeMatch[1]);
    }

    // Parse housing patterns
    const housingMatch = userMessage.match(/(?:rent|mortgage|housing).*?(\$?[\d,]+(?:\.\d{2})?)/i);
    if (housingMatch) {
      profile.housingCostMonthly = this.parseNumber(housingMatch[1]);
    }

    // Parse debt patterns
    const debtMatch = userMessage.match(/(?:debt|payment).*?(\$?[\d,]+(?:\.\d{2})?)/i);
    if (debtMatch) {
      profile.debtPaymentsMonthly = this.parseNumber(debtMatch[1]);
    }

    // Parse savings patterns
    const savingsMatch = userMessage.match(/(?:savings|saved).*?(\$?[\d,]+(?:\.\d{2})?)/i);
    if (savingsMatch) {
      profile.savingsBalance = this.parseNumber(savingsMatch[1]);
    }

    return profile;
  }

  private parseNumber(str: string): number {
    // Remove $, commas
    const cleaned = str.replace(/[$,]/g, "");
    
    // Handle shorthand (5.2k = 5200)
    if (cleaned.toLowerCase().endsWith("k")) {
      return parseFloat(cleaned.slice(0, -1)) * 1000;
    }
    
    return parseFloat(cleaned);
  }
}
```

**Commit message:**
```
feat: implement InputParser for basic number extraction
```

**Time:** 1 hour

---

## Commit 4: MonthlySurplus Tool

**What:** Calculate income minus expenses

**tools.ts:**
```typescript
export function calculateMonthlySurplus(profile: FinancialProfile): MonthlySurplusResult {
  const missingFields: string[] = [];
  
  if (!profile.incomeMonthly) {
    missingFields.push("incomeMonthly");
  }

  const income = profile.incomeMonthly || 0;
  const housing = profile.housingCostMonthly || 0;
  const debt = profile.debtPaymentsMonthly || 0;
  const spending = profile.monthlySpendingEstimate || 300; // default

  const expenses = housing + debt + spending;
  const surplus = income - expenses;

  const assumptions: string[] = [];
  if (!profile.monthlySpendingEstimate) {
    assumptions.push("Estimated spending at $300");
  }

  let confidence = 90;
  if (!profile.monthlySpendingEstimate) confidence -= 20;
  if (missingFields.length > 0) confidence -= 30;

  return {
    income,
    expenses,
    surplus,
    confidence,
    assumptions,
    missingFields
  };
}
```

**Commit message:**
```
feat: implement calculateMonthlySurplus tool
```

**Time:** 30 minutes

---

## Commit 5: AffordabilityDecision

**What:** Decide if payment is affordable

**decisions.ts:**
```typescript
export function checkAffordability(
  profile: FinancialProfile,
  proposedPayment: number
): AffordabilityResult {
  const surplus = calculateMonthlySurplus(profile);

  if (surplus.missingFields.length > 0) {
    return {
      decision: "not_affordable",
      confidence: "low",
      remainingSurplus: 0,
      reasoning: `Missing: ${surplus.missingFields.join(", ")}`
    };
  }

  const remaining = surplus.surplus - proposedPayment;
  const remainingPercent = (remaining / surplus.income) * 100;

  // Decision logic
  if (remaining <= 0) {
    return {
      decision: "not_affordable",
      confidence: "high",
      remainingSurplus: remaining,
      reasoning: "Payment exceeds surplus"
    };
  }

  if (proposedPayment > surplus.surplus * 0.6) {
    return {
      decision: "risky_affordable",
      confidence: "medium",
      remainingSurplus: remaining,
      reasoning: "Payment is more than 60% of surplus"
    };
  }

  return {
    decision: "affordable",
    confidence: "high",
    remainingSurplus: remaining,
    reasoning: `Payment leaves $${Math.round(remaining)}/month buffer`
  };
}
```

**Commit message:**
```
feat: implement AffordabilityDecision with simple rules
```

**Time:** 30 minutes

---

## Commit 6: DecisionTrace

**What:** Immutable audit trail

**trace.ts:**
```typescript
import * as fs from "fs/promises";

export class TraceLogWriter {
  private logPath = "src/evals/reasoning-traces.jsonl";

  async write(trace: DecisionTrace): Promise<void> {
    const line = JSON.stringify(trace) + "\n";
    await fs.appendFile(this.logPath, line);
  }

  async read(traceId: string): Promise<DecisionTrace | null> {
    try {
      const content = await fs.readFile(this.logPath, "utf-8");
      const lines = content.split("\n").filter(l => l.trim());
      
      for (const line of lines) {
        const trace = JSON.parse(line) as DecisionTrace;
        if (trace.traceId === traceId) {
          return trace;
        }
      }
    } catch (e) {
      // File doesn't exist yet
    }
    
    return null;
  }
}
```

**Commit message:**
```
feat: implement DecisionTrace with append-only JSONL storage
```

**Time:** 30 minutes

---

## Commit 7: ReasoningEngine

**What:** Orchestrate the full pipeline

**engine.ts:**
```typescript
import { v4 as uuidv4 } from "uuid";

export class ReasoningEngine {
  private parser = new InputParser();
  private profileManager = new FinancialProfileManager();
  private traceWriter = new TraceLogWriter();

  async reason(
    userMessage: string,
    proposedPayment: number,
    existingProfile?: FinancialProfile
  ): Promise<{
    profile: FinancialProfile;
    decision: AffordabilityResult;
    traceId: string;
  }> {
    const traceId = uuidv4();
    const startTime = Date.now();

    // Step 1: Parse input
    const parsed = this.parser.parse(userMessage);

    // Step 2: Update profile
    let profile = existingProfile || this.profileManager.create("user");
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== undefined) {
        profile = this.profileManager.update(profile, key, value);
      }
    }

    // Step 3: Calculate surplus
    const surplus = calculateMonthlySurplus(profile);

    // Step 4: Make decision
    const decision = checkAffordability(profile, proposedPayment);

    // Step 5: Create trace
    const trace: DecisionTrace = {
      traceId,
      timestamp: new Date().toISOString(),
      profile,
      surplus,
      decision,
      explanation: `${decision.reasoning}. Remaining: $${Math.round(decision.remainingSurplus)}/month.`
    };

    // Step 6: Write trace
    await this.traceWriter.write(trace);

    return {
      profile,
      decision,
      traceId
    };
  }
}
```

**Commit message:**
```
feat: implement ReasoningEngine orchestrator
```

**Time:** 1 hour

---

## Commit 8: Claude Adapter

**What:** Constrained Claude explanation

**adapter.ts:**
```typescript
export async function generateExplanation(
  decision: AffordabilityResult,
  surplus: MonthlySurplusResult,
  proposedPayment: number
): Promise<string> {
  const prompt = `You are a financial clarity calculator. Explain this decision:

Decision: ${decision.decision}
Confidence: ${decision.confidence}
Monthly surplus: $${Math.round(surplus.surplus)}
Proposed payment: $${proposedPayment}
Remaining after payment: $${Math.round(decision.remainingSurplus)}

Explain clearly and briefly. Do not invent numbers. Use only the numbers provided.`;

  const response = await anthropic.messages.create({
    model: "claude-3-opus-20250219",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}
```

**Commit message:**
```
feat: implement Claude adapter with constrained prompts
```

**Time:** 30 minutes

---

## Commit 9: Shadow Mode

**What:** Run both legacy and reasoning engine

**shadow.ts:**
```typescript
export async function runInShadowMode(
  userMessage: string,
  proposedPayment: number,
  userId: string
): Promise<{
  legacyResponse: string;
  reasoningDecision: AffordabilityResult;
  traceId: string;
}> {
  // Run legacy chat
  const legacyResponse = await runLegacyChat(userMessage);

  // Run reasoning engine
  const engine = new ReasoningEngine();
  const result = await engine.reason(userMessage, proposedPayment);

  // Log comparison (don't show to user)
  await logShadowModeComparison(userId, {
    userMessage,
    legacyResponse,
    reasoningDecision: result.decision.decision,
    traceId: result.traceId
  });

  // Return ONLY legacy response to user
  return {
    legacyResponse,
    reasoningDecision: result.decision,
    traceId: result.traceId
  };
}
```

**Commit message:**
```
feat: implement shadow mode for safe comparison
```

**Time:** 1 hour

---

## Commit 10: Trace Viewer

**What:** Debug tool for iteration

**app/api/debug/trace/[id]/route.ts:**
```typescript
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const traceWriter = new TraceLogWriter();
  const trace = await traceWriter.read(params.id);

  if (!trace) {
    return Response.json({ error: "Trace not found" }, { status: 404 });
  }

  return Response.json({
    traceId: trace.traceId,
    timestamp: trace.timestamp,
    profile: trace.profile,
    surplus: trace.surplus,
    decision: trace.decision,
    explanation: trace.explanation
  });
}
```

**Commit message:**
```
feat: implement trace viewer debug endpoint
```

**Time:** 30 minutes

---

## Total Time: ~7 hours

**This is the entire vertical slice.**

One engineer can do this in one day.

---

## After Commit 10: What You Have

✅ Deterministic "Can I afford this?" working end-to-end  
✅ Immutable trace logs for every decision  
✅ Shadow mode comparing vs legacy chat  
✅ Debug tool for iteration  
✅ Claude explanation layer  

**That's enough to prove the concept.**

---

## What NOT to Do

❌ Don't add more fields to profile yet  
❌ Don't implement perfect NLP  
❌ Don't add safety guardrails yet  
❌ Don't implement scenario simulation  
❌ Don't implement missing data orchestration  

**Ship first. Expand later.**

---

## Testing Strategy

After Commit 10, test with:

```
User: "I make $5200 a month, rent is $2200, debt is $400. Can I afford a $700 car payment?"

Expected:
- Profile: income=$5200, housing=$2200, debt=$400
- Surplus: $2600
- Decision: affordable
- Confidence: high
- Remaining: $1900
```

---

## Success Criteria

- [ ] All 10 commits merged
- [ ] No TypeScript errors
- [ ] Trace logs being written
- [ ] Shadow mode running
- [ ] Trace viewer working
- [ ] Claude explanation generating

---

**Status:** Ready to execute  
**Start:** Immediately  
**Target:** All 10 commits in 1 day
