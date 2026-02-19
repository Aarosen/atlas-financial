import { describe, expect, it } from 'vitest';

import { simulateSavingsGrowth } from './scenarioSimulator';

describe('scenarioSimulator', () => {
  it('simulates savings growth', () => {
    const points = simulateSavingsGrowth({ monthlyContribution: 100, months: 6, annualRate: 0.05 });
    expect(points.length).toBe(6);
    expect(points[0].value).toBeGreaterThan(0);
  });
});
