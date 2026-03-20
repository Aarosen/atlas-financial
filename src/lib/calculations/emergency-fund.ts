import type { FinancialProfile } from '@/lib/types/profile';

export interface EmergencyFundResult {
  totalMonthlyExpenses: number;
  target3Month: number;
  target6Month: number;
  currentSavings: number;
  gap: number;
  funded3MonthPct: number;
  recommendedMonthly: number;
  monthsAtRecommended: number | null;
  monthsAtFullSurplus: number | null;
  isFullyFunded: boolean;
}

export function calculateEmergencyFund(p: FinancialProfile): EmergencyFundResult | null {
  if (p.monthly_fixed_expenses === null) return null;

  const totalMonthlyExpenses =
    (p.monthly_fixed_expenses ?? 0) + (p.monthly_variable_expenses ?? 0);
  const savings = p.total_savings ?? 0;
  const surplus = (p.monthly_income ?? 0) - totalMonthlyExpenses;

  const target3Month = totalMonthlyExpenses * 3;
  const target6Month = totalMonthlyExpenses * 6;
  const gap = Math.max(0, target3Month - savings);
  const funded3MonthPct = Math.min(savings / target3Month, 1);

  const recommendedMonthly =
    surplus > 0 ? Math.min(Math.round(surplus * 0.7), gap) : 0;
  const monthsAtRecommended =
    recommendedMonthly > 0 ? gap / recommendedMonthly : null;
  const monthsAtFullSurplus = surplus > 0 ? gap / surplus : null;

  return {
    totalMonthlyExpenses: Math.round(totalMonthlyExpenses),
    target3Month: Math.round(target3Month),
    target6Month: Math.round(target6Month),
    currentSavings: Math.round(savings),
    gap: Math.round(gap),
    funded3MonthPct: Math.round(funded3MonthPct * 100),
    recommendedMonthly: Math.round(recommendedMonthly),
    monthsAtRecommended: monthsAtRecommended
      ? Math.round(monthsAtRecommended * 10) / 10
      : null,
    monthsAtFullSurplus: monthsAtFullSurplus
      ? Math.round(monthsAtFullSurplus * 10) / 10
      : null,
    isFullyFunded: gap <= 0,
  };
}
