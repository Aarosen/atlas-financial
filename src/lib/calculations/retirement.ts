import type { FinancialProfile } from '@/lib/types/profile';

export interface RetirementResult {
  currentTrajectory: string;
  fireNumber: number;
  yearsToFire: number | null;
  monthlyGapToFire: number;
  retirementContribution: number;
  recommendedContribution: number;
}

export function calculateRetirement(p: FinancialProfile): RetirementResult | null {
  if (p.monthly_income === null) return null;

  const monthlyIncome = p.monthly_income;
  const monthlySurplus =
    monthlyIncome - (p.monthly_fixed_expenses ?? 0) - (p.monthly_variable_expenses ?? 0);
  const currentSavings = p.total_savings ?? 0;

  // FIRE number: 25x annual expenses (4% rule)
  const annualExpenses = ((p.monthly_fixed_expenses ?? 0) + (p.monthly_variable_expenses ?? 0)) * 12;
  const fireNumber = annualExpenses * 25;

  const yearsToFire =
    monthlySurplus > 0 ? (fireNumber - currentSavings) / (monthlySurplus * 12) : null;

  const recommendedContribution = Math.round(monthlySurplus * 0.15);
  const currentContribution = p.retirement_contribution_rate ?? 0;
  const monthlyGapToFire = Math.max(0, recommendedContribution - currentContribution);

  let currentTrajectory = 'off_track';
  if (yearsToFire && yearsToFire <= 10) currentTrajectory = 'on_track';
  else if (yearsToFire && yearsToFire <= 20) currentTrajectory = 'moderate';

  return {
    currentTrajectory,
    fireNumber: Math.round(fireNumber),
    yearsToFire: yearsToFire ? Math.round(yearsToFire * 10) / 10 : null,
    monthlyGapToFire: Math.round(monthlyGapToFire),
    retirementContribution: Math.round(currentContribution),
    recommendedContribution: Math.round(recommendedContribution),
  };
}
