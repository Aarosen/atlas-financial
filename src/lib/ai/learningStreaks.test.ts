import { describe, expect, it } from 'vitest';

import { computeLearningStreak } from './learningStreaks';

describe('learningStreaks', () => {
  it('calculates learning streak', () => {
    const now = Date.now();
    const streak = computeLearningStreak([now - 86_400_000, now]);
    expect(streak.days).toBeGreaterThan(0);
  });
});
