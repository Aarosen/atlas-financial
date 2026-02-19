import { describe, expect, it } from 'vitest';
import { buildMetricExplainer } from './metricExplainer';
import type { FinancialState, Strategy } from '@/lib/state/types';

const fin: FinancialState = {
  monthlyIncome: 5000,
  essentialExpenses: 3000,
  totalSavings: 1000,
  highInterestDebt: 0,
  lowInterestDebt: 0,
  monthlyDebtPayments: 0,
  primaryGoal: 'stability',
  secondaryGoal: undefined,
  riskTolerance: 'balanced',
  timeHorizonYears: 3,
};

const baseline: Strategy = {
  tier: 'Foundation',
  lever: 'stabilize_cashflow',
  urgency: 'Calm',
  confidence: 'high',
  bufMo: 1,
  futPct: 0.08,
  dExp: 'Moderate',
  metrics: { net: 200 },
  expl: {},
  explainability: {
    tier: 'Foundation',
    lever: 'stabilize_cashflow',
    reasonCodes: [],
    inputsUsed: {},
    assumptions: [],
    metrics: {},
    decisionTrace: [],
    nextAction: { title: 'Test', prompt: 'Test', suggestedAmount: 10 },
  },
  sug: 10,
  ts: Date.now(),
};

const avgWordsPerSentence = (text: string) => {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!sentences.length) return 0;
  const words = text
    .replace(/[^a-zA-Z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return words.length / sentences.length;
};

describe('buildMetricExplainer', () => {
  it('keeps average sentence length short for readability', () => {
    const text = buildMetricExplainer('net', fin, baseline, {
      fc: (n) => `$${n}`,
      fp: (n) => `${Math.round(n * 100)}%`,
    });
    expect(avgWordsPerSentence(text)).toBeLessThanOrEqual(12);
  });
});
