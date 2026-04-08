/**
 * Generates comparison data for all 5 levers with user-specific numbers.
 * Used in "Discuss other options" to show alternative lever choices.
 */

import type { FinancialState } from '@/lib/state/types';
import { calculateDebtPayoff, calculateMonthlyDebtPayment } from './recommendationBodyGenerator';

export interface LeverComparisonData {
  lever: string;
  name: string;
  explanation: string;
  keyMetric: string;
  keyValue: string;
  timelineMonths?: number;
}

export function generateLeverComparison(fin: Partial<FinancialState>): LeverComparisonData[] {
  const income = fin.monthlyIncome || 0;
  const expenses = fin.essentialExpenses || 0;
  const savings = fin.totalSavings || 0;
  const highDebt = fin.highInterestDebt || 0;
  const lowDebt = fin.lowInterestDebt || 0;
  const surplus = income - expenses;
  
  // AUDIT 15 FIX DEFECT-15-NEG-CASHFLOW-502: Guard against negative cashflow in all calculations
  const isNegativeCashflow = surplus < 0;
  const deficit = isNegativeCashflow ? Math.abs(surplus) : 0;
  const safeSurplus = Math.max(0, surplus); // Use 0 for negative cashflow in calculations

  // AUDIT 11 FIX DEFECT-01 & DEFECT-05: Use extracted APR if available, convert from percentage to decimal
  const aprPct = fin.highInterestDebtAPR ?? null;
  const apr = aprPct !== null ? aprPct / 100 : 0.23;

  // Emergency fund calculations
  const emergencyTarget3mo = expenses * 3;
  const emergencyGap = Math.max(0, emergencyTarget3mo - savings);
  const emergencyMonthly = safeSurplus > 0 ? Math.min(safeSurplus * 0.3, emergencyGap / 12) : 0;
  // AUDIT 17 FIX GAP-17-CUSHION-CALC: Fix months calculation to use gap, not target
  const emergencyMonths = emergencyGap === 0 ? 0 : (emergencyMonthly > 0 ? Math.ceil(emergencyGap / emergencyMonthly) : 0);

  // AUDIT 12 FIX DEFECT-07: Use shared utility for consistent debt payoff calculation
  // AUDIT 15 FIX: Use safeSurplus to prevent negative payment calculations
  const highDebtMonthly = highDebt > 0 ? calculateMonthlyDebtPayment(safeSurplus) : 0;
  const highDebtPayoffResult = calculateDebtPayoff(highDebt, highDebtMonthly);
  const highDebtMonths = highDebtPayoffResult.months;
  const highDebtMonthlyInterest = Math.round((highDebt * apr) / 12);

  // Discretionary optimization
  const discretionaryEstimate = Math.max(0, safeSurplus * 0.3);

  // Future allocation (savings/investment)
  const futureMonthly = safeSurplus > 0 ? safeSurplus * 0.5 : 0;
  const futureMonths = futureMonthly > 0 ? 1 : 0; // Can start immediately

  // AUDIT 14 FIX GAP-01: Retirement contributions calculation
  const retirementSavings = fin.retirementSavings || 0;
  const recommendedRetirementRate = 0.15; // 15% of gross income
  const recommendedRetirementMonthly = Math.round(income * recommendedRetirementRate);
  // AUDIT 15 FIX: Don't suggest retirement contributions when in negative cashflow
  const retirementDesc = isNegativeCashflow
    ? `You're in a deficit situation. Focus on stabilizing cashflow first, then retirement contributions.`
    : retirementSavings > 0
    ? `You have $${retirementSavings.toLocaleString()} in retirement accounts. With $${safeSurplus.toLocaleString()}/month available, consider maximizing tax-advantaged contributions (401k, IRA) first, then taxable brokerage.`
    : `You don't have retirement savings yet. With $${safeSurplus.toLocaleString()}/month available, starting a 401k or IRA is a powerful long-term move.`;

  // AUDIT 12 FIX DEFECT-10: Make stabilize_cashflow description data-driven based on surplus ratio
  const surplusRatio = income > 0 ? surplus / income : 0;
  const cashflowDesc = surplus < 0
    ? `You're spending $${deficit.toLocaleString()} more than you make each month. Closing this gap is the foundation of any financial plan.`
    : surplusRatio < 0.10
    ? `Your monthly surplus is tight — only $${surplus.toLocaleString()}/month after essentials. Protecting this buffer is priority one.`
    : `You have a $${surplus.toLocaleString()}/month surplus after essentials. Maintaining this cushion protects all other goals.`;

  const levers: LeverComparisonData[] = [
    // AUDIT 16 FIX P3-POLISH: Only show stabilize_cashflow lever if cashflow is actually problematic
    // Don't show for users with healthy positive surplus (>15% of income)
    ...(surplus < 0 || surplusRatio < 0.15 ? [{
      lever: 'stabilize_cashflow',
      name: 'Stabilize Cashflow',
      explanation: cashflowDesc,
      keyMetric: 'Monthly surplus',
      keyValue: `$${Math.abs(surplus).toLocaleString()}`,
      timelineMonths: 1,
    }] : []),
    // AUDIT 15 FIX DEFECT-15B-GHOST-LEVER: Only show debt lever if user has actual high-interest debt
    ...(highDebt > 0 ? [{
      lever: 'eliminate_high_interest_debt',
      name: 'Eliminate High-Interest Debt',
      explanation: `You have $${highDebt.toLocaleString()} in high-interest debt costing ~$${highDebtMonthlyInterest.toLocaleString()}/month in interest. Paying this down first is the highest guaranteed return.`,
      keyMetric: 'Payoff timeline',
      keyValue: `${highDebtMonths} months at $${Math.round(highDebtMonthly).toLocaleString()}/month`,
      timelineMonths: highDebtMonths,
    }] : []),
    // AUDIT 16 FIX P3-POLISH: Only show cushion lever if cushion is not already fully funded
    ...(savings < emergencyTarget3mo ? [{
      lever: 'build_emergency_buffer',
      name: 'Build Emergency Cushion',
      explanation: `Your emergency fund is ${savings > emergencyTarget3mo ? 'solid' : `${Math.round(savings / expenses)}-month cushion`}. The professional standard is 3-6 months of essentials.`,
      keyMetric: 'Target cushion',
      keyValue: `$${emergencyTarget3mo.toLocaleString()} (${emergencyMonths} months to build)`,
      timelineMonths: emergencyMonths,
    }] : []),
    {
      lever: 'optimize_discretionary_spend',
      name: 'Optimize Discretionary Spend',
      explanation: `You likely have ~$${Math.round(discretionaryEstimate).toLocaleString()}/month in discretionary spending. Optimizing this creates fuel for other goals.`,
      keyMetric: 'Potential monthly fuel',
      keyValue: `$${Math.round(discretionaryEstimate).toLocaleString()}`,
      timelineMonths: 1,
    },
    {
      lever: 'increase_future_allocation',
      name: 'Grow Future Savings',
      explanation: retirementSavings > 0
        ? `You have $${retirementSavings.toLocaleString()} in retirement accounts — a good start. With $${Math.round(futureMonthly).toLocaleString()}/month available for long-term growth, consider maximizing tax-advantaged contributions (401k, IRA) first, then taxable brokerage.`
        : `With positive cashflow and foundation in place, you can allocate $${Math.round(futureMonthly).toLocaleString()}/month to investments and long-term growth.`,
      keyMetric: 'Monthly allocation',
      keyValue: `$${Math.round(futureMonthly).toLocaleString()}`,
      timelineMonths: futureMonths,
    },
    ...(retirementSavings !== null && retirementSavings !== undefined ? [{
      lever: 'maximize_retirement_contributions',
      name: 'Maximize Retirement Contributions',
      explanation: retirementDesc,
      keyMetric: 'Recommended monthly',
      keyValue: `$${recommendedRetirementMonthly.toLocaleString()} (15% of income)`,
      timelineMonths: 1,
    }] : []),
  ];
  
  return levers;
}

/**
 * Get a specific lever's comparison data.
 */
export function getLeverComparison(lever: string, fin: FinancialState): LeverComparisonData | undefined {
  const comparisons = generateLeverComparison(fin);
  return comparisons.find((c) => c.lever === lever);
}
