import type { ChatMessage, FinancialState, Strategy } from './types';
import type { AtlasMode } from './atlasConversationController';

export type Screen = 'landing' | 'conversation' | 'summary' | 'tier' | 'dashboard' | 'strategy' | 'plan' | 'settings';

export type ConversationState = {
  scr: Screen;
  baseline: Strategy | null;
  msgs: ChatMessage[];
  inp: string;
  fin: FinancialState;
  pendingFin: FinancialState | null;
  pendingBlock: 'confirm' | 'lever' | 'next' | null;
  selectedLever: Strategy['lever'] | null;
  missing: Array<keyof FinancialState>;
  lastQuestionKey?: keyof FinancialState;
  mode: AtlasMode;
  answered: Partial<Record<keyof FinancialState, boolean>>;
  unknown: Partial<Record<keyof FinancialState, boolean>>;
  memorySummary: string | null;
  streaming: boolean;
  busy: boolean;
  apiErr: string | null;
};

export type ConversationEvent =
  | { type: 'NAVIGATE'; scr: Screen }
  | { type: 'SET_INPUT'; text: string }
  | { type: 'SET_PENDING_FIN'; fin: FinancialState | null }
  | { type: 'SET_PENDING_BLOCK'; block: ConversationState['pendingBlock'] }
  | { type: 'SET_SELECTED_LEVER'; lever: Strategy['lever'] | null }
  | { type: 'HYDRATE_FIN'; fin: Partial<FinancialState> }
  | { type: 'HYDRATE_BASELINE'; baseline: Strategy | null }
  | { type: 'SET_MODE'; mode: AtlasMode }
  | { type: 'RESTORE'; state: ConversationState }
  | { type: 'SEND_START'; text: string }
  | { type: 'STREAM_START' }
  | { type: 'STREAM_DELTA'; delta: string }
  | { type: 'STREAM_DONE' }
  | { type: 'STREAM_CANCELED' }
  | {
      type: 'SEND_EXTRACTED';
      finNext: FinancialState;
      missingNext: Array<keyof FinancialState>;
      answeredNext: Partial<Record<keyof FinancialState, boolean>>;
      unknownNext: Partial<Record<keyof FinancialState, boolean>>;
      apiOk: boolean;
      err?: string | null;
    }
  | { type: 'SET_MEMORY_SUMMARY'; summary: string | null }
  | { type: 'SEND_ASKED'; text: string; questionKey?: keyof FinancialState }
  | { type: 'SEND_STRATEGY_READY'; baseline: Strategy }
  | { type: 'SEND_FAILED'; err: string }
  | { type: 'RESET' };

const initialAssistantMessage: ChatMessage = {
  r: 'a',
  t: "Hey, I'm glad you're here.\n\nI'm not going to ask you to connect your bank or fill out a form. I just want to understand your situation — in your own words.\n\nWhat's on your mind when it comes to money right now?",
};

export function createDefaultFin(): FinancialState {
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

export function createInitialConversationState(initialScreen: Screen = 'landing'): ConversationState {
  return {
    scr: initialScreen,
    baseline: null,
    msgs: [initialAssistantMessage],
    inp: '',
    fin: createDefaultFin(),
    pendingFin: null,
    pendingBlock: null,
    selectedLever: null,
    missing: [],
    lastQuestionKey: undefined,
    mode: 'text',
    answered: {},
    unknown: {},
    memorySummary: null,
    streaming: false,
    busy: false,
    apiErr: null,
  };
}

export function conversationReducer(state: ConversationState, ev: ConversationEvent): ConversationState {
  switch (ev.type) {
    case 'NAVIGATE':
      return { ...state, scr: ev.scr };

    case 'RESTORE':
      return ev.state;

    case 'SET_INPUT':
      return { ...state, inp: ev.text };

    case 'SET_PENDING_FIN':
      return { ...state, pendingFin: ev.fin };

    case 'SET_PENDING_BLOCK':
      return { ...state, pendingBlock: ev.block };

    case 'SET_SELECTED_LEVER':
      return { ...state, selectedLever: ev.lever };

    case 'HYDRATE_FIN':
      return { ...state, fin: { ...state.fin, ...ev.fin } };

    case 'HYDRATE_BASELINE':
      return { ...state, baseline: ev.baseline };

    case 'SET_MODE':
      return { ...state, mode: ev.mode };

    case 'SEND_START':
      return {
        ...state,
        inp: '',
        streaming: false,
        busy: true,
        msgs: [...state.msgs, { r: 'u', t: ev.text }],
      };

    case 'STREAM_START':
      return {
        ...state,
        streaming: true,
        busy: true,
        msgs: [...state.msgs, { r: 'a', t: '' }],
      };

    case 'STREAM_DELTA': {
      if (!state.streaming) return state;
      const msgs = [...state.msgs];
      const last = msgs[msgs.length - 1];
      if (!last || last.r !== 'a') return state;
      msgs[msgs.length - 1] = { ...last, t: `${last.t || ''}${ev.delta || ''}` };
      return { ...state, msgs };
    }

    case 'STREAM_DONE':
      return { ...state, streaming: false, busy: false };

    case 'STREAM_CANCELED': {
      const msgs = [...state.msgs];
      const last = msgs[msgs.length - 1];
      if (last && last.r === 'a') {
        const cur = String(last.t || '');
        if (cur.trim().length === 0) {
          msgs[msgs.length - 1] = { ...last, t: 'Canceled' };
        } else if (!/\bcanceled\b/i.test(cur)) {
          msgs[msgs.length - 1] = { ...last, t: `${cur.trim()}\n\nCanceled` };
        }
      }
      return { ...state, streaming: false, busy: false, msgs };
    }

    case 'SEND_EXTRACTED':
      return {
        ...state,
        fin: ev.finNext,
        missing: ev.missingNext,
        answered: ev.answeredNext,
        unknown: ev.unknownNext,
        apiErr: ev.apiOk ? null : ev.err || 'Claude API unavailable',
      };

    case 'SET_MEMORY_SUMMARY':
      return {
        ...state,
        memorySummary: ev.summary,
      };

    case 'SEND_ASKED':
      return {
        ...state,
        busy: false,
        streaming: false,
        lastQuestionKey: ev.questionKey ?? state.lastQuestionKey,
        msgs: [...state.msgs, { r: 'a', t: ev.text }],
      };

    case 'SEND_STRATEGY_READY':
      return {
        ...state,
        baseline: ev.baseline,
        busy: false,
        streaming: false,
        msgs: [...state.msgs, { r: 'a', t: 'Perfect — I have enough to start.\n\nLet me reflect this back and we’ll pick one clear next step.' }],
      };

    case 'SEND_FAILED':
      return {
        ...state,
        busy: false,
        streaming: false,
        apiErr: ev.err,
      };

    case 'RESET':
      return {
        scr: 'landing',
        baseline: null,
        msgs: [initialAssistantMessage],
        inp: '',
        fin: createDefaultFin(),
        pendingFin: null,
        pendingBlock: null,
        selectedLever: null,
        missing: [],
        lastQuestionKey: undefined,
        mode: 'text',
        answered: {},
        unknown: {},
        memorySummary: null,
        streaming: false,
        busy: false,
        apiErr: null,
      };

    default:
      return state;
  }
}
