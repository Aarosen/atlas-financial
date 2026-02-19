 'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ClaudeClient } from '@/lib/api/client';
import { AtlasDb } from '@/lib/db/atlasDb';
import { StrategyEngine } from '@/lib/engine/strategyEngine';
import type { ChatMessage, FinancialState, Strategy } from '@/lib/state/types';
import { conversationReducer, createInitialConversationState, type Screen } from '@/lib/state/conversationMachine';
import { applyUserTurn, classifyInterruption, clarificationForMissing, metaResponse, nextQuestionForMissing } from '@/lib/state/atlasConversationController';
import { decideNextAction } from '@/lib/ai/orchestrator';
import { createReplayEntry, detectReplayEmotion, logReplayEntry } from '@/lib/ai/replay';
import { buildActionFeedback, detectAction, estimateActionImpact } from '@/lib/ai/actions';
import { suggestActions } from '@/lib/ai/actionSuggestions';
import { buildNudge } from '@/lib/ai/nudges';
import { buildStreakMessage, computeActionStreak } from '@/lib/ai/streaks';
import { detectLiteracyLevel, detectResponsePreference } from '@/lib/ai/personalization';
import { buildReasoningTrace } from '@/lib/ai/trace';
import { buildCheckinMessage, shouldShowCheckin } from '@/lib/ai/checkins';
import { createFeedbackEntry, shouldPromptFeedback } from '@/lib/ai/feedback';
import { createVoice } from '@/lib/voice/voice';
import { ConversationScreen, DashboardScreen, LandingScreen, PlanScreen, SettingsScreen, StrategyScreen, SummaryScreen, TierRevealScreen } from '@/screens';
import { buildMetricExplainer } from '@/lib/ui/metricExplainer';
import { Button } from '@/components/Buttons';
import { BarChart3, LayoutList, MessageSquare, Settings } from 'lucide-react';

const NEED: Array<keyof FinancialState> = ['monthlyIncome', 'essentialExpenses', 'totalSavings', 'primaryGoal', 'highInterestDebt', 'lowInterestDebt'];

const defaultFin: FinancialState = createInitialConversationState('landing').fin;

const fc = (n: number) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);

const fp = (n: number) => `${Math.round((Number.isFinite(n) ? n : 0) * 100)}%`;

const tc = (t: Strategy['tier']) =>
  (
    {
      Foundation: { name: 'Foundation', desc: 'We steady the ground first.' },
      Stabilizing: { name: 'Stabilizing', desc: 'We reduce pressure and build buffer.' },
      Strategic: { name: 'Strategic', desc: 'We’re building momentum with intent.' },
      GrowthReady: { name: 'Growth Ready', desc: 'We can lean into growth.' },
    } as const
  )[t];

export default function AtlasApp({ initialScreen = 'landing' }: { initialScreen?: Screen }) {
  const db = useMemo(() => new AtlasDb(), []);
  const claude = useMemo(() => new ClaudeClient(), []);
  const engine = useMemo(() => new StrategyEngine(), []);
  const [mounted, setMounted] = useState(false);
  const [apiStatus, setApiStatus] = useState(claude.status);
  const [voiceListening, setVoiceListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [replayEnabled, setReplayEnabled] = useState(true);
  const [responsePref, setResponsePref] = useState<'short' | 'explain' | null>(null);
  const [literacyLevel, setLiteracyLevel] = useState<'novice' | 'intermediate' | 'advanced' | null>(null);
  const voice = useMemo(
    () =>
      createVoice({
        onListeningChange: setVoiceListening,
        onSpeakingChange: setSpeaking,
      }),
    []
  );

  const buildMemorySummary = useCallback((fin: FinancialState, answered: Partial<Record<keyof FinancialState, boolean>>) => {
    const parts: string[] = [];
    if (answered.monthlyIncome && fin.monthlyIncome > 0) parts.push(`Monthly take-home: ${fc(fin.monthlyIncome)}.`);
    if (answered.essentialExpenses && fin.essentialExpenses > 0) parts.push(`Essentials: ${fc(fin.essentialExpenses)} / month.`);
    if (answered.totalSavings) parts.push(`Savings: ${fc(fin.totalSavings)}.`);
    if (answered.highInterestDebt) parts.push(`High-interest debt: ${fc(fin.highInterestDebt ?? 0)}.`);
    if (answered.lowInterestDebt) parts.push(`Low-interest debt: ${fc(fin.lowInterestDebt ?? 0)}.`);
    if (fin.primaryGoal) parts.push(`Primary goal: ${fin.primaryGoal}.`);
    if (fin.riskTolerance) parts.push(`Risk tolerance: ${fin.riskTolerance}.`);
    if (fin.timeHorizonYears) parts.push(`Time horizon: ${fin.timeHorizonYears} years.`);
    if (responsePref) parts.push(`Response preference: ${responsePref}.`);
    if (literacyLevel) parts.push(`Financial literacy: ${literacyLevel}.`);
    return parts.join(' ');
  }, [literacyLevel, responsePref]);

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<'talk' | 'plan' | 'dashboard' | 'settings'>('talk');
  const tabStacksRef = useRef({
    talk: 'conversation' as Screen,
    plan: 'plan' as Screen,
    dashboard: 'dashboard' as Screen,
    settings: 'settings' as Screen,
  });
  const [speakReplies, setSpeakReplies] = useState(false);
  const [voiceAutoSend, setVoiceAutoSend] = useState(false);
  const [editingLast, setEditingLast] = useState(false);
  const lastSendSnapshotRef = useRef<typeof st | null>(null);
  const lastUserTextRef = useRef<string | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const streamIdRef = useRef(0);
  const [st, dispatch] = useReducer(conversationReducer, createInitialConversationState(initialScreen));

  const bot = useRef<HTMLDivElement | null>(null);

  const handleConfirmFin = useCallback(async () => {
    if (!st.pendingFin) return;
    const b = (await engine.run(st.pendingFin, { answered: st.answered, unknown: st.unknown })) as Strategy;
    await db.set('strat', { k: 'baseline', ...b });
    dispatch({ type: 'SEND_STRATEGY_READY', baseline: b });
    dispatch({ type: 'SET_SELECTED_LEVER', lever: b.lever });
    dispatch({ type: 'SET_PENDING_BLOCK', block: 'lever' });
  }, [db, engine, st.pendingFin, st.answered, st.unknown]);

  const handleEditFin = useCallback(() => {
    dispatch({ type: 'SET_PENDING_BLOCK', block: null });
  }, [dispatch]);

  const handleConfirmNextStep = useCallback(async () => {
    if (st.pendingBlock === 'lever') {
      if (!st.baseline) return;
      dispatch({ type: 'SET_PENDING_BLOCK', block: 'next' });
      return;
    }
    if (st.pendingBlock === 'next') {
      dispatch({ type: 'SET_PENDING_BLOCK', block: null });
      dispatch({ type: 'SET_PENDING_FIN', fin: null });
      dispatch({ type: 'NAVIGATE', scr: 'summary' });
    }
  }, [db, st.pendingBlock, st.baseline, st.selectedLever, dispatch]);

  const metricExplainerText = useCallback(
    (metric: string, fin: FinancialState, baseline: Strategy) => buildMetricExplainer(metric, fin, baseline, { fc, fp }),
    []
  );

  const nextStepContent = useCallback(
    (fin: FinancialState, baseline: Strategy) => {
      const net = (baseline.metrics as any)?.net ?? fin.monthlyIncome - fin.essentialExpenses - fin.monthlyDebtPayments;
      if (baseline.lever === 'stabilize_cashflow') {
        return {
          direction: 'Get to money left each month.',
          action: 'Pick one bill or category to cut by $50–$150 this week (rent, groceries, subscriptions, phone, insurance).',
          time: 'Today or this week.',
        };
      }
      if (baseline.lever === 'eliminate_high_interest_debt') {
        return {
          direction: 'Reduce compounding interest.',
          action: 'List your credit cards (name + balance + APR, rough is fine).',
          time: 'Today.',
        };
      }
      if (baseline.lever === 'build_emergency_buffer') {
        return {
          direction: 'Build your emergency cushion.',
          action: 'Choose a weekly auto-transfer amount you can keep (even $10–$25).',
          time: 'This week.',
        };
      }
      if (baseline.lever === 'increase_future_allocation') {
        return {
          direction: 'Grow future savings.',
          action: 'Tell me if you have a 401(k) match or a Roth IRA option.',
          time: 'Today.',
        };
      }
      return {
        direction: 'Tighten discretionary spend.',
        action: 'Pick one category to shrink (dining, delivery, subscriptions, shopping).',
        time: 'This week.',
      };
    },
    []
  );

  const nextStepText = useCallback(
    (fin: FinancialState, baseline: Strategy) => {
      const next = nextStepContent(fin, baseline);
      return `Direction: ${next.direction}\nAction: ${next.action}\nTime: ${next.time}`;
    },
    [nextStepContent]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 719px)');
    const onChange = () => setIsMobile(!!mq.matches);
    onChange();
    try {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    } catch {
      mq.addListener(onChange);
      return () => mq.removeListener(onChange);
    }
  }, []);

  useEffect(() => {
    const tabForScreen = (scr: Screen) => {
      if (scr === 'conversation' || scr === 'summary' || scr === 'tier') return 'talk';
      if (scr === 'plan' || scr === 'strategy') return 'plan';
      if (scr === 'dashboard') return 'dashboard';
      if (scr === 'settings') return 'settings';
      return 'talk';
    };
    const tab = tabForScreen(st.scr);
    tabStacksRef.current[tab] = st.scr;
    setActiveTab(tab);
  }, [st.scr]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (st.scr !== 'conversation') return;
    // Resolve 'unknown' quickly without spending tokens: checks whether /api/chat is reachable and configured.
    void claude.statusCheck().finally(() => setApiStatus(claude.status));
  }, [claude, st.scr]);

  useEffect(() => {
    if (!st.baseline) return;
    if (st.scr !== 'conversation') return;
    void db.get<{ v: number }>('prefs', 'lastCheckinAt').then((p) => {
      const last = typeof p?.v === 'number' ? p.v : null;
      if (!shouldShowCheckin({ lastCheckinAt: last })) return;
      const msg = buildCheckinMessage();
      dispatch({ type: 'SEND_ASKED', text: msg });
      void db.set('prefs', { k: 'lastCheckinAt', v: Date.now() });
    });
  }, [db, st.baseline, st.scr]);

  useEffect(() => {
    if (st.scr !== 'conversation') return;
    void db.get<{ v: number }>('prefs', 'lastFeedbackAt').then((p) => {
      const last = typeof p?.v === 'number' ? p.v : null;
      if (!shouldPromptFeedback({ lastPromptAt: last })) return;
      const msg = 'Quick check: was that last response helpful? Reply "helpful" or "not helpful".';
      dispatch({ type: 'SEND_ASKED', text: msg });
      void db.set('prefs', { k: 'lastFeedbackAt', v: Date.now() });
    });
  }, [db, st.scr]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    db.set('prefs', { k: 'theme', v: theme }).catch(() => {});
  }, [theme, db]);

  useEffect(() => {
    db.get<{ v: 'light' | 'dark' }>('prefs', 'theme')
      .then((p: { v: 'light' | 'dark' } | undefined) => {
        if (p?.v) setTheme(p.v);
      })
      .catch(() => {});
  }, [db]);

  useEffect(() => {
    db.get<{ v: boolean }>('prefs', 'speakReplies')
      .then((p: { v: boolean } | undefined) => {
        if (typeof p?.v === 'boolean') setSpeakReplies(p.v);
      })
      .catch(() => {});
    db.get<{ v: boolean }>('prefs', 'voiceAutoSend')
      .then((p: { v: boolean } | undefined) => {
        if (typeof p?.v === 'boolean') setVoiceAutoSend(p.v);
      })
      .catch(() => {});
    db.get<{ v: boolean }>('prefs', 'replayEnabled')
      .then((p: { v: boolean } | undefined) => {
        if (typeof p?.v === 'boolean') setReplayEnabled(p.v);
      })
      .catch(() => {});
    db.get<{ v: 'short' | 'explain' }>('prefs', 'responsePref')
      .then((p: { v: 'short' | 'explain' } | undefined) => {
        if (p?.v) setResponsePref(p.v);
      })
      .catch(() => {});
    db.get<{ v: 'novice' | 'intermediate' | 'advanced' }>('prefs', 'literacyLevel')
      .then((p: { v: 'novice' | 'intermediate' | 'advanced' } | undefined) => {
        if (p?.v) setLiteracyLevel(p.v);
      })
      .catch(() => {});
    db.get<{ v: string }>('prefs', 'memorySummary')
      .then((p: { v: string } | undefined) => {
        if (typeof p?.v === 'string' && p.v.trim()) {
          dispatch({ type: 'SET_MEMORY_SUMMARY', summary: p.v.trim() });
        }
      })
      .catch(() => {});
  }, [db]);

  useEffect(() => {
    if (!speakReplies) return;
    if (!voice.ttsSupported) return;
    const last = st.msgs[st.msgs.length - 1];
    if (!last || last.r !== 'a') return;
    voice.speak(last.t);
  }, [st.msgs, speakReplies, voice]);

  useEffect(() => {
    db.get<any>('fin', 'cur')
      .then((v) => {
        if (v) {
          const nf: FinancialState = {
            ...defaultFin,
            ...v,
          };
          dispatch({ type: 'HYDRATE_FIN', fin: nf });
        }
      })
      .catch(() => {});
  }, [db]);

  useEffect(() => {
    db.get<Strategy>('strat', 'baseline')
      .then((s) => {
        if (s) dispatch({ type: 'HYDRATE_BASELINE', baseline: s });
      })
      .catch(() => {});
  }, [db]);

  useEffect(() => {
    bot.current?.scrollIntoView({ behavior: 'smooth' });
  }, [st.msgs]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'atlas:dashboardOpenedAt') return;
      if (!st.baseline) return;
      if (st.scr === 'dashboard') return;
      if (st.scr !== 'conversation') dispatch({ type: 'NAVIGATE', scr: 'conversation' });
      dispatch({ type: 'SEND_ASKED', text: nextStepText(st.fin, st.baseline) });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [st.baseline, st.fin, st.scr, nextStepText]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'atlas:explainMetric') return;
      if (!st.baseline) return;
      if (st.scr === 'dashboard') return;
      let metric = '';
      try {
        const parsed = JSON.parse(String(e.newValue || ''));
        metric = String(parsed?.metric || '');
      } catch {
        metric = '';
      }
      if (!metric) return;

      if (st.scr !== 'conversation') dispatch({ type: 'NAVIGATE', scr: 'conversation' });
      dispatch({ type: 'SEND_ASKED', text: metricExplainerText(metric, st.fin, st.baseline) });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [metricExplainerText, st.baseline, st.fin, st.scr]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (st.scr !== 'dashboard') return;
    try {
      window.localStorage.setItem('atlas:dashboardOpenedAt', String(Date.now()));
    } catch {
      // ignore
    }
  }, [st.scr]);

  const missing = useCallback((f: FinancialState) => NEED.filter((k) => f[k] === null || f[k] === undefined), []);

  const doSend = useCallback(
    async (base: typeof st, ut: string) => {
      dispatch({ type: 'SEND_START', text: ut });
      const kind = classifyInterruption(ut);
      const logReplay = (entry: ReturnType<typeof createReplayEntry>) => {
        void logReplayEntry({ enabled: replayEnabled, entry, set: db.set.bind(db) }).catch(() => {});
      };

      const pref = detectResponsePreference(ut);
      if (pref && pref !== responsePref) {
        setResponsePref(pref);
        void db.set('prefs', { k: 'responsePref', v: pref });
      }
      const literacy = detectLiteracyLevel(ut);
      if (literacy && literacy !== literacyLevel) {
        setLiteracyLevel(literacy);
        void db.set('prefs', { k: 'literacyLevel', v: literacy });
      }

      if (/^\s*(helpful|not helpful)\s*$/i.test(ut)) {
        const rating = /helpful/i.test(ut) ? 'helpful' : 'not_helpful';
        void db.set('feedback', createFeedbackEntry({ responseId: `resp_${Date.now()}`, rating }));
      }

      logReplay(createReplayEntry({ role: 'user', text: ut, kind, emotionTag: detectReplayEmotion(ut) }));

      const detectedAction = detectAction(ut);
      const actionImpact = estimateActionImpact(detectedAction);
      let actionFeedback = buildActionFeedback(detectedAction, actionImpact);
      if (detectedAction) {
        await db.set('actions', {
          id: `act_${Date.now()}`,
          ...detectedAction,
          impact: actionImpact,
        });
        const history = await db.all('actions');
        const streak = computeActionStreak(history as any[]);
        const streakMsg = buildStreakMessage(streak);
        if (streakMsg) actionFeedback = [actionFeedback, streakMsg].filter(Boolean).join('\n\n');
      }

      let nudgeText: string | null = null;
      if (!detectedAction) {
        const history = await db.all('actions');
        const last = (history as any[]).sort((a, b) => (b?.createdAt || 0) - (a?.createdAt || 0))[0];
        nudgeText = buildNudge({ lastActionAt: last?.createdAt ?? null, primaryGoal: st.fin.primaryGoal });
      }

      const prevMsgs: ChatMessage[] = [...base.msgs, { r: 'u' as const, t: ut }];
      try {
        const normalizeApiErr = (raw0: string) => {
          const raw = String(raw0 || '').trim();
          const t = raw.toLowerCase();
          if (!t) return 'Connection issue — retry when you’re ready.';
          if (t.includes('api not configured') || t.includes('anthropic_api_key')) return 'AI is not configured yet.';
          if (t.includes('too many requests') || t.includes('429')) return 'AI is rate-limited right now. Try again in a moment.';
          if (t.includes('proxy_error_') || t.includes('fetch') || t.includes('network') || t.includes('timeout')) return 'Connection issue — retry when you’re ready.';
          return raw;
        };

        const missBefore = base.missing.length ? base.missing : missing(base.fin);
        const resumeQ = missBefore.length ? nextQuestionForMissing(missBefore[0], prevMsgs.length) : null;

        if (kind === 'meta') {
          const ans = metaResponse(ut);
          const out = resumeQ ? `${ans} ${resumeQ.text}` : ans;
          logReplay(
            createReplayEntry({
              role: 'assistant',
              text: out,
              kind: 'meta',
              questionKey: resumeQ?.key,
              emotionTag: detectReplayEmotion(out),
            })
          );
          dispatch({ type: 'SEND_ASKED', text: out, questionKey: resumeQ?.key });
          return;
        }

      if (kind === 'followup_question') {
        const am = prevMsgs.slice(-10).map((m) => ({ role: m.r === 'u' ? ('user' as const) : ('assistant' as const), content: m.t }));

        streamAbortRef.current?.abort();
        const ctrl = new AbortController();
        streamAbortRef.current = ctrl;
        const myStreamId = ++streamIdRef.current;

        dispatch({ type: 'STREAM_START' });

        let streamed = '';
        const res = await claude.answerStream({
          msgs: am,
          question: ut,
          mode: 'explain',
          memorySummary: st.memorySummary,
          fin: st.fin,
          onDelta: (t) => {
            if (streamIdRef.current !== myStreamId) return;
            if (ctrl.signal.aborted) return;
            streamed += t;
            dispatch({ type: 'STREAM_DELTA', delta: t });
          },
          signal: ctrl.signal,
        });

        if (streamIdRef.current !== myStreamId) {
          // Canceled or replaced by a newer stream.
          return;
        }
        streamAbortRef.current = null;
        if (!res.ok && res.canceled) {
          dispatch({ type: 'STREAM_CANCELED' });
          return;
        }

        dispatch({ type: res.ok ? 'STREAM_DONE' : 'STREAM_DONE' });
        if (res.ok) {
          logReplay(
            createReplayEntry({
              role: 'assistant',
              text: streamed.trim(),
              kind: 'followup_question',
              emotionTag: detectReplayEmotion(streamed),
            })
          );
        }
        if (resumeQ) {
          logReplay(
            createReplayEntry({
              role: 'assistant',
              text: resumeQ.text,
              kind: 'ask',
              questionKey: resumeQ.key,
              emotionTag: detectReplayEmotion(resumeQ.text),
              trace: buildReasoningTrace({
                decision: 'ask',
                questionKey: resumeQ.key,
                missingCount: missBefore.length,
                answeredCount: Object.keys(base.answered || {}).length,
              }),
            })
          );
          dispatch({ type: 'SEND_ASKED', text: resumeQ.text, questionKey: resumeQ.key });
        }
        return;
      }

      const ex = await claude.extract(ut, base.fin);
      setApiStatus(claude.status);

      const st1 = applyUserTurn(
        {
          sessionId: 'ui',
          phase: missBefore.length ? ('onboarding' as const) : ('baseline_ready' as const),
          collected: base.fin,
          missing: missBefore,
          lastQuestionKey: base.lastQuestionKey,
          lastTurnAt: Date.now(),
          mode: base.mode,
          answered: base.answered,
          unknown: base.unknown,
        },
        {
          userText: ut,
          extractedFields: ex.fields as any,
          kind,
          now: Date.now(),
        }
      );

      const uf: FinancialState = st1.collected;
      const miss = st1.missing;
      const answeredNext = st1.answered;
      const unknownNext = st1.unknown;
      const extractedCount = Object.keys((ex.fields as Record<string, unknown>) || {}).length;

      const memorySummary = buildMemorySummary(uf, answeredNext);
      dispatch({ type: 'SET_MEMORY_SUMMARY', summary: memorySummary || null });
      if (memorySummary) {
        await db.set('prefs', { k: 'memorySummary', v: memorySummary, ts: Date.now() });
      }

      dispatch({
        type: 'SEND_EXTRACTED',
        finNext: uf,
        missingNext: miss,
        answeredNext,
        unknownNext,
        apiOk: ex.apiOk !== false,
        err: ex.apiOk === false ? normalizeApiErr(String((ex as any).err || '')) : null,
      });
      await db.set('fin', { k: 'cur', ...uf, ts: Date.now() });

      if (
        kind === 'answer_to_question' &&
        missBefore.length > 0 &&
        miss.length === missBefore.length &&
        miss[0] === missBefore[0] &&
        extractedCount === 0
      ) {
        const clar = clarificationForMissing(missBefore[0]);
        logReplay(
          createReplayEntry({
            role: 'assistant',
            text: clar,
            kind: 'clarify',
            questionKey: missBefore[0],
            emotionTag: detectReplayEmotion(clar),
            trace: buildReasoningTrace({
              decision: 'ask',
              questionKey: missBefore[0],
              missingCount: miss.length,
              answeredCount: Object.keys(answeredNext || {}).length,
            }),
          })
        );
        dispatch({ type: 'SEND_ASKED', text: clar, questionKey: missBefore[0] });
        return;
      }

      const action = decideNextAction({ kind, missing: miss, turnIndex: prevMsgs.length });
      if (action.type === 'complete') {
        if (actionFeedback) {
          logReplay(
            createReplayEntry({
              role: 'assistant',
              text: actionFeedback,
              kind: 'answer_to_question',
              emotionTag: detectReplayEmotion(actionFeedback),
            })
          );
          dispatch({ type: 'SEND_ASKED', text: actionFeedback });
        }
        dispatch({ type: 'SET_PENDING_FIN', fin: uf });
        dispatch({ type: 'SET_PENDING_BLOCK', block: 'confirm' });
        return;
      }
      if (action.type === 'ask') {
        const preface = [actionFeedback, nudgeText].filter(Boolean).join('\n\n');
        const askText = preface ? `${preface}\n\n${action.text}` : action.text;
        logReplay(
          createReplayEntry({
            role: 'assistant',
            text: askText,
            kind: 'ask',
            questionKey: action.questionKey,
            emotionTag: detectReplayEmotion(askText),
            trace: buildReasoningTrace({
              decision: 'ask',
              questionKey: action.questionKey,
              missingCount: miss.length,
              answeredCount: Object.keys(answeredNext || {}).length,
            }),
          })
        );
        dispatch({ type: 'SEND_ASKED', text: askText, questionKey: action.questionKey });
      }
    } catch (e: any) {
      const raw = String(e?.message || 'send_failed');
      const friendly = (() => {
        const t = raw.toLowerCase();
        if (t.includes('api not configured') || t.includes('anthropic_api_key')) return 'AI is not configured yet.';
        if (t.includes('too many requests') || t.includes('429')) return 'AI is rate-limited right now. Try again in a moment.';
        if (t.includes('proxy_error_') || t.includes('fetch') || t.includes('network') || t.includes('timeout')) return 'Connection issue — retry when you’re ready.';
        return raw;
      })();
      setApiStatus(claude.status);
      dispatch({ type: 'SEND_FAILED', err: friendly });
    }
  },
    [claude, db, engine, missing]
  );

  const send = useCallback(
    async (overrideText?: string) => {
      if (st.busy) return;
      voice.stopSpeak();
      const ut = String((overrideText ?? st.inp) || '').trim();
      if (!ut) return;

      if (editingLast && lastSendSnapshotRef.current) {
        const snap = lastSendSnapshotRef.current;
        setEditingLast(false);
        dispatch({ type: 'RESTORE', state: snap });
        await doSend(snap, ut);
        return;
      }

      lastSendSnapshotRef.current = st;
      lastUserTextRef.current = ut;
      await doSend(st, ut);
    },
    [st, voice, editingLast, doSend]
  );

  const canRetry = !!st.apiErr && !st.busy && !!lastSendSnapshotRef.current && !!lastUserTextRef.current;

  const retryLast = useCallback(() => {
    if (!canRetry) return;
    const snap = lastSendSnapshotRef.current;
    const ut = lastUserTextRef.current;
    if (!snap || !ut) return;
    dispatch({ type: 'RESTORE', state: snap });
    void doSend(snap, ut);
  }, [canRetry, doSend]);

  useEffect(() => {
    voice.setOnTranscript((t) => {
      dispatch({ type: 'SET_INPUT', text: t });
      if (voiceAutoSend) {
        queueMicrotask(() => void send(t));
      }
    });
  }, [voice, voiceAutoSend, send]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const renderTalkStack = (scr: Screen) => (
    <>
      <div style={{ display: scr === 'conversation' ? 'block' : 'none' }}>
        <ConversationScreen
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          apiErr={st.apiErr}
          apiStatus={apiStatus}
          msgs={st.msgs}
          busy={st.busy}
          pendingBlock={st.pendingBlock}
          pendingFin={st.pendingFin}
          selectedLever={st.selectedLever}
          baseline={st.baseline}
          onConfirmFin={handleConfirmFin}
          onEditFin={handleEditFin}
          onConfirmNextStep={handleConfirmNextStep}
          inp={st.inp}
          onChangeInp={(v) => dispatch({ type: 'SET_INPUT', text: v })}
          onKeyDown={onKeyDown}
          onSend={() => void send()}
          canRetry={canRetry}
          onRetry={retryLast}
          onQuickReply={(text) => {
            dispatch({ type: 'SET_INPUT', text });
            if (text.trim().endsWith(':')) return;
            void send(text);
          }}
          onEditLastUserMessage={() => {
            if (st.busy) return;
            const lastUser = [...st.msgs].reverse().find((m) => m.r === 'u');
            const t = String(lastUser?.t || '').trim();
            if (!t) return;
            setEditingLast(true);
            dispatch({ type: 'SET_INPUT', text: t });
          }}
          nextStepHint={st.baseline && st.missing.length === 0 && !st.pendingBlock ? 'Continue with one step' : null}
          nextStepContent={st.baseline && st.missing.length === 0 ? nextStepContent(st.fin, st.baseline) : null}
          actionSuggestions={st.baseline && st.missing.length === 0 ? suggestActions({ fin: st.fin, baseline: st.baseline }) : null}
          lastQuestionKey={st.lastQuestionKey}
          onNextStep={
            st.baseline && st.missing.length === 0
              ? () => {
                  dispatch({ type: 'SEND_ASKED', text: nextStepText(st.fin, st.baseline!) });
                }
              : undefined
          }
          botRef={bot}
          voiceSupported={mounted ? voice.sttSupported : false}
          onVoiceStart={() => {
            dispatch({ type: 'SET_MODE', mode: 'voice' });
            voice.stopSpeak();
            voice.startStt();
          }}
          voiceListening={voiceListening}
          speaking={speaking}
          onStopSpeaking={() => voice.stopSpeak()}
          streaming={st.streaming}
          onCancelStream={() => {
            streamAbortRef.current?.abort();
            streamAbortRef.current = null;
            streamIdRef.current++;
            dispatch({ type: 'STREAM_CANCELED' });
          }}
        />
      </div>
      {st.baseline && (
        <div style={{ display: scr === 'summary' ? 'block' : 'none' }}>
          <SummaryScreen
            theme={theme}
            onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            apiErr={st.apiErr}
            apiStatus={claude.status}
            fin={st.fin}
            baseline={st.baseline}
            onShowTier={() => dispatch({ type: 'NAVIGATE', scr: 'tier' })}
            onEditViaChat={() => dispatch({ type: 'NAVIGATE', scr: 'conversation' })}
            fc={fc}
            fp={fp}
          />
        </div>
      )}
      {st.baseline && (
        <div style={{ display: scr === 'tier' ? 'block' : 'none' }}>
          <TierRevealScreen
            theme={theme}
            onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            apiErr={st.apiErr}
            apiStatus={claude.status}
            baseline={st.baseline}
            onOpenDashboard={() => {
              if (typeof window !== 'undefined') {
                window.open('/dashboard', '_blank', 'noopener,noreferrer');
              }
              dispatch({ type: 'NAVIGATE', scr: 'conversation' });
              dispatch({ type: 'SEND_ASKED', text: nextStepText(st.fin, st.baseline!) });
            }}
            onKeepTalking={() => dispatch({ type: 'NAVIGATE', scr: 'conversation' })}
            tc={tc}
            fp={fp}
          />
        </div>
      )}
    </>
  );

  const renderDashboard = () =>
    !st.baseline ? (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--padY) var(--padX)' }}>
        <div style={{ width: '100%', maxWidth: 560, display: 'grid', gap: 12, textAlign: 'center' }}>
          <h1 className="srOnly">Dashboard</h1>
          <div style={{ fontWeight: 950, fontSize: 18 }}>Dashboard not ready yet</div>
          <div style={{ color: 'var(--ink2)', lineHeight: 1.7 }}>
            Once Atlas has a baseline strategy, your dashboard will populate automatically.
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
            <Button onClick={() => dispatch({ type: 'NAVIGATE', scr: 'conversation' })} variant="primary" size="md">
              Go to conversation →
            </Button>
          </div>
        </div>
      </div>
    ) : (
      <DashboardScreen
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        apiErr={st.apiErr}
        apiStatus={claude.status}
        fin={st.fin}
        baseline={st.baseline}
        onTalk={() => dispatch({ type: 'NAVIGATE', scr: 'conversation' })}
        onStrategy={() => dispatch({ type: 'NAVIGATE', scr: 'strategy' })}
        onSettings={() => dispatch({ type: 'NAVIGATE', scr: 'settings' })}
        fc={fc}
        fp={fp}
        getMetricExplainer={metricExplainerText}
      />
    );

  const renderPlan = () => {
    if (!st.baseline) {
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--padY) var(--padX)' }}>
          <div style={{ width: '100%', maxWidth: 560, display: 'grid', gap: 12, textAlign: 'center' }}>
            <h1 className="srOnly">Plan</h1>
            <div style={{ fontWeight: 950, fontSize: 18 }}>Plan not ready yet</div>
            <div style={{ color: 'var(--ink2)', lineHeight: 1.7 }}>
              Once Atlas has a baseline strategy, your plan will populate automatically.
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
              <Button onClick={() => dispatch({ type: 'NAVIGATE', scr: 'conversation' })} variant="primary" size="md">
                Go to conversation →
              </Button>
            </div>
          </div>
        </div>
      );
    }
    if (st.scr === 'strategy') {
      return (
        <StrategyScreen
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          apiErr={st.apiErr}
          apiStatus={claude.status}
          baseline={st.baseline}
          onBack={() => dispatch({ type: 'NAVIGATE', scr: 'dashboard' })}
          onAsk={() => dispatch({ type: 'NAVIGATE', scr: 'conversation' })}
          tc={tc}
        />
      );
    }
    return (
      <PlanScreen
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        apiErr={st.apiErr}
        apiStatus={claude.status}
        baseline={st.baseline}
        onRefine={() => dispatch({ type: 'NAVIGATE', scr: 'conversation' })}
      />
    );
  };

  const renderSettings = () => (
    <SettingsScreen
      theme={theme}
      onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      apiErr={st.apiErr}
      apiStatus={claude.status}
      onThemeLight={() => setTheme('light')}
      onThemeDark={() => setTheme('dark')}
      speakReplies={speakReplies}
      onToggleSpeakReplies={() => {
        const v = !speakReplies;
        setSpeakReplies(v);
        void db.set('prefs', { k: 'speakReplies', v });
        if (!v) voice.stopSpeak();
      }}
      voiceAutoSend={voiceAutoSend}
      onToggleVoiceAutoSend={() => {
        const v = !voiceAutoSend;
        setVoiceAutoSend(v);
        void db.set('prefs', { k: 'voiceAutoSend', v });
      }}
      replayEnabled={replayEnabled}
      onToggleReplayEnabled={() => {
        const v = !replayEnabled;
        setReplayEnabled(v);
        void db.set('prefs', { k: 'replayEnabled', v });
      }}
      onDeleteLocalData={() => {
        void (async () => {
          await db.nuke();
          dispatch({ type: 'RESET' });
        })();
      }}
      onBackToDashboard={() => dispatch({ type: 'NAVIGATE', scr: 'dashboard' })}
      canBackToDashboard={!!st.baseline}
    />
  );

  const showTabs = isMobile && st.scr !== 'landing';
  const tabTarget = (tab: typeof activeTab) => tabStacksRef.current[tab];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {st.scr === 'landing' && <LandingScreen theme={theme} onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} onStart={() => dispatch({ type: 'NAVIGATE', scr: 'conversation' })} />}

      {showTabs ? (
        <>
          <div style={{ display: activeTab === 'talk' ? 'block' : 'none' }}>{renderTalkStack(tabTarget('talk'))}</div>
          <div style={{ display: activeTab === 'plan' ? 'block' : 'none' }}>{renderPlan()}</div>
          <div style={{ display: activeTab === 'dashboard' ? 'block' : 'none' }}>{renderDashboard()}</div>
          <div style={{ display: activeTab === 'settings' ? 'block' : 'none' }}>{renderSettings()}</div>

          <div className="atlasTabBar" role="tablist" aria-label="Primary">
            {([
              { id: 'talk', label: 'Talk', icon: MessageSquare },
              { id: 'plan', label: 'Plan', icon: LayoutList },
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'settings', label: 'Settings', icon: Settings },
            ] as const).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={tab.label}
                  className={["atlasTabBtn", isActive ? "atlasTabBtnActive" : ""].filter(Boolean).join(' ')}
                  onClick={() => {
                    setActiveTab(tab.id);
                    dispatch({ type: 'NAVIGATE', scr: tabTarget(tab.id) });
                  }}
                >
                  <Icon size={18} aria-hidden />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {st.scr === 'conversation' && renderTalkStack('conversation')}
          {st.scr === 'summary' && renderTalkStack('summary')}
          {st.scr === 'tier' && renderTalkStack('tier')}
          {st.scr === 'dashboard' && renderDashboard()}
          {(st.scr === 'plan' || st.scr === 'strategy') && renderPlan()}
          {st.scr === 'settings' && renderSettings()}
        </>
      )}
    </div>
  );
}
