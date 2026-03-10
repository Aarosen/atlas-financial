# Atlas Missing Data Orchestration

**Version:** 1.0  
**Status:** Design Specification  
**Date:** 2026-03-10

---

## Overview

Missing Data Orchestration defines which questions to ask first when critical data is missing.

Not all missing fields are equal. Some questions are prerequisites for others. Some unlock entire decision paths.

This layer ensures Atlas asks the most valuable question at each step, not random ones.

---

## Core Principle

**Ask the question that unblocks the most decisions first.**

Example:
- User hasn't provided income
- User hasn't provided rent
- Which to ask first?

Answer: Income. Because:
- Income blocks: budgeting, affordability, emergency fund, debt prioritization, debt vs invest
- Rent blocks: budgeting, affordability, emergency fund
- Income unblocks more decisions → ask income first

---

## Decision Type Priority Maps

### 1. Budgeting Decision

**Blocking fields (must have):**
1. gross_monthly_income OR net_monthly_income
2. fixed_expenses.rent_or_mortgage

**Required fields (strongly needed):**
3. fixed_expenses.debt_payments
4. variable_expenses (at least groceries + transportation)

**Optional fields:**
5. goals.savings_goal
6. metadata.risk_tolerance

**Question Priority Order:**

```
1. "What's your monthly income (gross or take-home)?"
   → Unblocks: budgeting, affordability, emergency fund, dti
   → Confidence impact: high

2. "What's your rent or mortgage payment?"
   → Unblocks: budgeting, affordability, emergency fund
   → Confidence impact: high

3. "What are your total monthly debt payments (minimum)?
   → Unblocks: budgeting, dti, affordability
   → Confidence impact: medium

4. "What do you spend on groceries and transportation?"
   → Unblocks: budgeting accuracy
   → Confidence impact: medium

5. "Any other fixed expenses (insurance, subscriptions)?"
   → Improves budgeting accuracy
   → Confidence impact: low

6. "What's your savings goal?"
   → Helps prioritize surplus allocation
   → Confidence impact: low
```

**When to ask:**
- If missing blocking field: ask immediately
- If missing required field: ask after blocking fields
- If missing optional field: ask only if user asks for detailed guidance

---

### 2. Emergency Fund Decision

**Blocking fields:**
1. gross_monthly_income OR net_monthly_income
2. fixed_expenses.rent_or_mortgage
3. assets.emergency_fund

**Required fields:**
4. income_stability
5. metadata.family_status

**Optional fields:**
6. metadata.age_range

**Question Priority Order:**

```
1. "What's your monthly income?"
   → Unblocks: emergency fund target calculation
   → Confidence impact: high

2. "What's your rent or mortgage?"
   → Unblocks: monthly expense estimation
   → Confidence impact: high

3. "How much do you have in emergency savings right now?"
   → Unblocks: gap analysis
   → Confidence impact: high

4. "Is your job stable, or does income vary?"
   → Affects target (stable = 3 months, unstable = 6 months)
   → Confidence impact: medium

5. "Do you have dependents?"
   → Affects target (+1 month per dependent)
   → Confidence impact: medium

6. "What's your age range?"
   → Helps with long-term planning context
   → Confidence impact: low
```

**When to ask:**
- If missing blocking field: ask immediately
- If missing required field: ask after blocking fields
- If missing optional field: ask only if user wants detailed guidance

---

### 3. Affordability Decision

**Blocking fields:**
1. gross_monthly_income OR net_monthly_income
2. fixed_expenses.rent_or_mortgage
3. fixed_expenses.debt_payments
4. assets.emergency_fund

**Required fields:**
5. variable_expenses (estimate)

**Optional fields:**
6. metadata.employment_stability

**Question Priority Order:**

```
1. "What's your monthly income?"
   → Unblocks: affordability calculation
   → Confidence impact: high

2. "What's your rent or mortgage?"
   → Unblocks: fixed expense baseline
   → Confidence impact: high

3. "What are your monthly debt payments?"
   → Unblocks: fixed expense total
   → Confidence impact: high

4. "How much do you have in emergency savings?"
   → Unblocks: safety check (can't afford if it eliminates emergency fund)
   → Confidence impact: high

5. "What do you spend on groceries, transportation, dining out?"
   → Unblocks: total expense calculation
   → Confidence impact: medium

6. "Is your job stable?"
   → Affects risk tolerance for tight budgets
   → Confidence impact: low
```

**When to ask:**
- If missing blocking field: ask immediately
- If missing required field: ask after blocking fields
- If missing optional field: ask only if affordability is tight

---

### 4. Debt Prioritization Decision

**Blocking fields:**
1. debt (at least one debt with balance + rate)
2. gross_monthly_income OR net_monthly_income

**Required fields:**
3. assets.emergency_fund

**Optional fields:**
4. goals.debt_payoff_timeline
5. metadata.risk_tolerance

**Question Priority Order:**

```
1. "What debts do you have? (balances, interest rates)"
   → Unblocks: debt prioritization
   → Confidence impact: high

2. "What's your monthly income?"
   → Unblocks: payoff timeline calculation
   → Confidence impact: high

3. "How much emergency savings do you have?"
   → Unblocks: safety check (can't pay off debt if it eliminates emergency fund)
   → Confidence impact: high

4. "When do you want to be debt-free?"
   → Helps set realistic payoff timeline
   → Confidence impact: medium

5. "Are you comfortable with aggressive payoff, or prefer balanced?"
   → Helps balance debt payoff with other goals
   → Confidence impact: low
```

**When to ask:**
- If missing blocking field: ask immediately
- If missing required field: ask after blocking fields
- If missing optional field: ask only if user wants custom timeline

---

### 5. Debt vs Investing Decision

**Blocking fields:**
1. debt (at least one debt with balance + rate)
2. gross_monthly_income OR net_monthly_income
3. assets.emergency_fund

**Required fields:**
4. income_stability

**Optional fields:**
5. metadata.risk_tolerance
6. goals.investment_goal

**Question Priority Order:**

```
1. "What's your monthly income?"
   → Unblocks: surplus calculation
   → Confidence impact: high

2. "What debts do you have? (balances, rates)"
   → Unblocks: debt cost analysis
   → Confidence impact: high

3. "How much emergency savings do you have?"
   → Unblocks: safety check (can't invest if emergency fund is low)
   → Confidence impact: high

4. "Is your income stable?"
   → Affects risk tolerance (unstable = prioritize debt)
   → Confidence impact: high

5. "What's your risk tolerance?"
   → Affects investment recommendation
   → Confidence impact: medium

6. "What are you investing for?"
   → Helps set investment timeline
   → Confidence impact: low
```

**When to ask:**
- If missing blocking field: ask immediately
- If missing required field: ask after blocking fields
- If missing optional field: ask only if user wants detailed guidance

---

## Smart Question Selection Algorithm

```typescript
function selectNextQuestion(
  profile: FinancialProfile,
  decisionType: string
): {
  question: string;
  field: string;
  priority: number;
  reason: string;
} | null {
  // 1. Get priority map for decision type
  const priorityMap = getPriorityMap(decisionType);
  
  // 2. Find first missing blocking field
  for (const field of priorityMap.blocking) {
    if (isFieldMissing(profile, field)) {
      return {
        question: getQuestion(field),
        field: field,
        priority: 1,
        reason: "Blocking field - required to make decision"
      };
    }
  }
  
  // 3. Find first missing required field
  for (const field of priorityMap.required) {
    if (isFieldMissing(profile, field)) {
      return {
        question: getQuestion(field),
        field: field,
        priority: 2,
        reason: "Required field - improves decision quality"
      };
    }
  }
  
  // 4. Find first missing optional field with low confidence
  for (const field of priorityMap.optional) {
    if (isFieldMissing(profile, field)) {
      return {
        question: getQuestion(field),
        field: field,
        priority: 3,
        reason: "Optional field - refines decision"
      };
    }
  }
  
  // 5. Find field with low confidence (even if present)
  for (const field of priorityMap.blocking.concat(priorityMap.required)) {
    const confidence = getFieldConfidence(profile, field);
    if (confidence < 60) {
      return {
        question: `Can you confirm ${getFieldLabel(field)}? You mentioned ${getFieldValue(profile, field)}.`,
        field: field,
        priority: 2,
        reason: "Low confidence - needs verification"
      };
    }
  }
  
  // 6. All critical fields present and confident
  return null;
}
```

---

## Question Templates

### Income Questions

```
Blocking (must ask):
"What's your monthly income (gross or take-home)?"
"How much do you earn per month?"
"What's your annual salary?"

If provisional:
"You mentioned about $5,200. Can you confirm that's accurate?"
"Is that $5,200 before or after taxes?"

If range:
"You said between $4,500 and $5,500. What's a typical month?"
```

### Expense Questions

```
Blocking (must ask):
"What's your rent or mortgage payment?"
"How much do you pay for housing each month?"

Required (strongly ask):
"What are your total monthly debt payments (minimum)?"
"What do you spend on groceries and transportation?"
"Any other fixed expenses (insurance, subscriptions)?"

If provisional:
"You said about $400 on groceries. Is that a typical month?"
"Does that $300 on dining out include all eating out?"
```

### Debt Questions

```
Blocking (must ask):
"What debts do you have? (credit cards, loans, etc.)"
"For each debt, what's the balance and interest rate?"

If incomplete:
"You mentioned credit card debt. What's the balance and interest rate?"
"What's your minimum payment on the student loans?"
```

### Asset Questions

```
Blocking (must ask):
"How much do you have in emergency savings?"
"What's your current emergency fund?"

If low confidence:
"You said about $8,000. Can you confirm that?"
"Is that in a savings account?"
```

### Stability Questions

```
Required (ask after blocking fields):
"Is your job stable, or does income vary?"
"How long have you been in your current role?"
"Do you have dependents?"

If unclear:
"You mentioned variable income. How much does it vary month to month?"
"Are you looking at a job change soon?"
```

---

## Conditional Question Logic

### If Income is Missing

```
Ask: "What's your monthly income?"

If user provides range:
  → Use midpoint, mark provisional
  → Ask: "Is that gross or net?"

If user provides annual:
  → Convert to monthly
  → Ask: "Is that gross or net?"

If user provides biweekly:
  → Convert to monthly
  → Ask: "Is that gross or net?"

If user says "I don't know":
  → Ask: "Can you estimate?"
  → If still no: "What's your job title? I can estimate based on that."
```

### If Rent is Missing

```
Ask: "What's your rent or mortgage?"

If user says "I don't know":
  → Ask: "What's your city/region?"
  → Estimate based on region (confidence = 30)
  → Ask: "Is that close?"

If user provides annual:
  → Convert to monthly
  → Confirm: "So that's $X per month?"

If user provides range:
  → Use midpoint
  → Ask: "Is that typical?"
```

### If Emergency Fund is Missing

```
Ask: "How much do you have in emergency savings?"

If user says "None":
  → Set to 0
  → Flag as critical gap
  → Ask: "Is that something you want to build?"

If user says "I don't know":
  → Ask: "Do you have a savings account?"
  → Ask: "About how much is in it?"

If user provides range:
  → Use midpoint
  → Ask: "Can you check your account?"
```

### If Debt is Missing

```
Ask: "Do you have any debts? (credit cards, loans, etc.)"

If user says "No":
  → Set all debt to 0
  → Skip debt-related questions

If user says "Yes":
  → Ask: "What type of debt?"
  → For each debt:
    → Ask: "What's the balance?"
    → Ask: "What's the interest rate?"
    → Ask: "What's your minimum payment?"

If user provides partial info:
  → Ask: "Do you know the interest rate?"
  → Ask: "What's your minimum payment?"
```

---

## Multi-Turn Conversation Example

### Scenario: User wants budgeting advice

**Turn 1:**
```
User: "I need help with my budget."

Atlas: "I'd love to help! Let me ask a few quick questions.
        What's your monthly income (gross or take-home)?"

Decision: Ask income (blocking field for budgeting)
```

**Turn 2:**
```
User: "About $5,200 a month after taxes."

Atlas: "Great. And what's your rent or mortgage payment?"

Decision: Ask rent (second blocking field)
Confidence: gross_monthly_income = 75 (provisional)
```

**Turn 3:**
```
User: "Rent is $2,200."

Atlas: "Got it. What are your monthly debt payments (minimum)?"

Decision: Ask debt payments (required field)
Confidence: rent = 90
```

**Turn 4:**
```
User: "I pay $400 total in debt payments."

Atlas: "And roughly how much do you spend on groceries and transportation?"

Decision: Ask variable expenses (required field)
Confidence: debt_payments = 90
```

**Turn 5:**
```
User: "Maybe $400 on groceries and $200 on transportation."

Atlas: "Perfect. Let me calculate your budget...

Your monthly income: $5,200
Your fixed expenses: $2,800 (rent $2,200 + debt $400 + utilities/insurance ~$200)
Your variable expenses: ~$600 (groceries $400 + transportation $200)
Total: ~$3,400

Monthly surplus: $1,800

Here's what I recommend:
1. Build your emergency fund to $13,200 (4 months of expenses)
2. Then allocate surplus to debt payoff or savings goals

Do you have an emergency fund started?"

Decision: Ask emergency fund (for context, not blocking for budgeting)
Confidence: All blocking/required fields present
```

---

## Handling Low Confidence

### Rule 1: Verify provisional data

```
If field.is_provisional = true AND field.confidence < 70:
  → Ask: "You mentioned [value]. Is that accurate?"
  → If user confirms: increase confidence to 85
  → If user corrects: update value, set confidence to 90
```

### Rule 2: Ask for confirmation on critical fields

```
If field in [gross_monthly_income, rent_or_mortgage, emergency_fund]:
  AND field.confidence < 80:
  → Ask: "Can you confirm [field]?"
  → Provide context: "You said [value]. Is that right?"
```

### Rule 3: Offer to refine estimates

```
If field.data_quality = "estimate":
  → Ask: "Would you like to refine this estimate?"
  → Offer: "I can help you track actual spending for a week or two."
```

---

## Decision Readiness Check

```typescript
function isReadyForDecision(
  profile: FinancialProfile,
  decisionType: string
): {
  ready: boolean;
  missingFields: string[];
  lowConfidenceFields: string[];
  recommendation: string;
} {
  const priorityMap = getPriorityMap(decisionType);
  
  // Check blocking fields
  const missingBlocking = priorityMap.blocking.filter(
    f => isFieldMissing(profile, f)
  );
  
  if (missingBlocking.length > 0) {
    return {
      ready: false,
      missingFields: missingBlocking,
      lowConfidenceFields: [],
      recommendation: `Need to ask about: ${missingBlocking.join(", ")}`
    };
  }
  
  // Check required fields
  const missingRequired = priorityMap.required.filter(
    f => isFieldMissing(profile, f)
  );
  
  // Check confidence on blocking/required fields
  const lowConfidence = priorityMap.blocking
    .concat(priorityMap.required)
    .filter(f => getFieldConfidence(profile, f) < 70);
  
  if (missingRequired.length > 0 || lowConfidence.length > 0) {
    return {
      ready: true, // Can make decision, but with caveats
      missingFields: missingRequired,
      lowConfidenceFields: lowConfidence,
      recommendation: `Can make decision, but recommend confirming: ${lowConfidence.join(", ")}`
    };
  }
  
  return {
    ready: true,
    missingFields: [],
    lowConfidenceFields: [],
    recommendation: "Ready to make decision with high confidence"
  };
}
```

---

## Summary

Missing Data Orchestration ensures:

1. **Smart prioritization** — ask the most valuable question first
2. **Blocking-first approach** — get critical fields before optional ones
3. **Confidence-aware** — verify low-confidence data
4. **Conversation flow** — natural question sequencing
5. **Decision readiness** — know when you have enough data
6. **Fallback handling** — graceful degradation when data is missing

This prevents the "random question" problem and makes Atlas feel intelligent about what it needs to know.

---

**Next:** Scenario Simulation Engine design (show users tradeoffs)
