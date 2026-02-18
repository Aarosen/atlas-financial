import { describe, expect, it } from 'vitest';
import { decideNextAction } from './orchestrator';

describe('orchestrator', () => {
  it('holds on meta/followup interruptions', () => {
    const hold = decideNextAction({ kind: 'meta', missing: ['monthlyIncome'], turnIndex: 0 });
    expect(hold.type).toBe('hold');
  });

  it('asks next missing question', () => {
    const out = decideNextAction({ kind: 'answer_to_question', missing: ['essentialExpenses'], turnIndex: 2 });
    expect(out.type).toBe('ask');
    if (out.type === 'ask') {
      expect(out.questionKey).toBe('essentialExpenses');
      expect(out.text.length).toBeGreaterThan(0);
    }
  });

  it('completes when nothing is missing', () => {
    const out = decideNextAction({ kind: 'answer_to_question', missing: [], turnIndex: 1 });
    expect(out.type).toBe('complete');
  });
});
