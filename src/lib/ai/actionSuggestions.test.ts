import { describe, expect, it } from 'vitest';

import { suggestActions } from './actionSuggestions';

const base = {
  fin: {
    monthlyIncome: 4000,
    essentialExpenses: 2500,
    totalSavings: 2000,
    highInterestDebt: 0,
    lowInterestDebt: 0,
    monthlyDebtPayments: 0,
    primaryGoal: 'stability' as const,
    riskTolerance: 'balanced' as const,
    timeHorizonYears: 3,
  },
};

describe('actionSuggestions', () => {
  it('suggests cashflow actions', () => {
    const suggestions = suggestActions({
      ...base,
      baseline: {
        tier: 'Foundation',
        lever: 'stabilize_cashflow',
        urgency: 'Calm',
        confidence: 'med',
        bufMo: 0,
        futPct: 0,
        dExp: 'High',
        metrics: {},
        expl: {},
        explainability: {} as any,
        sug: 0,
        ts: Date.now(),
      },
    });
    expect(suggestions.length).toBeGreaterThan(0);
  });
});
