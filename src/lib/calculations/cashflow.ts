import type { FinancialProfile } from '@/lib/types/profile';

export interface CashflowResult {
  monthlySurplus: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  surplusPercentage: number;
  cashflowHealth: 'critical' | 'warning' | 'healthy' | 'strong';
  expenseBreakdown: {
    fixed: number;
    variable: number;
  };
}

export function calculateCashflow(p: FinancialProfile): CashflowResult | null {
  if (p.monthly_income === null || p.monthly_fixed_expenses === null) return null;

  const monthlyIncome = p.monthly_income;
  const fixedExpenses = p.monthly_fixed_expenses ?? 0;
  const variableExpenses = p.monthly_variable_expenses ?? 0;
  const monthlyExpenses = fixedExpenses + variableExpenses;
  const monthlySurplus = monthlyIncome - monthlyExpenses;
  const surplusPercentage = (monthlySurplus / monthlyIncome) * 100;

  let cashflowHealth: 'critical' | 'warning' | 'healthy' | 'strong';
  if (monthlySurplus < 0) cashflowHealth = 'critical';
  else if (surplusPercentage < 5) cashflowHealth = 'warning';
  else if (surplusPercentage < 15) cashflowHealth = 'healthy';
  else cashflowHealth = 'strong';

  return {
    monthlySurplus: Math.round(monthlySurplus),
    monthlyIncome: Math.round(monthlyIncome),
    monthlyExpenses: Math.round(monthlyExpenses),
    surplusPercentage: Math.round(surplusPercentage),
    cashflowHealth,
    expenseBreakdown: {
      fixed: Math.round(fixedExpenses),
      variable: Math.round(variableExpenses),
    },
  };
}
