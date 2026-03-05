'use client';

import { useMemo, useState } from 'react';
import type { MetricCardPayload as MetricCardPayloadType } from '@/lib/types/financial';

export function MetricCardPayload({ card }: { card: MetricCardPayloadType }) {
  const [showWhy, setShowWhy] = useState(false);
  const explainer = useMemo(() => {
    const lines: string[] = [];
    if (card.subtitle) lines.push(card.subtitle);
    if (card.action) lines.push(card.action);
    if (!lines.length) lines.push('Based on the numbers you shared so far.');
    return lines.join('\n');
  }, [card.action, card.subtitle]);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.08em', color: 'var(--ink2)' }}>{card.title}</div>
        <button
          onClick={() => setShowWhy((v) => !v)}
          style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink2)' }}
          aria-label={showWhy ? 'Hide why' : 'Why this?'}
          title={showWhy ? 'Hide why' : 'Why this?'}
          type="button"
        >
          {showWhy ? 'Hide why' : 'Why this?'}
        </button>
      </div>
      <div style={{ marginTop: 6, fontSize: 20, fontWeight: 900, color: 'var(--ink)' }}>{card.value}</div>
      {card.subtitle && <div style={{ marginTop: 4, fontSize: 12, color: 'var(--ink2)' }}>{card.subtitle}</div>}
      {card.action && <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: 'var(--ink2)' }}>{card.action}</div>}
      {showWhy && (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ink2)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {explainer}
        </div>
      )}
    </div>
  );
}
