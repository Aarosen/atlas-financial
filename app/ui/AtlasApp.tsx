'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Claude } from './atlas/claude';
import { DB } from './atlas/db';
import { Engine } from './atlas/engine';
import type { ChatMessage, FinancialState, Strategy } from './atlas/types';

const NEED: Array<keyof FinancialState> = ['monthlyIncome', 'essentialExpenses', 'totalSavings', 'highInterestDebt', 'lowInterestDebt'];

const defaultFin: FinancialState = {
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

type Screen = 'landing' | 'conversation' | 'summary' | 'tier' | 'dashboard' | 'strategy' | 'settings';

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
  const db = useMemo(() => new DB(), []);
  const claude = useMemo(() => new Claude(), []);
  const engine = useMemo(() => new Engine(), []);

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [scr, setScr] = useState<Screen>(initialScreen);
  const [baseline, setBaseline] = useState<Strategy | null>(null);

  const [msgs, setMsgs] = useState<ChatMessage[]>([
    {
      r: 'a',
      t: "Hey, I'm glad you're here.\n\nI'm not going to ask you to connect your bank or fill out a form. I just want to understand your situation — in your own words.\n\nWhat's on your mind when it comes to money right now?",
    },
  ]);
  const [inp, setInp] = useState('');
  const [fin, setFin] = useState<FinancialState>(defaultFin);
  const [busy, setBusy] = useState(false);
  const [apiErr, setApiErr] = useState<string | null>(null);

  const bot = useRef<HTMLDivElement | null>(null);

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
    db.get<any>('fin', 'cur')
      .then((v) => {
        if (v) {
          const nf: FinancialState = {
            ...defaultFin,
            ...v,
          };
          setFin(nf);
        }
      })
      .catch(() => {});
  }, [db]);

  useEffect(() => {
    db.get<Strategy>('strat', 'baseline')
      .then((s) => {
        if (s) setBaseline(s);
      })
      .catch(() => {});
  }, [db]);

  useEffect(() => {
    bot.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  const missing = useCallback((f: FinancialState) => NEED.filter((k) => f[k] === null || f[k] === undefined), []);

  const send = useCallback(async () => {
    if (!inp.trim() || busy) return;

    const ut = inp.trim();
    setInp('');

    const nm = [...msgs, { r: 'u' as const, t: ut }];
    setMsgs(nm);
    setBusy(true);

    const ex = await claude.extract(ut, fin);
    const fields = ex.fields;
    if (ex.apiOk === false) setApiErr(ex.err || 'Claude API unavailable');
    else setApiErr(null);
    const uf: FinancialState = { ...fin };
    Object.entries(fields).forEach(([k, v]) => {
      if (v !== undefined && v !== null && k in uf) {
        (uf as any)[k] = v;
      }
    });

    setFin(uf);
    await db.set('fin', { k: 'cur', ...uf, ts: Date.now() });

    const miss = missing(uf);
    if (miss.length === 0) {
      const b = (await engine.run(uf)) as Strategy;
      setBaseline(b);
      await db.set('strat', { k: 'baseline', ...b });
      setMsgs([...nm, { r: 'a', t: "Perfect — I have enough to start.\n\nLet me reflect this back and we’ll pick one clear next step." }]);
      setBusy(false);
      setScr('summary');
      return;
    }

    const am = nm.map((m) => ({ role: m.r === 'u' ? ('user' as const) : ('assistant' as const), content: m.t }));
    const q = await claude.chat(am, miss as string[]);
    setMsgs([...nm, { r: 'a', t: q }]);
    setBusy(false);
  }, [inp, busy, msgs, claude, fin, db, engine, missing]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const Logo = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path
          d="M12 2.8c5.08 0 9.2 4.12 9.2 9.2 0 5.08-4.12 9.2-9.2 9.2-5.08 0-9.2-4.12-9.2-9.2 0-5.08 4.12-9.2 9.2-9.2Z"
          stroke="currentColor"
          strokeWidth="1.6"
          opacity="0.9"
        />
        <path d="M12 6.2 6.8 17.8h10.4L12 6.2Z" fill="currentColor" opacity="0.9" />
      </svg>
      <span style={{ fontWeight: 950, letterSpacing: '-0.02em' }}>Atlas</span>
    </div>
  );

  const TopBar = ({ title }: { title: string }) => (
    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--bdr)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Logo />
        <div style={{ color: 'var(--ink3)', fontWeight: 800, fontSize: 12 }}>{title}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {apiErr && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--amber-lt)', borderRadius: 999, padding: '6px 12px', border: '1px solid rgba(194,115,10,.2)' }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--amber)', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 800 }}>API not configured</span>
          </div>
        )}
        {claude.isAvailable() && claude.apiAvailable === true && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--green-lt)', borderRadius: 999, padding: '6px 12px', border: '1px solid rgba(46,125,82,.2)' }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--green)', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 800 }}>Claude AI active</span>
          </div>
        )}
        {!claude.isAvailable() && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--amber-lt)', borderRadius: 999, padding: '6px 12px', border: '1px solid rgba(194,115,10,.2)' }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--amber)', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 800 }}>Offline mode</span>
          </div>
        )}
        <button
          onClick={() => setTheme((t: 'light' | 'dark') => (t === 'dark' ? 'light' : 'dark'))}
          style={{ background: 'transparent', border: '1px solid var(--bdr2)', borderRadius: 14, padding: '8px 12px', cursor: 'pointer', color: 'var(--ink2)', fontWeight: 700, fontSize: 12 }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  );

  const Card = ({ children }: { children: any }) => (
    <div style={{ background: 'var(--card)', border: '1px solid var(--bdr)', borderRadius: 18, padding: 16, boxShadow: 'var(--sh1)' }}>{children}</div>
  );

  const PrimaryBtn = ({ onClick, children, disabled }: { onClick: () => void; children: any; disabled?: boolean }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ background: 'linear-gradient(135deg,var(--teal),var(--sky))', color: '#fff', border: 'none', borderRadius: 16, padding: '14px 18px', fontWeight: 900, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}
    >
      {children}
    </button>
  );

  const GhostBtn = ({ onClick, children }: { onClick: () => void; children: any }) => (
    <button onClick={onClick} style={{ background: 'transparent', border: '1px solid var(--bdr2)', borderRadius: 16, padding: '14px 18px', fontWeight: 800, cursor: 'pointer', color: 'var(--ink2)' }}>
      {children}
    </button>
  );

  const Tier = ({ onDash }: { onDash: () => void }) => {
    if (!baseline) return null;
    const t = tc(baseline.tier);
    const leverLabels: Record<string, string> = {
      stabilize_cashflow: 'Stabilise your cashflow',
      eliminate_high_interest_debt: 'Tackle high-interest debt',
      build_emergency_buffer: 'Build your emergency buffer',
      increase_future_allocation: 'Grow your future allocation',
      optimize_discretionary_spend: 'Optimise one spending category',
    };
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <TopBar title="Your tier" />
        <div style={{ padding: '22px 16px' }}>
          <div style={{ maxWidth: 820, margin: '0 auto', display: 'grid', gap: 14 }}>
            <Card>
              <div style={{ fontWeight: 950, fontSize: 22, letterSpacing: '-0.02em' }}>{t.name}</div>
              <div style={{ marginTop: 8, color: 'var(--ink2)', lineHeight: 1.6 }}>{t.desc}</div>
              <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ color: 'var(--ink2)', fontWeight: 800 }}>Emergency buffer</div>
                  <div style={{ fontWeight: 950 }}>{baseline.bufMo.toFixed(1)} months</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ color: 'var(--ink2)', fontWeight: 800 }}>Future allocation</div>
                  <div style={{ fontWeight: 950 }}>{fp(baseline.futPct)}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ color: 'var(--ink2)', fontWeight: 800 }}>Debt pressure</div>
                  <div style={{ fontWeight: 950 }}>{baseline.dExp}</div>
                </div>
              </div>
            </Card>
            <Card>
              <div style={{ fontWeight: 950, fontSize: 16 }}>Your best next lever</div>
              <div style={{ marginTop: 8, color: 'var(--ink2)', lineHeight: 1.6 }}>{leverLabels[baseline.lever] || baseline.lever}</div>
              <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <PrimaryBtn onClick={onDash}>Open dashboard →</PrimaryBtn>
                <GhostBtn onClick={() => setScr('conversation')}>Keep talking</GhostBtn>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const Summary = ({ onCont }: { onCont: () => void }) => {
    if (!baseline) return null;
    const items: Array<{ l: string; v: string; ok: boolean }> = [
      { l: 'Monthly income', v: fc(fin.monthlyIncome || 0), ok: true },
      { l: 'Essential expenses', v: fc(fin.essentialExpenses || 0), ok: true },
      { l: 'Emergency buffer', v: `${baseline.bufMo.toFixed(1)} months`, ok: baseline.bufMo >= 3 },
      { l: 'Future allocation', v: fp(baseline.futPct), ok: baseline.futPct >= 0.15 },
      { l: 'Debt pressure', v: baseline.dExp, ok: baseline.dExp === 'Low' },
      { l: 'Stated goal', v: (fin.primaryGoal || 'stability').replace('_', ' '), ok: true },
    ];
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <TopBar title="Summary" />
        <div style={{ padding: '22px 16px' }}>
          <div style={{ maxWidth: 820, margin: '0 auto', display: 'grid', gap: 14 }}>
            <Card>
              <div style={{ fontWeight: 950, fontSize: 20, letterSpacing: '-0.02em' }}>Here’s what I heard</div>
              <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                {items.map((it) => (
                  <div key={it.l} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '10px 12px', borderRadius: 14, border: '1px solid var(--bdr)', background: 'var(--bg2)' }}>
                    <div style={{ color: 'var(--ink2)', fontWeight: 800 }}>{it.l}</div>
                    <div style={{ fontWeight: 950, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span>{it.v}</span>
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: it.ok ? 'var(--green)' : 'var(--amber)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <div style={{ color: 'var(--ink2)', lineHeight: 1.7 }}>
                Next, I’ll place you into a tier (not a label — just a way to pick the right move at the right time).
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <PrimaryBtn onClick={onCont}>Show my tier →</PrimaryBtn>
                <GhostBtn onClick={() => setScr('conversation')}>Edit via chat</GhostBtn>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const Dashboard = () => {
    if (!baseline) return null;
    const net = (baseline.metrics as any)?.net ?? fin.monthlyIncome - fin.essentialExpenses - fin.monthlyDebtPayments;
    const focusMap: Record<string, string> = {
      stabilize_cashflow: 'Get to non-negative monthly cashflow',
      eliminate_high_interest_debt: 'Reduce compounding high-interest debt',
      build_emergency_buffer: 'Build a 3–6 month buffer',
      increase_future_allocation: 'Raise your future allocation to 15%+',
      optimize_discretionary_spend: 'Optimize one discretionary category',
    };
    const focus = focusMap[baseline.lever] || 'One clear improvement';
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <TopBar title="Dashboard" />
        <div style={{ padding: '22px 16px' }}>
          <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              <Card>
                <div style={{ color: 'var(--ink2)', fontWeight: 900, fontSize: 12, letterSpacing: '0.08em' }}>NET EACH MONTH</div>
                <div style={{ marginTop: 8, fontWeight: 980, fontSize: 26 }}>{fc(net)}</div>
              </Card>
              <Card>
                <div style={{ color: 'var(--ink2)', fontWeight: 900, fontSize: 12, letterSpacing: '0.08em' }}>BUFFER</div>
                <div style={{ marginTop: 8, fontWeight: 980, fontSize: 26 }}>{baseline.bufMo.toFixed(1)} mo</div>
              </Card>
              <Card>
                <div style={{ color: 'var(--ink2)', fontWeight: 900, fontSize: 12, letterSpacing: '0.08em' }}>FUTURE ALLOCATION</div>
                <div style={{ marginTop: 8, fontWeight: 980, fontSize: 26 }}>{fp(baseline.futPct)}</div>
              </Card>
              <Card>
                <div style={{ color: 'var(--ink2)', fontWeight: 900, fontSize: 12, letterSpacing: '0.08em' }}>DEBT PRESSURE</div>
                <div style={{ marginTop: 8, fontWeight: 980, fontSize: 26 }}>{baseline.dExp}</div>
              </Card>
            </div>
            <Card>
              <div style={{ fontWeight: 950, fontSize: 18 }}>Focus</div>
              <div style={{ marginTop: 8, color: 'var(--ink2)', lineHeight: 1.7 }}>{focus}</div>
              <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <PrimaryBtn onClick={() => setScr('conversation')}>Talk it through</PrimaryBtn>
                <GhostBtn onClick={() => setScr('strategy')}>How tiers work</GhostBtn>
                <GhostBtn onClick={() => setScr('settings')}>Settings</GhostBtn>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const StrategyScreen = () => {
    if (!baseline) return null;
    const criteria: Record<Strategy['tier'], string[]> = {
      Foundation: ['Monthly outflow ≥ inflow (negative cashflow)', 'Emergency buffer < 1 month'],
      Stabilizing: ['Buffer between 1–3 months', 'High-interest debt > 2× monthly income'],
      Strategic: ['Buffer between 3–6 months', 'Debt-to-income ratio > 30%'],
      GrowthReady: ['Buffer ≥ 6 months', 'Debt-to-income ≤ 30%', 'Positive monthly cashflow'],
    };
    const t = tc(baseline.tier);
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <TopBar title="Strategy" />
        <div style={{ padding: '22px 16px' }}>
          <div style={{ maxWidth: 820, margin: '0 auto', display: 'grid', gap: 14 }}>
            <Card>
              <div style={{ fontWeight: 980, fontSize: 20 }}>{t.name}</div>
              <div style={{ marginTop: 8, color: 'var(--ink2)', lineHeight: 1.7 }}>{t.desc}</div>
            </Card>
            <Card>
              <div style={{ fontWeight: 950, fontSize: 16 }}>What that tier usually means</div>
              <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                {criteria[baseline.tier].map((c) => (
                  <div key={c} style={{ padding: '10px 12px', border: '1px solid var(--bdr)', borderRadius: 14, background: 'var(--bg2)', color: 'var(--ink2)', fontWeight: 700 }}>
                    {c}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <PrimaryBtn onClick={() => setScr('dashboard')}>Back to dashboard</PrimaryBtn>
                <GhostBtn onClick={() => setScr('conversation')}>Ask Atlas a question</GhostBtn>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const SettingsScreen = () => (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <TopBar title="Settings" />
      <div style={{ padding: '22px 16px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', display: 'grid', gap: 14 }}>
          <Card>
            <div style={{ fontWeight: 950, fontSize: 16 }}>Theme</div>
            <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <GhostBtn onClick={() => setTheme('light')}>Light</GhostBtn>
              <GhostBtn onClick={() => setTheme('dark')}>Dark</GhostBtn>
            </div>
          </Card>
          <Card>
            <div style={{ fontWeight: 950, fontSize: 16 }}>Data</div>
            <div style={{ marginTop: 8, color: 'var(--ink2)', lineHeight: 1.7 }}>Atlas stores your state locally (IndexedDB). You can wipe it anytime.</div>
            <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <GhostBtn
                onClick={() => {
                  void (async () => {
                    await db.nuke();
                    setFin(defaultFin);
                    setBaseline(null);
                    setMsgs([
                      {
                        r: 'a',
                        t: "Hey, I'm glad you're here.\n\nI'm not going to ask you to connect your bank or fill out a form. I just want to understand your situation — in your own words.\n\nWhat's on your mind when it comes to money right now?",
                      },
                    ]);
                    setScr('landing');
                  })();
                }}
              >
                Delete local data
              </GhostBtn>
              <PrimaryBtn onClick={() => setScr('dashboard')} disabled={!baseline}>
                Back to dashboard
              </PrimaryBtn>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {scr === 'landing' && (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 20px' }}>
          <div style={{ width: '100%', maxWidth: 720, textAlign: 'center' }}>
            <h1 style={{ fontSize: 40, lineHeight: 1.1, margin: 0, letterSpacing: '-0.03em' }}>The clarity you’ve always wanted about your money.</h1>
            <p style={{ margin: '18px auto 0', maxWidth: 560, color: 'var(--ink2)', lineHeight: 1.7, fontSize: 16 }}>
              Atlas talks with you, understands your real situation, and gives you one clear step forward — like a brilliant friend who genuinely cares about your future.
            </p>

            <div style={{ marginTop: 26, display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button
                onClick={() => setScr('conversation')}
                style={{ background: 'linear-gradient(135deg,var(--teal),var(--sky))', color: '#fff', border: 'none', borderRadius: 16, padding: '14px 22px', fontWeight: 800, cursor: 'pointer' }}
              >
                Let’s talk with Atlas →
              </button>
              <button
                onClick={() => setTheme((t: 'light' | 'dark') => (t === 'dark' ? 'light' : 'dark'))}
                style={{ background: 'transparent', border: '1px solid var(--bdr2)', borderRadius: 16, padding: '14px 18px', fontWeight: 700, cursor: 'pointer', color: 'var(--ink2)' }}
              >
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </button>
            </div>

            <div style={{ marginTop: 26, color: 'var(--ink3)', fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap' }}>
              <div>🔒 No bank sync</div>
              <div>📱 Stays on your device</div>
              <div>🎯 One step at a time</div>
              <div>💬 Real conversation</div>
            </div>
          </div>
        </div>
      )}

      {scr === 'conversation' && (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
          <TopBar title="Conversation" />

          <div style={{ flex: 1, overflowY: 'auto', padding: '22px 16px' }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              {msgs.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.r === 'u' ? 'flex-end' : 'flex-start', marginBottom: 14 }}>
                  <div
                    style={{
                      maxWidth: '78%',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.6,
                      fontSize: 15,
                      padding: '12px 14px',
                      borderRadius: m.r === 'u' ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
                      background: m.r === 'u' ? 'linear-gradient(135deg,var(--teal),var(--sky))' : 'var(--card)',
                      color: m.r === 'u' ? '#fff' : 'var(--ink)',
                      border: m.r === 'u' ? 'none' : '1px solid var(--bdr)',
                      boxShadow: 'var(--sh1)',
                    }}
                  >
                    {m.t}
                  </div>
                </div>
              ))}
              {busy && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 14 }}>
                  <div style={{ padding: '12px 14px', borderRadius: 18, border: '1px solid var(--bdr)', background: 'var(--card)', boxShadow: 'var(--sh1)', color: 'var(--ink2)' }}>
                    Thinking…
                  </div>
                </div>
              )}
              <div ref={bot} />
            </div>
          </div>

          <div style={{ padding: '14px 16px', borderTop: '1px solid var(--bdr)', background: 'var(--bg)' }}>
            <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
              <textarea
                value={inp}
                onChange={(e) => setInp(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Tell Atlas anything…"
                rows={1}
                style={{ width: '100%', padding: '12px 50px 12px 14px', borderRadius: 14, border: '1.5px solid var(--bdr2)', background: 'var(--card)', outline: 'none', resize: 'none', color: 'var(--ink)' }}
              />
              <button
                onClick={() => void send()}
                disabled={!inp.trim() || busy}
                style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'linear-gradient(135deg,var(--teal),var(--sky))', border: 'none', color: '#fff', width: 38, height: 34, borderRadius: 12, cursor: busy ? 'not-allowed' : 'pointer', opacity: !inp.trim() || busy ? 0.5 : 1 }}
              >
                →
              </button>
            </div>
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink3)', marginTop: 8 }}>
              Try: “I make $4k/month and spend about $2.5k on essentials”
            </div>
          </div>
        </div>
      )}

      {scr === 'summary' && <Summary onCont={() => setScr('tier')} />}
      {scr === 'tier' && <Tier onDash={() => setScr('dashboard')} />}
      {scr === 'dashboard' && <Dashboard />}
      {scr === 'strategy' && <StrategyScreen />}
      {scr === 'settings' && <SettingsScreen />}
    </div>
  );
}
