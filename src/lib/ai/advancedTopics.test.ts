import { describe, expect, it } from 'vitest';

import { buildAdvancedTopicContext } from './advancedTopics';

describe('advancedTopics', () => {
  it('returns context for stable buffer', () => {
    const ctx = buildAdvancedTopicContext({
      monthlyIncome: 5000,
      essentialExpenses: 2000,
      totalSavings: 8000,
      highInterestDebt: 0,
      lowInterestDebt: 0,
      monthlyDebtPayments: 0,
      primaryGoal: 'growth',
      riskTolerance: 'balanced',
      timeHorizonYears: 5,
    });
    expect(ctx).toContain('investing');
  });
});
