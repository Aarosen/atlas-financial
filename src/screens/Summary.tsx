import type { FinancialState, Strategy } from '@/lib/state/types';
import { Card } from '@/components/Card';
import { GhostBtn, PrimaryBtn } from '@/components/Buttons';
import { TopBar, ScreenWrap } from '@/components/TopBar';
import { PageContainer, Stack } from '@/components/Layout';

export function SummaryScreen({
  theme,
  onToggleTheme,
  apiErr,
  apiStatus,
  fin,
  baseline,
  onShowTier,
  onEditViaChat,
  fc,
  fp,
}: {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  apiErr: string | null;
  apiStatus: 'unknown' | 'online' | 'degraded' | 'offline';
  fin: FinancialState;
  baseline: Strategy;
  onShowTier: () => void;
  onEditViaChat: () => void;
  fc: (n: number) => string;
  fp: (n: number) => string;
}) {
  const items: Array<{ l: string; v: string; ok: boolean }> = [
    { l: 'Monthly income', v: fc(fin.monthlyIncome || 0), ok: true },
    { l: 'Essential expenses', v: fc(fin.essentialExpenses || 0), ok: true },
    { l: 'Emergency buffer', v: `${baseline.bufMo.toFixed(1)} months`, ok: baseline.bufMo >= 3 },
    { l: 'Future allocation', v: fp(baseline.futPct), ok: baseline.futPct >= 0.15 },
    { l: 'Debt pressure', v: baseline.dExp, ok: baseline.dExp === 'Low' },
    { l: 'Stated goal', v: (fin.primaryGoal || 'stability').replace('_', ' '), ok: true },
  ];

  return (
    <ScreenWrap>
      <TopBar title="Summary" theme={theme} onToggleTheme={onToggleTheme} apiErr={apiErr} apiStatus={apiStatus} />
      <PageContainer style={{ paddingTop: 'var(--padY)', paddingBottom: 'var(--padY)' }}>
        <Stack gap={14}>
          <Card>
            <div style={{ fontWeight: 950, fontSize: 'var(--fsH2)', letterSpacing: '-0.02em' }}>Here’s what I heard</div>
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
            <div style={{ color: 'var(--ink2)', lineHeight: 1.7 }}>Next, I’ll place you into a tier (not a label — just a way to pick the right move at the right time).</div>
            <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <PrimaryBtn onClick={onShowTier}>Show my tier →</PrimaryBtn>
              <GhostBtn onClick={onEditViaChat}>Refine in Talk</GhostBtn>
            </div>
          </Card>
        </Stack>
      </PageContainer>
    </ScreenWrap>
  );
}
