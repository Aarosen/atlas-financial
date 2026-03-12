export interface FinancialToolkitInput {
  monthlyIncome?: number;
  essentialExpenses?: number;
  discretionaryExpenses?: number;
  totalSavings?: number;
  highInterestDebt?: number;
  lowInterestDebt?: number;
  monthlyDebtPayments?: number;
  savingsGoal?: number;
}

export interface FinancialToolkitSummary {
  monthlySavings?: number;
  savingsRate?: number;
  emergencyFundMonths?: number;
  debtToIncomeRatio?: number;
  debtPayoffMonths?: number;
  savingsGoalMonths?: number;
}

function clamp(value: number) {
  return Number.isFinite(value) ? value : 0;
}

export function calculateDebtPayoffMonths(
  principal: number,
  annualRate: number,
  monthlyPayment: number
): number {
  const r = annualRate / 12;
  if (r === 0) return Math.ceil(principal / monthlyPayment);
  if (monthlyPayment <= principal * r) return Infinity;
  return Math.log(monthlyPayment / (monthlyPayment - principal * r)) / Math.log(1 + r);
}

export function calculateSavingsTimeline(goal: number, monthlySavings: number): number | undefined {
  if (goal <= 0 || monthlySavings <= 0) return undefined;
  return goal / monthlySavings;
}

export function buildToolkitSummary(input: FinancialToolkitInput): FinancialToolkitSummary {
  const income = clamp(input.monthlyIncome ?? 0);
  const essentials = clamp(input.essentialExpenses ?? 0);
  const discretionary = clamp(input.discretionaryExpenses ?? 0);
  const debtPayments = clamp(input.monthlyDebtPayments ?? 0);
  const savings = clamp(input.totalSavings ?? 0);
  const highDebt = clamp(input.highInterestDebt ?? 0);
  const lowDebt = clamp(input.lowInterestDebt ?? 0);

  const monthlySavings = income ? income - essentials - discretionary - debtPayments : undefined;
  const savingsRate = income && monthlySavings !== undefined ? (monthlySavings / income) * 100 : undefined;
  const emergencyFundMonths = essentials > 0 ? savings / essentials : undefined;
  const debtToIncomeRatio = income > 0 ? (highDebt + lowDebt) / (income * 12) : undefined;
  const debtPayoffMonths =
    highDebt > 0 && input.monthlyDebtPayments
      ? calculateDebtPayoffMonths(highDebt, 0.22, input.monthlyDebtPayments)
      : undefined;
  const savingsGoalMonths =
    input.savingsGoal && monthlySavings && monthlySavings > 0
      ? calculateSavingsTimeline(input.savingsGoal, monthlySavings)
      : undefined;

  return {
    monthlySavings,
    savingsRate,
    emergencyFundMonths,
    debtToIncomeRatio,
    debtPayoffMonths,
    savingsGoalMonths,
  };
}

export function buildToolkitContext(input: FinancialToolkitInput): string | null {
  const summary = buildToolkitSummary(input);
  const lines: string[] = [];

  if (summary.monthlySavings !== undefined) {
    lines.push(`monthly_savings_estimate: $${summary.monthlySavings.toFixed(0)}`);
  }
  if (summary.savingsRate !== undefined) {
    lines.push(`savings_rate: ${summary.savingsRate.toFixed(1)}% of income`);
  }
  if (summary.emergencyFundMonths !== undefined) {
    lines.push(`emergency_fund_months: ${summary.emergencyFundMonths.toFixed(2)}`);
  }
  if (summary.debtToIncomeRatio !== undefined) {
    lines.push(`debt_to_income_ratio: ${(summary.debtToIncomeRatio * 100).toFixed(1)}%`);
  }
  if (summary.debtPayoffMonths !== undefined && Number.isFinite(summary.debtPayoffMonths)) {
    lines.push(`debt_payoff_months_estimate: ${summary.debtPayoffMonths.toFixed(1)}`);
  }
  if (summary.savingsGoalMonths !== undefined) {
    lines.push(`savings_goal_months_estimate: ${summary.savingsGoalMonths.toFixed(1)}`);
  }

  return lines.length > 0 ? lines.join("\n") : null;
}
