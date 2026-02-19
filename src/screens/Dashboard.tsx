import type { ReactNode } from 'react';
import type { FinancialState, Strategy } from '@/lib/state/types';
import { Card } from '@/components/Card';
import { GhostBtn, PrimaryBtn } from '@/components/Buttons';
import { TopBar, ScreenWrap } from '@/components/TopBar';
import { PageContainer, Stack } from '@/components/Layout';

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
}) {
  const net = (baseline.metrics as any)?.net ?? fin.monthlyIncome - fin.essentialExpenses - fin.monthlyDebtPayments;
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

  const explain = (metric: string) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('atlas:explainMetric', JSON.stringify({ metric, at: Date.now() }));
    } catch {
      // ignore
    }
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

  return (
    <ScreenWrap>
      <h1 className="srOnly">Dashboard</h1>
      <TopBar title="Dashboard" theme={theme} onToggleTheme={onToggleTheme} apiErr={apiErr} apiStatus={apiStatus} />
      <PageContainer maxWidth={980} style={{ paddingTop: 'var(--padY)', paddingBottom: 'var(--padY)' }}>
        <Stack gap={14}>
          <Card>
            <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: '0.08em', color: 'var(--ink2)' }}>PROFILE CLARITY</div>
            <div style={{ marginTop: 8, fontWeight: 950, fontSize: 20 }}>{completenessScore}%</div>
            <div style={{ marginTop: 6, color: 'var(--ink2)', lineHeight: 1.7 }}>As we keep talking, this picture gets sharper.</div>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <ClickCard metric="net">
              <Card>
                <div style={{ color: 'var(--ink2)', fontWeight: 900, fontSize: 12, letterSpacing: '0.08em' }}>MONEY LEFT EACH MONTH</div>
                <div style={{ marginTop: 8, fontWeight: 980, fontSize: 26 }}>{fc(net)}</div>
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink3)' }}>Explain • Based on: {basedOn.net.join(', ')}</div>
                <div style={{ marginTop: 10, height: 36, borderRadius: 12, border: '1px dashed var(--bdr)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--ink3)' }}>{trendNote}</div>
              </Card>
            </ClickCard>
            <ClickCard metric="buffer">
              <Card>
                <div style={{ color: 'var(--ink2)', fontWeight: 900, fontSize: 12, letterSpacing: '0.08em' }}>EMERGENCY CUSHION</div>
                <div style={{ marginTop: 8, fontWeight: 980, fontSize: 26 }}>{baseline.bufMo.toFixed(1)} mo</div>
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink3)' }}>Explain • Based on: {basedOn.buffer.join(', ')}</div>
                <div style={{ marginTop: 10, height: 36, borderRadius: 12, border: '1px dashed var(--bdr)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--ink3)' }}>{trendNote}</div>
              </Card>
            </ClickCard>
            <ClickCard metric="future">
              <Card>
                <div style={{ color: 'var(--ink2)', fontWeight: 900, fontSize: 12, letterSpacing: '0.08em' }}>FUTURE SAVINGS</div>
                <div style={{ marginTop: 8, fontWeight: 980, fontSize: 26 }}>{fp(baseline.futPct)}</div>
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink3)' }}>Explain • Based on: {basedOn.future.join(', ')}</div>
                <div style={{ marginTop: 10, height: 36, borderRadius: 12, border: '1px dashed var(--bdr)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--ink3)' }}>{trendNote}</div>
              </Card>
            </ClickCard>
            <ClickCard metric="debt">
              <Card>
                <div style={{ color: 'var(--ink2)', fontWeight: 900, fontSize: 12, letterSpacing: '0.08em' }}>DEBT LOAD</div>
                <div style={{ marginTop: 8, fontWeight: 980, fontSize: 26 }}>{baseline.dExp}</div>
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink3)' }}>Explain • Based on: {basedOn.debt.join(', ')}</div>
                <div style={{ marginTop: 10, height: 36, borderRadius: 12, border: '1px dashed var(--bdr)', background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--ink3)' }}>{trendNote}</div>
              </Card>
            </ClickCard>
          </div>
          <Card>
            <div style={{ fontWeight: 950, fontSize: 18 }}>Direction</div>
            <div style={{ marginTop: 8, color: 'var(--ink2)', lineHeight: 1.7 }}>{focus}</div>
            <div style={{ marginTop: 6, color: 'var(--ink3)', fontSize: 12 }}>Atlas will keep refining this as we learn more.</div>
            <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <PrimaryBtn onClick={onTalk}>Refine in Talk</PrimaryBtn>
              <GhostBtn onClick={onStrategy}>How tiers work</GhostBtn>
              <GhostBtn onClick={onSettings}>Settings</GhostBtn>
            </div>
          </Card>
        </Stack>
      </PageContainer>
    </ScreenWrap>
  );
}
