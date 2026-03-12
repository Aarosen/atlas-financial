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

const REQUIRED: Array<keyof FinancialState> = ['monthlyIncome', 'essentialExpenses', 'totalSavings', 'primaryGoal', 'highInterestDebt', 'lowInterestDebt'];

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
    if (Boolean(answered[k])) return true;
    const v = collected[k] as any;
    if (k === 'monthlyIncome' || k === 'essentialExpenses') return typeof v === 'number' && v > 0;
    if (k === 'totalSavings') return typeof v === 'number' && v >= 0 && (Boolean(answered[k]) || v > 0);
    if (k === 'primaryGoal') return Boolean(answered[k]);
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

  if (!dontKnow && effectiveQuestionKey === 'primaryGoal') {
    const t = userText.toLowerCase();
    const map = (text: string) => {
      if (/stable|stability|secure|peace\s*of\s*mind/i.test(text)) return 'stability';
      if (/wealth|retire|financial\s*independence|fire|passive/i.test(text)) return 'wealth_building';
      if (/grow|invest|returns|portfolio/i.test(text)) return 'growth';
      if (/flexib|freedom|liquid/i.test(text)) return 'flexibility';
      return null;
    };
    const primary = map(t);
    if (primary) {
      (collected as any).primaryGoal = primary;
      answered.primaryGoal = true;
      if (unknown.primaryGoal) delete unknown.primaryGoal;
    }
    const secondaryMatch = t.split(/\band\b|\balso\b/i).map((s) => s.trim()).filter(Boolean);
    if (secondaryMatch.length > 1) {
      const secondary = secondaryMatch.slice(1).join(' and ').trim();
      if (secondary) (collected as any).secondaryGoal = secondary;
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
          return effectiveQuestionKey === 'totalSavings' || mentionsSavings || k === 'totalSavings';
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
  // Natural, conversational questions without explanations
  // Just genuine curiosity about their situation
  const variants: Record<string, string[]> = {
    monthlyIncome: [
      "What's your monthly take-home?",
      'How much do you bring home each month?',
      "What's your monthly income after taxes?",
      'How much are you making per month?',
    ],
    essentialExpenses: [
      'What do you spend on essentials each month? Rent, food, utilities, that kind of thing.',
      'How much do you need for essentials each month?',
      "What's your baseline monthly spend?",
      'What do the basics cost you?',
    ],
    totalSavings: [
      'How much do you currently have saved?',
      "What's your savings balance?",
      'How much have you saved so far?',
      'Do you have savings set aside?',
    ],
    highInterestDebt: [
      'Do you have any high-interest debt like credit cards?',
      'Any credit card balances?',
      'Do you carry any high-interest debt?',
      'What high-interest debt do you have?',
    ],
    lowInterestDebt: [
      'Do you have any other loans — student loans, car loans, mortgage?',
      'Any student loans, car loans, or a mortgage?',
      'Any other debt we should know about?',
      'What other loans do you have?',
    ],
    primaryGoal: [
      'What matters most to you right now?',
      'What are you hoping to achieve?',
      'What would feel like a win for you?',
      'What are your biggest financial goals?',
    ],
  };

  const v = variants[k];
  if (!v || v.length === 0) return { key: k, text: 'What would help you most right now?' };
  const idx = Math.abs(turnIndex) % v.length;
  return { key: k, text: v[idx] };
}

export type InterruptionType = 'answer_to_question' | 'followup_question' | 'correction' | 'meta';

export function classifyInterruption(userText: string): InterruptionType {
  const t = userText.trim().toLowerCase();

  if (/(what.*do.*(data|store|send)|privacy|private|stored|transmit)/i.test(t)) return 'meta';
  if (/\b(store|send)\b/i.test(t) && /\bwhat|why|how\b/i.test(t)) return 'meta';
  if (/^(actually|correction|sorry|wait|i meant|update)/i.test(t) || /\bmy\s+(income|rent|expenses|savings|debt)\s+is\b/i.test(t)) return 'correction';

  if (t.includes('?')) {
    // Goal-oriented questions should route to orchestrator, not explain mode
    // But avoid matching "what is X?" educational questions
    let isGoalQuestion =
      /\bcan i afford\b/i.test(t) ||
      /\bshould i\b/i.test(t) ||
      /\bhow (much|do i|can i|should i)\b/i.test(t) ||
      /\bwhat (should|would|can|is the best)\b/i.test(t) ||
      /\bam i (on track|okay|good|saving enough)\b/i.test(t);

    // Also match goal-oriented keywords but NOT in "what is X?" format
    if (!isGoalQuestion && !/^what\s+is\b/i.test(t)) {
      if (/\b(afford|budget|save|invest|pay off|debt|retire|emergency fund)\b/i.test(t)) {
        isGoalQuestion = true;
      }
    }

    if (isGoalQuestion) return 'answer_to_question';

    // Genuine clarifying/educational questions use explain mode
    return 'followup_question';
  }

  return 'answer_to_question';
}

export function metaResponse(userText: string): string {
  if (/(data|privacy|store|stored|send|transmit)/i.test(userText)) {
    return 'Your data stays private—I only send what you type for the current request to Claude AI, and your financial info stays in your browser locally where you can delete it anytime.';
  }
  return "I can answer that.";
}
