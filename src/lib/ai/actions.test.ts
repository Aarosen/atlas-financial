import { describe, expect, it } from 'vitest';

import { buildActionFeedback, detectAction, estimateActionImpact } from './actions';

describe('actions', () => {
  it('detects an auto-transfer action', () => {
    const action = detectAction('I set up a $50 weekly auto-transfer');
    expect(action?.type).toBe('auto_transfer');
    expect(action?.frequency).toBe('weekly');
  });

  it('estimates action impact', () => {
    const action = detectAction('I set up a $100 monthly auto transfer');
    const impact = estimateActionImpact(action);
    expect(impact?.monthlyUsd).toBeGreaterThan(0);
    expect(impact?.yearlyUsd).toBeGreaterThan(impact?.monthlyUsd ?? 0);
  });

  it('builds action feedback text', () => {
    const action = detectAction('I set up a $25 weekly auto-transfer');
    const impact = estimateActionImpact(action);
    const feedback = buildActionFeedback(action, impact);
    expect(feedback).toContain('Action logged');
  });
});
