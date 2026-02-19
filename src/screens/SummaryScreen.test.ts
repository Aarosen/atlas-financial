import { describe, expect, it } from 'vitest';
import TestRenderer from 'react-test-renderer';
import React from 'react';

import { SummaryScreen } from './Summary';
import type { FinancialState, Strategy } from '@/lib/state/types';

const fin: FinancialState = {
  monthlyIncome: 8000,
  essentialExpenses: 3000,
  totalSavings: 24000,
  highInterestDebt: 0,
  lowInterestDebt: 0,
  monthlyDebtPayments: 0,
  primaryGoal: 'stability',
  secondaryGoal: 'buy a home',
  riskTolerance: 'balanced',
  timeHorizonYears: 3,
};

const baseline: Strategy = {
  tier: 'GrowthReady',
  lever: 'increase_future_allocation',
  urgency: 'Calm',
  confidence: 'high',
  bufMo: 6.5,
  futPct: 0.15,
  dExp: 'Low',
  metrics: { net: 2000 },
  expl: {},
  explainability: {
    tier: 'GrowthReady',
    lever: 'increase_future_allocation',
    reasonCodes: [],
    inputsUsed: {},
    assumptions: [],
    metrics: {},
    decisionTrace: [],
    nextAction: { title: 'Test', prompt: 'Test', suggestedAmount: 100 },
  },
  sug: 100,
  ts: Date.now(),
};

describe('SummaryScreen', () => {
  it('shows primary + secondary goal', () => {
    let tr!: TestRenderer.ReactTestRenderer;
    TestRenderer.act(() => {
      tr = TestRenderer.create(
        React.createElement(SummaryScreen as any, {
          theme: 'light',
          onToggleTheme: () => {},
          apiErr: null,
          apiStatus: 'online',
          fin,
          baseline,
          onShowTier: () => {},
          onEditViaChat: () => {},
          fc: (n: number) => `$${n}`,
          fp: (n: number) => `${Math.round(n * 100)}%`,
        })
      );
    });
    const text = JSON.stringify(tr.toJSON());
    expect(text).toContain('Goal I’m hearing');
    expect(text).toContain('stability + buy a home');
  });
});
