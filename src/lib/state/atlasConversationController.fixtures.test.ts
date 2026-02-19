import { describe, expect, it } from 'vitest';
import { applyUserTurn, createInitialAtlasConversationState } from './atlasConversationController';
import { createDefaultFin } from './conversationMachine';

type Fx = {
  name: string;
  turns: Array<{
    user: string;
    extracted?: Record<string, unknown>;
    expect: {
      phase: 'onboarding' | 'baseline_ready' | 'strategy' | 'maintenance';
      missing0?: string;
      lastQuestionKey?: string;
      unknownKeys?: string[];
      collected?: Partial<Record<string, unknown>>;
    };
  }>;
};

describe('atlasConversationController scripted fixtures', () => {
  const fixtures: Fx[] = [
    {
      name: 'happy path partial -> completes onboarding',
      turns: [
        {
          user: 'I take home about $4k/mo',
          extracted: { monthlyIncome: 4000 },
          expect: { phase: 'onboarding', missing0: 'essentialExpenses', lastQuestionKey: 'essentialExpenses' },
        },
        {
          user: 'Essentials are ~2500',
          extracted: { essentialExpenses: 2500 },
          expect: { phase: 'onboarding', missing0: 'totalSavings', lastQuestionKey: 'totalSavings' },
        },
        {
          user: "I don't know my savings", // unknown, but answered
          extracted: {},
          expect: { phase: 'onboarding', missing0: 'primaryGoal', lastQuestionKey: 'primaryGoal', unknownKeys: ['totalSavings'] },
        },
        {
          user: 'No credit card debt',
          extracted: { highInterestDebt: 0 },
          expect: { phase: 'onboarding', missing0: 'primaryGoal', lastQuestionKey: 'primaryGoal' },
        },
        {
          user: 'No other loans',
          extracted: { lowInterestDebt: 0 },
          expect: { phase: 'onboarding', missing0: 'primaryGoal', lastQuestionKey: 'primaryGoal' },
        },
      ],
    },
    {
      name: 'numeric-only answer advances lastQuestionKey (prevents re-ask loop)',
      turns: [
        {
          user: 'hi',
          extracted: {},
          expect: { phase: 'onboarding', lastQuestionKey: 'monthlyIncome' },
        },
        {
          user: '6000',
          extracted: {},
          expect: { phase: 'onboarding', missing0: 'essentialExpenses', lastQuestionKey: 'essentialExpenses', collected: { monthlyIncome: 6000 } },
        },
      ],
    },
    {
      name: 'contradiction/correction overwrites value',
      turns: [
        {
          user: 'I make $5k',
          extracted: { monthlyIncome: 5000 },
          expect: { phase: 'onboarding', collected: { monthlyIncome: 5000 } },
        },
        {
          user: 'Actually it is $6k',
          extracted: { monthlyIncome: 6000 },
          expect: { phase: 'onboarding', collected: { monthlyIncome: 6000 } },
        },
      ],
    },
    {
      name: 'correction: essentials overwritten (actually rent/essentials)',
      turns: [
        {
          user: 'income 6000',
          extracted: { monthlyIncome: 6000 },
          expect: { phase: 'onboarding', missing0: 'essentialExpenses', lastQuestionKey: 'essentialExpenses' },
        },
        {
          user: 'essentials are 2800',
          extracted: { essentialExpenses: 2800 },
          expect: { phase: 'onboarding', missing0: 'totalSavings', lastQuestionKey: 'totalSavings', collected: { essentialExpenses: 2800 } },
        },
        {
          user: 'actually essentials are 3200',
          extracted: { essentialExpenses: 3200 },
          expect: { phase: 'onboarding', missing0: 'totalSavings', lastQuestionKey: 'totalSavings', collected: { essentialExpenses: 3200 } },
        },
      ],
    },
    {
      name: 'correction: forgot a car loan (lowInterestDebt goes from 0 to >0)',
      turns: [
        {
          user: 'income 8000',
          extracted: { monthlyIncome: 8000 },
          expect: { phase: 'onboarding', missing0: 'essentialExpenses' },
        },
        {
          user: 'essentials 3000',
          extracted: { essentialExpenses: 3000 },
          expect: { phase: 'onboarding', missing0: 'totalSavings' },
        },
        {
          user: 'savings 12000',
          extracted: { totalSavings: 12000 },
          expect: { phase: 'onboarding', missing0: 'primaryGoal' },
        },
        {
          user: 'no credit cards',
          extracted: { highInterestDebt: 0 },
          expect: { phase: 'onboarding', missing0: 'primaryGoal' },
        },
        {
          user: 'no other loans',
          extracted: { lowInterestDebt: 0 },
          expect: { phase: 'onboarding', missing0: 'primaryGoal', collected: { lowInterestDebt: 0 } },
        },
        {
          user: 'I forgot — car loan is 9000',
          extracted: { lowInterestDebt: 9000 },
          expect: { phase: 'onboarding', missing0: 'primaryGoal', collected: { lowInterestDebt: 9000 } },
        },
      ],
    },
    {
      name: "unknown vs 0 are distinguishable (savings)",
      turns: [
        {
          user: 'income 4000',
          extracted: { monthlyIncome: 4000 },
          expect: { phase: 'onboarding' },
        },
        {
          user: 'essentials 2000',
          extracted: { essentialExpenses: 2000 },
          expect: { phase: 'onboarding', missing0: 'totalSavings' },
        },
        {
          user: "don't know", // unknown
          extracted: {},
          expect: { phase: 'onboarding', unknownKeys: ['totalSavings'] },
        },
        {
          user: 'Actually savings is 0',
          extracted: { totalSavings: 0 },
          expect: { phase: 'onboarding', unknownKeys: [] },
        },
      ],
    },
    {
      name: "don't know income (marks unknown and advances to essentials)",
      turns: [
        {
          user: "I don't know", // asked income first
          extracted: {},
          expect: { phase: 'onboarding', missing0: 'essentialExpenses', lastQuestionKey: 'essentialExpenses', unknownKeys: ['monthlyIncome'] },
        },
      ],
    },
    {
      name: "don't know essentials (marks unknown and advances)",
      turns: [
        {
          user: 'income 5000',
          extracted: { monthlyIncome: 5000 },
          expect: { phase: 'onboarding', missing0: 'essentialExpenses', lastQuestionKey: 'essentialExpenses' },
        },
        {
          user: 'not sure',
          extracted: {},
          expect: { phase: 'onboarding', missing0: 'totalSavings', lastQuestionKey: 'totalSavings', unknownKeys: ['essentialExpenses'] },
        },
      ],
    },
    {
      name: "don't know high-interest debt (treated as answered+unknown)",
      turns: [
        { user: 'income 5000', extracted: { monthlyIncome: 5000 }, expect: { phase: 'onboarding', missing0: 'essentialExpenses' } },
        { user: 'essentials 2500', extracted: { essentialExpenses: 2500 }, expect: { phase: 'onboarding', missing0: 'totalSavings' } },
        { user: 'savings 3000', extracted: { totalSavings: 3000 }, expect: { phase: 'onboarding', missing0: 'primaryGoal' } },
        {
          user: "I don't know", // highInterestDebt
          extracted: {},
          expect: { phase: 'onboarding', missing0: 'highInterestDebt', unknownKeys: ['primaryGoal'] },
        },
      ],
    },
    {
      name: "don't know low-interest debt (treated as answered+unknown)",
      turns: [
        { user: 'income 5000', extracted: { monthlyIncome: 5000 }, expect: { phase: 'onboarding', missing0: 'essentialExpenses' } },
        { user: 'essentials 2500', extracted: { essentialExpenses: 2500 }, expect: { phase: 'onboarding', missing0: 'totalSavings' } },
        { user: 'savings 3000', extracted: { totalSavings: 3000 }, expect: { phase: 'onboarding', missing0: 'primaryGoal' } },
        { user: 'cc debt 0', extracted: { highInterestDebt: 0 }, expect: { phase: 'onboarding', missing0: 'primaryGoal' } },
        {
          user: "don't know", // lowInterestDebt
          extracted: {},
          expect: { phase: 'onboarding', missing0: 'lowInterestDebt', unknownKeys: ['primaryGoal'] },
        },
      ],
    },
    {
      name: 'meta interruption mid-onboarding does not reset progress',
      turns: [
        { user: 'income 5000', extracted: { monthlyIncome: 5000 }, expect: { phase: 'onboarding', missing0: 'essentialExpenses' } },
        {
          user: 'what are you doing with my data?',
          extracted: {},
          expect: { phase: 'onboarding', missing0: 'essentialExpenses' },
        },
        { user: 'essentials 2400', extracted: { essentialExpenses: 2400 }, expect: { phase: 'onboarding', missing0: 'totalSavings' } },
      ],
    },
    {
      name: 'followup interruption mid-onboarding does not reset progress',
      turns: [
        { user: 'income 5000', extracted: { monthlyIncome: 5000 }, expect: { phase: 'onboarding', missing0: 'essentialExpenses' } },
        {
          user: 'what is an emergency fund?',
          extracted: {},
          expect: { phase: 'onboarding', missing0: 'essentialExpenses' },
        },
        { user: 'essentials 2400', extracted: { essentialExpenses: 2400 }, expect: { phase: 'onboarding', missing0: 'totalSavings' } },
      ],
    },
    {
      name: 'multiple interruptions in a row preserve missing and lastQuestionKey',
      turns: [
        { user: 'income 5200', extracted: { monthlyIncome: 5200 }, expect: { phase: 'onboarding', missing0: 'essentialExpenses', lastQuestionKey: 'essentialExpenses' } },
        { user: 'privacy?', extracted: {}, expect: { phase: 'onboarding', missing0: 'essentialExpenses', lastQuestionKey: 'essentialExpenses' } },
        { user: 'what is DTI?', extracted: {}, expect: { phase: 'onboarding', missing0: 'essentialExpenses', lastQuestionKey: 'essentialExpenses' } },
        { user: 'essentials 2600', extracted: { essentialExpenses: 2600 }, expect: { phase: 'onboarding', missing0: 'totalSavings' } },
      ],
    },
    {
      name: 'contradiction: savings unknown then corrected to explicit 0 clears unknown flag',
      turns: [
        { user: 'income 4500', extracted: { monthlyIncome: 4500 }, expect: { phase: 'onboarding', missing0: 'essentialExpenses' } },
        { user: 'essentials 2000', extracted: { essentialExpenses: 2000 }, expect: { phase: 'onboarding', missing0: 'totalSavings' } },
        { user: "don't know", extracted: {}, expect: { phase: 'onboarding', missing0: 'primaryGoal', unknownKeys: ['totalSavings'] } },
        { user: 'savings 0', extracted: { totalSavings: 0 }, expect: { phase: 'onboarding', unknownKeys: [] } },
      ],
    },
    {
      name: 'contradiction: debt unknown then corrected to explicit amount clears unknown flag',
      turns: [
        { user: 'income 5000', extracted: { monthlyIncome: 5000 }, expect: { phase: 'onboarding', missing0: 'essentialExpenses' } },
        { user: 'essentials 2000', extracted: { essentialExpenses: 2000 }, expect: { phase: 'onboarding', missing0: 'totalSavings' } },
        { user: 'savings 2000', extracted: { totalSavings: 2000 }, expect: { phase: 'onboarding', missing0: 'primaryGoal' } },
        { user: "don't know", extracted: {}, expect: { phase: 'onboarding', missing0: 'highInterestDebt', unknownKeys: ['primaryGoal'] } },
        { user: 'actually cc debt 1600', extracted: { highInterestDebt: 1600 }, expect: { phase: 'onboarding', missing0: 'lowInterestDebt', unknownKeys: ['primaryGoal'] } },
      ],
    },

    {
      name: "don't know income then later provide it (unknown clears)",
      turns: [
        { user: "I don't know", extracted: {}, expect: { phase: 'onboarding', missing0: 'essentialExpenses', unknownKeys: ['monthlyIncome'] } },
        { user: 'actually income is 4800', extracted: { monthlyIncome: 4800 }, expect: { phase: 'onboarding', missing0: 'essentialExpenses', unknownKeys: [] } },
      ],
    },

    {
      name: "don't know essentials then later provide it (unknown clears)",
      turns: [
        { user: 'income 5200', extracted: { monthlyIncome: 5200 }, expect: { phase: 'onboarding', missing0: 'essentialExpenses' } },
        { user: 'no idea', extracted: {}, expect: { phase: 'onboarding', missing0: 'totalSavings', unknownKeys: ['essentialExpenses'] } },
        { user: 'actually essentials 2600', extracted: { essentialExpenses: 2600 }, expect: { phase: 'onboarding', missing0: 'totalSavings', unknownKeys: [] } },
      ],
    },

    {
      name: 'debt flips: credit cards 0 -> 3000 -> 0 (overwrites deterministically)',
      turns: [
        { user: 'income 7000', extracted: { monthlyIncome: 7000 }, expect: { phase: 'onboarding', missing0: 'essentialExpenses' } },
        { user: 'essentials 3200', extracted: { essentialExpenses: 3200 }, expect: { phase: 'onboarding', missing0: 'totalSavings' } },
        { user: 'savings 15000', extracted: { totalSavings: 15000 }, expect: { phase: 'onboarding', missing0: 'primaryGoal' } },
        { user: 'cc 0', extracted: { highInterestDebt: 0 }, expect: { phase: 'onboarding', missing0: 'primaryGoal', collected: { highInterestDebt: 0 } } },
        { user: 'actually cc 3000', extracted: { highInterestDebt: 3000 }, expect: { phase: 'onboarding', missing0: 'primaryGoal', collected: { highInterestDebt: 3000 } } },
        { user: 'paid it off, cc 0', extracted: { highInterestDebt: 0 }, expect: { phase: 'onboarding', missing0: 'primaryGoal', collected: { highInterestDebt: 0 } } },
      ],
    },

    {
      name: 'debt flips: low-interest 0 -> 12000 -> 0 (overwrites deterministically)',
      turns: [
        { user: 'income 9000', extracted: { monthlyIncome: 9000 }, expect: { phase: 'onboarding', missing0: 'essentialExpenses' } },
        { user: 'essentials 3500', extracted: { essentialExpenses: 3500 }, expect: { phase: 'onboarding', missing0: 'totalSavings' } },
        { user: 'savings 20000', extracted: { totalSavings: 20000 }, expect: { phase: 'onboarding', missing0: 'primaryGoal' } },
        { user: 'cc 0', extracted: { highInterestDebt: 0 }, expect: { phase: 'onboarding', missing0: 'primaryGoal' } },
        { user: 'loans 0', extracted: { lowInterestDebt: 0 }, expect: { phase: 'onboarding', missing0: 'primaryGoal', collected: { lowInterestDebt: 0 } } },
        { user: 'actually student loan 12000', extracted: { lowInterestDebt: 12000 }, expect: { phase: 'onboarding', missing0: 'primaryGoal', collected: { lowInterestDebt: 12000 } } },
        { user: 'paid it off, loans 0', extracted: { lowInterestDebt: 0 }, expect: { phase: 'onboarding', missing0: 'primaryGoal', collected: { lowInterestDebt: 0 } } },
      ],
    },

    {
      name: 'interruption after correction still resumes same missing question',
      turns: [
        { user: 'income 6000', extracted: { monthlyIncome: 6000 }, expect: { phase: 'onboarding', missing0: 'essentialExpenses' } },
        { user: 'essentials 2800', extracted: { essentialExpenses: 2800 }, expect: { phase: 'onboarding', missing0: 'totalSavings', lastQuestionKey: 'totalSavings' } },
        { user: 'actually essentials 3000', extracted: { essentialExpenses: 3000 }, expect: { phase: 'onboarding', missing0: 'totalSavings', lastQuestionKey: 'totalSavings' } },
        { user: 'privacy?', extracted: {}, expect: { phase: 'onboarding', missing0: 'totalSavings', lastQuestionKey: 'totalSavings' } },
        { user: 'savings 5000', extracted: { totalSavings: 5000 }, expect: { phase: 'onboarding', missing0: 'primaryGoal' } },
      ],
    },

    {
      name: 'followup after correction still resumes same missing question',
      turns: [
        { user: 'income 6000', extracted: { monthlyIncome: 6000 }, expect: { phase: 'onboarding', missing0: 'essentialExpenses' } },
        { user: 'essentials 2800', extracted: { essentialExpenses: 2800 }, expect: { phase: 'onboarding', missing0: 'totalSavings', lastQuestionKey: 'totalSavings' } },
        { user: 'actually essentials 3000', extracted: { essentialExpenses: 3000 }, expect: { phase: 'onboarding', missing0: 'totalSavings', lastQuestionKey: 'totalSavings' } },
        { user: 'what is an emergency fund?', extracted: {}, expect: { phase: 'onboarding', missing0: 'totalSavings', lastQuestionKey: 'totalSavings' } },
        { user: 'savings 5000', extracted: { totalSavings: 5000 }, expect: { phase: 'onboarding', missing0: 'primaryGoal' } },
      ],
    },

    {
      name: 'voice-like followup still preserves missing (mode-agnostic)',
      turns: [
        { user: 'income 5100', extracted: { monthlyIncome: 5100 }, expect: { phase: 'onboarding', missing0: 'essentialExpenses', lastQuestionKey: 'essentialExpenses' } },
        { user: 'what is DTI?', extracted: {}, expect: { phase: 'onboarding', missing0: 'essentialExpenses', lastQuestionKey: 'essentialExpenses' } },
        { user: 'essentials 2400', extracted: { essentialExpenses: 2400 }, expect: { phase: 'onboarding', missing0: 'totalSavings' } },
      ],
    },

    {
      name: 'dont-know cascades: income unknown -> essentials unknown -> savings explicit',
      turns: [
        { user: "I don't know", extracted: {}, expect: { phase: 'onboarding', missing0: 'essentialExpenses', unknownKeys: ['monthlyIncome'] } },
        { user: 'not sure', extracted: {}, expect: { phase: 'onboarding', missing0: 'totalSavings', unknownKeys: ['monthlyIncome', 'essentialExpenses'] } },
        { user: 'savings 2000', extracted: { totalSavings: 2000 }, expect: { phase: 'onboarding', missing0: 'primaryGoal', unknownKeys: ['monthlyIncome', 'essentialExpenses'] } },
      ],
    },

    {
      name: 'dont-know debt then later corrected to explicit amount clears unknown',
      turns: [
        { user: 'income 6500', extracted: { monthlyIncome: 6500 }, expect: { phase: 'onboarding', missing0: 'essentialExpenses' } },
        { user: 'essentials 3000', extracted: { essentialExpenses: 3000 }, expect: { phase: 'onboarding', missing0: 'totalSavings' } },
        { user: 'savings 8000', extracted: { totalSavings: 8000 }, expect: { phase: 'onboarding', missing0: 'primaryGoal' } },
        { user: "don't know", extracted: {}, expect: { phase: 'onboarding', missing0: 'highInterestDebt', unknownKeys: ['primaryGoal'] } },
        { user: 'actually cc 1800', extracted: { highInterestDebt: 1800 }, expect: { phase: 'onboarding', missing0: 'lowInterestDebt', unknownKeys: ['primaryGoal'] } },
      ],
    },
  ];

  for (const fx of fixtures) {
    it(fx.name, () => {
      let st = createInitialAtlasConversationState({ collected: createDefaultFin(), now: 0 });
      for (const t of fx.turns) {
        const user = String(t.user || '');
        const kind = /\b(privacy|data)\b/i.test(user) ? 'meta' : user.includes('?') ? 'followup_question' : undefined;
        st = applyUserTurn(st, { userText: user, extractedFields: t.extracted as any, now: (st.lastTurnAt || 0) + 1, kind });
        expect(st.phase).toBe(t.expect.phase);
        if (t.expect.missing0) expect(st.missing[0]).toBe(t.expect.missing0);
        if (t.expect.lastQuestionKey) expect(st.lastQuestionKey).toBe(t.expect.lastQuestionKey);
        if (t.expect.unknownKeys) {
          const keys = Object.keys(st.unknown).sort();
          expect(keys).toEqual(t.expect.unknownKeys.sort());
        }
        if (t.expect.collected) {
          for (const [k, v] of Object.entries(t.expect.collected)) {
            expect((st.collected as any)[k]).toBe(v);
          }
        }
      }
    });
  }
});
