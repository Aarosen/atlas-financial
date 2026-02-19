import { describe, expect, it } from 'vitest';

import { computeMastery } from './mastery';

describe('mastery', () => {
  it('returns mastered when scores are high', () => {
    expect(computeMastery({ correctRate: 0.9, followups: 0 })).toBe('mastered');
  });
});
