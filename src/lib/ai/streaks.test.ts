import { describe, expect, it } from 'vitest';

import { buildStreakMessage, computeActionStreak } from './streaks';

describe('streaks', () => {
  it('returns no streak when no actions', () => {
    const s = computeActionStreak([]);
    expect(s.days).toBe(0);
  });

  it('builds a streak message', () => {
    const now = Date.now();
    const s = computeActionStreak([
      { type: 'auto_transfer', createdAt: now - 86_400_000 },
      { type: 'auto_transfer', createdAt: now },
    ] as any);
    const msg = buildStreakMessage(s);
    expect(msg).toBeTruthy();
  });
});
