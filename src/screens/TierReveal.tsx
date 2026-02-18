import type { Strategy } from '@/lib/state/types';
import { Card } from '@/components/Card';
import { GhostBtn, PrimaryBtn } from '@/components/Buttons';
import { TopBar, ScreenWrap } from '@/components/TopBar';
import { PageContainer, Stack } from '@/components/Layout';

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
  const basedOn = ['Monthly income', 'Essentials', 'Savings', 'Debt balances'];

  return (
    <ScreenWrap>
      <TopBar title="Your tier" theme={theme} onToggleTheme={onToggleTheme} apiErr={apiErr} apiStatus={apiStatus} />
      <PageContainer style={{ paddingTop: 'var(--padY)', paddingBottom: 'var(--padY)' }}>
        <Stack gap={14}>
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
            <div style={{ marginTop: 6, color: 'var(--ink3)', fontSize: 12 }}>Based on: {basedOn.join(', ')}</div>
            <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <PrimaryBtn onClick={onKeepTalking}>Refine in Talk</PrimaryBtn>
              <GhostBtn onClick={onOpenDashboard}>Open dashboard →</GhostBtn>
            </div>
          </Card>
        </Stack>
      </PageContainer>
    </ScreenWrap>
  );
}
