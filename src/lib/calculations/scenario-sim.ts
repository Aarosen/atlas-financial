import type { FinancialProfile } from '@/lib/types/profile';
import { calculateEmergencyFund } from './emergency-fund';
import { calculateDebtPayoff } from './debt-payoff';
import { calculateCashflow } from './cashflow';

export type ScenarioType =
  | 'income_increase'
  | 'income_decrease'
  | 'income_loss'
  | 'new_expense'
  | 'expense_removed'
  | 'new_debt'
  | 'debt_paid_off'
  | 'major_purchase'
  | 'job_change';

export interface ScenarioResult {
  scenarioLabel: string;
  surplusDelta: number;
  efTimelineDelta: number | null;
  debtPayoffDelta: number | null;
  recommendation: string;
}

export function runScenario(
  profile: FinancialProfile,
  scenario: { type: ScenarioType; value: number; label: string }
): ScenarioResult {
  const modified = { ...profile };

  switch (scenario.type) {
    case 'income_increase':
      modified.monthly_income = (profile.monthly_income ?? 0) + scenario.value;
      break;
    case 'income_decrease':
      modified.monthly_income = Math.max(0, (profile.monthly_income ?? 0) - scenario.value);
      break;
    case 'income_loss':
      modified.monthly_income = 0;
      break;
    case 'new_expense':
      modified.monthly_fixed_expenses = (profile.monthly_fixed_expenses ?? 0) + scenario.value;
      break;
    case 'expense_removed':
      modified.monthly_fixed_expenses = Math.max(
        0,
        (profile.monthly_fixed_expenses ?? 0) - scenario.value
      );
      break;
    case 'major_purchase':
      modified.total_savings = Math.max(0, (profile.total_savings ?? 0) - scenario.value);
      break;
  }

  const beforeCashflow = calculateCashflow(profile);
  const afterCashflow = calculateCashflow(modified);

  const surplusDelta = (afterCashflow?.monthlySurplus ?? 0) - (beforeCashflow?.monthlySurplus ?? 0);

  const beforeEF = calculateEmergencyFund(profile);
  const afterEF = calculateEmergencyFund(modified);
  const efTimelineDelta = (afterEF?.monthsAtRecommended ?? 0) - (beforeEF?.monthsAtRecommended ?? 0);

  const beforeDebt = calculateDebtPayoff(profile);
  const afterDebt = calculateDebtPayoff(modified);
  const debtPayoffDelta = (afterDebt?.avalancheMonths ?? 0) - (beforeDebt?.avalancheMonths ?? 0);

  let recommendation = '';
  if (surplusDelta > 0) {
    recommendation = `This scenario improves your monthly surplus by $${Math.abs(surplusDelta)}. Direct this toward your emergency fund or highest-rate debt.`;
  } else if (surplusDelta < 0) {
    recommendation = `This scenario reduces your monthly surplus by $${Math.abs(surplusDelta)}. Review your budget to offset this impact.`;
  } else {
    recommendation = 'This scenario keeps your monthly surplus unchanged.';
  }

  return {
    scenarioLabel: scenario.label,
    surplusDelta,
    efTimelineDelta: efTimelineDelta !== 0 ? efTimelineDelta : null,
    debtPayoffDelta: debtPayoffDelta !== 0 ? debtPayoffDelta : null,
    recommendation,
  };
}
