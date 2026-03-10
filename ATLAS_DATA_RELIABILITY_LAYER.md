# Atlas Data Reliability Layer

**Version:** 1.0  
**Status:** Design Specification  
**Date:** 2026-03-10

---

## Overview

The Data Reliability Layer sits between raw user input and the canonical Financial Profile schema.

Its job is to:
1. **Parse** raw user input (text, numbers, ranges, estimates)
2. **Normalize** to canonical units and frequencies
3. **Detect** data quality issues (contradictions, implausible values)
4. **Estimate** confidence scores
5. **Flag** provisional data and missing critical fields
6. **Merge** with existing profile data safely

This layer prevents garbage-in-garbage-out by making data quality explicit.

---

## Input Types

### Raw User Input Examples

```
"My income is about $5,200 a month"
→ gross_monthly_income: 5200, confidence: 70, is_provisional: true

"I make $62,400 a year"
→ gross_monthly_income: 5200, confidence: 85, is_provisional: false

"Between $4,500 and $5,500 per month"
→ gross_monthly_income: 5000, confidence: 60, is_provisional: true

"I take home around $3,900"
→ net_monthly_income: 3900, confidence: 75, is_provisional: true

"Rent is $2,200, utilities about $150, insurance $200"
→ rent_or_mortgage: 2200 (confidence: 90)
→ utilities: 150 (confidence: 70, is_provisional: true)
→ insurance: 200 (confidence: 85)

"I have $3,500 in credit card debt at 18.5%"
→ debt.credit_card.balance: 3500 (confidence: 90)
→ debt.credit_card.interest_rate: 18.5 (confidence: 95)

"My emergency fund is like $8,000 or so"
→ assets.emergency_fund: 8000 (confidence: 70, is_provisional: true)
```

---

## Parsing Rules

### Income Parsing

#### Rule 1: Detect frequency

```
Input: "I make $5,200"
→ Assume monthly (most common)
→ confidence: 70

Input: "I make $62,400"
→ Detect annual (> 12,000 likely annual)
→ Convert to monthly: 62,400 / 12 = 5,200
→ confidence: 85

Input: "I get paid $2,600 biweekly"
→ Detect biweekly
→ Convert to monthly: 2,600 * 26 / 12 = 5,633
→ confidence: 90

Input: "About $1,200 a week"
→ Detect weekly
→ Convert to monthly: 1,200 * 52 / 12 = 5,200
→ confidence: 85
```

#### Rule 2: Detect gross vs net

```
Input: "I make $5,200 gross"
→ gross_monthly_income: 5200
→ source: user_provided
→ confidence: 90

Input: "I take home $3,900"
→ net_monthly_income: 3900
→ source: user_provided
→ confidence: 85

Input: "My paycheck is $2,600 biweekly"
→ Likely net (paycheck language)
→ net_monthly_income: 2,600 * 26 / 12 = 5,633
→ source: user_provided
→ confidence: 80

Input: "I make $5,200 after taxes"
→ net_monthly_income: 5200
→ source: user_provided
→ confidence: 90
```

#### Rule 3: Detect estimates and ranges

```
Input: "About $5,200"
→ is_provisional: true
→ confidence: 70

Input: "Roughly $5,200"
→ is_provisional: true
→ confidence: 65

Input: "Between $4,500 and $5,500"
→ value: (4500 + 5500) / 2 = 5000
→ is_provisional: true
→ confidence: 60

Input: "I think around $5,200"
→ is_provisional: true
→ confidence: 65

Input: "$5,200 (from my W2)"
→ is_provisional: false
→ confidence: 95
```

---

### Expense Parsing

#### Rule 1: Detect fixed vs variable

```
Input: "Rent is $2,200"
→ fixed_expenses.rent_or_mortgage: 2200
→ confidence: 90

Input: "I spend about $400 on groceries"
→ variable_expenses.groceries: 400
→ is_provisional: true
→ confidence: 70

Input: "Utilities run me about $150"
→ fixed_expenses.utilities: 150
→ is_provisional: true
→ confidence: 70

Input: "I eat out maybe $300 a month"
→ variable_expenses.dining_out: 300
→ is_provisional: true
→ confidence: 60
```

#### Rule 2: Detect frequency

```
Input: "Rent is $2,200 a month"
→ frequency: monthly
→ confidence: 95

Input: "I pay $26,400 a year for rent"
→ Convert to monthly: 26,400 / 12 = 2,200
→ confidence: 90

Input: "My utilities are about $1,800 a year"
→ Convert to monthly: 1,800 / 12 = 150
→ confidence: 85
```

#### Rule 3: Detect ranges and estimates

```
Input: "Groceries are somewhere between $300 and $500"
→ value: (300 + 500) / 2 = 400
→ is_provisional: true
→ confidence: 50

Input: "I probably spend $300 on dining out"
→ is_provisional: true
→ confidence: 60

Input: "Groceries: $400 (tracked last month)"
→ is_provisional: false
→ confidence: 85
```

---

### Debt Parsing

#### Rule 1: Extract balance, rate, payment

```
Input: "I have $3,500 in credit card debt at 18.5%"
→ debt.credit_card.balance: 3500 (confidence: 90)
→ debt.credit_card.interest_rate: 18.5 (confidence: 95)
→ debt.credit_card.payment: null (not provided)

Input: "Student loans: $28,000 at 5.5%, paying $300/month"
→ debt.student_loans.balance: 28000 (confidence: 90)
→ debt.student_loans.interest_rate: 5.5 (confidence: 90)
→ debt.student_loans.payment: 300 (confidence: 90)

Input: "I owe about $3,500 on my credit card"
→ debt.credit_card.balance: 3500 (confidence: 75, is_provisional: true)
→ debt.credit_card.interest_rate: null
→ debt.credit_card.payment: null
```

#### Rule 2: Detect rate type (APR vs monthly)

```
Input: "18.5% interest"
→ Assume APR (standard)
→ interest_rate: 18.5
→ confidence: 90

Input: "1.5% monthly interest"
→ Convert to APR: 1.5 * 12 = 18%
→ interest_rate: 18
→ confidence: 85

Input: "0.154% daily"
→ Convert to APR: 0.154 * 365 = 56.2%
→ Flag as unusual (likely error)
→ confidence: 30
```

---

### Asset Parsing

#### Rule 1: Parse emergency fund

```
Input: "I have about $8,000 in savings"
→ assets.emergency_fund: 8000 (confidence: 70, is_provisional: true)

Input: "My emergency fund is $8,000 (confirmed)"
→ assets.emergency_fund: 8000 (confidence: 95, is_provisional: false)

Input: "I have $8,000 in my savings account"
→ assets.emergency_fund: 8000 (confidence: 85)
→ source_detail: "savings account"
```

#### Rule 2: Distinguish emergency fund from savings

```
Input: "I have $8,000 emergency fund and $2,000 in savings"
→ assets.emergency_fund: 8000
→ assets.savings: 2000

Input: "I have $10,000 total saved"
→ assets.emergency_fund: 10000 (assume all is emergency fund)
→ assets.savings: null
→ confidence: 60 (ambiguous)
```

---

## Confidence Scoring

### Base Confidence by Source

```
user_provided + confirmed: 95
user_provided + estimate: 75
user_provided + rough: 50
inferred + confirmed: 85
inferred + estimate: 60
inferred + rough: 40
derived: 70
imported: 85
```

### Modifiers

#### Provisional Modifier (-20)
```
"About $5,200" → base 75 - 20 = 55
"Roughly $400" → base 75 - 20 = 55
```

#### Range Modifier (-15)
```
"Between $4,500 and $5,500" → base 75 - 15 = 60
```

#### Recency Modifier
```
< 1 week old: +0
< 1 month old: -5
< 3 months old: -15
> 3 months old: -30
```

#### Source Detail Modifier
```
"From W2": +10
"From pay stub": +10
"From bank statement": +10
"From estimate": -10
"From memory": -20
```

---

## Conflict Detection

### Rule 1: Income contradiction

```
User says:
- "I make $5,200 gross"
- Later: "I take home $5,000"

Check: net < gross?
→ 5000 < 5200 ✓ OK

User says:
- "I make $5,200 gross"
- Later: "I take home $6,000"

Check: net < gross?
→ 6000 < 5200 ✗ CONFLICT
→ Flag: "Take-home ($6,000) exceeds gross ($5,200). Please clarify."
→ Keep both, mark confidence = 30
```

### Rule 2: Expense contradiction

```
User says:
- "Fixed expenses are $3,000"
- Later: "Rent $2,200, utilities $150, insurance $200, debt $400"
- Sum: $2,950

Check: sum ≈ stated?
→ $2,950 ≈ $3,000 ✓ OK (within 5%)

User says:
- "Fixed expenses are $3,000"
- Later: "Rent $2,200, utilities $150, insurance $200, debt $400, other $1,000"
- Sum: $3,950

Check: sum ≈ stated?
→ $3,950 > $3,000 ✗ CONFLICT
→ Flag: "Sum of expenses ($3,950) exceeds stated total ($3,000). Please review."
→ Use sum, mark confidence = 50
```

### Rule 3: Debt contradiction

```
User says:
- "Credit card balance: $3,500"
- Later: "Credit card balance: $4,000"

Check: same field?
→ CONFLICT
→ Flag: "Credit card balance changed from $3,500 to $4,000. Using latest value."
→ Use $4,000, mark confidence = 70
```

### Rule 4: Implausible values

```
User says: "I make $500,000 a month"
→ Check: > reasonable max ($100,000)?
→ Flag: "Income seems unusually high. Please confirm."
→ confidence: 30

User says: "Rent is $0"
→ Check: rent > 0?
→ Flag: "Rent is $0. Did you mean to leave this blank?"
→ confidence: 20

User says: "Interest rate is 150%"
→ Check: rate > 50%?
→ Flag: "Interest rate seems very high. Please confirm."
→ confidence: 40
```

---

## Data Quality Assessment

### Overall Data Quality Score

```
quality_score = (
  (provided_fields / total_fields) * 0.4 +
  (avg_confidence / 100) * 0.4 +
  (1 - conflict_count / total_fields) * 0.2
) * 100

Example:
- 15 of 25 fields provided: 15/25 = 0.6
- Average confidence: 78/100 = 0.78
- 1 conflict out of 25: (1 - 1/25) = 0.96

quality_score = (0.6 * 0.4 + 0.78 * 0.4 + 0.96 * 0.2) * 100
              = (0.24 + 0.312 + 0.192) * 100
              = 0.744 * 100
              = 74.4
```

### Quality Flags

```
quality_score >= 80: "High quality data"
quality_score >= 60: "Acceptable data"
quality_score >= 40: "Low quality data - consider asking for clarification"
quality_score < 40: "Very low quality - recommend user verification"
```

---

## Merging with Existing Profile

### Rule 1: Newer data wins

```
Existing profile:
- gross_monthly_income: 5200 (confidence: 90, last_updated: 2026-02-01)

New input: "I make $5,400 now"
- gross_monthly_income: 5400 (confidence: 75, last_updated: 2026-03-10)

Result: Use 5400 (newer data)
→ Mark as update, record old value in history
```

### Rule 2: Higher confidence wins (if same timestamp)

```
Existing profile:
- rent_or_mortgage: 2200 (confidence: 70, last_updated: 2026-03-10)

New input: "Rent is $2,200 (from lease)"
- rent_or_mortgage: 2200 (confidence: 95, last_updated: 2026-03-10)

Result: Use confidence 95 (higher confidence)
```

### Rule 3: Provisional loses to confirmed

```
Existing profile:
- utilities: 150 (is_provisional: true, confidence: 70)

New input: "Utilities are $180 (from last bill)"
- utilities: 180 (is_provisional: false, confidence: 90)

Result: Use 180 with is_provisional: false
```

### Rule 4: Detect and flag contradictions

```
Existing profile:
- gross_monthly_income: 5200 (confidence: 90)

New input: "I make $6,000 a month"
- gross_monthly_income: 6000 (confidence: 75)

Check: |6000 - 5200| / 5200 > 10%?
→ 15.4% > 10% ✗ CONFLICT
→ Flag: "Income changed significantly from $5,200 to $6,000. Please confirm."
→ Ask user: "Did your income change, or was one of these estimates incorrect?"
→ Keep both, mark conflict_flag: true
```

---

## Implementation Algorithm

```typescript
async function processUserInput(
  rawInput: string,
  existingProfile: FinancialProfile
): Promise<{
  updatedProfile: FinancialProfile;
  extractedFields: Record<string, any>;
  qualityScore: number;
  conflicts: ConflictFlag[];
  confidenceScores: Record<string, number>;
}> {
  // 1. Parse raw input
  const parsed = parseInput(rawInput);
  
  // 2. Normalize to canonical units
  const normalized = normalizeUnits(parsed);
  
  // 3. Estimate confidence scores
  const withConfidence = estimateConfidence(normalized);
  
  // 4. Detect conflicts with existing profile
  const conflicts = detectConflicts(withConfidence, existingProfile);
  
  // 5. Merge with existing profile
  const merged = mergeWithProfile(withConfidence, existingProfile, conflicts);
  
  // 6. Calculate overall quality score
  const qualityScore = calculateQualityScore(merged);
  
  // 7. Update completeness state
  const updated = updateCompleteness(merged);
  
  return {
    updatedProfile: updated,
    extractedFields: normalized,
    qualityScore,
    conflicts,
    confidenceScores: withConfidence
  };
}
```

---

## Example: Full Processing

### Input
```
"My income is about $5,200 a month. 
Rent is $2,200, utilities around $150, 
insurance $200, and I pay $400 in debt payments. 
I spend maybe $400 on groceries, $200 on transportation, 
$300 on dining out, and $100 on entertainment. 
I have about $8,000 in savings. 
I have $3,500 in credit card debt at 18.5%."
```

### Processing

#### Step 1: Parse
```
income: "about $5,200 a month"
  → gross_monthly_income: 5200
  → frequency: monthly
  → is_provisional: true (word "about")

rent: "$2,200"
  → rent_or_mortgage: 2200
  → is_provisional: false

utilities: "around $150"
  → utilities: 150
  → is_provisional: true (word "around")

... (continue for all fields)

credit_card_debt: "$3,500 in credit card debt at 18.5%"
  → debt.credit_card.balance: 3500
  → debt.credit_card.interest_rate: 18.5
```

#### Step 2: Normalize
```
All amounts already in USD
All frequencies converted to monthly
All rates assumed APR
```

#### Step 3: Estimate Confidence
```
gross_monthly_income: 5200
  → base: 75 (user_provided + estimate)
  → provisional: -20 (word "about")
  → confidence: 55

rent_or_mortgage: 2200
  → base: 90 (user_provided + confirmed)
  → provisional: 0
  → confidence: 90

utilities: 150
  → base: 75 (user_provided + estimate)
  → provisional: -20 (word "around")
  → confidence: 55

debt.credit_card.balance: 3500
  → base: 90 (user_provided + confirmed)
  → confidence: 90

debt.credit_card.interest_rate: 18.5
  → base: 95 (user_provided + confirmed)
  → confidence: 95
```

#### Step 4: Detect Conflicts
```
Check: net_monthly_income vs gross_monthly_income
  → No net provided, can infer
  → No conflict

Check: sum of fixed expenses
  → rent: 2200 + utilities: 150 + insurance: 200 + debt: 400
  → sum: 2950
  → No stated total, no conflict

Check: implausible values
  → All values within reasonable ranges
  → No conflicts
```

#### Step 5: Merge with Existing Profile
```
Assume existing profile is empty (new user)
→ All fields are new
→ No conflicts to resolve
```

#### Step 6: Calculate Quality Score
```
provided_fields: 13 of 25 = 0.52
avg_confidence: (55 + 90 + 55 + 90 + 90 + 90 + 75 + 70 + 60 + 70 + 90 + 95) / 12 = 79.6
conflicts: 0

quality_score = (0.52 * 0.4 + 0.796 * 0.4 + 1.0 * 0.2) * 100
              = (0.208 + 0.318 + 0.2) * 100
              = 72.6
```

#### Step 7: Update Completeness
```
provided_fields: [
  "income.gross_monthly_income",
  "fixed_expenses.rent_or_mortgage",
  "fixed_expenses.utilities",
  "fixed_expenses.insurance",
  "fixed_expenses.debt_payments",
  "variable_expenses.groceries",
  "variable_expenses.transportation",
  "variable_expenses.dining_out",
  "variable_expenses.entertainment",
  "assets.emergency_fund",
  "debt.credit_card.balance",
  "debt.credit_card.interest_rate"
]

inferred_fields: [
  "income.net_monthly_income" (from gross),
  "debt.credit_card.payment" (from balance + rate)
]

missing_critical_fields: []

completeness_score: 68

decision_ready: true (all blocking fields present)

decision_ready_for: [
  "budgeting",
  "affordability",
  "emergency_fund",
  "debt_prioritization"
]
```

### Output
```json
{
  "updatedProfile": { ... (full profile with all fields) ... },
  "extractedFields": {
    "gross_monthly_income": 5200,
    "rent_or_mortgage": 2200,
    "utilities": 150,
    "insurance": 200,
    "debt_payments": 400,
    "groceries": 400,
    "transportation": 200,
    "dining_out": 300,
    "entertainment": 100,
    "emergency_fund": 8000,
    "credit_card_balance": 3500,
    "credit_card_rate": 18.5
  },
  "qualityScore": 72.6,
  "conflicts": [],
  "confidenceScores": {
    "gross_monthly_income": 55,
    "rent_or_mortgage": 90,
    "utilities": 55,
    "insurance": 90,
    "debt_payments": 90,
    "groceries": 75,
    "transportation": 75,
    "dining_out": 70,
    "entertainment": 70,
    "emergency_fund": 70,
    "credit_card_balance": 90,
    "credit_card_rate": 95
  }
}
```

---

## Summary

The Data Reliability Layer:

1. **Parses** raw user input with intelligent frequency/unit detection
2. **Normalizes** to canonical schema (monthly USD, APR, etc.)
3. **Estimates** confidence on every field (0-100)
4. **Flags** provisional data and estimates
5. **Detects** contradictions and implausible values
6. **Merges** safely with existing profile
7. **Calculates** overall quality score
8. **Updates** completeness state

This ensures that the Financial Profile is always reliable, traceable, and ready for decision-making.

---

**Next:** Missing Data Orchestration design (priority maps for which questions to ask first)
