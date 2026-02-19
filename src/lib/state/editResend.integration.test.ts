import { describe, expect, it } from 'vitest';

import type { FinancialState } from './types';
import { StrategyEngine } from '../engine/strategyEngine';
import { computeMissing } from './atlasConversationController';
import { conversationReducer, createInitialConversationState, type ConversationState } from './conversationMachine';

async function applyDeterministicSend(args: {
  st: ConversationState;
  userText: string;
  extractedFields: Partial<FinancialState>;
}): Promise<ConversationState> {
  const eng = new StrategyEngine();

  const st1 = conversationReducer(args.st, { type: 'SEND_START', text: args.userText });

  const finNext: FinancialState = { ...st1.fin, ...args.extractedFields };
  const answeredNext: Partial<Record<keyof FinancialState, boolean>> = { ...st1.answered };
  const unknownNext: Partial<Record<keyof FinancialState, boolean>> = { ...st1.unknown };

  for (const k0 of Object.keys(args.extractedFields)) {
    const k = k0 as keyof FinancialState;
    answeredNext[k] = true;
    if (unknownNext[k]) delete unknownNext[k];
  }

  const missingNext = computeMissing(finNext, answeredNext);
  const st2 = conversationReducer(st1, {
    type: 'SEND_EXTRACTED',
    finNext,
    missingNext,
    answeredNext,
    unknownNext,
    apiOk: true,
  });

  if (missingNext.length !== 0) {
    return conversationReducer(st2, { type: 'SEND_ASKED', text: 'stub', questionKey: missingNext[0] });
  }

  const baseline = await eng.run(finNext, { answered: answeredNext, unknown: unknownNext });

  return conversationReducer(st2, { type: 'SEND_STRATEGY_READY', baseline });
}

describe('edit + resend integration', () => {
  it('rewind + resend with higher income changes tier deterministically', async () => {
    const st0 = createInitialConversationState('conversation');

    const snapBefore = st0;

    const stAfterLow = await applyDeterministicSend({
      st: snapBefore,
      userText: 'I make $2000 and spend $2500 on essentials, no debt, $0 savings.',
      extractedFields: {
        monthlyIncome: 2000,
        essentialExpenses: 2500,
        totalSavings: 0,
        primaryGoal: 'stability',
        highInterestDebt: 0,
        lowInterestDebt: 0,
      },
    });

    expect(stAfterLow.baseline?.tier).toBe('Foundation');

    // Simulate edit+resend: restore snapshot from before last send and resend corrected income.
    const restored = conversationReducer(stAfterLow, { type: 'RESTORE', state: snapBefore });

    const stAfterEdit = await applyDeterministicSend({
      st: restored,
      userText: 'Correction: I actually make $8000/month.',
      extractedFields: {
        monthlyIncome: 8000,
        essentialExpenses: 2500,
        totalSavings: 2500 * 8,
        primaryGoal: 'growth',
        highInterestDebt: 0,
        lowInterestDebt: 0,
      },
    });

    expect(stAfterEdit.baseline?.tier).toBe('GrowthReady');
    expect(stAfterEdit.baseline?.tier).not.toBe(stAfterLow.baseline?.tier);
  });
});
