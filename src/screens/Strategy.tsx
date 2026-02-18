import type { Strategy } from '@/lib/state/types';
import { Card } from '@/components/Card';
import { GhostBtn, PrimaryBtn } from '@/components/Buttons';
import { TopBar, ScreenWrap } from '@/components/TopBar';
import { PageContainer, Stack } from '@/components/Layout';

export function StrategyScreen({
  theme,
  onToggleTheme,
  apiErr,
  apiStatus,
  baseline,
  onBack,
  onAsk,
  tc,
}: {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  apiErr: string | null;
  apiStatus: 'unknown' | 'online' | 'degraded' | 'offline';
  baseline: Strategy;
  onBack: () => void;
  onAsk: () => void;
  tc: (t: Strategy['tier']) => { name: string; desc: string };
}) {
  const criteria: Record<Strategy['tier'], string[]> = {
    Foundation: ['Monthly outflow ≥ inflow (negative cashflow)', 'Emergency buffer < 1 month'],
    Stabilizing: ['Buffer between 1–3 months', 'High-interest debt > 2× monthly income'],
    Strategic: ['Buffer between 3–6 months', 'Debt-to-income ratio > 30%'],
    GrowthReady: ['Buffer ≥ 6 months', 'Debt-to-income ≤ 30%', 'Positive monthly cashflow'],
  };
  const t = tc(baseline.tier);
  const ex = baseline.explainability;
  const basedOn = Object.keys(ex.inputsUsed || {}).join(', ');

  return (
    <ScreenWrap>
      <TopBar title="Strategy" theme={theme} onToggleTheme={onToggleTheme} apiErr={apiErr} apiStatus={apiStatus} />
      <PageContainer style={{ paddingTop: 'var(--padY)', paddingBottom: 'var(--padY)' }}>
        <Stack gap={14}>
          <Card>
            <div style={{ fontWeight: 980, fontSize: 'var(--fsH2)' }}>{t.name}</div>
            <div style={{ marginTop: 8, color: 'var(--ink2)', lineHeight: 1.7 }}>{t.desc}</div>
            <div style={{ marginTop: 10, color: 'var(--ink2)', fontWeight: 800 }}>Confidence: {baseline.confidence}</div>
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
              <PrimaryBtn onClick={onAsk}>Refine in Talk</PrimaryBtn>
              <GhostBtn onClick={onBack}>Back to dashboard</GhostBtn>
            </div>
          </Card>

          <Card>
            <div style={{ fontWeight: 950, fontSize: 16 }}>Explain</div>
            <div style={{ marginTop: 10, color: 'var(--ink2)', lineHeight: 1.7 }}>Tier: {ex.tier} • Lever: {ex.lever}</div>
            <div style={{ marginTop: 8, color: 'var(--ink3)', fontSize: 12 }}>Based on: {basedOn || 'Your recent inputs'}</div>
            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: '0.08em', color: 'var(--ink2)' }}>REASONS</div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ex.reasonCodes.map((c) => (
                    <div key={c} style={{ padding: '6px 10px', borderRadius: 999, border: '1px solid var(--bdr)', background: 'var(--bg2)', fontWeight: 800, color: 'var(--ink2)' }}>
                      {c}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: '0.08em', color: 'var(--ink2)' }}>INPUTS USED</div>
                <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                  {Object.entries(ex.inputsUsed).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '8px 10px', borderRadius: 12, border: '1px solid var(--bdr)', background: 'var(--bg2)' }}>
                      <div style={{ color: 'var(--ink2)', fontWeight: 800 }}>{k}</div>
                      <div style={{ fontWeight: 950 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: '0.08em', color: 'var(--ink2)' }}>ASSUMPTIONS</div>
                <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                  {ex.assumptions.length ? (
                    ex.assumptions.map((a) => (
                      <div key={a} style={{ padding: '8px 10px', borderRadius: 12, border: '1px solid var(--bdr)', background: 'var(--bg2)', color: 'var(--ink2)', fontWeight: 800 }}>
                        {a}
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '8px 10px', borderRadius: 12, border: '1px solid var(--bdr)', background: 'var(--bg2)', color: 'var(--ink2)', fontWeight: 800 }}>None</div>
                  )}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: '0.08em', color: 'var(--ink2)' }}>DECISION TRACE</div>
                <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
                  {ex.decisionTrace.map((s) => (
                    <div key={s.key} style={{ padding: '10px 12px', borderRadius: 14, border: '1px solid var(--bdr)', background: 'var(--bg2)' }}>
                      <div style={{ fontWeight: 950 }}>{s.title}</div>
                      <div style={{ marginTop: 6, color: 'var(--ink2)', lineHeight: 1.7 }}>{s.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: '0.08em', color: 'var(--ink2)' }}>NEXT ACTION</div>
                <div style={{ marginTop: 8, padding: '10px 12px', borderRadius: 14, border: '1px solid var(--bdr)', background: 'var(--bg2)' }}>
                  <div style={{ fontWeight: 950 }}>{ex.nextAction.title}</div>
                  <div style={{ marginTop: 6, color: 'var(--ink2)', lineHeight: 1.7 }}>{ex.nextAction.prompt}</div>
                  <div style={{ marginTop: 8, fontWeight: 950 }}>Suggested amount: {ex.nextAction.suggestedAmount}</div>
                </div>
              </div>
            </div>
          </Card>
        </Stack>
      </PageContainer>
    </ScreenWrap>
  );
}
