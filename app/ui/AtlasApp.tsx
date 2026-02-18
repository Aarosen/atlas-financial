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

        streamAbortRef.current?.abort();
        const ac = new AbortController();
        streamAbortRef.current = ac;

        dispatch({ type: 'STREAM_START' });

        const r = await claude.answerStream({
          msgs: am,
          question: ut,
          onDelta: (t: string) => dispatch({ type: 'STREAM_DELTA', delta: t }),
          signal: ac.signal,
        });

        if (r.canceled) {
          dispatch({ type: 'STREAM_CANCELED' });
          return;
        }

        dispatch({ type: 'STREAM_DONE' });
        if (resumeQ) dispatch({ type: 'SEND_ASKED', text: resumeQ.text, questionKey: resumeQ.key });
        return;
      }

      const dontKnow = /\b(don'?t\s+know|not\s+sure|no\s+idea)\b/i.test(ut);

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
            onOpenDashboard={() => dispatch({ type: 'NAVIGATE', scr: 'dashboard' })}
            onKeepTalking={() => dispatch({ type: 'NAVIGATE', scr: 'conversation' })}
            tc={tc}
            fp={fp}
          />
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
