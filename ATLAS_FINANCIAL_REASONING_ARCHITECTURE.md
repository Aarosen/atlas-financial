# Atlas Financial Reasoning Architecture

**Version:** 1.0  
**Status:** Design Specification  
**Date:** 2026-03-10

---

## Executive Summary

Atlas is evolving from a financial chatbot to a **deterministic financial reasoning engine with AI explanation**.

The architecture separates concerns:
- **Deterministic layer** (tools, decisions, calculations) — always correct
- **Explanation layer** (Claude) — conversational, empathetic, but never invents decisions
- **Validation layer** (self-check) — ensures consistency before response

This prevents the three architectural risks:
1. LLM math errors (tools are deterministic)
2. Context packing failures (structured profile, not conversational reconstruction)
3. Shallow advice (decision engine enforces structured reasoning)

---

## System Architecture Overview

```
User Input
    ↓
Context Engine
(extract/validate/structure financial profile)
    ↓
Financial Tools Layer
(deterministic calculations)
    ↓
Decision Engine
(structured financial logic)
    ↓
LLM Explanation Layer
(Claude explains decision already made)
    ↓
Self-Check Layer
(validate consistency)
    ↓
Response to User
```

---

## Layer 1: Structured Context Engine

### Purpose

Replace conversational memory reconstruction with a deterministic, canonical financial profile.

### Financial Profile Schema

```typescript
interface FinancialProfile {
  // Income
  income: {
    gross_monthly: number | null;
    net_monthly: number | null;
    frequency: "monthly" | "biweekly" | "weekly" | null;
    stability: "stable" | "variable" | "unknown";
    source: string | null;
  };

  // Fixed Expenses
  fixed_expenses: {
    rent_or_mortgage: number | null;
    utilities: number | null;
    insurance: number | null;
    debt_payments: number | null;
    other_fixed: number | null;
  };

  // Variable Expenses
  variable_expenses: {
    groceries: number | null;
    transportation: number | null;
    dining_out: number | null;
    entertainment: number | null;
    other_variable: number | null;
  };

  // Debt
  debt: {
    credit_card: {
      balance: number | null;
      interest_rate: number | null;
      min_payment: number | null;
    };
    student_loans: {
      balance: number | null;
      interest_rate: number | null;
      payment: number | null;
    };
    auto_loan: {
      balance: number | null;
      interest_rate: number | null;
      payment: number | null;
    };
    other_debt: {
      balance: number | null;
      interest_rate: number | null;
      payment: number | null;
    };
  };

  // Assets
  assets: {
    emergency_fund: number | null;
    savings: number | null;
    investments: number | null;
    retirement: number | null;
  };

  // Goals
  goals: {
    emergency_fund_target: number | null;
    debt_payoff_timeline: string | null;
    savings_goal: number | null;
    investment_goal: string | null;
  };

  // Metadata
  metadata: {
    risk_tolerance: "conservative" | "moderate" | "aggressive" | null;
    age_range: string | null;
    family_status: string | null;
    employment_stability: "stable" | "unstable" | "unknown";
  };
}
```

### Completeness State

```typescript
interface CompletenessState {
  // Which fields are provided by user
  provided_fields: string[];

  // Which fields are inferred (calculated from others)
  inferred_fields: string[];

  // Which fields are provisional (user said "approximately")
  provisional_fields: string[];

  // Which critical fields are missing
  missing_critical_fields: string[];

  // Confidence score (0-100)
  completeness_score: number;

  // Can we make decisions?
  decision_ready: boolean;
  decision_ready_for: string[]; // which decision types
}
```

### Session State

```typescript
interface SessionState {
  // Current financial profile
  profile: FinancialProfile;

  // Completeness tracking
  completeness: CompletenessState;

  // Conversation history (for context, not for reconstruction)
  conversation_history: Array<{
    timestamp: string;
    user_message: string;
    assistant_response: string;
    decision_made: string | null;
    data_extracted: Partial<FinancialProfile>;
  }>;

  // Decisions made in this session
  decisions_made: Array<{
    decision_type: string;
    timestamp: string;
    inputs_used: string[];
    decision_result: string;
    confidence: number;
  }>;

  // Flags
  flags: {
    has_high_debt: boolean;
    has_emergency_fund: boolean;
    is_cash_flow_negative: boolean;
    has_risky_behavior: boolean;
  };
}
```

### Context Engine Responsibilities

1. **Extract** — Parse user input for financial data
2. **Validate** — Check data types, ranges, consistency
3. **Structure** — Place into canonical profile
4. **Track completeness** — Mark provided/inferred/missing
5. **Detect conflicts** — Flag contradictions with prior data
6. **Infer safely** — Calculate derived metrics only when safe

### Rules

- **Never reconstruct from conversation history** — use structured profile
- **Mark provisional data** — "approximately $2,000" is provisional
- **Track missing data explicitly** — don't guess
- **Detect conflicts** — if user says income changed, update and flag
- **Completeness gates decisions** — some decisions require minimum data

---

## Layer 2: Financial Tools Layer

### Purpose

Move all arithmetic and financial calculations out of the LLM into deterministic, testable functions.

### Tool Set (Phase 1)

#### 1. `calculate_monthly_surplus()`

**Inputs:**
- gross_monthly_income
- fixed_expenses (rent, utilities, insurance, debt payments)
- variable_expenses (groceries, transportation, dining, entertainment)

**Outputs:**
```typescript
{
  gross_income: number;
  total_fixed_expenses: number;
  total_variable_expenses: number;
  total_expenses: number;
  monthly_surplus: number;
  surplus_rate: number; // percentage
  status: "positive" | "negative" | "breakeven";
}
```

**Validation:**
- All inputs must be non-negative
- Income must be > 0
- If surplus is negative, flag as critical

**Failure mode:** If income or expenses are missing, return `null` with required fields list.

---

#### 2. `calculate_emergency_fund_target()`

**Inputs:**
- monthly_expenses (total)
- employment_stability ("stable" | "unstable")
- dependents (count)

**Outputs:**
```typescript
{
  monthly_expenses: number;
  months_recommended: number; // 3-6 based on stability
  target_amount: number;
  current_amount: number;
  shortfall: number;
  status: "healthy" | "low" | "critical";
}
```

**Rules:**
- Stable employment: 3 months
- Unstable employment: 6 months
- Each dependent: +1 month
- Minimum: 3 months

---

#### 3. `calculate_debt_payoff_timeline()`

**Inputs:**
- debt_balance
- interest_rate (annual percentage)
- monthly_payment
- extra_payment (optional)

**Outputs:**
```typescript
{
  debt_balance: number;
  monthly_payment: number;
  interest_rate: number;
  months_to_payoff: number;
  total_interest_paid: number;
  payoff_date: string;
  with_extra_payment: {
    extra_amount: number;
    months_saved: number;
    interest_saved: number;
  };
}
```

**Validation:**
- Monthly payment must be > interest accrual
- If not, return error: "payment too low"

---

#### 4. `check_affordability()`

**Inputs:**
- monthly_surplus
- proposed_expense (new payment)
- emergency_fund_status ("healthy" | "low")
- debt_to_income_ratio

**Outputs:**
```typescript
{
  proposed_expense: number;
  remaining_surplus: number;
  dti_after: number;
  is_affordable: boolean;
  reason: string;
  risk_level: "safe" | "moderate" | "risky" | "dangerous";
}
```

**Rules:**
- Safe: remaining surplus > 10% of income AND dti < 36%
- Moderate: remaining surplus > 5% AND dti < 43%
- Risky: remaining surplus > 0% AND dti < 50%
- Dangerous: remaining surplus ≤ 0% OR dti > 50%

---

#### 5. `compare_debt_vs_invest()`

**Inputs:**
- debt_interest_rate
- expected_investment_return (estimated)
- debt_balance
- available_amount
- risk_tolerance
- emergency_fund_status

**Outputs:**
```typescript
{
  debt_interest_rate: number;
  expected_return: number;
  mathematical_advantage: "debt" | "invest" | "neutral";
  risk_adjusted_recommendation: "debt" | "invest" | "split";
  reasoning: string;
}
```

**Rules:**
- If debt rate > expected return: recommend debt payoff
- If emergency fund < target: recommend savings first
- If debt rate < 5% and fund healthy: can consider investing
- High risk tolerance doesn't override low emergency fund

---

#### 6. `calculate_dti_ratio()`

**Inputs:**
- gross_monthly_income
- total_monthly_debt_payments

**Outputs:**
```typescript
{
  gross_income: number;
  debt_payments: number;
  dti_ratio: number; // percentage
  status: "healthy" | "acceptable" | "concerning" | "critical";
}
```

**Thresholds:**
- < 36%: healthy
- 36-43%: acceptable
- 43-50%: concerning
- > 50%: critical

---

#### 7. `calculate_savings_rate()`

**Inputs:**
- monthly_surplus
- gross_monthly_income

**Outputs:**
```typescript
{
  monthly_surplus: number;
  gross_income: number;
  savings_rate: number; // percentage
  benchmark: number; // typical is 10-20%
  status: "low" | "healthy" | "excellent";
}
```

---

### Tool Contract

Every tool must:
1. **Validate inputs** — return error if missing critical data
2. **Document assumptions** — what did we assume?
3. **Return metadata** — which inputs were used, which were estimated
4. **Fail safely** — never return a guess, return null + required fields
5. **Be testable** — deterministic, no randomness

---

## Layer 3: Decision Engine

### Purpose

Implement structured financial logic that makes decisions before explanation.

### Decision Types (Phase 1)

#### 1. Budgeting Decision

**Required inputs:**
- gross_monthly_income
- fixed_expenses (rent, utilities, insurance, debt payments)
- variable_expenses (groceries, transportation, etc.)

**Optional inputs:**
- savings_goal
- debt_payoff_goal

**Decision logic:**

```
1. Calculate monthly_surplus
2. If surplus < 0:
   → Decision: "Spending exceeds income"
   → Action: Identify cuts needed
   → Defer: Ask which expenses are flexible

3. If surplus > 0:
   → Calculate emergency_fund_status
   → If emergency fund < target:
      → Decision: "Build emergency fund first"
      → Action: Allocate surplus to emergency fund
   → Else if has high-interest debt:
      → Decision: "Prioritize debt payoff"
      → Action: Allocate surplus to debt
   → Else:
      → Decision: "Balanced approach"
      → Action: Split surplus (savings + investing)
```

**Minimum viable decision:**
- Surplus/deficit status
- If deficit: which expenses to cut
- If surplus: where to allocate

**When to defer:**
- If variable expenses are estimates: "Can you track actual spending for 2 weeks?"
- If income is unstable: "What's your minimum monthly income?"

**What NOT to do:**
- Don't recommend cutting essentials
- Don't suggest aggressive investing if cash flow is negative
- Don't ignore debt when surplus is small

---

#### 2. Emergency Fund Decision

**Required inputs:**
- monthly_expenses
- employment_stability
- current_emergency_fund

**Optional inputs:**
- dependents
- health_status

**Decision logic:**

```
1. Calculate emergency_fund_target
2. If current < target:
   → Calculate shortfall
   → If shortfall < 1 month expenses:
      → Decision: "Almost there"
      → Action: Allocate next $X to complete
   → Else if shortfall < 3 month expenses:
      → Decision: "Build emergency fund"
      → Action: Allocate surplus to fund
   → Else:
      → Decision: "Emergency fund is critical"
      → Action: Prioritize fund over other goals
3. Else:
   → Decision: "Emergency fund is healthy"
   → Action: Can allocate surplus to other goals
```

**Minimum viable decision:**
- Current status (healthy/low/critical)
- Target amount
- Monthly allocation needed

**When to defer:**
- If employment stability unknown: "Is your job stable?"
- If expenses are estimates: "What's your actual monthly spending?"

**What NOT to do:**
- Don't recommend investing before emergency fund is complete
- Don't suggest emergency fund > 12 months (unless very unstable employment)

---

#### 3. Affordability Decision

**Required inputs:**
- monthly_surplus
- proposed_expense (e.g., car payment, apartment upgrade)
- emergency_fund_status

**Optional inputs:**
- debt_to_income_ratio
- risk_tolerance

**Decision logic:**

```
1. Check if emergency fund is healthy
   → If not: Decision: "Build emergency fund first"
   → Defer: "Can you wait 3 months?"

2. Calculate remaining_surplus after proposed expense
3. If remaining_surplus < 5% of income:
   → Decision: "Too risky"
   → Reason: "No buffer for unexpected expenses"
   → Action: Suggest lower amount or wait

4. If remaining_surplus > 10% of income:
   → Decision: "Affordable"
   → Action: Proceed

5. Else (5-10% range):
   → Decision: "Affordable but tight"
   → Action: Proceed with caution, build buffer first
```

**Minimum viable decision:**
- Yes/No/Maybe
- Remaining buffer
- Risk level

**When to defer:**
- If emergency fund is low: "Build emergency fund first"
- If income is unstable: "Wait until income is stable"

**What NOT to do:**
- Don't approve if it eliminates emergency fund
- Don't approve if it creates negative cash flow
- Don't ignore existing debt obligations

---

#### 4. Debt Prioritization Decision

**Required inputs:**
- List of debts (balance, interest rate, payment)
- monthly_surplus

**Optional inputs:**
- emergency_fund_status
- savings_goals

**Decision logic:**

```
1. If emergency_fund < target:
   → Decision: "Build emergency fund first"
   → Action: Allocate surplus to fund, not debt

2. Rank debts by interest rate (highest first)
3. If highest rate > 12%:
   → Decision: "Aggressive debt payoff"
   → Action: Attack highest-rate debt first
   → Calculate payoff timeline

4. Else if highest rate > 6%:
   → Decision: "Balanced approach"
   → Action: Pay minimums, allocate extra to highest rate

5. Else:
   → Decision: "Low-interest debt"
   → Action: Can consider investing instead
   → Use debt_vs_invest logic
```

**Minimum viable decision:**
- Which debt to prioritize
- Payoff timeline
- Monthly allocation

**When to defer:**
- If emergency fund is critical: "Build fund first"
- If income is unstable: "Stabilize income first"

**What NOT to do:**
- Don't ignore high-interest debt (>15%)
- Don't recommend aggressive payoff if it eliminates emergency fund
- Don't ignore minimum payments

---

#### 5. Debt vs Investing Decision

**Required inputs:**
- debt_interest_rate
- expected_investment_return (estimated)
- emergency_fund_status

**Optional inputs:**
- risk_tolerance
- investment_timeline

**Decision logic:**

```
1. If emergency_fund < target:
   → Decision: "Build emergency fund first"
   → Defer: "Can you wait?"

2. If debt_interest_rate > 10%:
   → Decision: "Pay off debt first"
   → Reason: "Guaranteed return beats uncertain investing"

3. Else if debt_interest_rate > expected_return:
   → Decision: "Pay off debt first"
   → Reason: "Debt payoff is better return"

4. Else if risk_tolerance = "conservative":
   → Decision: "Pay off debt first"
   → Reason: "Debt payoff is more certain"

5. Else:
   → Decision: "Can consider investing"
   → Action: Split allocation (debt + investing)
```

**Minimum viable decision:**
- Debt payoff vs investing
- Allocation split
- Reasoning

**When to defer:**
- If emergency fund is low: "Build fund first"
- If expected return is unknown: "What's your investment timeline?"

**What NOT to do:**
- Don't recommend investing if emergency fund is incomplete
- Don't ignore high-interest debt
- Don't oversimplify the decision (show the math)

---

### Decision Engine Rules

1. **Emergency fund is a blocker** — most decisions defer if fund is incomplete
2. **Negative cash flow is a blocker** — can't invest or save if spending > income
3. **High-interest debt is urgent** — >12% should be priority
4. **Risk tolerance matters** — but doesn't override safety rules
5. **Always ask one more question** — if critical data is missing, don't guess

---

## Layer 4: LLM Explanation Layer

### Purpose

Claude explains decisions already made by the deterministic layer. Never invents decisions.

### Prompt Contract

```
You are Atlas, a financial reasoning system that explains financial decisions.

CRITICAL RULES:
1. You explain decisions already made by the decision engine
2. You never invent new decisions or recommendations
3. You never perform calculations (tools already did)
4. You never contradict the decision provided
5. You acknowledge missing data explicitly
6. You are warm, empathetic, and clear—but never vague

INPUT YOU RECEIVE:
- decision_type: string (e.g., "budgeting", "affordability")
- decision_result: string (e.g., "affordable", "too risky")
- reasoning: string (e.g., "remaining surplus is 8% of income")
- financial_profile: FinancialProfile (structured data)
- tools_output: object (calculation results)

YOUR JOB:
1. Acknowledge the user's situation with empathy
2. Explain the decision clearly
3. Show the math (reference tool outputs)
4. Explain the reasoning
5. Suggest next steps
6. Ask clarifying questions if needed

FORBIDDEN:
- Do not suggest a different decision than provided
- Do not perform calculations
- Do not make assumptions about missing data
- Do not use vague language like "might" or "could"
- Do not contradict the decision engine's logic

EXAMPLE:

User: "Can I afford a $500 car payment?"

Decision engine output:
{
  decision: "too_risky",
  remaining_surplus: 2%,
  reason: "remaining_surplus_too_low"
}

Your response:
"Based on your income of $5,200 and current expenses of $5,100, you'd have only $100 left after a $500 car payment. That's 2% of your income—not enough for unexpected expenses.

Here's what I'd suggest:
1. Build your emergency fund to $15,600 (3 months of expenses)
2. Then revisit this decision—you might have more breathing room

Or: Could you reduce other expenses first? If you cut $200/month elsewhere, a $500 payment becomes more manageable."

NOT: "You might be able to afford it if you're careful" (vague)
NOT: "Let me calculate..." (tools already did)
NOT: "I think you should wait" (contradicts decision engine)
```

### Explanation Templates

#### Budgeting Decision

```
"Your income is $X and expenses are $Y, leaving a surplus of $Z per month.

[If surplus < 0]
"You're spending more than you earn. Here's where we can cut:
- [highest variable expense]: $X/month
- [second highest]: $Y/month
Which of these can you reduce?"

[If surplus > 0]
"You have $Z to allocate. Here's my recommendation:
1. [Priority 1]: [amount]
2. [Priority 2]: [amount]
3. [Priority 3]: [amount]

This is based on [reasoning from decision engine]."
```

#### Affordability Decision

```
"Let's check if a $X payment is affordable.

Your current surplus: $Y/month
After the payment: $Z/month (Z% of income)

[If affordable]
"This is manageable. You'd still have $Z for emergencies and other goals."

[If too risky]
"This is too tight. You'd have only $Z left—not enough for unexpected expenses. I'd suggest:
1. [Option 1]
2. [Option 2]"
```

### Style Rules

- **Be specific** — use actual numbers from the profile
- **Show the math** — reference tool outputs
- **Acknowledge constraints** — "You have $X, not $Y"
- **Offer alternatives** — "Or you could..."
- **Be warm** — "I know this isn't what you wanted to hear, but..."
- **Never hedge** — "definitely" not "might"

---

## Layer 5: Self-Check / Consistency Layer

### Purpose

Before response, validate that explanation matches decision and no contradictions exist.

### Checks

```typescript
interface SelfCheckValidation {
  checks: Array<{
    name: string;
    passed: boolean;
    error?: string;
  }>;
  overall_pass: boolean;
  issues: string[];
}
```

#### Check 1: Decision Consistency

```
Verify:
- Explanation recommends the decision (not contradicts it)
- Numbers in explanation match tool outputs
- Reasoning matches decision engine logic
```

#### Check 2: Math Accuracy

```
Verify:
- All calculations reference tool outputs
- No manual math in explanation
- Numbers are consistent throughout response
```

#### Check 3: Missing Data Handling

```
Verify:
- If data is missing, explanation acknowledges it
- No assumptions made about missing data
- Asks for data instead of guessing
```

#### Check 4: Safety Rules

```
Verify:
- No recommendation to eliminate emergency fund
- No recommendation to spend more than income
- No risky advice without explicit acknowledgment
- High-interest debt is prioritized
```

#### Check 5: Tone Consistency

```
Verify:
- Tone matches decision (serious if risky, encouraging if positive)
- No contradictions in emotional tone
- Empathy is genuine, not dismissive
```

### Failure Handling

If any check fails:
- **Don't send response** — flag for human review
- **Log the issue** — for eval system
- **Return safe fallback** — "Let me reconsider this..."

---

## Layer 6: Integration with Eval System

### Eval Coverage

#### Tool Correctness Evals

```
Test each financial tool:
- calculate_monthly_surplus: edge cases, negative values, missing inputs
- calculate_emergency_fund_target: different employment statuses
- calculate_debt_payoff_timeline: various interest rates and payments
- check_affordability: boundary conditions (5%, 10%, 15% surplus)
- compare_debt_vs_invest: different rate scenarios
- calculate_dti_ratio: threshold conditions
- calculate_savings_rate: benchmarking
```

#### Decision Correctness Evals

```
Test each decision type:
- Budgeting: positive surplus, negative surplus, edge cases
- Emergency fund: low, medium, high fund status
- Affordability: safe, moderate, risky, dangerous scenarios
- Debt prioritization: single debt, multiple debts, mixed rates
- Debt vs investing: different rate scenarios, risk tolerances
```

#### Context Completeness Evals

```
Test context engine:
- Extraction: can it parse user input correctly?
- Validation: does it catch inconsistencies?
- Completeness: does it track missing data?
- Conflict detection: does it flag contradictions?
```

#### Explanation Consistency Evals

```
Test LLM layer:
- Does explanation match decision?
- Are numbers accurate?
- Does it show the math?
- Does it acknowledge missing data?
- Is tone appropriate?
```

#### Self-Check Validation Evals

```
Test validation layer:
- Does it catch math errors?
- Does it catch contradictions?
- Does it enforce safety rules?
- Does it flag missing data?
```

### Governance Integration

**Release gate:**
- All tool correctness evals must pass
- All decision correctness evals must pass
- Explanation consistency score > 95%
- Self-check validation 100% pass rate

**Monitoring:**
- Tool output variance (should be zero)
- Decision consistency (should be 100%)
- Explanation accuracy (should be >99%)

---

## Phased Rollout Plan

### Phase 1: Deterministic Calculations + Structured Context (4 weeks)

**Goal:** Get numbers right

**Build:**
1. Financial profile schema
2. Context engine (extraction, validation, structuring)
3. Financial tools (all 7 tools)
4. Tool tests (100% coverage)

**Validate:**
- Tool outputs match manual calculations
- Context engine correctly structures data
- No calculation errors in production

**Evals:**
- Tool correctness evals (all pass)
- Context completeness evals (all pass)

**Release gate:** Tool correctness 100%

---

### Phase 2: Decision Engine (4 weeks)

**Goal:** Make structured decisions

**Build:**
1. Decision engine for all 5 decision types
2. Decision logic (trees, rules, precedence)
3. Decision tests (100% coverage)

**Validate:**
- Decisions follow documented logic
- Edge cases handled correctly
- Blocking conditions enforced

**Evals:**
- Decision correctness evals (all pass)
- Edge case evals (all pass)

**Release gate:** Decision correctness 100%

---

### Phase 3: LLM Explanation + Self-Check (3 weeks)

**Goal:** Explain decisions safely

**Build:**
1. LLM explanation layer (prompt contract)
2. Self-check validation layer
3. Explanation tests (100% coverage)

**Validate:**
- Explanations match decisions
- Math is accurate
- Safety rules enforced
- Tone is appropriate

**Evals:**
- Explanation consistency evals (>95%)
- Self-check validation evals (100%)

**Release gate:** Explanation consistency >95%

---

### Phase 4: Governance + Release Integration (2 weeks)

**Goal:** Tight coupling with eval system

**Build:**
1. Governance gates (release decision logic)
2. Monitoring dashboards
3. Escalation rules

**Validate:**
- Release gates work correctly
- Monitoring detects issues
- Escalations trigger appropriately

**Evals:**
- All evals integrated into release gate
- Governance thresholds enforced

**Release gate:** All evals pass + governance gates active

---

## Data Contracts

### Context Engine → Tools

```typescript
interface ToolInput {
  // All inputs are either:
  // - number (validated, non-null)
  // - null (missing, tool must handle)
  
  gross_monthly_income: number | null;
  fixed_expenses: number | null;
  variable_expenses: number | null;
  debt_balance: number | null;
  interest_rate: number | null;
  // ... etc
  
  // Metadata
  data_quality: "complete" | "partial" | "sparse";
  missing_fields: string[];
}
```

### Tools → Decision Engine

```typescript
interface ToolOutput {
  // Result
  result: any; // tool-specific
  
  // Metadata
  inputs_used: string[];
  assumptions_made: string[];
  confidence: number; // 0-100
  
  // Error handling
  success: boolean;
  error?: string;
  required_for_decision?: string[];
}
```

### Decision Engine → LLM Layer

```typescript
interface DecisionOutput {
  decision_type: string;
  decision_result: string; // "yes", "no", "maybe", "defer"
  reasoning: string;
  confidence: number;
  next_steps: string[];
  missing_data: string[];
  
  // For explanation layer
  tool_outputs: Record<string, ToolOutput>;
  financial_profile: FinancialProfile;
}
```

### LLM Layer → Self-Check

```typescript
interface ExplanationOutput {
  explanation: string;
  decision_referenced: string;
  numbers_used: Record<string, number>;
  assumptions_stated: string[];
  safety_rules_followed: boolean;
}
```

---

## Implementation Guide

### File Structure

```
src/
  lib/
    reasoning/
      context/
        FinancialProfile.ts
        ContextEngine.ts
        CompletenessState.ts
      
      tools/
        CalculateMonthly Surplus.ts
        CalculateEmergencyFundTarget.ts
        CalculateDebtPayoffTimeline.ts
        CheckAffordability.ts
        CompareDebtVsInvest.ts
        CalculateDTIRatio.ts
        CalculateSavingsRate.ts
        ToolRegistry.ts
      
      decisions/
        BudgetingDecision.ts
        EmergencyFundDecision.ts
        AffordabilityDecision.ts
        DebtPrioritizationDecision.ts
        DebtVsInvestDecision.ts
        DecisionEngine.ts
      
      explanation/
        ExplanationPrompt.ts
        ExplanationFormatter.ts
      
      validation/
        SelfCheckValidator.ts
        ConsistencyChecker.ts
      
      reasoning.ts (main orchestrator)
```

### Key Classes

```typescript
// Main orchestrator
class FinancialReasoningEngine {
  contextEngine: ContextEngine;
  toolRegistry: ToolRegistry;
  decisionEngine: DecisionEngine;
  explanationLayer: ExplanationLayer;
  selfCheck: SelfCheckValidator;
  
  async reason(userMessage: string, sessionState: SessionState): Promise<Response> {
    // 1. Extract and structure context
    const updatedProfile = await this.contextEngine.process(userMessage, sessionState);
    
    // 2. Run relevant tools
    const toolOutputs = await this.toolRegistry.runRelevantTools(updatedProfile);
    
    // 3. Make decision
    const decision = await this.decisionEngine.decide(updatedProfile, toolOutputs);
    
    // 4. Generate explanation
    const explanation = await this.explanationLayer.explain(decision, updatedProfile, toolOutputs);
    
    // 5. Validate consistency
    const validation = await this.selfCheck.validate(explanation, decision, toolOutputs);
    
    if (!validation.overall_pass) {
      return { error: "Validation failed", issues: validation.issues };
    }
    
    return { explanation, decision, toolOutputs };
  }
}
```

---

## Success Metrics

### Phase 1
- Tool output variance: 0%
- Calculation accuracy: 100%
- Context completeness: >95%

### Phase 2
- Decision consistency: 100%
- Edge case handling: 100%
- Decision correctness evals: 100% pass

### Phase 3
- Explanation consistency: >95%
- Self-check validation: 100% pass
- Safety rules: 100% enforced

### Phase 4
- Release gate pass rate: >95%
- Production errors: <0.1%
- User satisfaction: >4.5/5

---

## Risk Mitigation

### Risk: Tools are incomplete

**Mitigation:**
- Start with 7 core tools
- Add more tools incrementally
- Each tool must have 100% test coverage

### Risk: Decision logic is wrong

**Mitigation:**
- Validate against CFP best practices
- Get expert review before Phase 2
- Test with real user scenarios

### Risk: LLM contradicts decision engine

**Mitigation:**
- Strict prompt contract
- Self-check validation catches contradictions
- Fail-safe: don't send response if validation fails

### Risk: Context engine loses data

**Mitigation:**
- Structured profile is source of truth
- Never reconstruct from conversation
- Completeness tracking prevents silent data loss

---

## Conclusion

This architecture transforms Atlas from a chatbot into a deterministic financial reasoning system. The LLM becomes the explanation layer, not the decision maker.

**Key benefits:**
- ✅ Calculations are always correct (tools are deterministic)
- ✅ Decisions are structured and defensible (decision engine)
- ✅ Context is never lost (structured profile)
- ✅ Explanations are consistent (self-check validation)
- ✅ Safety rules are enforced (validation layer)

**Timeline:** 13 weeks to full implementation

**Next step:** Begin Phase 1 implementation
