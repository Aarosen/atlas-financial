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

  // T0.4: GUARD — Strategy engine must not run with insufficient data
  describe('T0.4 Data Sufficiency Guard', () => {
    it('returns safe default when only 0 core fields provided', async () => {
      const eng = new StrategyEngine();
      const out = await eng.run({});

      expect(out.tier).toBe('Foundation');
      expect(out.lever).toBe('stabilize_cashflow');
      expect(out.confidence).toBe('low');
      expect(out.explainability.reasonCodes).toContain('INSUFFICIENT_DATA');
    });

    it('returns safe default when only 1 core field provided (income only)', async () => {
      const eng = new StrategyEngine();
      const out = await eng.run({
        monthlyIncome: 5000,
      });

      expect(out.tier).toBe('Foundation');
      expect(out.lever).toBe('stabilize_cashflow');
      expect(out.confidence).toBe('low');
      expect(out.explainability.reasonCodes).toContain('INSUFFICIENT_DATA');
    });

    it('returns safe default when only 1 core field provided (expenses only)', async () => {
      const eng = new StrategyEngine();
      const out = await eng.run({
        essentialExpenses: 3000,
      });

      expect(out.tier).toBe('Foundation');
      expect(out.lever).toBe('stabilize_cashflow');
      expect(out.confidence).toBe('low');
      expect(out.explainability.reasonCodes).toContain('INSUFFICIENT_DATA');
    });

    it('allows strategy when 2+ core fields provided (income + expenses)', async () => {
      const eng = new StrategyEngine();
      const out = await eng.run({
        monthlyIncome: 5000,
        essentialExpenses: 3000,
      });

      // Should NOT return the insufficient data default
      expect(out.explainability.reasonCodes).not.toContain('INSUFFICIENT_DATA');
    });

    it('allows strategy when 2+ core fields provided (income + debt payments)', async () => {
      const eng = new StrategyEngine();
      const out = await eng.run({
        monthlyIncome: 5000,
        monthlyDebtPayments: 500,
      });

      expect(out.explainability.reasonCodes).not.toContain('INSUFFICIENT_DATA');
    });

    it('allows strategy when 2+ core fields provided (income + savings)', async () => {
      const eng = new StrategyEngine();
      const out = await eng.run({
        monthlyIncome: 5000,
        totalSavings: 10000,
      });

      expect(out.explainability.reasonCodes).not.toContain('INSUFFICIENT_DATA');
    });

    it('treats zero income as missing data', async () => {
      const eng = new StrategyEngine();
      const out = await eng.run({
        monthlyIncome: 0,
        essentialExpenses: 3000,
      });

      expect(out.explainability.reasonCodes).toContain('INSUFFICIENT_DATA');
    });

    it('treats zero expenses as missing data', async () => {
      const eng = new StrategyEngine();
      const out = await eng.run({
        monthlyIncome: 5000,
        essentialExpenses: 0,
      });

      expect(out.explainability.reasonCodes).toContain('INSUFFICIENT_DATA');
    });

    it('treats zero debt payments as missing data', async () => {
      const eng = new StrategyEngine();
      const out = await eng.run({
        monthlyIncome: 5000,
        monthlyDebtPayments: 0,
      });

      expect(out.explainability.reasonCodes).toContain('INSUFFICIENT_DATA');
    });

    it('allows zero savings (it counts as a valid field)', async () => {
      const eng = new StrategyEngine();
      const out = await eng.run({
        monthlyIncome: 5000,
        totalSavings: 0,
      });

      expect(out.explainability.reasonCodes).not.toContain('INSUFFICIENT_DATA');
    });
  });
});
