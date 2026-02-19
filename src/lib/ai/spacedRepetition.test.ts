import { describe, expect, it } from 'vitest';

import { scheduleNextReview } from './spacedRepetition';

describe('spacedRepetition', () => {
  it('schedules next review based on mastery', () => {
    const base = scheduleNextReview({ lastReviewedAt: 0, masteryScore: 0.5 });
    const advanced = scheduleNextReview({ lastReviewedAt: 0, masteryScore: 0.9 });
    expect(advanced.intervalDays).toBeGreaterThan(base.intervalDays);
  });
});
