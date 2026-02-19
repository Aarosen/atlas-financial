import type { FinancialState } from '@/lib/state/types';

export function buildAdvancedTopicContext(fin: FinancialState): string | null {
  const parts: string[] = [];
  const essentials = fin.essentialExpenses || 0;
  const bufferMonths = essentials > 0 ? fin.totalSavings / essentials : 0;

  if (fin.monthlyIncome > 0) {
    parts.push('Consider tax-aware guidance when relevant (withholding, deductions, credits).');
  }
  if (bufferMonths >= 3) {
    parts.push('User may be ready for investing basics (index funds, allocation).');
  }
  if (fin.primaryGoal === 'wealth_building' || fin.primaryGoal === 'growth') {
    parts.push('User is oriented toward long-term wealth; introduce retirement planning when appropriate.');
  }

  return parts.length ? parts.join(' ') : null;
}
