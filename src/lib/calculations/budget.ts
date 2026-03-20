import type { FinancialProfile } from '@/lib/types/profile';

export interface BudgetResult {
  monthlyIncome: number;
  totalExpenses: number;
  discretionaryAvailable: number;
  expenseRatio: number;
  budgetHealthScore: number;
  suggestedCuts: Array<{ category: string; amount: number; reason: string }>;
}

export function calculateBudget(p: FinancialProfile): BudgetResult | null {
  if (p.monthly_income === null || p.monthly_fixed_expenses === null) return null;

  const monthlyIncome = p.monthly_income;
  const fixedExpenses = p.monthly_fixed_expenses ?? 0;
  const variableExpenses = p.monthly_variable_expenses ?? 0;
  const totalExpenses = fixedExpenses + variableExpenses;
  const discretionaryAvailable = monthlyIncome - totalExpenses;
  const expenseRatio = (totalExpenses / monthlyIncome) * 100;

  let budgetHealthScore = 100;
  if (expenseRatio > 90) budgetHealthScore = 20;
  else if (expenseRatio > 80) budgetHealthScore = 40;
  else if (expenseRatio > 70) budgetHealthScore = 60;
  else if (expenseRatio > 50) budgetHealthScore = 80;

  const suggestedCuts: Array<{ category: string; amount: number; reason: string }> = [];
  if (discretionaryAvailable < 0) {
    const deficit = Math.abs(discretionaryAvailable);
    suggestedCuts.push({
      category: 'Variable Expenses',
      amount: Math.round(deficit * 0.6),
      reason: 'Reduce discretionary spending (dining, entertainment, subscriptions)',
    });
    suggestedCuts.push({
      category: 'Fixed Expenses',
      amount: Math.round(deficit * 0.4),
      reason: 'Renegotiate or eliminate fixed costs (insurance, subscriptions)',
    });
  } else if (discretionaryAvailable < monthlyIncome * 0.1) {
    suggestedCuts.push({
      category: 'Variable Expenses',
      amount: Math.round(variableExpenses * 0.2),
      reason: 'Create more breathing room (aim for 10-15% discretionary)',
    });
  }

  return {
    monthlyIncome: Math.round(monthlyIncome),
    totalExpenses: Math.round(totalExpenses),
    discretionaryAvailable: Math.round(discretionaryAvailable),
    expenseRatio: Math.round(expenseRatio),
    budgetHealthScore,
    suggestedCuts,
  };
}
