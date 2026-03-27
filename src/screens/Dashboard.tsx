import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { FinancialState, Strategy } from '@/lib/state/types';
import { Card } from '@/components/Card';
import { Button, PrimaryBtn, GhostBtn } from '@/components/Buttons';
import { TopBar, ScreenWrap } from '@/components/TopBar';
import { PageContainer, Stack } from '@/components/Layout';
import { ProgressBar } from '@/components/ProgressBar';
import { conceptsForLever } from '@/lib/ai/conceptMap';
import { simulateSavingsGrowth } from '@/lib/ai/scenarioSimulator';
import { buildSparkline } from '@/lib/ai/visualExplainer';
import { buildAudioLesson } from '@/lib/ai/audioLessons';

export function DashboardScreen({
  theme,
  onToggleTheme,
  apiErr,
  apiStatus,
  fin,
  baseline,
  onTalk,
  onStrategy,
  onSettings,
  fc,
  fp,
  getMetricExplainer,
  outcomeMetrics,
}: {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  apiErr: string | null;
  apiStatus: 'unknown' | 'online' | 'degraded' | 'offline';
  fin: FinancialState;
  baseline: Strategy;
  onTalk: () => void;
  onStrategy: () => void;
  onSettings: () => void;
  fc: (n: number) => string;
  fp: (n: number) => string;
  getMetricExplainer: (metric: string, fin: FinancialState, baseline: Strategy) => string;
  outcomeMetrics?: {
    debtReduction: number;
    savingsGrowth: number;
    financialConfidence: number;
    creditScoreImprovement: number;
    conceptsMastered: string[];
    strugglingConcepts: string[];
  } | null;
}) {
  const net = (baseline.metrics as any)?.net ?? fin.monthlyIncome - fin.essentialExpenses - fin.monthlyDebtPayments;
  const [activeMetric, setActiveMetric] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, number[]> | null>(null);
  const completenessScore = (() => {
    const keys: Array<keyof FinancialState> = ['monthlyIncome', 'essentialExpenses', 'totalSavings', 'highInterestDebt', 'lowInterestDebt', 'primaryGoal'];
    const filled = keys.filter((k) => fin[k] !== null && fin[k] !== undefined && fin[k] !== 0).length;
    return Math.round((filled / keys.length) * 100);
  })();
  const basedOn = {
    net: ['Monthly income', 'Essentials', 'Debt payments'],
    buffer: ['Total savings', 'Essentials'],
    future: ['Future savings %', 'Monthly income'],
    debt: ['Debt balances', 'Debt payments'],
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('atlas:metricHistory');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') setHistory(parsed as Record<string, number[]>);
    } catch {
      // ignore
    }
  }, []);

  const explain = (metric: string) => {
    setActiveMetric(metric);
  };

  const ClickCard = ({ children, metric }: { children: ReactNode; metric: string }) => {
    return (
      <button
        onClick={() => explain(metric)}
        className="atlasClickCard"
        aria-label={`Explain ${metric}`}
        title="Explain"
      >
        {children}
      </button>
    );
  };

  const focusMap: Record<string, string> = {
    stabilize_cashflow: 'Get to money left each month',
    eliminate_high_interest_debt: 'Lower high-interest debt pressure',
    build_emergency_buffer: 'Build a 3–6 month emergency cushion',
    increase_future_allocation: 'Raise future savings toward 15%+',
    optimize_discretionary_spend: 'Tighten one discretionary category',
  };
  const focus = focusMap[baseline.lever] || 'One clear improvement';
  const trendNote = 'Trends will appear as Atlas learns more about you.';
  const concepts = conceptsForLever(baseline.lever).slice(0, 4);
  const scenario = simulateSavingsGrowth({ monthlyContribution: 50, months: 6, annualRate: 0.03 });
  const spark = buildSparkline(scenario.map((p) => p.value));
  const audioLesson = buildAudioLesson(`Quick lesson: ${focus}. We'll keep this simple and actionable.`);

  const trendFor = useMemo(() => {
    const normalize = (vals?: number[]) => (Array.isArray(vals) && vals.length > 1 ? vals : null);
    const historyMap = history || {};
    return {
      net: normalize(historyMap.net),
      buffer: normalize(historyMap.buffer),
      future: normalize(historyMap.future),
      debt: normalize(historyMap.debt),
    } as const;
  }, [history]);

  const chart = (metric: keyof typeof trendFor, higherIsBetter: boolean) => {
    const vals = trendFor[metric];
    if (!vals) {
      return (
        <div
          style={{ marginTop: 10, height: 36, borderRadius: 12, border: '1px dashed var(--bdr)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--ink3)' }}
        >
          {trendNote}
        </div>
      );
    }
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const points = vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * 100;
      const y = 100 - ((v - min) / span) * 100;
      return `${x},${y}`;
    });
    const delta = vals[vals.length - 1] - vals[0];
    const improving = higherIsBetter ? delta >= 0 : delta <= 0;
    const flat = Math.abs(delta) < span * 0.05;
    const tone = flat ? 'var(--amber)' : improving ? 'var(--green)' : 'var(--rose)';
    const label = `${metric} trend ${flat ? 'flat' : improving ? 'up' : 'down'}`;
    return (
      <div
        style={{ marginTop: 10, height: 36, borderRadius: 12, border: '1px solid var(--bdr)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        aria-label={label}
      >
        <svg width="100%" height="100%" viewBox="0 0 100 100" role="img" aria-label={label}>
          <polyline fill="none" stroke={tone} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={points.join(' ')} />
        </svg>
      </div>
    );
  };

  const outcomeSummary = outcomeMetrics
    ? {
        debtReduction: `${Math.max(0, outcomeMetrics.debtReduction).toFixed(1)}%`,
        savingsGrowth: `${Math.max(0, outcomeMetrics.savingsGrowth).toFixed(1)}%`,
        financialConfidence: `${Math.min(5, Math.max(0, outcomeMetrics.financialConfidence)).toFixed(1)} / 5`,
        creditScoreImprovement: `${Math.round(outcomeMetrics.creditScoreImprovement)} pts`,
      }
    : null;

  return (
    <ScreenWrap>
      <h1 className="srOnly">Dashboard</h1>
      <TopBar title="Dashboard" theme={theme} onToggleTheme={onToggleTheme} apiErr={apiErr} apiStatus={apiStatus} />
      <PageContainer maxWidth={980} style={{ paddingTop: 'var(--padY)', paddingBottom: 'var(--padY)' }}>
        <Stack gap={14}>
          <Card>
            <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: '0.08em', color: 'var(--ink2)' }} title="Based on how much we've learned so far.">PROFILE CLARITY</div>
            <div style={{ marginTop: 12 }}>
              <ProgressBar value={completenessScore} max={100} label="Profile completeness" showLabel={true} />
            </div>
            <div style={{ marginTop: 10, fontWeight: 950, fontSize: 20 }}>{completenessScore}%</div>
            <div style={{ marginTop: 6, color: 'var(--ink2)', lineHeight: 1.7 }}>As we keep talking, this picture gets sharper.</div>
            {completenessScore < 70 && (
              <div style={{ marginTop: 8, color: 'var(--ink3)', fontSize: 12 }}>Tell me more so I can refine this.</div>
            )}
          </Card>

          {outcomeSummary && outcomeMetrics && (
            <Card>
              <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: '0.08em', color: 'var(--ink2)' }}>OUTCOME TRACKING</div>
              <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                {[
                  { label: 'Debt reduction', value: outcomeSummary.debtReduction },
                  { label: 'Savings growth', value: outcomeSummary.savingsGrowth },
                  { label: 'Confidence', value: outcomeSummary.financialConfidence },
                  { label: 'Credit score change', value: outcomeSummary.creditScoreImprovement },
                ].map((row) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '8px 10px', borderRadius: 12, border: '1px solid var(--bdr)', background: 'var(--bg2)' }}>
                    <div style={{ color: 'var(--ink2)', fontWeight: 800 }}>{row.label}</div>
                    <div style={{ fontWeight: 950 }}>{row.value}</div>
                  </div>
                ))}
              </div>
              {(outcomeMetrics.conceptsMastered.length > 0 || outcomeMetrics.strugglingConcepts.length > 0) && (
                <div style={{ marginTop: 10, display: 'grid', gap: 6, color: 'var(--ink3)', fontSize: 12 }}>
                  {outcomeMetrics.conceptsMastered.length > 0 && (
                    <div>Mastered: {outcomeMetrics.conceptsMastered.slice(0, 3).join(', ')}</div>
                  )}
                  {outcomeMetrics.strugglingConcepts.length > 0 && (
                    <div>Needs work: {outcomeMetrics.strugglingConcepts.slice(0, 3).join(', ')}</div>
                  )}
                </div>
              )}
            </Card>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <ClickCard metric="net">
              <Card>
                <div style={{ color: 'var(--ink2)', fontWeight: 900, fontSize: 12, letterSpacing: '0.08em' }}>MONEY LEFT EACH MONTH</div>
                <div style={{ marginTop: 8, fontWeight: 980, fontSize: 26 }}>{fc(net)}</div>
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink3)' }}>Explain • Based on: {basedOn.net.join(', ')}</div>
                {chart('net', true)}
              </Card>
            </ClickCard>
            <ClickCard metric="buffer">
              <Card>
                <div style={{ color: 'var(--ink2)', fontWeight: 900, fontSize: 12, letterSpacing: '0.08em' }}>EMERGENCY CUSHION</div>
                <div style={{ marginTop: 8, fontWeight: 980, fontSize: 26 }}>{baseline.bufMo.toFixed(1)} mo</div>
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink3)' }}>Explain • Based on: {basedOn.buffer.join(', ')}</div>
                {chart('buffer', true)}
              </Card>
            </ClickCard>
            <ClickCard metric="future">
              <Card>
                <div style={{ color: 'var(--ink2)', fontWeight: 900, fontSize: 12, letterSpacing: '0.08em' }}>FUTURE SAVINGS</div>
                <div style={{ marginTop: 8, fontWeight: 980, fontSize: 26 }}>{fp(baseline.futPct)}</div>
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink3)' }}>Explain • Based on: {basedOn.future.join(', ')}</div>
                {chart('future', true)}
              </Card>
            </ClickCard>
            <ClickCard metric="debt">
              <Card>
                <div style={{ color: 'var(--ink2)', fontWeight: 900, fontSize: 12, letterSpacing: '0.08em' }} title="Debt load is how heavy your monthly debt payments feel.">DEBT LOAD</div>
                <div style={{ marginTop: 8, fontWeight: 980, fontSize: 26 }}>{baseline.dExp}</div>
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink3)' }}>Explain • Based on: {basedOn.debt.join(', ')}</div>
                {chart('debt', false)}
              </Card>
            </ClickCard>
          </div>
          {activeMetric && (
            <Card>
              <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: '0.08em', color: 'var(--ink2)' }}>PLAIN ENGLISH</div>
              <div style={{ marginTop: 8, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {getMetricExplainer(activeMetric, fin, baseline)}
              </div>
            </Card>
          )}
          <Card>
            <div style={{ fontWeight: 950, fontSize: 18 }}>Direction</div>
            <div style={{ marginTop: 8, color: 'var(--ink2)', lineHeight: 1.7 }}>{focus}</div>
            <div style={{ marginTop: 6, color: 'var(--ink3)', fontSize: 12 }}>Atlas will keep refining this as we learn more.</div>
            <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <PrimaryBtn onClick={onTalk}>Refine in Talk</PrimaryBtn>
              <GhostBtn onClick={onStrategy}>How tiers work</GhostBtn>
            </div>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <Card>
              <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: '0.08em', color: 'var(--ink2)' }}>KNOWLEDGE MAP</div>
              <div style={{ marginTop: 8, fontWeight: 700 }}>Connected concepts</div>
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {concepts.map((c) => (
                  <span key={c} style={{ padding: '6px 10px', borderRadius: 999, background: 'var(--bg2)', border: '1px solid var(--bdr)', fontSize: 12 }}>
                    {c}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ink3)' }}>These build on each other as you progress.</div>
            </Card>

            <Card>
              <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: '0.08em', color: 'var(--ink2)' }}>WHAT-IF PREVIEW</div>
              <div style={{ marginTop: 8, fontWeight: 700 }}>Save $50/month</div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink3)' }}>6-month projection (illustrative)</div>
              <div style={{ marginTop: 10, height: 36, borderRadius: 12, border: '1px solid var(--bdr)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="100%" height="100%" viewBox="0 0 100 100" role="img" aria-label="scenario sparkline">
                  <polyline
                    fill="none"
                    stroke="var(--sky)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={spark.map((p) => `${(p.x / Math.max(1, spark.length - 1)) * 100},${100 - p.y * 100}`).join(' ')}
                  />
                </svg>
              </div>
            </Card>

            <Card>
              <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: '0.08em', color: 'var(--ink2)' }}>AUDIO LESSON</div>
              <div style={{ marginTop: 8, fontWeight: 700 }}>Listen instead of read</div>
              <div style={{ marginTop: 6, color: 'var(--ink3)', fontSize: 12 }}>~{audioLesson.estimatedDurationSec}s</div>
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ink2)', lineHeight: 1.6 }}>{audioLesson.text}</div>
            </Card>
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <GhostBtn onClick={onSettings}>Settings</GhostBtn>
          </div>
        </Stack>
      </PageContainer>
    </ScreenWrap>
  );
}
