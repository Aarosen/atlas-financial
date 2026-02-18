import { describe, expect, it } from 'vitest';

import { scoreConfidence } from './strategyConfig';

describe('strategyConfig confidence scoring', () => {
  it('returns high when enough explicit values and plausible inputs', () => {
    const r = scoreConfidence(
      {
        monthlyIncome: 5000,
        essentialExpenses: 2500,
        totalSavings: 10000,
        highInterestDebt: 0,
        lowInterestDebt: 0,
        monthlyDebtPayments: 0,
        primaryGoal: 'stability',
        riskTolerance: 'balanced',
        timeHorizonYears: 3,
      },
      {
        answered: { monthlyIncome: true, essentialExpenses: true, totalSavings: true, highInterestDebt: true, lowInterestDebt: true },
        unknown: {},
      }
    );
    expect(r.confidence).toBe('high');
    expect(r.reasons.length).toBe(0);
  });

  it('returns low when debt is unknown', () => {
    const r = scoreConfidence(
      {
        monthlyIncome: 5000,
        essentialExpenses: 2500,
      },
      {
        answered: { monthlyIncome: true, essentialExpenses: true },
        unknown: { highInterestDebt: true },
      }
    );
    expect(r.confidence).toBe('low');
    expect(r.reasons).toContain('UNKNOWN_DEBT');
  });

  it('returns low when income or essentials are zero/nonpositive', () => {
    const r = scoreConfidence(
      {
        monthlyIncome: 0,
        essentialExpenses: 0,
      },
      {
        answered: {},
        unknown: {},
      }
    );
    expect(r.confidence).toBe('low');
    expect(r.reasons).toContain('INCOME_MISSING_OR_NONPOSITIVE');
    expect(r.reasons).toContain('ESSENTIALS_MISSING_OR_NONPOSITIVE');
  });

  it('flags essentials > income as low confidence', () => {
    const r = scoreConfidence(
      {
        monthlyIncome: 3000,
        essentialExpenses: 5000,
      },
      {
        answered: { monthlyIncome: true, essentialExpenses: true },
        unknown: {},
      }
    );
    expect(r.confidence).toBe('low');
    expect(r.reasons).toContain('ESSENTIALS_GT_INCOME');
  });
});
