'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ClaudeClient } from '@/lib/api/client';
import { AtlasDb } from '@/lib/db/atlasDb';
import { StrategyEngine } from '@/lib/engine/strategyEngine';
import type { ChatMessage, FinancialState, Strategy } from '@/lib/state/types';
import { conversationReducer, createInitialConversationState, type Screen } from '@/lib/state/conversationMachine';
import { classifyInterruption, computeMissing, metaResponse, nextQuestionForMissing } from '@/lib/state/atlasConversationController';
import { createVoice } from '@/lib/voice/voice';
import { ConversationScreen, DashboardScreen, LandingScreen, SettingsScreen, StrategyScreen, SummaryScreen, TierRevealScreen } from '@/screens';

const NEED: Array<keyof FinancialState> = ['monthlyIncome', 'essentialExpenses', 'totalSavings', 'highInterestDebt', 'lowInterestDebt'];

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
  const [voiceListening, setVoiceListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const voice = useMemo(
    () =>
      createVoice({
        onListeningChange: setVoiceListening,
        onSpeakingChange: setSpeaking,
      }),
    []
  );

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [speakReplies, setSpeakReplies] = useState(false);
  const [voiceAutoSend, setVoiceAutoSend] = useState(false);
  const [editingLast, setEditingLast] = useState(false);
  const lastSendSnapshotRef = useRef<typeof st | null>(null);
  const lastUserTextRef = useRef<string | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const [st, dispatch] = useReducer(conversationReducer, createInitialConversationState(initialScreen));

  const bot = useRef<HTMLDivElement | null>(null);

  const metricExplainerText = useCallback(
    (metric: string, fin: FinancialState, baseline: Strategy) => {
      const net = (baseline.metrics as any)?.net ?? fin.monthlyIncome - fin.essentialExpenses - fin.monthlyDebtPayments;

      if (metric === 'net') {
        return `Net each month (net cashflow)

- What it is: the money left over after essentials and minimum debt payments.
- Why it matters: it determines whether we’re building stability or drifting into debt.
- Your number: ${fc(net)} / month.
- What “good” looks like: >= ${fc(0)} is the first milestone; then we aim to grow the surplus.
- How to improve it: lower essentials, reduce minimum debt payments over time, or increase income.

One next step: tell me one category you can realistically cut by $50–$150 this week (rent, groceries, subscriptions, phone, insurance), and I’ll give you the exact play.`;
      }

      if (metric === 'buffer') {
        return `Buffer (emergency runway)

- What it is: how many months you could cover essentials if income stopped.
- Why it matters: it buys you time and prevents one surprise from turning into high-interest debt.
- Your number: ${baseline.bufMo.toFixed(1)} months.
- What “good” looks like: 1 month is relief, 3 months is stable, 6 months is very strong.
- How to improve it: a small automatic transfer + reducing one leak in spending.

One next step: pick a weekly auto-transfer amount you’d actually keep (even $10–$25). What number feels safe?`;
      }

      if (metric === 'future') {
        return `Future allocation

- What it is: the % of your income going toward your future (retirement/investing/sinking funds).
- Why it matters: it’s the engine of long-term wealth — after cashflow is stable.
- Your number: ${fp(baseline.futPct)}.
- What “good” looks like: 10% is a start; 15% is strong for most people; higher if you’re catching up.
- How to improve it: tiny % bumps (1–2%) and automations.

One next step: do you have a 401(k) match or a Roth IRA option?`;
      }

      return `Debt pressure

- What it is: a simple rating of how much your debt payments constrain your monthly flexibility.
- Why it matters: high pressure makes every month fragile; low pressure gives you room to build.
- Your number: ${baseline.dExp}.
- What “good” looks like: Low (or trending lower over time).
- How to improve it: prioritize high-interest balances, avoid new revolving debt, and renegotiate rates where possible.

One next step: list your highest-interest debt (card name + balance + APR, rough is fine) and we’ll pick the best first target.`;
    },
    []
  );

  const nextStepText = useCallback(
    (fin: FinancialState, baseline: Strategy) => {
      const net = (baseline.metrics as any)?.net ?? fin.monthlyIncome - fin.essentialExpenses - fin.monthlyDebtPayments;
      if (baseline.lever === 'stabilize_cashflow') {
        return `Dashboard’s open — let’s take one step.

Your net each month is ${fc(net)}. One clean move: pick one bill or category we can cut by $50–$150 this week, and set a 10-minute timer to find the cheapest alternative. When you tell me the category (rent, groceries, subscriptions, phone, insurance), I’ll give you the exact play.`;
      }
      if (baseline.lever === 'eliminate_high_interest_debt') {
        return `Dashboard’s open — one step.

The fastest win is to stop interest from compounding: list your credit cards (name + balance + APR, rough is fine). Then we’ll choose one card to target first and I’ll tell you exactly what to pay and what to keep as minimums.`;
      }
      if (baseline.lever === 'build_emergency_buffer') {
        return `Dashboard’s open — one step.

Let’s start your buffer with something automatic: choose a weekly auto-transfer amount that won’t break anything (even $10–$25). Tell me a number you’d actually keep, and we’ll set a target date for your first $500.`;
      }
      if (baseline.lever === 'increase_future_allocation') {
        return `Dashboard’s open — one step.

We’ll raise your “future allocation” without pain: tell me whether you have a 401(k) match or Roth IRA option. Then we’ll pick a small bump (1%–2%) and I’ll translate it into dollars per paycheck.`;
      }
      return `Dashboard’s open — one step.

Pick one discretionary category you want to shrink (dining, delivery, subscriptions, shopping). I’ll help you set a simple rule for the next 7 days that actually sticks.`;
    },
    []
  );

  useEffect(() => {
    setMounted(true);
  }, []);

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

      const prevMsgs: ChatMessage[] = [...base.msgs, { r: 'u' as const, t: ut }];
      try {
        const kind = classifyInterruption(ut);
        const missBefore = base.missing.length ? base.missing : missing(base.fin);
      const resumeQ = missBefore.length ? nextQuestionForMissing(missBefore[0], prevMsgs.length) : null;

      if (kind === 'meta') {
        const ans = metaResponse(ut);
        const out = resumeQ ? `${ans} ${resumeQ.text}` : ans;
        dispatch({ type: 'SEND_ASKED', text: out, questionKey: resumeQ?.key });
        return;
      }

      if (kind === 'followup_question') {
        const am = prevMsgs.slice(-10).map((m) => ({ role: m.r === 'u' ? ('user' as const) : ('assistant' as const), content: m.t }));
        const missNow = missBefore.map((k) => String(k));
        const ans = await claude.chat(am, missNow);
        const out = resumeQ ? `${String(ans || '').trim()}\n\n${resumeQ.text}` : String(ans || '').trim();
        dispatch({ type: 'SEND_ASKED', text: out, questionKey: resumeQ?.key });
        return;
      }

      const dontKnow = /\b(don'?t\s+know|not\s+sure|no\s+idea)\b/i.test(ut);
      const isNo = /^\s*(no|none|nope|nah|n\/a)\b/i.test(ut);

      const answeredNext: Partial<Record<keyof FinancialState, boolean>> = { ...base.answered };
      const unknownNext: Partial<Record<keyof FinancialState, boolean>> = { ...base.unknown };

      const uf: FinancialState = { ...base.fin };

      const parseBareNumber = (s: string): number | null => {
        const t = s.trim();
        const m = t.match(/^\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|thousand)?\s*$/i);
        if (!m) return null;
        let v = Number.parseFloat(m[1].replace(/,/g, ''));
        if (!Number.isFinite(v)) return null;
        if (m[2]) v *= 1000;
        return v;
      };

      if (dontKnow && base.lastQuestionKey) {
        const k = base.lastQuestionKey;
        answeredNext[k] = true;
        unknownNext[k] = true;
        if (k === 'highInterestDebt' || k === 'lowInterestDebt') (uf as any)[k] = 0;
        if (k === 'totalSavings') (uf as any)[k] = 0;
      }

      if (!dontKnow && isNo && base.lastQuestionKey) {
        const k = base.lastQuestionKey;
        if (k === 'highInterestDebt' || k === 'lowInterestDebt') {
          (uf as any)[k] = 0;
          answeredNext[k] = true;
          if (unknownNext[k]) delete unknownNext[k];
        }
      }

      if (!dontKnow && base.lastQuestionKey) {
        const v = parseBareNumber(ut);
        if (v !== null) {
          const k = base.lastQuestionKey;
          if (k === 'monthlyIncome' || k === 'essentialExpenses') {
            if (v > 0) {
              (uf as any)[k] = v;
              answeredNext[k] = true;
              if (unknownNext[k]) delete unknownNext[k];
            }
          } else if (k === 'totalSavings') {
            if (v >= 0) {
              (uf as any)[k] = v;
              answeredNext[k] = true;
              if (unknownNext[k]) delete unknownNext[k];
            }
          } else if (k === 'highInterestDebt' || k === 'lowInterestDebt') {
            if (v >= 0) {
              (uf as any)[k] = v;
              answeredNext[k] = true;
              if (unknownNext[k]) delete unknownNext[k];
            }
          }
        }
      }

      const ex = await claude.extract(ut, base.fin);

      Object.entries(ex.fields).forEach(([k, v]) => {
        if (v !== undefined && v !== null && k in uf) {
          (uf as any)[k] = v;
        }
      });

      Object.keys(ex.fields || {}).forEach((k0) => {
        const k = k0 as keyof FinancialState;
        if (k in uf) {
          answeredNext[k] = true;
          if (unknownNext[k]) delete unknownNext[k];
        }
      });

      const miss = computeMissing(uf, answeredNext);

      dispatch({ type: 'SEND_EXTRACTED', finNext: uf, missingNext: miss, answeredNext, unknownNext, apiOk: ex.apiOk !== false, err: (ex as any).err });
      await db.set('fin', { k: 'cur', ...uf, ts: Date.now() });

      if (miss.length === 0) {
        const b = (await engine.run(uf, { answered: answeredNext, unknown: unknownNext })) as Strategy;
        if (b.confidence === 'low') {
          const k = b.explainability.metrics && typeof (b.explainability as any).followupKey === 'string' ? ((b.explainability as any).followupKey as keyof FinancialState) : undefined;
          const fk = k || (b.explainability.inputsUsed.monthlyIncome === '0' ? ('monthlyIncome' as const) : b.explainability.inputsUsed.essentialExpenses === '0' ? ('essentialExpenses' as const) : ('highInterestDebt' as const));
          const q = nextQuestionForMissing(fk, prevMsgs.length);
          dispatch({ type: 'SEND_ASKED', text: q.text, questionKey: q.key });
          return;
        }
        await db.set('strat', { k: 'baseline', ...b });
        dispatch({ type: 'SEND_STRATEGY_READY', baseline: b });
        return;
      }

      const q = nextQuestionForMissing(miss[0], prevMsgs.length);
      dispatch({ type: 'SEND_ASKED', text: q.text, questionKey: q.key });
    } catch (e: any) {
      dispatch({ type: 'SEND_FAILED', err: String(e?.message || 'send_failed') });
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {st.scr === 'landing' && <LandingScreen theme={theme} onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} onStart={() => dispatch({ type: 'NAVIGATE', scr: 'conversation' })} />}

      {st.scr === 'conversation' && (
        <ConversationScreen
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          apiErr={st.apiErr}
          apiStatus={claude.status}
          msgs={st.msgs}
          busy={st.busy}
          inp={st.inp}
          onChangeInp={(v) => dispatch({ type: 'SET_INPUT', text: v })}
          onKeyDown={onKeyDown}
          onSend={() => void send()}
          onEditLastUserMessage={() => {
            if (st.busy) return;
            const lastUser = [...st.msgs].reverse().find((m) => m.r === 'u');
            const t = String(lastUser?.t || '').trim();
            if (!t) return;
            setEditingLast(true);
            dispatch({ type: 'SET_INPUT', text: t });
          }}
          nextStepHint={st.baseline ? 'Continue with one step' : null}
          onNextStep={
            st.baseline
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
          }}
        />
      )}

      {st.scr === 'summary' &&
        st.baseline && (
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
        )}

      {st.scr === 'tier' &&
        st.baseline && (
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
        )}

      {st.scr === 'dashboard' &&
        !st.baseline && (
          <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--padY) var(--padX)' }}>
            <div style={{ width: '100%', maxWidth: 560, display: 'grid', gap: 12, textAlign: 'center' }}>
              <div style={{ fontWeight: 950, fontSize: 18 }}>Dashboard not ready yet</div>
              <div style={{ color: 'var(--ink2)', lineHeight: 1.7 }}>
                Once Atlas has a baseline strategy, your dashboard will populate automatically.
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
                <button
                  onClick={() => dispatch({ type: 'NAVIGATE', scr: 'conversation' })}
                  style={{ background: 'linear-gradient(135deg,var(--teal),var(--sky))', color: '#fff', border: 'none', borderRadius: 16, padding: '14px 18px', fontWeight: 900, cursor: 'pointer' }}
                >
                  Go to conversation →
                </button>
              </div>
            </div>
          </div>
        )}

      {st.scr === 'dashboard' &&
        st.baseline && (
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
          />
        )}

      {st.scr === 'strategy' &&
        st.baseline && (
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
        )}

      {st.scr === 'settings' && (
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
          onDeleteLocalData={() => {
            void (async () => {
              await db.nuke();
              dispatch({ type: 'RESET' });
            })();
          }}
          onBackToDashboard={() => dispatch({ type: 'NAVIGATE', scr: 'dashboard' })}
          canBackToDashboard={!!st.baseline}
        />
      )}
    </div>
  );
}
