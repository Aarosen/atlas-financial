import { describe, expect, it, vi } from 'vitest';

import { buildNudge } from './nudges';

describe('nudges', () => {
  it('returns null when no last action', () => {
    expect(buildNudge({ lastActionAt: null })).toBeNull();
  });

  it('returns a nudge after 7 days', () => {
    vi.useFakeTimers();
    const now = new Date('2024-01-08T00:00:00Z');
    vi.setSystemTime(now);
    const last = new Date('2024-01-01T00:00:00Z').getTime();
    const msg = buildNudge({ lastActionAt: last, primaryGoal: 'stability' });
    expect(msg).toContain('stability');
    vi.useRealTimers();
  });
});
