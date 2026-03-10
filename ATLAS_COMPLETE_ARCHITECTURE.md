# Atlas Complete Financial Reasoning Architecture

**Version:** 1.0  
**Status:** Final Specification  
**Date:** 2026-03-10

---

## Complete System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER INPUT                                         │
│                    "Can I afford a $700 car payment?"                        │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LAYER 1: CONTEXT EXTRACTION                              │
│                                                                              │
│  • Parse raw user input                                                     │
│  • Extract financial data                                                   │
│  • Normalize to canonical units (monthly USD, APR, etc.)                   │
│  • Identify frequency (monthly/annual/biweekly)                            │
│  • Detect gross vs net income                                              │
│                                                                              │
│  Output: Extracted fields with raw values                                  │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              LAYER 2: DATA RELIABILITY LAYER                                │
│                                                                              │
│  • Estimate confidence scores (0-100)                                       │
│  • Detect provisional/estimate data                                        │
│  • Flag contradictions with existing profile                               │
│  • Detect implausible values                                               │
│  • Calculate overall data quality score                                    │
│  • Merge safely with existing profile                                      │
│                                                                              │
│  Output: Reliable, confidence-scored fields ready for decisions            │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│         LAYER 3: CANONICAL FINANCIAL PROFILE                               │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │ Income Section                                                   │      │
│  │  • gross_monthly_income (value, source, confidence, provisional)│      │
│  │  • net_monthly_income                                           │      │
│  │  • income_stability (stable/variable/unstable)                 │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │ Expense Section                                                  │      │
│  │  • fixed_expenses (rent, utilities, insurance, debt, other)     │      │
│  │  • variable_expenses (groceries, transport, dining, etc.)       │      │
│  │  • Each with: value, source, confidence, provisional flag      │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │ Debt Section                                                     │      │
│  │  • credit_card (balance, rate, payment)                         │      │
│  │  • student_loans (balance, rate, payment)                       │      │
│  │  • auto_loan (balance, rate, payment)                           │      │
│  │  • other_debt (balance, rate, payment)                          │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │ Assets Section                                                   │      │
│  │  • emergency_fund (value, confidence)                           │      │
│  │  • savings (value, confidence)                                  │      │
│  │  • investments (value, confidence)                              │      │
│  │  • retirement (value, confidence)                               │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │ Goals Section                                                    │      │
│  │  • emergency_fund_target                                        │      │
│  │  • debt_payoff_timeline                                         │      │
│  │  • savings_goal                                                 │      │
│  │  • investment_goal                                              │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │ Completeness Tracking                                            │      │
│  │  • provided_fields (user explicitly gave)                       │      │
│  │  • inferred_fields (calculated from others)                     │      │
│  │  • provisional_fields (marked as estimates)                     │      │
│  │  • missing_critical_fields (blocking decisions)                 │      │
│  │  • completeness_score (0-100)                                   │      │
│  │  • decision_ready (boolean)                                     │      │
│  │  • decision_ready_for (which decision types)                    │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  This is the SINGLE SOURCE OF TRUTH for all user financial data            │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│        LAYER 4: MISSING DATA ORCHESTRATION                                 │
│                                                                              │
│  • Check which critical fields are missing                                  │
│  • Determine next question to ask (priority-ordered)                       │
│  • Decide if decision can be made or if more data needed                   │
│                                                                              │
│  Priority Maps (by decision type):                                         │
│    • Budgeting: income → rent → debt → variable expenses                  │
│    • Affordability: income → rent → debt → emergency fund                 │
│    • Emergency Fund: income → rent → emergency fund → stability            │
│    • Debt Prioritization: debts → income → emergency fund                 │
│    • Debt vs Invest: income → debts → emergency fund → stability          │
│                                                                              │
│  Output: Next question to ask, or "ready to decide"                       │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
          If missing data:              If data complete:
          Ask next question              Continue to Layer 5
                    │                         │
                    └────────────┬────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              LAYER 5: FINANCIAL TOOLS LAYER                                │
│                                                                              │
│  Deterministic, testable functions (no LLM):                              │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │ calculate_monthly_surplus()                                      │      │
│  │  Input: income, fixed expenses, variable expenses               │      │
│  │  Output: surplus, deficit, status                               │      │
│  │  Validation: All inputs must be non-negative                    │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │ calculate_emergency_fund_target()                                │      │
│  │  Input: monthly expenses, employment stability, dependents      │      │
│  │  Output: target amount, shortfall, status                       │      │
│  │  Rules: 3 months stable, 6 months unstable, +1 per dependent   │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │ calculate_debt_payoff_timeline()                                 │      │
│  │  Input: balance, interest rate, monthly payment                 │      │
│  │  Output: months to payoff, total interest, payoff date          │      │
│  │  Validation: Payment must exceed interest accrual               │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │ check_affordability()                                            │      │
│  │  Input: surplus, proposed expense, emergency fund, DTI          │      │
│  │  Output: affordable (yes/no), risk level, reason                │      │
│  │  Rules: Safe if surplus > 10%, Risky if surplus < 5%           │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │ compare_debt_vs_invest()                                         │      │
│  │  Input: debt rate, expected return, emergency fund status       │      │
│  │  Output: recommendation (debt/invest/split), reasoning          │      │
│  │  Rules: Debt rate > return → pay debt; low fund → save first   │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │ calculate_dti_ratio()                                            │      │
│  │  Input: gross income, total debt payments                       │      │
│  │  Output: DTI ratio, status (healthy/concerning/critical)        │      │
│  │  Thresholds: <36% healthy, 36-43% acceptable, >50% critical   │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │ calculate_savings_rate()                                         │      │
│  │  Input: surplus, gross income                                   │      │
│  │  Output: savings rate %, benchmark comparison, status           │      │
│  │  Benchmark: 10-20% is healthy                                   │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  All tools are:                                                            │
│    • Deterministic (same input → same output)                             │
│    • Testable (100% coverage)                                             │
│    • Fail-safe (return null + required fields if missing data)            │
│    • Documented (assumptions, validation rules)                           │
│                                                                              │
│  Output: Tool results with confidence scores and assumptions              │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              LAYER 6: DECISION ENGINE                                       │
│                                                                              │
│  Structured financial logic (no LLM):                                      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │ BUDGETING DECISION                                               │      │
│  │                                                                  │      │
│  │ 1. Calculate monthly_surplus                                    │      │
│  │ 2. If surplus < 0:                                              │      │
│  │    → Decision: "Spending exceeds income"                        │      │
│  │    → Action: Identify cuts needed                               │      │
│  │ 3. If surplus > 0:                                              │      │
│  │    → Calculate emergency_fund_status                            │      │
│  │    → If fund < target:                                          │      │
│  │       Decision: "Build emergency fund first"                    │      │
│  │    → Else if has high-interest debt:                            │      │
│  │       Decision: "Prioritize debt payoff"                        │      │
│  │    → Else:                                                      │      │
│  │       Decision: "Balanced approach"                             │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │ AFFORDABILITY DECISION                                           │      │
│  │                                                                  │      │
│  │ 1. Check if emergency_fund < target:                            │      │
│  │    → Decision: "Build emergency fund first"                     │      │
│  │ 2. Calculate remaining_surplus after proposed expense           │      │
│  │ 3. If remaining < 5% of income:                                 │      │
│  │    → Decision: "Too risky"                                      │      │
│  │ 4. If remaining > 10% of income:                                │      │
│  │    → Decision: "Affordable"                                     │      │
│  │ 5. Else (5-10% range):                                          │      │
│  │    → Decision: "Affordable but tight"                           │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │ EMERGENCY FUND DECISION                                          │      │
│  │                                                                  │      │
│  │ 1. Calculate emergency_fund_target                              │      │
│  │ 2. If current < target:                                         │      │
│  │    → Calculate shortfall                                        │      │
│  │    → Decision: "Build emergency fund"                           │      │
│  │    → Action: Allocate surplus to fund                           │      │
│  │ 3. Else:                                                        │      │
│  │    → Decision: "Emergency fund is healthy"                      │      │
│  │    → Action: Allocate surplus to other goals                    │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │ DEBT PRIORITIZATION DECISION                                     │      │
│  │                                                                  │      │
│  │ 1. If emergency_fund < target:                                  │      │
│  │    → Decision: "Build emergency fund first"                     │      │
│  │ 2. Rank debts by interest rate (highest first)                  │      │
│  │ 3. If highest rate > 12%:                                       │      │
│  │    → Decision: "Aggressive debt payoff"                         │      │
│  │    → Action: Attack highest-rate debt first                     │      │
│  │ 4. Else if highest rate > 6%:                                   │      │
│  │    → Decision: "Balanced approach"                              │      │
│  │    → Action: Pay minimums, allocate extra to highest rate       │      │
│  │ 5. Else:                                                        │      │
│  │    → Decision: "Low-interest debt"                              │      │
│  │    → Action: Can consider investing instead                     │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐      │
│  │ DEBT VS INVESTING DECISION                                       │      │
│  │                                                                  │      │
│  │ 1. If emergency_fund < target:                                  │      │
│  │    → Decision: "Build emergency fund first"                     │      │
│  │ 2. If debt_rate > 10%:                                          │      │
│  │    → Decision: "Pay off debt first"                             │      │
│  │ 3. Else if debt_rate > expected_return:                         │      │
│  │    → Decision: "Pay off debt first"                             │      │
│  │ 4. Else if risk_tolerance = "conservative":                     │      │
│  │    → Decision: "Pay off debt first"                             │      │
│  │ 5. Else:                                                        │      │
│  │    → Decision: "Can consider investing"                         │      │
│  │    → Action: Split allocation (debt + investing)                │      │
│  └──────────────────────────────────────────────────────────────────┘      │
│                                                                              │
│  Output: Decision result + reasoning + next steps                          │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│           LAYER 7: SCENARIO SIMULATION ENGINE                              │
│                                                                              │
│  Generate alternative scenarios to show tradeoffs:                         │
│                                                                              │
│  • Clone base profile safely                                               │
│  • Apply modifications (income change, expense change, etc.)              │
│  • Recalculate all tools on projected profile                            │
│  • Calculate impacts (monthly, timeline, risk)                           │
│  • Compare scenarios side-by-side                                        │
│                                                                              │
│  Example: "Can I afford a $700 car payment?"                             │
│                                                                              │
│  Scenario A: $700 payment now                                            │
│    Remaining surplus: $1,100 (6.1% of income)                            │
│    Risk: Safe (but tight)                                                │
│                                                                              │
│  Scenario B: $450 payment now                                            │
│    Remaining surplus: $1,350 (7.7% of income)                            │
│    Risk: Safe (comfortable)                                              │
│                                                                              │
│  Scenario C: Wait 6 months, save $3,000                                  │
│    Then: $550 payment                                                    │
│    Remaining surplus: $1,250 (7.1% of income)                            │
│    Risk: Safe (best terms)                                               │
│                                                                              │
│  Output: Scenario results with comparisons                               │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│           LAYER 8: LLM EXPLANATION LAYER                                   │
│                                                                              │
│  Claude explains decisions already made (never invents):                   │
│                                                                              │
│  Input from Decision Engine:                                              │
│    • decision_result: "yes" / "no" / "maybe" / "defer"                   │
│    • reasoning: structured explanation of logic                          │
│    • tool_outputs: all calculations                                      │
│    • scenarios: alternative options                                      │
│                                                                              │
│  Prompt Contract:                                                         │
│    1. Explain the decision clearly                                        │
│    2. Show the math (reference tool outputs)                             │
│    3. Explain the reasoning                                              │
│    4. Suggest next steps                                                 │
│    5. NEVER invent new decisions                                         │
│    6. NEVER perform calculations                                         │
│    7. NEVER contradict the decision engine                               │
│    8. NEVER make assumptions about missing data                          │
│                                                                              │
│  Example Output:                                                          │
│    "Yes, a $700 car payment is affordable.                               │
│                                                                              │
│     Your monthly income is $5,200. After your current expenses            │
│     ($3,200), you have $2,000 left over. A $700 payment would            │
│     leave you $1,300/month, which is 6.2% of your income—a safe level.  │
│                                                                              │
│     However, I notice your emergency fund is $8,000, and ideally         │
│     it should be $13,200. I'd recommend:                                 │
│     1. Build emergency fund to $13,200 (6 months)                        │
│     2. Then comfortably afford the $700 payment                          │
│                                                                              │
│     Or consider a $450 payment instead, which leaves more breathing      │
│     room."                                                                │
│                                                                              │
│  Output: Natural language explanation                                    │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│           LAYER 9: SELF-CHECK / CONSISTENCY LAYER                          │
│                                                                              │
│  Before response, validate:                                               │
│                                                                              │
│  ✓ Decision Consistency                                                   │
│    → Explanation recommends the decision (not contradicts)               │
│    → Numbers match tool outputs                                          │
│    → Reasoning matches decision engine logic                             │
│                                                                              │
│  ✓ Math Accuracy                                                          │
│    → All calculations reference tool outputs                             │
│    → No manual math in explanation                                       │
│    → Numbers consistent throughout                                       │
│                                                                              │
│  ✓ Missing Data Handling                                                  │
│    → If data missing, explanation acknowledges it                        │
│    → No assumptions made about missing data                              │
│    → Asks for data instead of guessing                                   │
│                                                                              │
│  ✓ Safety Rules                                                           │
│    → No recommendation to eliminate emergency fund                       │
│    → No recommendation to spend more than income                         │
│    → No risky advice without explicit acknowledgment                     │
│    → High-interest debt is prioritized                                   │
│                                                                              │
│  ✓ Tone Consistency                                                       │
│    → Tone matches decision (serious if risky, encouraging if positive)  │
│    → No contradictions in emotional tone                                 │
│    → Empathy is genuine, not dismissive                                  │
│                                                                              │
│  If any check fails:                                                      │
│    → DO NOT send response                                                │
│    → Flag for human review                                               │
│    → Log the issue for eval system                                       │
│    → Return safe fallback: "Let me reconsider this..."                   │
│                                                                              │
│  Output: Validated response or error flag                                │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│           LAYER 10: DECISION TRACE LOG                                     │
│                                                                              │
│  Record everything for auditability:                                      │
│                                                                              │
│  • Input state (user message, profile, completeness)                      │
│  • Processing (data reliability, missing data, tool outputs)              │
│  • Decision logic (rules triggered, decision path, blocking conditions)   │
│  • Explanation (text, structure, consistency checks)                      │
│  • Scenarios (if generated)                                               │
│  • Validation (self-check results)                                        │
│  • Metadata (model, latency, tokens)                                      │
│                                                                              │
│  Enables:                                                                 │
│    • Debugging (why did Atlas recommend X?)                              │
│    • Eval verification (did decision engine work correctly?)             │
│    • Compliance (prove decision was sound)                               │
│    • Learning (analyze patterns in decisions)                            │
│                                                                              │
│  Output: Append-only trace log (JSONL format)                            │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RESPONSE TO USER                                    │
│                                                                              │
│  "Yes, a $700 car payment is affordable. Here's why:                      │
│                                                                              │
│   Your monthly income is $5,200. After your current expenses              │
│   ($3,200), you have $2,000 left over. A $700 payment would              │
│   leave you $1,300/month, which is 6.2% of your income—a safe level.    │
│                                                                              │
│   However, I notice your emergency fund is $8,000, and ideally           │
│   it should be $13,200. I'd recommend:                                   │
│   1. Build emergency fund to $13,200 (6 months)                          │
│   2. Then comfortably afford the $700 payment                            │
│                                                                              │
│   Or consider a $450 payment instead, which leaves more breathing        │
│   room."                                                                  │
│                                                                              │
│  Plus: Scenario comparison table showing alternatives                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Summary

### Happy Path (Complete Data)

```
User Input
    ↓
Context Extraction (parse raw input)
    ↓
Data Reliability Layer (confidence scoring, conflict detection)
    ↓
Financial Profile (canonical, reliable state)
    ↓
Missing Data Orchestration (check: all needed data present?)
    ↓
Financial Tools (deterministic calculations)
    ↓
Decision Engine (structured financial logic)
    ↓
Scenario Simulation (show alternatives)
    ↓
LLM Explanation (Claude explains decision)
    ↓
Self-Check Validation (verify consistency)
    ↓
Decision Trace Log (audit trail)
    ↓
Response to User
```

### Data Missing Path

```
User Input
    ↓
Context Extraction
    ↓
Data Reliability Layer
    ↓
Financial Profile
    ↓
Missing Data Orchestration (missing blocking field detected)
    ↓
Ask Next Question (priority-ordered)
    ↓
User Provides More Data
    ↓
[Loop back to Context Extraction]
```

---

## Key Architectural Principles

### 1. Separation of Concerns

- **Deterministic layer** (tools, decisions) — always correct
- **Explanation layer** (Claude) — conversational, but never invents
- **Validation layer** (self-check) — ensures consistency

### 2. Single Source of Truth

- Financial Profile is canonical
- Never reconstruct from conversation
- All decisions reference the profile

### 3. Fail-Safe Design

- Tools return null + required fields if data missing
- Self-check prevents bad responses
- Decision trace logs everything for debugging

### 4. Transparency

- Every decision is traceable
- Every number is sourced
- Every assumption is documented

### 5. Confidence-Aware

- Every field has confidence score (0-100)
- Decisions account for data quality
- Users know when data is provisional

---

## Integration with Eval System

The architecture feeds directly into the eval system:

```
Financial Reasoning Architecture
    ↓
Decision Trace Logs (machine-readable audit trail)
    ↓
Eval System
    ├─ Tool Correctness Evals (verify calculations)
    ├─ Decision Correctness Evals (verify logic)
    ├─ Context Completeness Evals (verify data handling)
    ├─ Explanation Consistency Evals (verify LLM output)
    └─ Self-Check Validation Evals (verify safety)
    ↓
Governance Thresholds
    ↓
Release Readiness Dashboard
```

---

## Implementation Roadmap

### Phase 1: Deterministic Calculations + Structured Context (4 weeks)

- Build Financial Profile schema
- Implement Context Extraction
- Implement Data Reliability Layer
- Build all 7 Financial Tools
- 100% test coverage

### Phase 2: Decision Engine (4 weeks)

- Implement all 5 decision types
- Build Missing Data Orchestration
- Decision logic tests
- Edge case handling

### Phase 3: LLM Explanation + Self-Check (3 weeks)

- Implement LLM explanation layer
- Build Self-Check validation
- Explanation consistency tests
- Tone and safety checks

### Phase 4: Scenario Simulation + Trace Logs (2 weeks)

- Implement Scenario Simulation Engine
- Build Decision Trace Log schema
- Trace log storage and querying

### Phase 5: Governance + Release Integration (2 weeks)

- Integrate with eval system
- Governance gates
- Release readiness checks

---

## Success Criteria

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
- Scenario accuracy: 100%
- Trace log completeness: 100%

### Phase 5
- Release gate pass rate: >95%
- Production errors: <0.1%
- User satisfaction: >4.5/5

---

## Conclusion

This architecture transforms Atlas from:

**"AI giving financial advice"**

Into:

**"A deterministic financial reasoning engine explained through AI"**

The LLM becomes the interface, not the calculator or decision maker.

This is the architecture used by the most reliable AI decision systems in fintech, aviation, and medical domains.

---

## Document References

For detailed specifications, see:

1. `ATLAS_FINANCIAL_PROFILE_SCHEMA.md` — Canonical profile structure
2. `ATLAS_DATA_RELIABILITY_LAYER.md` — Input parsing and confidence scoring
3. `ATLAS_MISSING_DATA_ORCHESTRATION.md` — Priority-ordered question selection
4. `ATLAS_SCENARIO_SIMULATION_ENGINE.md` — Tradeoff analysis
5. `ATLAS_DECISION_TRACE_LOG_SCHEMA.md` — Audit trail and debugging
6. `ATLAS_FINANCIAL_REASONING_ARCHITECTURE.md` — Original architecture design

---

**Version:** 1.0  
**Status:** Complete  
**Ready for Implementation**
