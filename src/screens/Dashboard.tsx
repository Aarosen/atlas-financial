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
    stabilize_cashflow: 'Get to non-negative monthly cashflow',
    eliminate_high_interest_debt: 'Reduce compounding high-interest debt',
    build_emergency_buffer: 'Build a 3–6 month buffer',
    increase_future_allocation: 'Raise your future allocation to 15%+',
    optimize_discretionary_spend: 'Optimize one discretionary category',
  };
  const focus = focusMap[baseline.lever] || 'One clear improvement';

  return (
    <ScreenWrap>
      <h1 className="srOnly">Dashboard</h1>
      <TopBar title="Dashboard" theme={theme} onToggleTheme={onToggleTheme} apiErr={apiErr} apiStatus={apiStatus} />
      <PageContainer maxWidth={980} style={{ paddingTop: 'var(--padY)', paddingBottom: 'var(--padY)' }}>
        <Stack gap={14}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <ClickCard metric="net">
              <Card>
                <div style={{ color: 'var(--ink2)', fontWeight: 900, fontSize: 12, letterSpacing: '0.08em' }}>NET EACH MONTH</div>
                <div style={{ marginTop: 8, fontWeight: 980, fontSize: 26 }}>{fc(net)}</div>
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink3)' }}>Click to explain</div>
              </Card>
            </ClickCard>
            <ClickCard metric="buffer">
              <Card>
                <div style={{ color: 'var(--ink2)', fontWeight: 900, fontSize: 12, letterSpacing: '0.08em' }}>BUFFER</div>
                <div style={{ marginTop: 8, fontWeight: 980, fontSize: 26 }}>{baseline.bufMo.toFixed(1)} mo</div>
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink3)' }}>Click to explain</div>
              </Card>
            </ClickCard>
            <ClickCard metric="future">
              <Card>
                <div style={{ color: 'var(--ink2)', fontWeight: 900, fontSize: 12, letterSpacing: '0.08em' }}>FUTURE ALLOCATION</div>
                <div style={{ marginTop: 8, fontWeight: 980, fontSize: 26 }}>{fp(baseline.futPct)}</div>
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink3)' }}>Click to explain</div>
              </Card>
            </ClickCard>
            <ClickCard metric="debt">
              <Card>
                <div style={{ color: 'var(--ink2)', fontWeight: 900, fontSize: 12, letterSpacing: '0.08em' }}>DEBT PRESSURE</div>
                <div style={{ marginTop: 8, fontWeight: 980, fontSize: 26 }}>{baseline.dExp}</div>
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink3)' }}>Click to explain</div>
              </Card>
            </ClickCard>
          </div>
          <Card>
            <div style={{ fontWeight: 950, fontSize: 18 }}>Focus</div>
            <div style={{ marginTop: 8, color: 'var(--ink2)', lineHeight: 1.7 }}>{focus}</div>
            <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <PrimaryBtn onClick={onTalk}>Talk it through</PrimaryBtn>
              <GhostBtn onClick={onStrategy}>How tiers work</GhostBtn>
              <GhostBtn onClick={onSettings}>Settings</GhostBtn>
            </div>
          </Card>
        </Stack>
      </PageContainer>
    </ScreenWrap>
  );
}
