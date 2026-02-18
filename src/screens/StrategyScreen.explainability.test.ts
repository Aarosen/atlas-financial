import { describe, expect, it } from 'vitest';

import type { Strategy } from '@/lib/state/types';
import { StrategyScreen } from './Strategy';

function asText(node: any, out: string[] = []): string {
  if (!node) return out.join(' ');
  if (typeof node === 'string' || typeof node === 'number') {
    out.push(String(node));
    return out.join(' ');
  }
  if (Array.isArray(node)) {
    node.forEach((n) => asText(n, out));
    return out.join(' ');
  }
  const props = node.props;
  if (props?.children) asText(props.children, out);
  return out.join(' ');
}

describe('StrategyScreen explainability panel', () => {
  it('renders Explain panel without null checks when explainability is present', () => {
    const baseline: Strategy = {
      tier: 'Foundation',
      lever: 'stabilize_cashflow',
      urgency: 'Protective',
      bufMo: 0,
      futPct: 0,
      dExp: 'Critical',
      metrics: {},
      expl: {},
      explainability: {
        tier: 'Foundation',
        lever: 'stabilize_cashflow',
        reasonCodes: ['NET_NEGATIVE'],
        inputsUsed: { monthlyIncome: '2000' },
        assumptions: [],
        metrics: { net: -500 },
        decisionTrace: [{ key: 'k', title: 't', detail: 'd' }],
        nextAction: { title: 'Stabilize cashflow', prompt: 'p', suggestedAmount: 500 },
      },
      sug: 0,
      ts: Date.now(),
    };

    const el = StrategyScreen({
      theme: 'light',
      onToggleTheme: () => {},
      apiErr: null,
      apiStatus: 'online',
      baseline,
      onBack: () => {},
      onAsk: () => {},
      tc: () => ({ name: 'Foundation', desc: 'd' }),
    });

    const txt = asText(el);
    expect(txt).toContain('Explain');
    expect(txt).toContain('NET_NEGATIVE');
    expect(txt).toContain('NEXT ACTION');
  });
});
