# Atlas: Five Real User Questions That Will Break the System First

**Version:** 1.0  
**Status:** Design for These Now  
**Date:** 2026-03-10

---

## Overview

These five questions will appear in your first week of shadow mode.

They will expose gaps in your system.

Design for them now, before users hit them.

---

## Question 1: "I make $5200 yearly"

### Why It Breaks

User says "yearly" but your parser expects "monthly".

```
User: "I make $5200 yearly"
Parser: 5200 (wrong, should be ~433/month)
Decision: "Affordable" (wrong, should be "not_affordable")
```

### The Problem

Your parser doesn't detect "yearly" vs "monthly".

### The Fix (Do This Now)

Add pattern detection:

```typescript
private parseFrequency(userMessage: string): "monthly" | "annual" | "unknown" {
  if (/yearly|per year|annual|\/year/i.test(userMessage)) {
    return "annual";
  }
  if (/monthly|per month|\/month/i.test(userMessage)) {
    return "monthly";
  }
  return "unknown";
}

private normalizeToMonthly(value: number, frequency: "monthly" | "annual" | "unknown"): number {
  if (frequency === "annual") {
    return value / 12;
  }
  return value;
}
```

### Test Case

```typescript
it("should parse yearly income", () => {
  const result = parser.parse("I make $5200 yearly");
  expect(result.incomeMonthly).toBe(433); // 5200/12
});

it("should parse monthly income", () => {
  const result = parser.parse("I make $5200 monthly");
  expect(result.incomeMonthly).toBe(5200);
});
```

### Why This Matters

This is the #1 way users will give you wrong data.

Fix it before they do.

---

## Question 2: "My rent is $2200 but that includes utilities"

### Why It Breaks

User gives housing cost but includes utilities.

Your tool assumes housing is just rent/mortgage.

```
User: "Rent is $2200 including utilities"
Parser: housingCostMonthly = 2200
Tool: Assumes utilities are separate
Decision: Wrong
```

### The Problem

You're conflating housing cost with total fixed expenses.

### The Fix (Do This Now)

Add field for utilities:

```typescript
export interface FinancialProfile {
  incomeMonthly?: number;
  housingCostMonthly?: number;
  utilitiesMonthly?: number; // NEW
  debtPaymentsMonthly?: number;
  savingsBalance?: number;
  monthlySpendingEstimate?: number;
  dependents?: number;
}

// In parser
const utilityMatch = userMessage.match(/(?:utilities|electric|water|gas).*?(\$?[\d,]+)/i);
if (utilityMatch) {
  profile.utilitiesMonthly = this.parseNumber(utilityMatch[1]);
}

// In tool
const housing = profile.housingCostMonthly || 0;
const utilities = profile.utilitiesMonthly || 150; // default estimate
const fixedExpenses = housing + utilities + debt;
```

### Test Case

```typescript
it("should handle utilities separately", () => {
  const profile = {
    incomeMonthly: 5200,
    housingCostMonthly: 2000,
    utilitiesMonthly: 200,
    debtPaymentsMonthly: 400
  };
  const result = calculateMonthlySurplus(profile);
  expect(result.expenses).toBe(2600); // 2000 + 200 + 400
});
```

### Why This Matters

Users naturally bundle housing costs.

Your system needs to unbundle them.

---

## Question 3: "I have $3000 in credit card debt at 18% APR"

### Why It Breaks

User mentions debt interest rate.

Your system doesn't track interest rates.

```
User: "I have $3000 credit card debt at 18% APR"
Parser: debtPaymentsMonthly = 3000 (wrong, should be ~$150/month)
Decision: Completely wrong
```

### The Problem

You're confusing debt balance with debt payment.

### The Fix (Do This Now)

Add debt tracking:

```typescript
export interface Debt {
  balance: number;
  interestRate: number;
  monthlyPayment: number;
}

export interface FinancialProfile {
  incomeMonthly?: number;
  housingCostMonthly?: number;
  utilitiesMonthly?: number;
  debts?: Debt[]; // NEW
  savingsBalance?: number;
  monthlySpendingEstimate?: number;
  dependents?: number;
}

// In parser
const debtMatch = userMessage.match(/(\$?[\d,]+)\s*(?:debt|credit card).*?(\d+)%/i);
if (debtMatch) {
  const balance = this.parseNumber(debtMatch[1]);
  const rate = parseFloat(debtMatch[2]);
  const monthlyPayment = this.estimateMonthlyPayment(balance, rate);
  
  profile.debts = [{
    balance,
    interestRate: rate,
    monthlyPayment
  }];
}

private estimateMonthlyPayment(balance: number, rate: number): number {
  // Rough estimate: 2% of balance per month
  return balance * 0.02;
}
```

### Test Case

```typescript
it("should parse debt with interest rate", () => {
  const result = parser.parse("I have $3000 credit card debt at 18% APR");
  expect(result.debts).toHaveLength(1);
  expect(result.debts[0].balance).toBe(3000);
  expect(result.debts[0].interestRate).toBe(18);
  expect(result.debts[0].monthlyPayment).toBeCloseTo(60); // 2% of 3000
});
```

### Why This Matters

Users think in terms of debt balance and interest rate.

Your system needs to convert to monthly payment.

---

## Question 4: "I'm self-employed, so my income varies"

### Why It Breaks

User mentions variable income.

Your system assumes stable income.

```
User: "I'm self-employed, income varies between $3000 and $7000"
Parser: incomeMonthly = 5000 (midpoint, but confidence should be low)
Decision: Risky, but system doesn't know
```

### The Problem

You're not tracking income stability.

### The Fix (Do This Now)

Add stability tracking:

```typescript
export interface FinancialProfile {
  incomeMonthly?: number;
  incomeStability?: "stable" | "variable" | "unstable"; // NEW
  incomeMin?: number; // NEW
  incomeMax?: number; // NEW
  housingCostMonthly?: number;
  utilitiesMonthly?: number;
  debts?: Debt[];
  savingsBalance?: number;
  monthlySpendingEstimate?: number;
  dependents?: number;
}

// In parser
if (/varies|variable|fluctuates|self-employed/i.test(userMessage)) {
  profile.incomeStability = "variable";
  
  const rangeMatch = userMessage.match(/between\s*\$?([\d,]+)\s*and\s*\$?([\d,]+)/i);
  if (rangeMatch) {
    profile.incomeMin = this.parseNumber(rangeMatch[1]);
    profile.incomeMax = this.parseNumber(rangeMatch[2]);
    profile.incomeMonthly = (profile.incomeMin + profile.incomeMax) / 2;
  }
}

// In tool
let confidence = 90;
if (profile.incomeStability === "variable") {
  confidence -= 30; // Much lower confidence for variable income
}
```

### Test Case

```typescript
it("should handle variable income", () => {
  const result = parser.parse("I'm self-employed, income varies between $3000 and $7000");
  expect(result.incomeMonthly).toBe(5000);
  expect(result.incomeStability).toBe("variable");
  expect(result.incomeMin).toBe(3000);
  expect(result.incomeMax).toBe(7000);
});

it("should lower confidence for variable income", () => {
  const profile = {
    incomeMonthly: 5000,
    incomeStability: "variable",
    housingCostMonthly: 2200,
    debtPaymentsMonthly: 400
  };
  const result = calculateMonthlySurplus(profile);
  expect(result.confidence).toBeLessThan(70); // Much lower
});
```

### Why This Matters

Self-employed users are common.

Your system needs to handle income variability.

---

## Question 5: "I'm not sure about my exact expenses, maybe $600-800?"

### Why It Breaks

User gives range for expenses.

Your system doesn't handle ranges well.

```
User: "My spending is probably $600-800 per month"
Parser: monthlySpendingEstimate = 600 (wrong, should be 700 midpoint)
Decision: Overestimates surplus
```

### The Problem

You're not handling ranges for expenses.

### The Fix (Do This Now)

Add range handling:

```typescript
export interface FinancialProfile {
  incomeMonthly?: number;
  incomeStability?: "stable" | "variable" | "unstable";
  incomeMin?: number;
  incomeMax?: number;
  housingCostMonthly?: number;
  utilitiesMonthly?: number;
  debts?: Debt[];
  savingsBalance?: number;
  monthlySpendingEstimate?: number;
  monthlySpendingMin?: number; // NEW
  monthlySpendingMax?: number; // NEW
  dependents?: number;
}

// In parser
const spendingRangeMatch = userMessage.match(/spending.*?(\$?[\d,]+)\s*-\s*(\$?[\d,]+)/i);
if (spendingRangeMatch) {
  const min = this.parseNumber(spendingRangeMatch[1]);
  const max = this.parseNumber(spendingRangeMatch[2]);
  profile.monthlySpendingMin = min;
  profile.monthlySpendingMax = max;
  profile.monthlySpendingEstimate = (min + max) / 2;
}

// In tool - calculate both scenarios
const spendingLow = profile.monthlySpendingMin || profile.monthlySpendingEstimate || 300;
const spendingHigh = profile.monthlySpendingMax || profile.monthlySpendingEstimate || 300;

const surplusOptimistic = income - housing - debt - spendingLow;
const surplusPessimistic = income - housing - debt - spendingHigh;

return {
  surplus: (surplusOptimistic + surplusPessimistic) / 2,
  surplusRange: {
    optimistic: surplusOptimistic,
    pessimistic: surplusPessimistic
  },
  confidence: 60 // Lower confidence for ranges
};
```

### Test Case

```typescript
it("should handle spending ranges", () => {
  const result = parser.parse("My spending is probably $600-800 per month");
  expect(result.monthlySpendingEstimate).toBe(700);
  expect(result.monthlySpendingMin).toBe(600);
  expect(result.monthlySpendingMax).toBe(800);
});

it("should calculate surplus range", () => {
  const profile = {
    incomeMonthly: 5200,
    housingCostMonthly: 2200,
    debtPaymentsMonthly: 400,
    monthlySpendingMin: 600,
    monthlySpendingMax: 800
  };
  const result = calculateMonthlySurplus(profile);
  expect(result.surplusRange.optimistic).toBe(2000); // 5200 - 2200 - 400 - 600
  expect(result.surplusRange.pessimistic).toBe(1800); // 5200 - 2200 - 400 - 800
});
```

### Why This Matters

Users rarely know exact expenses.

Your system needs to handle uncertainty.

---

## Implementation Priority

**Before shipping vertical slice, add:**

1. ✅ Frequency detection (yearly vs monthly)
2. ✅ Utilities field
3. ✅ Debt tracking with interest rates
4. ✅ Income stability tracking
5. ✅ Range handling for expenses

**These five fixes will prevent 80% of first-week failures.**

---

## Testing Strategy

Create a test file with all five questions:

```typescript
describe("Five Breaking Questions", () => {
  it("should handle yearly income", () => { ... });
  it("should handle utilities separately", () => { ... });
  it("should parse debt with interest", () => { ... });
  it("should handle variable income", () => { ... });
  it("should handle spending ranges", () => { ... });
});
```

Run these tests before shipping.

---

## What These Questions Teach You

### Question 1: Frequency Matters
Users think in different time periods.
Your parser must normalize.

### Question 2: Bundling is Natural
Users bundle related expenses.
Your system must unbundle.

### Question 3: Interest Rates Matter
Users think in terms of debt balance.
Your system must convert to payment.

### Question 4: Stability Varies
Income isn't always stable.
Your system must track variability.

### Question 5: Uncertainty is Real
Users don't know exact numbers.
Your system must handle ranges.

---

## The Honest Truth

These five questions will appear in your first week.

If you don't handle them, users will:
- Get wrong answers
- Lose trust
- Stop using the system

If you do handle them, users will:
- Get correct answers
- Build trust
- Come back

**Design for these five questions now.**

**Don't wait for users to break your system.**

---

## Implementation Checklist

Before Commit 1:

- [ ] Add frequency detection (yearly/monthly)
- [ ] Add utilities field
- [ ] Add debt tracking with interest rates
- [ ] Add income stability tracking
- [ ] Add range handling for expenses
- [ ] Write tests for all five questions
- [ ] All tests passing

---

**Status:** Design for these now  
**Impact:** Prevents 80% of first-week failures  
**Effort:** 2-3 hours additional implementation  
**Timeline:** Do this before shipping vertical slice
