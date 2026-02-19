import { describe, expect, it } from 'vitest';
import TestRenderer from 'react-test-renderer';
import React from 'react';

import { DashboardScreen } from './Dashboard';
import type { FinancialState, Strategy } from '@/lib/state/types';

const fin: FinancialState = {
  monthlyIncome: 8000,
  essentialExpenses: 3000,
  totalSavings: 24000,
  highInterestDebt: 0,
  lowInterestDebt: 0,
  monthlyDebtPayments: 0,
  primaryGoal: 'stability',
  secondaryGoal: undefined,
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

const getText = (node: any): string => {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(getText).join(' ');
  if (typeof node === 'object' && node.children) return getText(node.children);
  return '';
};

describe('DashboardScreen', () => {
  it('renders simplified metric labels and profile clarity', () => {
    let tr!: TestRenderer.ReactTestRenderer;
    TestRenderer.act(() => {
      tr = TestRenderer.create(
        React.createElement(DashboardScreen as any, {
          theme: 'light',
          onToggleTheme: () => {},
          apiErr: null,
          apiStatus: 'online',
          fin,
          baseline,
          onTalk: () => {},
          onStrategy: () => {},
          onSettings: () => {},
          fc: (n: number) => `$${n}`,
          fp: (n: number) => `${Math.round(n * 100)}%`,
          getMetricExplainer: () => 'explainer',
        })
      );
    });
    const text = getText(tr.toJSON());
    expect(text).toContain('MONEY LEFT EACH MONTH');
    expect(text).toContain('EMERGENCY CUSHION');
    expect(text).toContain('FUTURE SAVINGS');
    expect(text).toContain('DEBT LOAD');
    expect(text).toContain('PROFILE CLARITY');
  });

  it('shows early-session refinement callout when completeness is low', () => {
    let tr!: TestRenderer.ReactTestRenderer;
    TestRenderer.act(() => {
      tr = TestRenderer.create(
        React.createElement(DashboardScreen as any, {
          theme: 'light',
          onToggleTheme: () => {},
          apiErr: null,
          apiStatus: 'online',
          fin: { ...fin, monthlyIncome: 0, essentialExpenses: 0, totalSavings: 0, highInterestDebt: null, lowInterestDebt: null, primaryGoal: 'stability' },
          baseline,
          onTalk: () => {},
          onStrategy: () => {},
          onSettings: () => {},
          fc: (n: number) => `$${n}`,
          fp: (n: number) => `${Math.round(n * 100)}%`,
          getMetricExplainer: () => 'explainer',
        })
      );
    });
    const text = getText(tr.toJSON());
    expect(text).toContain('Tell me more so I can refine this.');
  });
});
