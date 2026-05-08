# Atlas — Financial Definitions Reference

Every numeric threshold or ratio Atlas uses for tiering or recommendations
is defined here with its source. If you change a definition, update this
file in the same PR and add a regression test.

| Metric | Atlas definition | Source | Tier thresholds |
|---|---|---|---|
| `dti` | monthly debt payments / gross monthly income | CFPB | <0.20 healthy, <0.36 manageable, <0.43 stretched, ≥0.43 distressed |
| `emergencyFundMonths` | totalSavings / essentialExpenses | CFPB consumer guidance | <1 critical, <3 thin, <6 building, ≥6 funded |
| `savingsRate` | (monthlyIncome − essentialExpenses − discretionaryExpenses) / monthlyIncome | Atlas convention | <0 negative, <0.05 low, <0.20 typical, ≥0.20 strong |
| `disposableIncome` | monthlyIncome − essentialExpenses − monthlyDebtPayments | Atlas convention | absolute $ value; not tiered |
| `highInterestApr` | APR ≥ 8% (default; user can override per-debt) | Atlas convention; close to CFPB usage of "high-cost credit" | n/a |
| `bufferTarget` | 6× essentialExpenses if dependents>0 OR variable income; else 3× | Atlas convention | n/a |

## Key Regulatory References

### CFPB DTI Definition
- **Source:** https://www.consumerfinance.gov/ask-cfpb/what-is-a-debt-to-income-ratio-en-1791/
- **Formula:** Monthly debt payments / Gross monthly income
- **Includes:** Credit card minimums, auto loans, student loans, mortgage P&I+T+I, child support, alimony
- **Excludes:** Utilities, groceries, insurance premiums (non-mortgage), taxes (except property tax in PITI)

### Fannie Mae Conventional Underwriting
- **Source:** Fannie Mae Selling Guide B3-6-02
- **Front-end ratio:** 28% (housing payment / gross income)
- **Back-end ratio:** 36% (all debt payments / gross income)
- **Atlas uses:** Back-end ratio (36% threshold for "manageable")

### Emergency Fund Guidance
- **CFPB:** 3–6 months of essential expenses
- **Atlas tiers:** <1 month = critical, <3 = thin, <6 = building, ≥6 = funded

## Last Reviewed
**2026-05-07** (Aaron)

## Change Log
- 2026-05-07: Initial definitions document. DTI corrected from balance/annual to payments/monthly.
