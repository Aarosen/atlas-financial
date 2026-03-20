import type { FinancialSnapshot } from '@/lib/ai/financialExtractor';

export interface CalculationResult {
  monthlySurplus: number;
  emergencyFund: {
    target3Month: number;
    target6Month: number;
    currentGap: number;
    monthsAtFullSurplus: number | null;
    recommendedMonthly: number;
  } | null;
  debtPayoff: {
    highestRateDebt: { name: string; rate: number; balance: number } | null;
    monthlyInterestCost: number;
    avalancheOrder: string[];
  } | null;
  oneAction: string;
}

export function runCalculations(data: Partial<FinancialSnapshot>): CalculationResult | null {
  if (data.monthlyIncome === undefined && data.monthlyIncome !== 0) return null;
  if (data.monthlyFixedExpenses === undefined && data.monthlyFixedExpenses !== 0) return null;

  const monthlyIncome = data.monthlyIncome ?? 0;
  const fixedExpenses = data.monthlyFixedExpenses ?? 0;
  const variableExpenses = data.monthlyVariableExpenses ?? 0;
  const totalExpenses = fixedExpenses + variableExpenses;
  const monthlySurplus = monthlyIncome - totalExpenses;
  const savings = data.currentSavings ?? 0;

  // Emergency fund calculation
  const efTarget3 = totalExpenses * 3;
  const efTarget6 = totalExpenses * 6;
  const efGap = Math.max(0, efTarget3 - savings);
  const efMonths = monthlySurplus > 0 ? efGap / monthlySurplus : null;
  const efRecommended = monthlySurplus > 0
    ? Math.min(Math.round(monthlySurplus * 0.7), efGap)
    : 0;

  // Debt calculation
  const debts = data.debts ?? [];
  const sortedDebts = [...debts].sort((a, b) => b.rate - a.rate);
  const monthlyInterest = debts.reduce(
    (sum, d) => sum + (d.balance * d.rate / 100 / 12), 0
  );
  const highestRate = sortedDebts[0] || null;

  // One action
  let oneAction = '';
  if (efGap > 0 && monthlySurplus > 0) {
    oneAction = `Direct $${Math.round(efRecommended)}/month to a dedicated savings account until your $${Math.round(efTarget3)} emergency fund is built.`;
  } else if (highestRate && monthlySurplus > 0) {
    oneAction = `Put an extra $${Math.round(Math.min(monthlySurplus * 0.8, highestRate.balance))}/month toward your ${highestRate.name} at ${highestRate.rate}% — that's your highest-cost debt.`;
  } else if (monthlySurplus <= 0) {
    oneAction = 'Identify one expense to cut this week to create any surplus — even $50/month is a start.';
  }

  return {
    monthlySurplus: Math.round(monthlySurplus),
    emergencyFund: efGap > 0 ? {
      target3Month: Math.round(efTarget3),
      target6Month: Math.round(efTarget6),
      currentGap: Math.round(efGap),
      monthsAtFullSurplus: efMonths ? Math.round(efMonths * 10) / 10 : null,
      recommendedMonthly: Math.round(efRecommended),
    } : null,
    debtPayoff: debts.length > 0 ? {
      highestRateDebt: highestRate
        ? { name: highestRate.name, rate: highestRate.rate, balance: Math.round(highestRate.balance) }
        : null,
      monthlyInterestCost: Math.round(monthlyInterest * 100) / 100,
      avalancheOrder: sortedDebts.map(d => d.name),
    } : null,
    oneAction,
  };
}

export function formatCalculationBlock(result: CalculationResult): string {
  if (!result) return '';
  const ef = result.emergencyFund;
  const dp = result.debtPayoff;
  return [
    '[CALCULATION_RESULTS — use these exact numbers in your response]',
    `Monthly surplus: $${result.monthlySurplus}`,
    ef ? `Emergency fund: target=$${ef.target3Month} (3mo) / $${ef.target6Month} (6mo), gap=$${ef.currentGap}, recommended_monthly=$${ef.recommendedMonthly}, months_to_goal=${ef.monthsAtFullSurplus ?? 'N/A'}` : '',
    dp?.highestRateDebt ? `Highest-rate debt: ${dp.highestRateDebt.name} @ ${dp.highestRateDebt.rate}%, balance=$${dp.highestRateDebt.balance}, monthly_interest_cost=$${dp.monthlyInterestCost}` : '',
    dp?.avalancheOrder?.length ? `Debt payoff order (avalanche): ${dp.avalancheOrder.join(' → ')}` : '',
    `Recommended action: ${result.oneAction}`,
    '[END_CALCULATIONS]',
  ].filter(Boolean).join('\n');
}
