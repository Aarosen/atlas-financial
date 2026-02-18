import { describe, expect, it } from 'vitest';
import { conversationReducer, createInitialConversationState } from './conversationMachine';
import type { Strategy } from './types';

describe('conversationMachine', () => {
  it('starts on the provided initial screen and is not busy', () => {
    const st = createInitialConversationState('landing');
    expect(st.scr).toBe('landing');
    expect(st.busy).toBe(false);
    expect(st.msgs.length).toBeGreaterThan(0);
  });

  it('RESTORE returns the provided snapshot state', () => {
    const st0 = { ...createInitialConversationState('conversation'), inp: 'x' };
    const st1 = conversationReducer(st0, { type: 'SEND_START', text: 'hi' });
    const st2 = conversationReducer(st1, { type: 'RESTORE', state: st0 });
    expect(st2).toEqual(st0);
  });

  it('SEND_START appends user message, clears input, and sets busy', () => {
    const st0 = { ...createInitialConversationState('conversation'), inp: 'hello' };
    const st1 = conversationReducer(st0, { type: 'SEND_START', text: 'hello' });

    expect(st1.busy).toBe(true);
    expect(st1.inp).toBe('');
    expect(st1.msgs[st1.msgs.length - 1]).toEqual({ r: 'u', t: 'hello' });
  });

  it('STRATEGY_READY appends assistant transition message', () => {
    const st0 = createInitialConversationState('conversation');
    const baseline: Strategy = {
      tier: 'Foundation',
      lever: 'stabilize_cashflow',
      urgency: 'Protective',
      confidence: 'high',
      bufMo: 0,
      futPct: 0,
      dExp: 'Critical',
      metrics: {},
      expl: {},
      explainability: {
        tier: 'Foundation',
        lever: 'stabilize_cashflow',
        reasonCodes: [] as string[],
        inputsUsed: {},
        assumptions: [] as string[],
        metrics: {},
        decisionTrace: [],
        nextAction: { title: '', prompt: '', suggestedAmount: 0 },
      },
      sug: 0,
      ts: Date.now(),
    };

    const st1 = conversationReducer(st0, { type: 'SEND_STRATEGY_READY', baseline });
    expect(st1.busy).toBe(false);
    expect(st1.baseline).toBe(baseline);
    expect(st1.msgs[st1.msgs.length - 1].r).toBe('a');
  });

  it('SEND_EXTRACTED updates fin, missing, answered, and unknown', () => {
    const st0 = createInitialConversationState('conversation');
    const st1 = conversationReducer(st0, {
      type: 'SEND_EXTRACTED',
      finNext: { ...st0.fin, monthlyIncome: 4000 },
      missingNext: ['essentialExpenses'],
      answeredNext: { monthlyIncome: true },
      unknownNext: {},
      apiOk: true,
    });
    expect(st1.fin.monthlyIncome).toBe(4000);
    expect(st1.missing).toEqual(['essentialExpenses']);
    expect(st1.answered.monthlyIncome).toBe(true);
  });
});
