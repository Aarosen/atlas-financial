'use client';

import type { MetricCardPayload as MetricCardPayloadType } from '@/lib/types/financial';

export function MetricCardPayload({ card }: { card: MetricCardPayloadType }) {
  return (
    <div
      style={{
        border: '1px solid var(--bdr)',
        background: 'var(--card)',
        borderRadius: 14,
        padding: '12px 14px',
        boxShadow: 'var(--sh1)',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.08em', color: 'var(--ink2)' }}>{card.title}</div>
      <div style={{ marginTop: 6, fontSize: 20, fontWeight: 900, color: 'var(--ink)' }}>{card.value}</div>
      {card.subtitle && <div style={{ marginTop: 4, fontSize: 12, color: 'var(--ink2)' }}>{card.subtitle}</div>}
      {card.action && <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: 'var(--ink2)' }}>{card.action}</div>}
    </div>
  );
}
