import { describe, expect, it } from 'vitest';
import { StrategyEngine } from './strategyEngine';

describe('StrategyEngine', () => {
  it('identifies Foundation when net is negative or buffer < 1 month', async () => {
    const eng = new StrategyEngine();
    const out = await eng.run({
      monthlyIncome: 2000,
      essentialExpenses: 2500,
      totalSavings: 0,
      highInterestDebt: 0,
      lowInterestDebt: 0,
      monthlyDebtPayments: 0,
      primaryGoal: 'stability',
      riskTolerance: 'balanced',
      timeHorizonYears: 3,
    });

    expect(out.tier).toBe('Foundation');
    expect(out.lever).toBe('stabilize_cashflow');
    expect(out.explainability.tier).toBe(out.tier);
    expect(out.explainability.lever).toBe(out.lever);
    expect(Array.isArray(out.explainability.reasonCodes)).toBe(true);
    expect(out.explainability.nextAction.title.length).toBeGreaterThan(0);
  });

  it('can reach GrowthReady on strong buffer and positive cashflow', async () => {
    const eng = new StrategyEngine();
    const out = await eng.run({
      monthlyIncome: 8000,
      essentialExpenses: 3000,
      totalSavings: 3000 * 8,
      highInterestDebt: 0,
      lowInterestDebt: 0,
      monthlyDebtPayments: 0,
      primaryGoal: 'growth',
      riskTolerance: 'balanced',
      timeHorizonYears: 10,
    });

    expect(out.tier).toBe('GrowthReady');
    expect(out.explainability.tier).toBe(out.tier);
    expect(out.explainability.lever).toBe(out.lever);
  });
});
