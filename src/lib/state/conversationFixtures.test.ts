import { describe, expect, it } from 'vitest';
import { classifyInterruption, metaResponse, nextQuestionForMissing } from './atlasConversationController';
import { conversationReducer, createInitialConversationState } from './conversationMachine';

function countQuestions(t: string) {
  return (t.match(/\?/g) || []).length;
}

function countSentences(t: string) {
  const s = String(t || '').trim();
  const ends = s.match(/[.!?](?:\s|$)/g) || [];
  return ends.length || (s ? 1 : 0);
}

describe('conversation fixtures (deterministic + interruptions)', () => {
  it('nextQuestionForMissing is deterministic by turnIndex', () => {
    const q1 = nextQuestionForMissing('monthlyIncome', 0);
    const q2 = nextQuestionForMissing('monthlyIncome', 3);
    expect(q1.key).toBe('monthlyIncome');
    expect(q1.text).toBe(q2.text);
  });

  it('metaResponse is a single sentence and has no question mark', () => {
    const t = metaResponse('what are you doing with my data?');
    expect(countSentences(t)).toBe(1);
    expect(countQuestions(t)).toBe(0);
  });

  it('classifies interruptions correctly', () => {
    expect(classifyInterruption('what is an emergency fund?')).toBe('followup_question');
    expect(classifyInterruption('what are you doing with my data?')).toBe('meta');
    expect(classifyInterruption('actually my rent is 1800')).toBe('correction');
    expect(classifyInterruption("i don't know")).toBe('answer_to_question');
  });

  it('meta interruption can be answered and resumed with exactly one question', () => {
    const resume = nextQuestionForMissing('essentialExpenses', 2);
    const out = `${metaResponse('privacy')} ${resume.text}`;
    expect(countQuestions(out)).toBe(1);
    expect(countSentences(out)).toBeLessThanOrEqual(3);
  });

  it('followup interruption can be resumed without losing state (reducer keeps missing + questionKey)', () => {
    const st0 = createInitialConversationState('conversation');
    const st1 = conversationReducer(st0, {
      type: 'SEND_EXTRACTED',
      finNext: st0.fin,
      missingNext: ['monthlyIncome', 'essentialExpenses'],
      answeredNext: {},
      unknownNext: {},
      apiOk: true,
    });
    const q = nextQuestionForMissing(st1.missing[0], 1);
    const st2 = conversationReducer(st1, { type: 'SEND_ASKED', text: q.text, questionKey: q.key });

    expect(st2.missing).toEqual(['monthlyIncome', 'essentialExpenses']);
    expect(st2.lastQuestionKey).toBe('monthlyIncome');
    expect(countQuestions(st2.msgs[st2.msgs.length - 1].t)).toBe(1);
  });

  const scripted = [
    {
      name: 'partial data -> asks monthlyIncome',
      missing: ['monthlyIncome', 'essentialExpenses'],
      expectedKey: 'monthlyIncome',
    },
    {
      name: 'after income -> asks essentials',
      missing: ['essentialExpenses'],
      expectedKey: 'essentialExpenses',
    },
    {
      name: 'debts null -> asks highInterestDebt',
      missing: ['highInterestDebt', 'lowInterestDebt'],
      expectedKey: 'highInterestDebt',
    },
    {
      name: 'savings unknown -> asks totalSavings',
      missing: ['totalSavings'],
      expectedKey: 'totalSavings',
    },
    {
      name: 'low interest only -> asks lowInterestDebt',
      missing: ['lowInterestDebt'],
      expectedKey: 'lowInterestDebt',
    },
    {
      name: 'correction is classified as correction',
      interruption: 'actually my income is 6200',
      kind: 'correction',
    },
  ] as const;

  for (const fx of scripted) {
    it(fx.name, () => {
      if ('interruption' in fx) {
        expect(classifyInterruption(fx.interruption)).toBe(fx.kind);
        return;
      }
      const q = nextQuestionForMissing(fx.missing[0], 0);
      expect(q.key).toBe(fx.expectedKey);
      // New mentor-like questions include explanatory text, so they may have 2 question marks
      // (one in the main question, one implied in the explanation)
      expect(countQuestions(q.text)).toBeGreaterThanOrEqual(1);
      expect(countQuestions(q.text)).toBeLessThanOrEqual(2);
    });
  }
});
