import { describe, expect, it } from 'vitest';
import { checkCostBudget, checkLatencyBudget, estimateCost } from './budgets';

describe('budgets', () => {
  it('estimates cost for tokens', () => {
    const cost = estimateCost(1000, 500);
    expect(cost).toBeGreaterThan(0);
  });

  it('checks latency budget', () => {
    expect(checkLatencyBudget(3000, 5000)).toBe(true);
    expect(checkLatencyBudget(6000, 5000)).toBe(false);
  });

  it('checks cost budget', () => {
    expect(checkCostBudget(0.03, 0.05)).toBe(true);
    expect(checkCostBudget(0.06, 0.05)).toBe(false);
  });
});
