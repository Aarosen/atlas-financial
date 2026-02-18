import type { Strategy } from '@/lib/state/types';
import { Card } from '@/components/Card';
import { GhostBtn, PrimaryBtn } from '@/components/Buttons';
import { TopBar, ScreenWrap } from '@/components/TopBar';

export function TierRevealScreen({
  theme,
  onToggleTheme,
  apiErr,
  apiStatus,
  baseline,
  onOpenDashboard,
  onKeepTalking,
  tc,
  fp,
}: {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  apiErr: string | null;
  apiStatus: 'unknown' | 'online' | 'degraded' | 'offline';
  baseline: Strategy;
  onOpenDashboard: () => void;
  onKeepTalking: () => void;
  tc: (t: Strategy['tier']) => { name: string; desc: string };
  fp: (n: number) => string;
}) {
  const t = tc(baseline.tier);
  const leverLabels: Record<string, string> = {
    stabilize_cashflow: 'Stabilise your cashflow',
    eliminate_high_interest_debt: 'Tackle high-interest debt',
    build_emergency_buffer: 'Build your emergency buffer',
    increase_future_allocation: 'Grow your future allocation',
    optimize_discretionary_spend: 'Optimise one spending category',
  };

  return (
    <ScreenWrap>
      <TopBar title="Your tier" theme={theme} onToggleTheme={onToggleTheme} apiErr={apiErr} apiStatus={apiStatus} />
      <div style={{ padding: 'var(--padY) var(--padX)' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', display: 'grid', gap: 14, width: '100%' }}>
          <Card>
            <div style={{ fontWeight: 950, fontSize: 'var(--fsTitle)', letterSpacing: '-0.02em' }}>{t.name}</div>
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
              <PrimaryBtn onClick={onOpenDashboard}>Open dashboard →</PrimaryBtn>
              <GhostBtn onClick={onKeepTalking}>Keep talking</GhostBtn>
            </div>
          </Card>
        </div>
      </div>
    </ScreenWrap>
  );
}
