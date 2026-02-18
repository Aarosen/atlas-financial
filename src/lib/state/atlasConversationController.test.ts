import { describe, expect, test } from 'vitest';
import { applyUserTurn, clarificationForMissing, computeMissing, createInitialAtlasConversationState } from './atlasConversationController';
import type { FinancialState } from './types';

function baseFin(): FinancialState {
  return {
    monthlyIncome: 0,
    essentialExpenses: 0,
    totalSavings: 0,
    highInterestDebt: null,
    lowInterestDebt: null,
    monthlyDebtPayments: 0,
    primaryGoal: 'stability',
    riskTolerance: 'balanced',
    timeHorizonYears: 3,
  };
}

describe('atlasConversationController', () => {
  test('computeMissing requires high/low interest debt to be non-null', () => {
    const fin = baseFin();
    const missing = computeMissing(fin, {});
    expect(missing).toContain('highInterestDebt');
    expect(missing).toContain('lowInterestDebt');

    const missing2 = computeMissing({ ...fin, highInterestDebt: 0, lowInterestDebt: 0 }, {});
    expect(missing2).not.toContain('highInterestDebt');
    expect(missing2).not.toContain('lowInterestDebt');
  });

  test('applyUserTurn treats "no" as 0 for debt questions', () => {
    const fin = baseFin();
    const st = createInitialAtlasConversationState({ collected: fin });

    // Force the last asked question
    const st2 = { ...st, lastQuestionKey: 'highInterestDebt' as const };
    const out = applyUserTurn(st2, { userText: 'no' });
    expect(out.collected.highInterestDebt).toBe(0);
    expect(out.answered.highInterestDebt).toBe(true);
  });

  test('applyUserTurn treats "don\'t know" as unknown and sets debt to 0', () => {
    const fin = baseFin();
    const st = createInitialAtlasConversationState({ collected: fin });

    const st2 = { ...st, lastQuestionKey: 'lowInterestDebt' as const };
    const out = applyUserTurn(st2, { userText: "I don't know" });
    expect(out.collected.lowInterestDebt).toBe(0);
    expect(out.unknown.lowInterestDebt).toBe(true);
  });

  test('clarificationForMissing returns helpful prompt', () => {
    const t = clarificationForMissing('monthlyIncome');
    expect(t.toLowerCase()).toContain('monthly');
    expect(t.toLowerCase()).toContain('rough');
  });
});
