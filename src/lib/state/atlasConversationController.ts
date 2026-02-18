import type { FinancialState } from './types';

export type AtlasPhase = 'onboarding' | 'baseline_ready' | 'strategy' | 'maintenance';
export type AtlasMode = 'text' | 'voice';

export type AtlasConversationState = {
  sessionId: string;
  phase: AtlasPhase;
  collected: FinancialState;
  missing: Array<keyof FinancialState>;
  lastQuestionKey?: keyof FinancialState;
  lastTurnAt: number;
  mode: AtlasMode;
  answered: Partial<Record<keyof FinancialState, boolean>>;
  unknown: Partial<Record<keyof FinancialState, boolean>>;
};

const REQUIRED: Array<keyof FinancialState> = ['monthlyIncome', 'essentialExpenses', 'totalSavings', 'highInterestDebt', 'lowInterestDebt'];

export function newSessionId() {
  return `sess_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function createInitialAtlasConversationState(args: {
  collected: FinancialState;
  mode?: AtlasMode;
  sessionId?: string;
  now?: number;
}): AtlasConversationState {
  const sessionId = args.sessionId || newSessionId();
  const mode = args.mode || 'text';
  const now = args.now ?? Date.now();
  const answered: AtlasConversationState['answered'] = {};
  const unknown: AtlasConversationState['unknown'] = {};
  const missing = computeMissing(args.collected, answered);
  return {
    sessionId,
    phase: missing.length ? 'onboarding' : 'baseline_ready',
    collected: args.collected,
    missing,
    lastQuestionKey: missing[0],
    lastTurnAt: now,
    mode,
    answered,
    unknown,
  };
}

export function computeMissing(collected: FinancialState, answered: AtlasConversationState['answered']): Array<keyof FinancialState> {
  const isKnown = (k: keyof FinancialState) => {
    if (answered[k] === true) return true;
    const v = collected[k] as any;
    if (k === 'monthlyIncome' || k === 'essentialExpenses') return typeof v === 'number' && v > 0;
    if (k === 'totalSavings') return false;
    if (k === 'highInterestDebt' || k === 'lowInterestDebt') return v !== null;
    return v !== null && v !== undefined;
  };

  return REQUIRED.filter((k) => !isKnown(k));
}

export type ScriptTurn = {
  userText: string;
  extractedFields?: Partial<Record<keyof FinancialState, unknown>>;
  kind?: 'meta' | 'followup_question' | 'correction' | 'answer_to_question';
  now?: number;
};

export function applyUserTurn(st: AtlasConversationState, turn: ScriptTurn): AtlasConversationState {
  const now = turn.now ?? Date.now();
  const userText = String(turn.userText || '');
  const kind = turn.kind || classifyInterruption(userText);
  const dontKnow = /\b(don'?t\s+know|not\s+sure|no\s+idea)\b/i.test(userText);
  const isNo = /^\s*(no|none|nope|nah|n\/a)\b/i.test(userText);
  const effectiveQuestionKey = (st.lastQuestionKey || st.missing[0]) as keyof FinancialState | undefined;
  const mentionsSavings = /\b(savings?|saved|emergency|cash)\b/i.test(userText);
  const mentionsDebt = /\b(debt|loan|loans|card|cards|credit)\b/i.test(userText);

  const collected: FinancialState = { ...st.collected };
  const answered: AtlasConversationState['answered'] = { ...st.answered };
  const unknown: AtlasConversationState['unknown'] = { ...st.unknown };

  if (kind === 'meta' || kind === 'followup_question') {
    return {
      ...st,
      lastTurnAt: now,
    };
  }

  if (dontKnow && effectiveQuestionKey) {
    const k = effectiveQuestionKey;
    answered[k] = true;
    unknown[k] = true;
    if (k === 'highInterestDebt' || k === 'lowInterestDebt') (collected as any)[k] = 0;
    if (k === 'totalSavings') (collected as any)[k] = 0;
  }

  if (!dontKnow && isNo && effectiveQuestionKey) {
    const k = effectiveQuestionKey;
    if (k === 'highInterestDebt' || k === 'lowInterestDebt') {
      answered[k] = true;
      if (unknown[k]) delete unknown[k];
      (collected as any)[k] = 0;
    }
  }

  const parseBareNumber = (s: string): number | null => {
    const t = s.trim();
    const m = t.match(/^\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|thousand)?\s*$/i);
    if (!m) return null;
    let v = Number.parseFloat(m[1].replace(/,/g, ''));
    if (!Number.isFinite(v)) return null;
    if (m[2]) v *= 1000;
    return v;
  };

  if (!dontKnow && effectiveQuestionKey) {
    const v = parseBareNumber(userText);
    if (v !== null) {
      const k = effectiveQuestionKey;
      if (k === 'monthlyIncome' || k === 'essentialExpenses') {
        if (v > 0) {
          (collected as any)[k] = v;
          answered[k] = true;
          if (unknown[k]) delete unknown[k];
        }
      } else if (k === 'totalSavings') {
        if (v >= 0) {
          (collected as any)[k] = v;
          answered[k] = true;
          if (unknown[k]) delete unknown[k];
        }
      } else if (k === 'highInterestDebt' || k === 'lowInterestDebt') {
        if (v >= 0) {
          (collected as any)[k] = v;
          answered[k] = true;
          if (unknown[k]) delete unknown[k];
        }
      }
    }
  }

  if (turn.extractedFields) {
    for (const [k0, v0] of Object.entries(turn.extractedFields)) {
      const k = k0 as keyof FinancialState;
      if (!(k in collected)) continue;
      if (v0 === undefined || v0 === null) continue;
      (collected as any)[k] = v0;

      const shouldMarkAnswered = (() => {
        if (k === 'monthlyIncome' || k === 'essentialExpenses') return typeof v0 === 'number' && v0 > 0;

        if (k === 'totalSavings') {
          if (!(typeof v0 === 'number' && v0 >= 0)) return false;
          if (v0 > 0) return true;
          return effectiveQuestionKey === 'totalSavings' || mentionsSavings;
        }

        if (k === 'highInterestDebt' || k === 'lowInterestDebt') {
          if (!(typeof v0 === 'number' && v0 >= 0)) return false;
          if (v0 > 0) return true;
          return effectiveQuestionKey === k || mentionsDebt;
        }

        return true;
      })();

      if (!shouldMarkAnswered) continue;
      answered[k] = true;
      if (unknown[k]) delete unknown[k];
    }
  }

  const missing = computeMissing(collected, answered);
  const phase: AtlasPhase = missing.length ? 'onboarding' : 'baseline_ready';
  const lastQuestionKey = missing[0];

  return {
    ...st,
    collected,
    answered,
    unknown,
    missing,
    phase,
    lastQuestionKey,
    lastTurnAt: now,
  };
}

export function nextQuestionForMissing(
  k: keyof FinancialState,
  turnIndex: number
): {
  key: keyof FinancialState;
  text: string;
} {
  const withWhy = (q: string, why: string) => `${q} (${why} A rough number is totally fine.)`;
  const variants: Record<string, string[]> = {
    monthlyIncome: [
      withWhy("What's your monthly take-home income?", 'This tells us what we can safely work with.'),
      withWhy('About how much hits your account each month, after tax?', 'It anchors every other decision we make.'),
      withWhy('What would you say your monthly take-home is?', 'It sets the scale for goals and tradeoffs.'),
    ],
    essentialExpenses: [
      withWhy('About how much goes to essentials each month — rent, groceries, utilities?', 'We need to know your non-negotiables first.'),
      withWhy('Roughly what do your essentials cost per month?', 'This shows how much flexibility we actually have.'),
      withWhy('What do you spend on essentials in a typical month?', 'It tells us how much buffer you really have.'),
    ],
    totalSavings: [
      withWhy('How much do you have in savings/cash right now?', 'This helps me gauge your safety net.'),
      withWhy('About how much is in savings today?', 'It tells us how resilient you are to surprises.'),
      withWhy('What’s your current savings balance, roughly?', 'It defines your emergency buffer.'),
    ],
    highInterestDebt: [
      withWhy('Do you have any high-interest debt like credit cards — and if so, about how much total?', 'This tells us what’s compounding against you.'),
      withWhy('Any credit card balances (or other high-interest debt) — roughly how much total?', 'High-interest debt can erase progress quickly.'),
      withWhy('Do you carry any high-interest debt right now — roughly how much?', 'It helps us decide the safest first move.'),
    ],
    lowInterestDebt: [
      withWhy('Any other loans (student, car, mortgage) — and if so, about how much total?', 'This affects cashflow and long-term options.'),
      withWhy('Do you have any other debt like student loans, car loans, or a mortgage — roughly how much total?', 'It helps us plan without overcommitting.'),
      withWhy('Any lower-interest loans we should account for — roughly what’s the total?', 'It rounds out your full picture.'),
    ],
  };

  const v = variants[k];
  if (!v || v.length === 0) return { key: k, text: 'Tell me one number that feels most important right now.' };
  const idx = Math.abs(turnIndex) % v.length;
  return { key: k, text: v[idx] };
}

export type InterruptionType = 'answer_to_question' | 'followup_question' | 'correction' | 'meta';

export function classifyInterruption(userText: string): InterruptionType {
  const t = userText.trim().toLowerCase();

  if (/(what.*do.*(data|store|send)|privacy|private|stored|transmit)/i.test(t)) return 'meta';
  if (/^(actually|correction|sorry|wait|i meant|update)/i.test(t) || /\bmy\s+(income|rent|expenses|savings|debt)\s+is\b/i.test(t)) return 'correction';
  if (t.includes('?')) return 'followup_question';
  return 'answer_to_question';
}

export function metaResponse(userText: string): string {
  if (/(data|privacy|store|stored|send|transmit)/i.test(userText)) {
    return 'Messages you type may be sent to our AI provider to generate responses, and your financial state is stored locally in your browser (IndexedDB) which you can delete anytime.';
  }
  return "I can answer that. What are you curious about?";
}
