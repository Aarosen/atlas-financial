import type { Strategy } from '@/lib/state/types';
import { Card } from '@/components/Card';
import { Button } from '@/components/Buttons';
import { TopBar, ScreenWrap } from '@/components/TopBar';
import { PageContainer, Stack } from '@/components/Layout';

export function PlanScreen({
  theme,
  onToggleTheme,
  apiErr,
  apiStatus,
  baseline,
  onRefine,
}: {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  apiErr: string | null;
  apiStatus: 'unknown' | 'online' | 'degraded' | 'offline';
  baseline: Strategy;
  onRefine: () => void;
}) {
  const leverLabelMap: Record<string, string> = {
    stabilize_cashflow: 'Stabilize cashflow',
    eliminate_high_interest_debt: 'Lower high-interest debt',
    build_emergency_buffer: 'Build an emergency cushion',
    increase_future_allocation: 'Grow future savings',
    optimize_discretionary_spend: 'Tighten discretionary spend',
  };
  const leverLabel = leverLabelMap[baseline.lever] || baseline.lever;
  const primaryStep = baseline.explainability?.nextAction?.prompt || 'Direction: keep the next step small enough to finish this week.';
  const checklist = (baseline.explainability?.decisionTrace || [])
    .slice(0, 5)
    .map((s) => s.title)
    .filter(Boolean);

  return (
    <ScreenWrap>
      <TopBar title="Plan" theme={theme} onToggleTheme={onToggleTheme} apiErr={apiErr} apiStatus={apiStatus} />
      <PageContainer maxWidth={820} style={{ paddingTop: 'var(--padY)', paddingBottom: 'var(--padY)' }}>
        <Stack gap={14}>
          <Card>
            <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: '0.08em', color: 'var(--ink2)' }}>FOCUS</div>
            <div style={{ marginTop: 6, fontWeight: 980, fontSize: 20 }}>{leverLabel}</div>
            <div style={{ marginTop: 10, color: 'var(--ink2)', lineHeight: 1.7 }}>The most leverage‑positive move for right now.</div>
            <div style={{ marginTop: 8, color: 'var(--ink3)', fontSize: 12 }}>As we keep talking, this picture gets sharper.</div>
          </Card>

          <Card>
            <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: '0.08em', color: 'var(--ink2)' }}>NEXT STEP</div>
            <div style={{ marginTop: 8, fontWeight: 950, fontSize: 16, lineHeight: 1.6 }}>{primaryStep}</div>
            <div style={{ marginTop: 14 }}>
              <Button onClick={onRefine} variant="primary" size="md">Refine in Talk</Button>
            </div>
          </Card>

          <Card>
            <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: '0.08em', color: 'var(--ink2)' }}>CHECKLIST</div>
            <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
              {(checklist.length ? checklist : ['Choose a specific category to focus on', 'Set a target amount', 'Schedule a 10‑minute action block']).map((item) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 12, border: '1px solid var(--bdr)', background: 'var(--bg2)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 999, border: '2px solid var(--ink3)' }} />
                  <div style={{ color: 'var(--ink2)', fontWeight: 800 }}>{item}</div>
                </div>
              ))}
            </div>
          </Card>
        </Stack>
      </PageContainer>
    </ScreenWrap>
  );
}
