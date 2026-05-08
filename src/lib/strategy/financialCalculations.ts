/**
 * Atlas financial calculation primitives.
 *
 * Every threshold and definition in this file is mirrored in
 * docs/financial-definitions.md. Do not change a threshold here without
 * updating that file AND adding a regression test in the matching
 * __tests__ file. Silent threshold drift is the single highest trust
 * risk in this product.
 */

/**
 * Debt-to-Income ratio, computed per CFPB / Fannie Mae definition.
 *
 * Formula: monthly debt payments / gross monthly income
 *
 * NOT the prior (incorrect) definition of (debt balances / annual income).
 * The prior definition produced a number ~3-12x smaller than the regulatory
 * one for typical users, silently mis-tiering everyone.
 *
 * References:
 *   CFPB: https://www.consumerfinance.gov/ask-cfpb/what-is-a-debt-to-income-ratio-en-1791/
 *   Fannie Mae Selling Guide B3-6-02 (DTI Ratios).
 *
 * @param monthlyDebtPayments  Sum of all required minimum monthly payments
 *                             across credit cards, auto loans, student loans,
 *                             personal loans, mortgage P&I+T+I, child support,
 *                             alimony. Excludes utilities, groceries, insurance
 *                             premiums for non-mortgage policies, taxes (other
 *                             than property tax inside PITI).
 * @param monthlyIncome        Gross monthly income (pre-tax). For salaried
 *                             users, annual salary / 12. For variable income,
 *                             trailing 12-month average.
 * @returns                    DTI as a decimal (0.36 = 36%). Returns 0 when
 *                             income is missing or zero (defensive default —
 *                             do NOT use 0 as "low DTI" signal anywhere).
 */
export function calcDti(monthlyDebtPayments: number, monthlyIncome: number): number {
  if (!monthlyIncome || monthlyIncome <= 0) return 0;
  if (!monthlyDebtPayments || monthlyDebtPayments < 0) return 0;
  return monthlyDebtPayments / monthlyIncome;
}

/**
 * Optional convenience: standardized DTI tiers used by Atlas's strategy engine.
 * Aligned with mainstream lender thresholds (CFPB rule of thumb / Fannie Mae
 * conventional underwriting). Do NOT silently shift these without an eval run.
 */
export type DtiTier = 'healthy' | 'manageable' | 'stretched' | 'distressed';

export function dtiTier(dti: number): DtiTier {
  if (dti < 0.20) return 'healthy';
  if (dti < 0.36) return 'manageable';
  if (dti < 0.43) return 'stretched';
  return 'distressed';
}

/**
 * Emergency fund coverage in months of essential expenses.
 *
 * Formula: totalSavings / essentialExpenses
 *
 * @param totalSavings         Total liquid savings available
 * @param essentialExpenses    Monthly essential expenses (housing, utilities, food, insurance)
 * @returns                    Number of months of coverage. Returns null if essentialExpenses is 0.
 */
export function calcEmergencyFundMonths(totalSavings: number, essentialExpenses: number): number | null {
  if (!essentialExpenses || essentialExpenses <= 0) return null;
  if (!totalSavings || totalSavings < 0) return 0;
  return totalSavings / essentialExpenses;
}

/**
 * Savings rate as a percentage of gross income.
 *
 * Formula: (monthlyIncome - essentialExpenses - discretionaryExpenses) / monthlyIncome
 *
 * @param monthlyIncome        Gross monthly income
 * @param essentialExpenses    Monthly essential expenses
 * @param discretionaryExpenses Monthly discretionary/optional expenses (can be undefined)
 * @returns                    Object with value (0.30 = 30%) and confidence flag
 */
export interface SavingsRateResult {
  value: number;
  confidence: 'full' | 'partial'; // 'partial' if discretionary was undefined
}

export function calcSavingsRate(input: {
  monthlyIncome: number;
  essentialExpenses: number;
  discretionaryExpenses?: number;
}): SavingsRateResult {
  const { monthlyIncome, essentialExpenses, discretionaryExpenses } = input;
  if (!monthlyIncome || monthlyIncome <= 0) return { value: 0, confidence: 'full' };

  const discretionary = discretionaryExpenses ?? 0;
  const savings = monthlyIncome - essentialExpenses - discretionary;
  const rate = savings / monthlyIncome;

  return {
    value: Math.max(0, rate),
    confidence: discretionaryExpenses === undefined ? 'partial' : 'full',
  };
}

/**
 * Disposable income after essential expenses and debt payments.
 *
 * Formula: monthlyIncome - essentialExpenses - monthlyDebtPayments
 *
 * @param monthlyIncome        Gross monthly income
 * @param essentialExpenses    Monthly essential expenses
 * @param monthlyDebtPayments  Required monthly debt payments
 * @returns                    Disposable income in dollars (can be negative)
 */
export function calcDisposableIncome(
  monthlyIncome: number,
  essentialExpenses: number,
  monthlyDebtPayments: number
): number {
  return monthlyIncome - essentialExpenses - monthlyDebtPayments;
}
