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
  // Mentor-like questions that explain WHY we're asking
  // This builds trust and helps users understand the financial logic
  const withWhy = (q: string, why: string) => `${q}\n\n_${why}_`;
  
  const variants: Record<string, string[]> = {
    monthlyIncome: [
      withWhy(
        "What's your monthly take-home income — the amount that actually hits your account after taxes?",
        "This is the foundation. Everything else we plan depends on knowing what you're actually working with."
      ),
      withWhy(
        'About how much comes in each month, after tax?',
        'Your income is the anchor. It determines what\'s possible and what trade-offs we need to make.'
      ),
      withWhy(
        'What would you say your monthly take-home is?',
        'This sets the scale for everything — your goals, your safety net, your flexibility.'
      ),
    ],
    essentialExpenses: [
      withWhy(
        'What do your essentials cost each month — rent, groceries, utilities, insurance, that kind of thing?',
        'Your essentials are your non-negotiables. Everything else we plan comes from what\'s left over.'
      ),
      withWhy(
        'Roughly what do your essentials total each month?',
        'This shows us how much flexibility you actually have. The gap between income and essentials is where the real options are.'
      ),
      withWhy(
        'What do you spend on the must-haves each month?',
        'Knowing your essentials helps us see how much breathing room you have for goals and debt payoff.'
      ),
    ],
    totalSavings: [
      withWhy(
        'How much do you have in savings or cash right now?',
        'This is your safety net. It tells us how resilient you are to surprises and what we can safely do next.'
      ),
      withWhy(
        'About how much is in savings today?',
        'Your current savings show us your starting point. It helps me gauge how much emergency buffer you have.'
      ),
      withWhy(
        'What\'s your current savings balance, roughly?',
        'This defines your emergency fund. It\'s the foundation of financial security.'
      ),
    ],
    highInterestDebt: [
      withWhy(
        'Do you have any high-interest debt — like credit cards? If so, roughly how much total?',
        'High-interest debt is the enemy of progress. It compounds against you every month. Understanding it is the first step to beating it.'
      ),
      withWhy(
        'Any credit card balances or other high-interest debt?',
        'High-interest debt can erase your progress faster than anything else. We need to know what we\'re dealing with.'
      ),
      withWhy(
        'Do you carry any high-interest debt right now?',
        'This matters because it directly affects your monthly cashflow and your path forward.'
      ),
    ],
    lowInterestDebt: [
      withWhy(
        'Do you have any other loans — student loans, car loans, mortgage? Roughly how much total?',
        'Lower-interest debt is different. It affects your cashflow and options, but it\'s not the same emergency as high-interest debt.'
      ),
      withWhy(
        'Any student loans, car loans, or a mortgage we should account for?',
        'These loans shape your long-term picture. They affect what you can do and what you should prioritize.'
      ),
      withWhy(
        'Any other debt we should know about?',
        'This rounds out your full financial picture so we can make a real plan.'
      ),
    ],
    primaryGoal: [
      withWhy(
        'What matters most to you right now — stability (peace of mind), growth (building wealth), flexibility (freedom), or something else?',
        'Your goal is the north star. Everything we recommend flows from what you actually want.'
      ),
      withWhy(
        'Which goal feels most urgent to you: stability, growth, flexibility, or building wealth?',
        'Your priority tells me how to sequence your next steps. Different goals need different strategies.'
      ),
      withWhy(
        'If I could help you with one financial outcome, what would matter most?',
        'This anchors everything. Your goal shapes the advice I give you.'
      ),
    ],
  };

  const v = variants[k];
  if (!v || v.length === 0) return { key: k, text: 'What number feels most important to share right now?' };
  const idx = Math.abs(turnIndex) % v.length;
  return { key: k, text: v[idx] };
}

export type InterruptionType = 'answer_to_question' | 'followup_question' | 'correction' | 'meta';

export function classifyInterruption(userText: string): InterruptionType {
  const t = userText.trim().toLowerCase();

  if (/(what.*do.*(data|store|send)|privacy|private|stored|transmit)/i.test(t)) return 'meta';
  if (/\b(store|send)\b/i.test(t) && /\bwhat|why|how\b/i.test(t)) return 'meta';
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
