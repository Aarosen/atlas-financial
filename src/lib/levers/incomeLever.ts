import type { FinancialState } from '@/lib/state/types';

export interface IncomeLeverResult {
  applies: boolean;
  surplusPct: number | null;
  potentialMonthlyBumpUSD: number | null;
  reasonShort: string;
}

export function computeIncomeLever(fin: FinancialState): IncomeLeverResult {
  const inc = fin.monthlyIncome;
  const ess = fin.essentialExpenses;
  if (!Number.isFinite(inc) || !Number.isFinite(ess) || inc <= 0) {
    return { applies: false, surplusPct: null, potentialMonthlyBumpUSD: null, reasonShort: '' };
  }
  const surplus = inc - ess;
  const surplusPct = surplus / inc;
  if (surplusPct >= 0.20) {
    return { applies: false, surplusPct, potentialMonthlyBumpUSD: null, reasonShort: '' };
  }
  // Heuristic: a credible 1–6 hour-per-week income lever ≈ 15% of essentials,
  // capped at $1,500 to avoid implausible promises.
  const potential = Math.min(1500, ess * 0.15);
  return {
    applies: true,
    surplusPct,
    potentialMonthlyBumpUSD: Number(potential.toFixed(0)),
    reasonShort: `Your surplus is ${(surplusPct * 100).toFixed(0)}% of income; lifting income gives more room than only cutting expenses.`,
  };
}
