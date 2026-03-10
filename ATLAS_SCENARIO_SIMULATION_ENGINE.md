# Atlas Scenario Simulation Engine

**Version:** 1.0  
**Status:** Design Specification  
**Date:** 2026-03-10

---

## Overview

The Scenario Simulation Engine allows users to explore financial tradeoffs before making decisions.

Instead of answering "Can I afford a $700 car payment?" with just yes/no, Atlas shows:

```
Current situation:
  Monthly surplus: $1,800

Scenario A: $700 car payment
  Remaining surplus: $1,100
  Risk level: Safe

Scenario B: $450 car payment
  Remaining surplus: $1,350
  Risk level: Safe

Scenario C: Wait 6 months (save first)
  Additional savings: $6,600
  Then afford: $900+ payment
  Risk level: Safe
```

This dramatically improves decision quality by making tradeoffs visible.

---

## Core Concept

**Scenario = Profile + Modification**

```typescript
interface Scenario {
  name: string;
  description: string;
  baseProfile: FinancialProfile;
  modifications: ScenarioModification[];
  results: ScenarioResults;
}

interface ScenarioModification {
  type: "income_change" | "expense_change" | "debt_change" | "asset_change" | "goal_change";
  field: string;
  oldValue: any;
  newValue: any;
  timeline: string; // "immediate", "3 months", "6 months", "1 year"
}

interface ScenarioResults {
  projectedProfile: FinancialProfile;
  monthlyImpact: {
    surplus_change: number;
    dti_change: number;
    emergency_fund_impact: number;
  };
  timelineImpact: {
    months_to_goal: number;
    debt_payoff_acceleration: number;
    savings_accumulation: number;
  };
  riskAssessment: {
    safety_level: "safe" | "moderate" | "risky" | "dangerous";
    buffer_remaining: number;
    emergency_fund_impact: "healthy" | "low" | "critical";
  };
}
```

---

## Scenario Types

### 1. Income Change Scenarios

**Use case:** "What if I get a raise?"

```
Scenario: $500/month raise
  Modification: gross_monthly_income: 5200 → 5700
  Timeline: "3 months" (after probation)
  
Results:
  New monthly surplus: $2,300 (+$500)
  New DTI: 38% (-2%)
  
Recommendation:
  "With this raise, you could:
   - Accelerate debt payoff by 6 months
   - Build emergency fund to target in 3 months
   - Start investing with $300/month"
```

**Variations:**
- Salary increase
- New job (with income change)
- Side income
- Bonus/commission
- Job loss (income decrease)

---

### 2. Expense Change Scenarios

**Use case:** "What if I move to a cheaper apartment?"

```
Scenario: Move to $1,800 apartment
  Modification: rent_or_mortgage: 2200 → 1800
  Timeline: "immediate" (next lease)
  
Results:
  New monthly surplus: $2,200 (+$400)
  New fixed expenses: $2,550 (-$400)
  
Recommendation:
  "Saving $400/month on rent means:
   - Emergency fund complete in 3 months
   - Debt payoff accelerated by 8 months
   - Or $400/month to invest"
```

**Variations:**
- Rent change
- Utilities optimization
- Insurance shopping
- Subscription cuts
- Childcare changes

---

### 3. Debt Change Scenarios

**Use case:** "What if I pay off my credit card?"

```
Scenario: Pay off $3,500 credit card
  Modification: debt.credit_card.balance: 3500 → 0
  Timeline: "12 months" (with extra payments)
  
Results:
  New monthly debt payment: $300 (-$100)
  New monthly surplus: $1,900 (+$100)
  Interest saved: $2,100 over 12 months
  
Recommendation:
  "Paying off credit card in 12 months means:
   - Save $2,100 in interest
   - Free up $100/month in budget
   - Improve credit score by ~50 points"
```

**Variations:**
- Pay off specific debt
- Consolidate loans
- Refinance at lower rate
- Extend loan term

---

### 4. Asset Change Scenarios

**Use case:** "What if I build my emergency fund?"

```
Scenario: Build emergency fund to $13,200
  Modification: assets.emergency_fund: 8000 → 13200
  Timeline: "6 months" (allocate $867/month)
  
Results:
  Monthly allocation: $867
  Remaining surplus: $933
  Emergency fund status: Healthy
  
Recommendation:
  "Building emergency fund in 6 months means:
   - You're protected against job loss
   - Can handle $13,200 emergency
   - Still have $933/month for other goals"
```

**Variations:**
- Build emergency fund
- Start investing
- Save for down payment
- Build vacation fund

---

### 5. Goal Change Scenarios

**Use case:** "What if I want to be debt-free in 2 years?"

```
Scenario: Aggressive debt payoff (2 years)
  Modification: goals.debt_payoff_timeline: "36 months" → "24 months"
  Modification: debt_extra_payment: 0 → 500
  Timeline: "immediate"
  
Results:
  New monthly debt payment: $600 (+$200)
  New monthly surplus: $1,600 (-$200)
  Debt-free date: 2026-03 → 2025-03
  Interest saved: $3,200
  
Recommendation:
  "Aggressive payoff means:
   - Debt-free 1 year earlier
   - Save $3,200 in interest
   - Requires $200/month less flexibility
   - Still maintain emergency fund"
```

---

## Simulation Algorithm

```typescript
async function simulateScenario(
  baseProfile: FinancialProfile,
  modifications: ScenarioModification[]
): Promise<ScenarioResults> {
  // 1. Clone base profile
  const projectedProfile = deepClone(baseProfile);
  
  // 2. Apply modifications
  for (const mod of modifications) {
    applyModification(projectedProfile, mod);
  }
  
  // 3. Recalculate all tools
  const toolResults = {
    surplus: calculateMonthlySurplus(projectedProfile),
    dti: calculateDTIRatio(projectedProfile),
    emergency_fund: calculateEmergencyFundTarget(projectedProfile),
    debt_payoff: calculateDebtPayoffTimeline(projectedProfile),
    affordability: checkAffordability(projectedProfile)
  };
  
  // 4. Calculate impacts
  const monthlyImpact = {
    surplus_change: toolResults.surplus.monthly_surplus - 
                    calculateMonthlySurplus(baseProfile).monthly_surplus,
    dti_change: toolResults.dti.dti_ratio - 
                calculateDTIRatio(baseProfile).dti_ratio,
    emergency_fund_impact: toolResults.emergency_fund.shortfall - 
                           calculateEmergencyFundTarget(baseProfile).shortfall
  };
  
  // 5. Calculate timeline impacts
  const timelineImpact = {
    months_to_goal: calculateMonthsToGoal(projectedProfile),
    debt_payoff_acceleration: calculatePayoffAcceleration(baseProfile, projectedProfile),
    savings_accumulation: calculateSavingsAccumulation(projectedProfile)
  };
  
  // 6. Assess risk
  const riskAssessment = assessScenarioRisk(projectedProfile, toolResults);
  
  return {
    projectedProfile,
    monthlyImpact,
    timelineImpact,
    riskAssessment
  };
}
```

---

## Comparison Scenarios

### Use Case: Affordability Decision

**User question:** "Can I afford a $700 car payment?"

**Atlas generates 3 scenarios:**

#### Scenario A: $700 payment (user's request)

```
Modification: new_expense: 0 → 700 (car payment)
Timeline: immediate

Results:
  Current surplus: $1,800
  After payment: $1,100
  Remaining: 6.1% of income
  Risk: Safe (but tight)
  
Assessment:
  "Affordable, but leaves limited buffer for emergencies."
```

#### Scenario B: $450 payment (conservative)

```
Modification: new_expense: 0 → 450 (car payment)
Timeline: immediate

Results:
  Current surplus: $1,800
  After payment: $1,350
  Remaining: 7.7% of income
  Risk: Safe (comfortable)
  
Assessment:
  "More comfortable. Leaves good buffer for emergencies."
```

#### Scenario C: Wait 6 months, save first

```
Modification: allocate_to_savings: 500 (for 6 months)
Timeline: 6 months
Then: new_expense: 0 → 700

Results:
  Savings accumulated: $3,000
  Down payment: $3,000
  Loan amount: $17,000 (instead of $20,000)
  Monthly payment: $550 (instead of $700)
  Risk: Safe (comfortable)
  
Assessment:
  "Waiting 6 months means:
   - $3,000 down payment
   - $150/month lower payment
   - Better loan terms
   - More financial flexibility"
```

**Comparison Table:**

| Scenario | Payment | Remaining Surplus | Risk Level | Notes |
|----------|---------|-------------------|-----------|-------|
| A: $700 now | $700 | $1,100 (6.1%) | Safe | Tight buffer |
| B: $450 now | $450 | $1,350 (7.7%) | Safe | Comfortable |
| C: Wait 6mo | $550 | $1,250 (7.1%) | Safe | Best terms |

---

## Sensitivity Analysis

**Question:** "How sensitive is my budget to income changes?"

```
Base scenario:
  Income: $5,200
  Surplus: $1,800

Sensitivity scenarios:
  -10% income ($4,680):
    Surplus: $1,280 (-$520)
    Risk: Moderate (tight)
    
  -20% income ($4,160):
    Surplus: $760 (-$1,040)
    Risk: Risky (emergency fund at risk)
    
  +10% income ($5,720):
    Surplus: $2,320 (+$520)
    Risk: Safe (very comfortable)
    
  +20% income ($6,240):
    Surplus: $2,840 (+$1,040)
    Risk: Safe (excellent)

Recommendation:
  "Your budget is sensitive to income changes.
   A 10% drop would be manageable.
   A 20% drop would require expense cuts.
   Build emergency fund to 6 months given income variability."
```

---

## Timeline Projections

**Question:** "When can I be debt-free?"

```
Current state:
  Total debt: $31,500
  Monthly payment: $400
  Interest rate: average 8%

Timeline scenarios:

Scenario A: Current pace
  Timeline: 96 months (8 years)
  Interest paid: $9,200
  
Scenario B: Add $100/month
  Timeline: 72 months (6 years)
  Interest paid: $6,800
  Savings: $2,400
  
Scenario C: Add $200/month
  Timeline: 54 months (4.5 years)
  Interest paid: $4,900
  Savings: $4,300
  
Scenario D: Aggressive ($300/month extra)
  Timeline: 42 months (3.5 years)
  Interest paid: $3,600
  Savings: $5,600

Recommendation:
  "Adding $200/month gets you debt-free in 4.5 years
   and saves $4,300 in interest. That's the sweet spot
   between aggressive payoff and financial flexibility."
```

---

## Multi-Variable Scenarios

**Question:** "What's my best path to financial security?"

```
Current state:
  Income: $5,200
  Surplus: $1,800
  Emergency fund: $8,000 (target: $13,200)
  Debt: $31,500
  
Scenario: Balanced approach (24 months)

Month 1-6:
  Action: Build emergency fund
  Allocation: $867/month to emergency fund
  Remaining surplus: $933
  
Month 7-12:
  Action: Emergency fund complete
  New allocation: $500 to debt, $433 to investing
  
Month 13-24:
  Action: Aggressive debt payoff
  Allocation: $700 to debt, $200 to investing
  
Results after 24 months:
  Emergency fund: $13,200 (complete)
  Debt: $25,000 (-$6,500)
  Investments: $3,200
  
Timeline:
  Debt-free: 48 months (4 years)
  Emergency fund: Complete (6 months)
  Investing: Started (month 7)
  
Assessment:
  "Balanced approach gives you:
   - Security (emergency fund in 6 months)
   - Progress (debt down $6,500 in 2 years)
   - Growth (investing started)
   - Flexibility (still have $200/month buffer)"
```

---

## Scenario Presentation

### Text Summary

```
"Here's what a $700 car payment would look like:

Current situation:
  Monthly income: $5,200
  Monthly expenses: $3,400
  Monthly surplus: $1,800

With $700 car payment:
  New monthly expenses: $4,100
  New monthly surplus: $1,100
  Percentage of income: 6.1%

Is it affordable?
  ✓ Yes, you'd still have $1,100/month
  ⚠ But it's on the tighter side
  
My recommendation:
  Consider a $450 payment instead.
  That leaves you $1,350/month buffer,
  which is more comfortable for emergencies.
  
Or wait 6 months and save $3,000 down payment.
  Then a $550 payment is very comfortable."
```

### Structured Data

```json
{
  "scenarios": [
    {
      "name": "$700 payment now",
      "monthly_impact": {
        "surplus": 1100,
        "dti": 39,
        "risk": "safe"
      },
      "timeline_impact": {
        "emergency_fund_months": 12,
        "debt_free_months": 96
      }
    },
    {
      "name": "$450 payment now",
      "monthly_impact": {
        "surplus": 1350,
        "dti": 37,
        "risk": "safe"
      },
      "timeline_impact": {
        "emergency_fund_months": 10,
        "debt_free_months": 96
      }
    },
    {
      "name": "Wait 6 months, $550 payment",
      "monthly_impact": {
        "surplus": 1250,
        "dti": 38,
        "risk": "safe"
      },
      "timeline_impact": {
        "emergency_fund_months": 6,
        "debt_free_months": 90
      }
    }
  ]
}
```

---

## Implementation Notes

### Safe Cloning

```typescript
function deepClone(profile: FinancialProfile): FinancialProfile {
  // Must clone deeply to avoid modifying original
  return JSON.parse(JSON.stringify(profile));
}
```

### Modification Validation

```typescript
function validateModification(
  modification: ScenarioModification,
  baseProfile: FinancialProfile
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check field exists
  if (!fieldExists(baseProfile, modification.field)) {
    errors.push(`Field ${modification.field} does not exist`);
  }
  
  // Check value is plausible
  if (modification.newValue < 0) {
    errors.push(`Value cannot be negative: ${modification.newValue}`);
  }
  
  // Check modification makes sense
  if (modification.type === "income_change" && modification.newValue === 0) {
    errors.push("Income cannot be zero");
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Performance Optimization

```typescript
// Cache scenario results for same modifications
const scenarioCache = new Map<string, ScenarioResults>();

function getCachedScenario(
  baseProfile: FinancialProfile,
  modifications: ScenarioModification[]
): ScenarioResults | null {
  const key = generateCacheKey(baseProfile, modifications);
  return scenarioCache.get(key) || null;
}
```

---

## Summary

The Scenario Simulation Engine:

1. **Enables exploration** — users see tradeoffs before deciding
2. **Compares options** — side-by-side scenario comparison
3. **Projects timelines** — when will goals be achieved?
4. **Assesses risk** — safety level for each scenario
5. **Provides recommendations** — which scenario is best?
6. **Builds confidence** — users understand the implications

This transforms financial guidance from "yes/no" to "here are your options."

---

**Next:** Decision Trace Log schema design (audit trail for every decision)
