import type { FinancialState, Strategy } from '@/lib/state/types';
import { Card } from '@/components/Card';
import { GhostBtn, PrimaryBtn } from '@/components/Buttons';
import { TopBar, ScreenWrap } from '@/components/TopBar';

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
      <TopBar title="Dashboard" theme={theme} onToggleTheme={onToggleTheme} apiErr={apiErr} apiStatus={apiStatus} />
      <div style={{ padding: 'var(--padY) var(--padX)' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: 14, width: '100%' }}>
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
              <PrimaryBtn onClick={onTalk}>Talk it through</PrimaryBtn>
              <GhostBtn onClick={onStrategy}>How tiers work</GhostBtn>
              <GhostBtn onClick={onSettings}>Settings</GhostBtn>
            </div>
          </Card>
        </div>
      </div>
    </ScreenWrap>
  );
}
