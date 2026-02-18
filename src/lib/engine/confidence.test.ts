import { describe, expect, it } from 'vitest';
import { StrategyEngine } from './strategyEngine';
import type { FinancialState } from '../state/types';

describe('confidence indicator', () => {
  it('returns low confidence when key fields missing', async () => {
    const engine = new StrategyEngine();
    const fin: Partial<FinancialState> = {
      monthlyIncome: 0,
      essentialExpenses: 0,
      totalSavings: 0,
      highInterestDebt: null,
      lowInterestDebt: null,
      monthlyDebtPayments: 0,
    } as FinancialState;
    const strat = await engine.run(fin, { answered: {}, unknown: { monthlyIncome: true } });
    expect(strat.confidence).toBe('low');
  });
});
