# Atlas Financial Profile Schema

**Version:** 1.0  
**Status:** Production Specification  
**Date:** 2026-03-10

---

## Overview

The Financial Profile is the canonical, single source of truth for all user financial data in Atlas.

Every tool, decision, and scenario depends on this schema. It must be:
- **Precise** — no ambiguity about units, frequency, or source
- **Reliable** — confidence/reliability metadata on every field
- **Complete** — tracks provided, inferred, provisional, and missing states
- **Traceable** — knows where each value came from
- **Safe** — prevents silent data loss or contradiction

---

## Financial Profile Schema

### Income Section

#### gross_monthly_income

| Property | Value |
|----------|-------|
| **Field Name** | gross_monthly_income |
| **Type** | number \| null |
| **Unit** | USD, monthly |
| **Allowed Frequencies** | monthly (canonical), annual (converted) |
| **Source** | user_provided \| inferred \| imported |
| **Confidence** | 0-100 (user says "about $5,200" = 70) |
| **Required For** | budgeting, affordability, dti, emergency_fund, all decisions |
| **Blocking If Missing** | true |
| **Validation Rules** | > 0, <= 500000 |
| **Metadata** |  |
| - is_provisional | boolean (user said "approximately") |
| - frequency_provided | "monthly" \| "annual" \| "biweekly" \| "weekly" |
| - source_detail | string ("W2 salary", "self-employed estimate", "multiple jobs") |
| - last_updated | ISO timestamp |
| - data_quality | "confirmed" \| "estimate" \| "rough" |

**Notes:**
- If user provides annual, convert to monthly (annual / 12)
- If user provides biweekly, convert to monthly (biweekly * 26 / 12)
- If user says "about" or "roughly", mark provisional = true
- If user provides range ("$4,500 to $5,500"), use midpoint, mark confidence < 80

---

#### net_monthly_income

| Property | Value |
|----------|-------|
| **Field Name** | net_monthly_income |
| **Type** | number \| null |
| **Unit** | USD, monthly (after taxes, deductions) |
| **Allowed Frequencies** | monthly (canonical), annual (converted) |
| **Source** | user_provided \| inferred \| derived |
| **Confidence** | 0-100 |
| **Required For** | budgeting (if gross unknown), affordability |
| **Blocking If Missing** | false (can infer from gross) |
| **Validation Rules** | > 0, < gross_monthly_income |
| **Metadata** |  |
| - is_provisional | boolean |
| - frequency_provided | "monthly" \| "annual" \| "biweekly" \| "weekly" |
| - source_detail | string ("pay stub", "estimate", "calculated") |
| - last_updated | ISO timestamp |
| - data_quality | "confirmed" \| "estimate" \| "rough" |

**Notes:**
- If only gross provided, can infer net (gross * 0.75 for W2, confidence = 40)
- If user provides net, use directly (confidence = 90)
- If user provides both, validate: net < gross, flag if net > gross * 0.85

---

#### income_stability

| Property | Value |
|----------|-------|
| **Field Name** | income_stability |
| **Type** | "stable" \| "variable" \| "unstable" \| null |
| **Source** | user_provided \| inferred |
| **Confidence** | 0-100 |
| **Required For** | emergency_fund (affects target), debt_prioritization |
| **Blocking If Missing** | false |
| **Metadata** |  |
| - reason | string ("W2 job", "freelance", "commission-based") |
| - months_consistent | number (how many months of stable income) |
| - variance_percent | number (% month-to-month variation) |
| - last_updated | ISO timestamp |

**Rules:**
- "stable" = W2 employment, consistent for 12+ months, <10% variation
- "variable" = freelance/commission, 6-12 months history, 10-30% variation
- "unstable" = new job (<6 months), >30% variation, or job search

---

### Expense Section

#### fixed_expenses

| Property | Value |
|----------|-------|
| **Field Name** | fixed_expenses |
| **Type** | object |
| **Canonical Unit** | USD, monthly |
| **Source** | user_provided \| inferred \| derived |
| **Confidence** | 0-100 per sub-field |
| **Required For** | budgeting, affordability, surplus calculation |
| **Blocking If Missing** | true (at least rent/mortgage required) |

**Sub-fields:**

##### rent_or_mortgage

| Property | Value |
|----------|-------|
| **Field Name** | rent_or_mortgage |
| **Type** | number \| null |
| **Unit** | USD, monthly |
| **Source** | user_provided \| inferred |
| **Confidence** | 0-100 |
| **Required For** | all decisions |
| **Blocking If Missing** | true |
| **Validation Rules** | > 0, <= 10000 |
| **Metadata** |  |
| - is_provisional | boolean |
| - frequency_provided | "monthly" \| "annual" |
| - source_detail | string ("lease", "mortgage", "estimate") |
| - data_quality | "confirmed" \| "estimate" |

---

##### utilities

| Property | Value |
|----------|-------|
| **Field Name** | utilities |
| **Type** | number \| null |
| **Unit** | USD, monthly |
| **Source** | user_provided \| inferred \| derived |
| **Confidence** | 0-100 |
| **Required For** | budgeting, surplus |
| **Blocking If Missing** | false |
| **Validation Rules** | 0-500 (typical range) |
| **Metadata** |  |
| - includes | string[] ("electric", "water", "gas", "internet") |
| - is_provisional | boolean |
| - data_quality | "confirmed" \| "estimate" |

**Notes:**
- If missing, infer from region/climate (confidence = 30)
- If user provides annual, convert to monthly

---

##### insurance

| Property | Value |
|----------|-------|
| **Field Name** | insurance |
| **Type** | number \| null |
| **Unit** | USD, monthly |
| **Source** | user_provided \| inferred |
| **Confidence** | 0-100 |
| **Required For** | budgeting, surplus |
| **Blocking If Missing** | false |
| **Validation Rules** | 0-1000 |
| **Metadata** |  |
| - includes | string[] ("health", "auto", "home", "life") |
| - is_provisional | boolean |
| - data_quality | "confirmed" \| "estimate" |

---

##### debt_payments

| Property | Value |
|----------|-------|
| **Field Name** | debt_payments |
| **Type** | number \| null |
| **Unit** | USD, monthly (minimum payments only) |
| **Source** | user_provided \| derived |
| **Confidence** | 0-100 |
| **Required For** | budgeting, dti, affordability |
| **Blocking If Missing** | false |
| **Validation Rules** | >= 0 |
| **Metadata** |  |
| - includes | string[] ("credit_card_min", "student_loan", "auto_loan", "personal_loan") |
| - is_provisional | boolean |
| - data_quality | "confirmed" \| "estimate" |

**Notes:**
- This is MINIMUM payments only, not extra payments
- Derived from debt section if not provided directly
- If user provides range, use midpoint

---

##### other_fixed

| Property | Value |
|----------|-------|
| **Field Name** | other_fixed |
| **Type** | number \| null |
| **Unit** | USD, monthly |
| **Source** | user_provided \| inferred |
| **Confidence** | 0-100 |
| **Required For** | budgeting |
| **Blocking If Missing** | false |
| **Validation Rules** | >= 0 |
| **Metadata** |  |
| - includes | string[] ("subscriptions", "gym", "childcare", "alimony") |
| - is_provisional | boolean |
| - data_quality | "confirmed" \| "estimate" |

---

#### variable_expenses

| Property | Value |
|----------|-------|
| **Field Name** | variable_expenses |
| **Type** | object |
| **Canonical Unit** | USD, monthly |
| **Source** | user_provided \| inferred \| derived |
| **Confidence** | 0-100 per sub-field |
| **Required For** | budgeting, surplus |
| **Blocking If Missing** | false (can estimate) |

**Sub-fields:**

##### groceries

| Property | Value |
|----------|-------|
| **Field Name** | groceries |
| **Type** | number \| null |
| **Unit** | USD, monthly |
| **Source** | user_provided \| inferred |
| **Confidence** | 0-100 |
| **Required For** | budgeting |
| **Blocking If Missing** | false |
| **Validation Rules** | 0-2000 |
| **Metadata** |  |
| - household_size | number |
| - is_provisional | boolean |
| - data_quality | "confirmed" \| "estimate" \| "rough" |

**Notes:**
- If missing, infer from household size (1 person ≈ $300, +$150 per additional person)
- Confidence = 40 if inferred

---

##### transportation

| Property | Value |
|----------|-------|
| **Field Name** | transportation |
| **Type** | number \| null |
| **Unit** | USD, monthly |
| **Source** | user_provided \| inferred |
| **Confidence** | 0-100 |
| **Required For** | budgeting |
| **Blocking If Missing** | false |
| **Validation Rules** | 0-1500 |
| **Metadata** |  |
| - includes | string[] ("gas", "public_transit", "car_maintenance", "parking") |
| - is_provisional | boolean |
| - data_quality | "confirmed" \| "estimate" |

---

##### dining_out

| Property | Value |
|----------|-------|
| **Field Name** | dining_out |
| **Type** | number \| null |
| **Unit** | USD, monthly |
| **Source** | user_provided \| inferred |
| **Confidence** | 0-100 |
| **Required For** | budgeting |
| **Blocking If Missing** | false |
| **Blocking If Missing** | false |
| **Validation Rules** | 0-2000 |
| **Metadata** |  |
| - is_provisional | boolean |
| - data_quality | "confirmed" \| "estimate" \| "rough" |

---

##### entertainment

| Property | Value |
|----------|-------|
| **Field Name** | entertainment |
| **Type** | number \| null |
| **Unit** | USD, monthly |
| **Source** | user_provided \| inferred |
| **Confidence** | 0-100 |
| **Required For** | budgeting |
| **Blocking If Missing** | false |
| **Validation Rules** | 0-1000 |
| **Metadata** |  |
| - is_provisional | boolean |
| - data_quality | "confirmed" \| "estimate" |

---

##### other_variable

| Property | Value |
|----------|-------|
| **Field Name** | other_variable |
| **Type** | number \| null |
| **Unit** | USD, monthly |
| **Source** | user_provided \| inferred |
| **Confidence** | 0-100 |
| **Required For** | budgeting |
| **Blocking If Missing** | false |
| **Validation Rules** | >= 0 |
| **Metadata** |  |
| - includes | string[] ("clothing", "personal_care", "gifts", "hobbies") |
| - is_provisional | boolean |
| - data_quality | "confirmed" \| "estimate" |

---

### Debt Section

#### debt

| Property | Value |
|----------|-------|
| **Field Name** | debt |
| **Type** | object |
| **Source** | user_provided \| imported |
| **Confidence** | 0-100 per debt |
| **Required For** | debt_prioritization, affordability, dti |
| **Blocking If Missing** | false |

**Sub-sections:**

##### credit_card

| Property | Value |
|----------|-------|
| **Field Name** | credit_card |
| **Type** | object |

**Fields:**
- **balance** (number \| null): USD, current balance
  - Confidence: 90 if from statement, 60 if estimate
  - Validation: >= 0
  - Metadata: is_provisional, data_quality

- **interest_rate** (number \| null): annual percentage (e.g., 18.5)
  - Confidence: 95 if from statement, 50 if estimate
  - Validation: 0-36
  - Metadata: is_provisional, data_quality

- **min_payment** (number \| null): USD, monthly minimum
  - Confidence: 90 if from statement, 40 if calculated
  - Validation: > 0
  - Metadata: is_provisional, data_quality, calculation_method

---

##### student_loans

| Property | Value |
|----------|-------|
| **Field Name** | student_loans |
| **Type** | object |

**Fields:**
- **balance** (number \| null): USD, total outstanding
  - Confidence: 95 if from servicer, 70 if estimate
  - Validation: >= 0
  - Metadata: is_provisional, data_quality, number_of_loans

- **interest_rate** (number \| null): annual percentage
  - Confidence: 95 if from servicer, 60 if estimate
  - Validation: 0-12
  - Metadata: is_provisional, data_quality, loan_type

- **payment** (number \| null): USD, monthly payment
  - Confidence: 95 if from servicer, 50 if estimate
  - Validation: > 0
  - Metadata: is_provisional, data_quality, repayment_plan

---

##### auto_loan

| Property | Value |
|----------|-------|
| **Field Name** | auto_loan |
| **Type** | object |

**Fields:**
- **balance** (number \| null): USD, remaining balance
  - Confidence: 95 if from lender, 70 if estimate
  - Validation: >= 0
  - Metadata: is_provisional, data_quality

- **interest_rate** (number \| null): annual percentage
  - Confidence: 95 if from lender, 60 if estimate
  - Validation: 0-15
  - Metadata: is_provisional, data_quality

- **payment** (number \| null): USD, monthly payment
  - Confidence: 95 if from lender, 50 if estimate
  - Validation: > 0
  - Metadata: is_provisional, data_quality, months_remaining

---

##### other_debt

| Property | Value |
|----------|-------|
| **Field Name** | other_debt |
| **Type** | object |

**Fields:**
- **balance** (number \| null): USD, total balance
  - Confidence: 90 if from creditor, 60 if estimate
  - Validation: >= 0
  - Metadata: is_provisional, data_quality, debt_type

- **interest_rate** (number \| null): annual percentage
  - Confidence: 90 if from creditor, 50 if estimate
  - Validation: 0-36
  - Metadata: is_provisional, data_quality

- **payment** (number \| null): USD, monthly payment
  - Confidence: 90 if from creditor, 50 if estimate
  - Validation: > 0
  - Metadata: is_provisional, data_quality

---

### Assets Section

#### assets

| Property | Value |
|----------|-------|
| **Field Name** | assets |
| **Type** | object |
| **Source** | user_provided \| imported |
| **Confidence** | 0-100 per asset |
| **Required For** | emergency_fund, affordability, debt_vs_invest |
| **Blocking If Missing** | false |

**Sub-fields:**

##### emergency_fund

| Property | Value |
|----------|-------|
| **Field Name** | emergency_fund |
| **Type** | number \| null |
| **Unit** | USD |
| **Source** | user_provided \| imported |
| **Confidence** | 0-100 |
| **Required For** | all decisions (critical) |
| **Blocking If Missing** | false (assume 0) |
| **Validation Rules** | >= 0 |
| **Metadata** |  |
| - is_provisional | boolean |
| - source_detail | string ("savings account", "estimate", "checking") |
| - data_quality | "confirmed" \| "estimate" |
| - last_updated | ISO timestamp |

---

##### savings

| Property | Value |
|----------|-------|
| **Field Name** | savings |
| **Type** | number \| null |
| **Unit** | USD |
| **Source** | user_provided \| imported |
| **Confidence** | 0-100 |
| **Required For** | budgeting, savings_goal |
| **Blocking If Missing** | false |
| **Validation Rules** | >= 0 |
| **Metadata** |  |
| - is_provisional | boolean |
| - source_detail | string ("savings account", "estimate") |
| - data_quality | "confirmed" \| "estimate" |

---

##### investments

| Property | Value |
|----------|-------|
| **Field Name** | investments |
| **Type** | number \| null |
| **Unit** | USD |
| **Source** | user_provided \| imported |
| **Confidence** | 0-100 |
| **Required For** | debt_vs_invest, wealth_planning |
| **Blocking If Missing** | false |
| **Validation Rules** | >= 0 |
| **Metadata** |  |
| - is_provisional | boolean |
| - source_detail | string ("brokerage", "estimate") |
| - data_quality | "confirmed" \| "estimate" |

---

##### retirement

| Property | Value |
|----------|-------|
| **Field Name** | retirement |
| **Type** | number \| null |
| **Unit** | USD |
| **Source** | user_provided \| imported |
| **Confidence** | 0-100 |
| **Required For** | retirement_planning |
| **Blocking If Missing** | false |
| **Validation Rules** | >= 0 |
| **Metadata** |  |
| - is_provisional | boolean |
| - source_detail | string ("401k", "IRA", "estimate") |
| - data_quality | "confirmed" \| "estimate" |

---

### Goals Section

#### goals

| Property | Value |
|----------|-------|
| **Field Name** | goals |
| **Type** | object |
| **Source** | user_provided |
| **Confidence** | 0-100 per goal |
| **Required For** | decision context |
| **Blocking If Missing** | false |

**Sub-fields:**

##### emergency_fund_target

| Property | Value |
|----------|-------|
| **Field Name** | emergency_fund_target |
| **Type** | number \| null |
| **Unit** | USD |
| **Source** | user_provided \| derived |
| **Confidence** | 0-100 |
| **Required For** | emergency_fund decision |
| **Blocking If Missing** | false (can calculate) |
| **Metadata** |  |
| - months_of_expenses | number (3, 6, 12) |
| - is_provisional | boolean |
| - data_quality | "confirmed" \| "calculated" |

---

##### debt_payoff_timeline

| Property | Value |
|----------|-------|
| **Field Name** | debt_payoff_timeline |
| **Type** | string \| null |
| **Unit** | duration (e.g., "12 months", "3 years") |
| **Source** | user_provided |
| **Confidence** | 0-100 |
| **Required For** | debt_prioritization |
| **Blocking If Missing** | false |
| **Metadata** |  |
| - is_provisional | boolean |
| - data_quality | "confirmed" \| "estimate" |

---

##### savings_goal

| Property | Value |
|----------|-------|
| **Field Name** | savings_goal |
| **Type** | number \| null |
| **Unit** | USD |
| **Source** | user_provided |
| **Confidence** | 0-100 |
| **Required For** | budgeting, savings_planning |
| **Blocking If Missing** | false |
| **Metadata** |  |
| - timeline | string (e.g., "12 months", "5 years") |
| - purpose | string (e.g., "down payment", "vacation") |
| - is_provisional | boolean |
| - data_quality | "confirmed" \| "estimate" |

---

##### investment_goal

| Property | Value |
|----------|-------|
| **Field Name** | investment_goal |
| **Type** | string \| null |
| **Unit** | description |
| **Source** | user_provided |
| **Confidence** | 0-100 |
| **Required For** | debt_vs_invest |
| **Blocking If Missing** | false |
| **Metadata** |  |
| - timeline | string |
| - risk_tolerance | "conservative" \| "moderate" \| "aggressive" |
| - is_provisional | boolean |

---

### Metadata Section

#### metadata

| Property | Value |
|----------|-------|
| **Field Name** | metadata |
| **Type** | object |

**Fields:**

##### risk_tolerance

| Property | Value |
|----------|-------|
| **Field Name** | risk_tolerance |
| **Type** | "conservative" \| "moderate" \| "aggressive" \| null |
| **Source** | user_provided |
| **Confidence** | 0-100 |
| **Required For** | debt_vs_invest, investment decisions |
| **Blocking If Missing** | false |
| **Metadata** |  |
| - assessment_method | string ("questionnaire", "stated", "inferred") |
| - last_updated | ISO timestamp |

---

##### age_range

| Property | Value |
|----------|-------|
| **Field Name** | age_range |
| **Type** | string \| null |
| **Unit** | age bracket (e.g., "25-34", "35-44") |
| **Source** | user_provided |
| **Confidence** | 0-100 |
| **Required For** | emergency_fund, retirement planning |
| **Blocking If Missing** | false |
| **Metadata** |  |
| - is_provisional | boolean |
| - data_quality | "confirmed" \| "estimate" |

---

##### family_status

| Property | Value |
|----------|-------|
| **Field Name** | family_status |
| **Type** | string \| null |
| **Unit** | status (e.g., "single", "married", "has_dependents") |
| **Source** | user_provided |
| **Confidence** | 0-100 |
| **Required For** | emergency_fund, affordability |
| **Blocking If Missing** | false |
| **Metadata** |  |
| - dependents | number |
| - is_provisional | boolean |

---

##### employment_stability

| Property | Value |
|----------|-------|
| **Field Name** | employment_stability |
| **Type** | "stable" \| "unstable" \| "unknown" |
| **Source** | user_provided \| inferred |
| **Confidence** | 0-100 |
| **Required For** | emergency_fund, affordability |
| **Blocking If Missing** | false |
| **Metadata** |  |
| - reason | string |
| - months_in_role | number |
| - is_provisional | boolean |

---

### Completeness State

#### completeness

| Property | Value |
|----------|-------|
| **Field Name** | completeness |
| **Type** | object |

**Fields:**

##### provided_fields

| Property | Value |
|----------|-------|
| **Field Name** | provided_fields |
| **Type** | string[] |
| **Description** | List of field paths user explicitly provided |
| **Example** | ["gross_monthly_income", "fixed_expenses.rent_or_mortgage", "debt.credit_card.balance"] |

---

##### inferred_fields

| Property | Value |
|----------|-------|
| **Field Name** | inferred_fields |
| **Type** | string[] |
| **Description** | List of field paths calculated from other fields |
| **Example** | ["net_monthly_income" (from gross), "fixed_expenses.utilities" (from region)] |

---

##### provisional_fields

| Property | Value |
|----------|-------|
| **Field Name** | provisional_fields |
| **Type** | string[] |
| **Description** | List of field paths user marked as estimates |
| **Example** | ["variable_expenses.groceries" (user said "about $300")] |

---

##### missing_critical_fields

| Property | Value |
|----------|-------|
| **Field Name** | missing_critical_fields |
| **Type** | string[] |
| **Description** | List of fields blocking decisions |
| **Example** | ["gross_monthly_income", "fixed_expenses.rent_or_mortgage"] |

---

##### completeness_score

| Property | Value |
|----------|-------|
| **Field Name** | completeness_score |
| **Type** | number (0-100) |
| **Description** | Overall data completeness |
| **Calculation** | (provided + inferred) / total_fields * 100 |

---

##### decision_ready

| Property | Value |
|----------|-------|
| **Field Name** | decision_ready |
| **Type** | boolean |
| **Description** | Can any decision be made? |
| **Rule** | true if no blocking fields missing |

---

##### decision_ready_for

| Property | Value |
|----------|-------|
| **Field Name** | decision_ready_for |
| **Type** | string[] |
| **Description** | Which decision types can be made |
| **Example** | ["budgeting", "affordability"] |

---

## TypeScript Interface

```typescript
interface FinancialProfile {
  // Income
  income: {
    gross_monthly_income: {
      value: number | null;
      source: "user_provided" | "inferred" | "imported";
      confidence: number; // 0-100
      is_provisional: boolean;
      frequency_provided: "monthly" | "annual" | "biweekly" | "weekly";
      source_detail: string;
      last_updated: string; // ISO timestamp
      data_quality: "confirmed" | "estimate" | "rough";
    };
    net_monthly_income: {
      value: number | null;
      source: "user_provided" | "inferred" | "derived";
      confidence: number;
      is_provisional: boolean;
      frequency_provided: "monthly" | "annual" | "biweekly" | "weekly";
      source_detail: string;
      last_updated: string;
      data_quality: "confirmed" | "estimate" | "rough";
    };
    income_stability: {
      value: "stable" | "variable" | "unstable" | null;
      source: "user_provided" | "inferred";
      confidence: number;
      reason: string;
      months_consistent: number;
      variance_percent: number;
      last_updated: string;
    };
  };

  // Fixed Expenses
  fixed_expenses: {
    rent_or_mortgage: FieldMetadata<number>;
    utilities: FieldMetadata<number>;
    insurance: FieldMetadata<number>;
    debt_payments: FieldMetadata<number>;
    other_fixed: FieldMetadata<number>;
  };

  // Variable Expenses
  variable_expenses: {
    groceries: FieldMetadata<number>;
    transportation: FieldMetadata<number>;
    dining_out: FieldMetadata<number>;
    entertainment: FieldMetadata<number>;
    other_variable: FieldMetadata<number>;
  };

  // Debt
  debt: {
    credit_card: DebtMetadata;
    student_loans: DebtMetadata;
    auto_loan: DebtMetadata;
    other_debt: DebtMetadata;
  };

  // Assets
  assets: {
    emergency_fund: FieldMetadata<number>;
    savings: FieldMetadata<number>;
    investments: FieldMetadata<number>;
    retirement: FieldMetadata<number>;
  };

  // Goals
  goals: {
    emergency_fund_target: FieldMetadata<number>;
    debt_payoff_timeline: FieldMetadata<string>;
    savings_goal: FieldMetadata<number>;
    investment_goal: FieldMetadata<string>;
  };

  // Metadata
  metadata: {
    risk_tolerance: FieldMetadata<"conservative" | "moderate" | "aggressive">;
    age_range: FieldMetadata<string>;
    family_status: FieldMetadata<string>;
    employment_stability: FieldMetadata<"stable" | "unstable" | "unknown">;
  };

  // Completeness
  completeness: {
    provided_fields: string[];
    inferred_fields: string[];
    provisional_fields: string[];
    missing_critical_fields: string[];
    completeness_score: number;
    decision_ready: boolean;
    decision_ready_for: string[];
  };
}

// Generic field metadata
interface FieldMetadata<T> {
  value: T | null;
  source: "user_provided" | "inferred" | "derived" | "imported";
  confidence: number; // 0-100
  is_provisional: boolean;
  data_quality: "confirmed" | "estimate" | "rough";
  last_updated: string; // ISO timestamp
  metadata?: Record<string, any>;
}

// Debt-specific metadata
interface DebtMetadata {
  balance: FieldMetadata<number>;
  interest_rate: FieldMetadata<number>;
  payment: FieldMetadata<number>;
}
```

---

## Field Requirements by Decision Type

### Budgeting Decision

**Blocking (must have):**
- gross_monthly_income OR net_monthly_income
- fixed_expenses.rent_or_mortgage

**Required (strongly needed):**
- fixed_expenses.debt_payments
- variable_expenses (at least groceries + transportation)

**Optional:**
- goals.savings_goal
- metadata.risk_tolerance

---

### Emergency Fund Decision

**Blocking (must have):**
- gross_monthly_income OR net_monthly_income
- fixed_expenses.rent_or_mortgage
- assets.emergency_fund

**Required:**
- income_stability
- metadata.family_status

**Optional:**
- metadata.age_range

---

### Affordability Decision

**Blocking (must have):**
- gross_monthly_income OR net_monthly_income
- fixed_expenses.rent_or_mortgage
- fixed_expenses.debt_payments
- assets.emergency_fund

**Required:**
- variable_expenses (estimate)

**Optional:**
- metadata.employment_stability

---

### Debt Prioritization Decision

**Blocking (must have):**
- debt (at least one debt type with balance + rate)
- gross_monthly_income OR net_monthly_income

**Required:**
- assets.emergency_fund

**Optional:**
- goals.debt_payoff_timeline

---

### Debt vs Investing Decision

**Blocking (must have):**
- debt (at least one debt with balance + rate)
- gross_monthly_income OR net_monthly_income
- assets.emergency_fund

**Required:**
- income_stability

**Optional:**
- metadata.risk_tolerance
- goals.investment_goal

---

## Validation Rules

### Cross-field Validation

1. **Income consistency**: net_monthly_income < gross_monthly_income
   - If violated: flag as data quality issue, ask for clarification

2. **Expense consistency**: total_expenses < gross_monthly_income (usually)
   - If violated: flag as possible data entry error

3. **Debt consistency**: sum of debt payments <= total_fixed_expenses.debt_payments
   - If violated: flag discrepancy

4. **Asset consistency**: emergency_fund <= total_assets
   - If violated: flag as data quality issue

5. **Completeness**: if decision_ready = true, all blocking fields must be non-null
   - If violated: set decision_ready = false

---

## Data Quality Scoring

For each field, calculate confidence as:

```
confidence = base_confidence × source_multiplier × recency_multiplier

base_confidence:
  - user_provided: 90
  - inferred: 60
  - derived: 40
  - imported: 85

source_multiplier:
  - confirmed: 1.0
  - estimate: 0.8
  - rough: 0.5

recency_multiplier:
  - < 1 week old: 1.0
  - < 1 month old: 0.95
  - < 3 months old: 0.85
  - > 3 months old: 0.7
```

---

## Example: Complete Profile

```json
{
  "income": {
    "gross_monthly_income": {
      "value": 5200,
      "source": "user_provided",
      "confidence": 90,
      "is_provisional": false,
      "frequency_provided": "monthly",
      "source_detail": "W2 salary",
      "last_updated": "2026-03-10T01:19:00Z",
      "data_quality": "confirmed"
    },
    "net_monthly_income": {
      "value": 3900,
      "source": "inferred",
      "confidence": 70,
      "is_provisional": false,
      "frequency_provided": "monthly",
      "source_detail": "calculated from gross (75%)",
      "last_updated": "2026-03-10T01:19:00Z",
      "data_quality": "estimate"
    },
    "income_stability": {
      "value": "stable",
      "source": "user_provided",
      "confidence": 95,
      "reason": "W2 employment, 5 years tenure",
      "months_consistent": 60,
      "variance_percent": 2
    }
  },
  "fixed_expenses": {
    "rent_or_mortgage": {
      "value": 2200,
      "source": "user_provided",
      "confidence": 95,
      "is_provisional": false,
      "data_quality": "confirmed",
      "source_detail": "lease agreement",
      "last_updated": "2026-03-10T01:19:00Z"
    },
    "utilities": {
      "value": 150,
      "source": "user_provided",
      "confidence": 85,
      "is_provisional": true,
      "data_quality": "estimate",
      "source_detail": "average of last 3 months",
      "last_updated": "2026-03-10T01:19:00Z"
    },
    "insurance": {
      "value": 200,
      "source": "user_provided",
      "confidence": 95,
      "is_provisional": false,
      "data_quality": "confirmed",
      "source_detail": "auto + health insurance",
      "last_updated": "2026-03-10T01:19:00Z"
    },
    "debt_payments": {
      "value": 400,
      "source": "derived",
      "confidence": 85,
      "is_provisional": false,
      "data_quality": "confirmed",
      "source_detail": "sum of minimum payments",
      "last_updated": "2026-03-10T01:19:00Z"
    },
    "other_fixed": {
      "value": 50,
      "source": "user_provided",
      "confidence": 70,
      "is_provisional": true,
      "data_quality": "estimate",
      "source_detail": "subscriptions estimate",
      "last_updated": "2026-03-10T01:19:00Z"
    }
  },
  "variable_expenses": {
    "groceries": {
      "value": 400,
      "source": "user_provided",
      "confidence": 75,
      "is_provisional": true,
      "data_quality": "estimate",
      "source_detail": "rough monthly average",
      "last_updated": "2026-03-10T01:19:00Z"
    },
    "transportation": {
      "value": 200,
      "source": "user_provided",
      "confidence": 80,
      "is_provisional": true,
      "data_quality": "estimate",
      "source_detail": "gas + maintenance",
      "last_updated": "2026-03-10T01:19:00Z"
    },
    "dining_out": {
      "value": 300,
      "source": "user_provided",
      "confidence": 70,
      "is_provisional": true,
      "data_quality": "rough",
      "source_detail": "estimate",
      "last_updated": "2026-03-10T01:19:00Z"
    },
    "entertainment": {
      "value": 100,
      "source": "user_provided",
      "confidence": 60,
      "is_provisional": true,
      "data_quality": "rough",
      "source_detail": "rough estimate",
      "last_updated": "2026-03-10T01:19:00Z"
    },
    "other_variable": {
      "value": 50,
      "source": "inferred",
      "confidence": 40,
      "is_provisional": true,
      "data_quality": "estimate",
      "source_detail": "default estimate",
      "last_updated": "2026-03-10T01:19:00Z"
    }
  },
  "debt": {
    "credit_card": {
      "balance": {
        "value": 3500,
        "source": "user_provided",
        "confidence": 90,
        "is_provisional": false,
        "data_quality": "confirmed",
        "source_detail": "recent statement",
        "last_updated": "2026-03-10T01:19:00Z"
      },
      "interest_rate": {
        "value": 18.5,
        "source": "user_provided",
        "confidence": 95,
        "is_provisional": false,
        "data_quality": "confirmed",
        "source_detail": "from statement",
        "last_updated": "2026-03-10T01:19:00Z"
      },
      "payment": {
        "value": 100,
        "source": "derived",
        "confidence": 85,
        "is_provisional": false,
        "data_quality": "confirmed",
        "source_detail": "minimum payment",
        "last_updated": "2026-03-10T01:19:00Z"
      }
    },
    "student_loans": {
      "balance": {
        "value": 28000,
        "source": "user_provided",
        "confidence": 95,
        "is_provisional": false,
        "data_quality": "confirmed",
        "source_detail": "from servicer",
        "last_updated": "2026-03-10T01:19:00Z"
      },
      "interest_rate": {
        "value": 5.5,
        "source": "user_provided",
        "confidence": 95,
        "is_provisional": false,
        "data_quality": "confirmed",
        "source_detail": "from servicer",
        "last_updated": "2026-03-10T01:19:00Z"
      },
      "payment": {
        "value": 300,
        "source": "user_provided",
        "confidence": 95,
        "is_provisional": false,
        "data_quality": "confirmed",
        "source_detail": "standard repayment",
        "last_updated": "2026-03-10T01:19:00Z"
      }
    },
    "auto_loan": {
      "balance": null,
      "interest_rate": null,
      "payment": null
    },
    "other_debt": {
      "balance": null,
      "interest_rate": null,
      "payment": null
    }
  },
  "assets": {
    "emergency_fund": {
      "value": 8000,
      "source": "user_provided",
      "confidence": 90,
      "is_provisional": false,
      "data_quality": "confirmed",
      "source_detail": "savings account",
      "last_updated": "2026-03-10T01:19:00Z"
    },
    "savings": {
      "value": 2000,
      "source": "user_provided",
      "confidence": 85,
      "is_provisional": false,
      "data_quality": "confirmed",
      "source_detail": "savings account",
      "last_updated": "2026-03-10T01:19:00Z"
    },
    "investments": {
      "value": null,
      "source": null,
      "confidence": 0,
      "is_provisional": false,
      "data_quality": null
    },
    "retirement": {
      "value": 45000,
      "source": "user_provided",
      "confidence": 85,
      "is_provisional": true,
      "data_quality": "estimate",
      "source_detail": "401k estimate",
      "last_updated": "2026-03-10T01:19:00Z"
    }
  },
  "goals": {
    "emergency_fund_target": {
      "value": 13200,
      "source": "derived",
      "confidence": 90,
      "is_provisional": false,
      "data_quality": "calculated",
      "metadata": {
        "months_of_expenses": 4,
        "calculation": "total_monthly_expenses * 4"
      },
      "last_updated": "2026-03-10T01:19:00Z"
    },
    "debt_payoff_timeline": {
      "value": "36 months",
      "source": "user_provided",
      "confidence": 70,
      "is_provisional": true,
      "data_quality": "estimate",
      "source_detail": "user goal",
      "last_updated": "2026-03-10T01:19:00Z"
    },
    "savings_goal": null,
    "investment_goal": null
  },
  "metadata": {
    "risk_tolerance": {
      "value": "moderate",
      "source": "user_provided",
      "confidence": 75,
      "is_provisional": true,
      "data_quality": "estimate",
      "metadata": {
        "assessment_method": "stated"
      },
      "last_updated": "2026-03-10T01:19:00Z"
    },
    "age_range": {
      "value": "25-34",
      "source": "user_provided",
      "confidence": 90,
      "is_provisional": false,
      "data_quality": "confirmed",
      "last_updated": "2026-03-10T01:19:00Z"
    },
    "family_status": {
      "value": "single",
      "source": "user_provided",
      "confidence": 95,
      "is_provisional": false,
      "data_quality": "confirmed",
      "last_updated": "2026-03-10T01:19:00Z"
    },
    "employment_stability": {
      "value": "stable",
      "source": "inferred",
      "confidence": 85,
      "is_provisional": false,
      "data_quality": "confirmed",
      "metadata": {
        "reason": "W2 employment, 5 years tenure",
        "months_in_role": 60
      },
      "last_updated": "2026-03-10T01:19:00Z"
    }
  },
  "completeness": {
    "provided_fields": [
      "income.gross_monthly_income",
      "income.income_stability",
      "fixed_expenses.rent_or_mortgage",
      "fixed_expenses.utilities",
      "fixed_expenses.insurance",
      "fixed_expenses.other_fixed",
      "variable_expenses.groceries",
      "variable_expenses.transportation",
      "variable_expenses.dining_out",
      "variable_expenses.entertainment",
      "debt.credit_card.balance",
      "debt.credit_card.interest_rate",
      "debt.student_loans.balance",
      "debt.student_loans.interest_rate",
      "debt.student_loans.payment",
      "assets.emergency_fund",
      "assets.savings",
      "assets.retirement",
      "goals.debt_payoff_timeline",
      "metadata.risk_tolerance",
      "metadata.age_range",
      "metadata.family_status"
    ],
    "inferred_fields": [
      "income.net_monthly_income",
      "fixed_expenses.debt_payments",
      "debt.credit_card.payment",
      "goals.emergency_fund_target",
      "metadata.employment_stability"
    ],
    "provisional_fields": [
      "fixed_expenses.utilities",
      "variable_expenses.groceries",
      "variable_expenses.transportation",
      "variable_expenses.dining_out",
      "variable_expenses.entertainment",
      "variable_expenses.other_variable",
      "goals.debt_payoff_timeline",
      "metadata.risk_tolerance",
      "assets.retirement"
    ],
    "missing_critical_fields": [],
    "completeness_score": 82,
    "decision_ready": true,
    "decision_ready_for": [
      "budgeting",
      "emergency_fund",
      "affordability",
      "debt_prioritization",
      "debt_vs_invest"
    ]
  }
}
```

---

## Summary

This Financial Profile schema is:

1. **Precise** — every field has clear type, unit, source, confidence
2. **Reliable** — tracks data quality and confidence on every value
3. **Complete** — knows what's provided, inferred, provisional, missing
4. **Traceable** — records source and timestamp for every field
5. **Safe** — prevents silent data loss through explicit tracking
6. **Implementable** — every field has validation rules and metadata

This is the backbone that the Data Reliability Layer, Missing Data Orchestration, Scenario Engine, and Decision Trace Logs all depend on.

---

**Next:** Data Reliability Layer design (maps raw user inputs to this schema with confidence scoring)
