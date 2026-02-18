import { describe, expect, it } from 'vitest';
import { benchmarkAtlas } from './benchmark';

describe('benchmark', () => {
  it('ranks Atlas against competitors', () => {
    const results = benchmarkAtlas({
      empathy: 9,
      explainability: 9,
      personalization: 8,
      accuracy: 8,
      latency: 1000,
    });
    expect(results.length).toBe(3);
    expect(results[0].percentile).toBeGreaterThanOrEqual(results[1].percentile);
  });

  it('calculates percentile correctly', () => {
    const results = benchmarkAtlas({
      empathy: 5,
      explainability: 5,
      personalization: 5,
      accuracy: 5,
      latency: 3000,
    });
    expect(results[0].percentile).toBeGreaterThan(0);
  });
});
