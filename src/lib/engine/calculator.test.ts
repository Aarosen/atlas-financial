import { describe, expect, it } from 'vitest';
import { calcBufferMonths, calcDti, calcFutureAllocation, calcNet, clamp0 } from './calculator';

describe('calculator', () => {
  it('clamps negatives to zero', () => {
    expect(clamp0(-3)).toBe(0);
  });

  it('calculates net', () => {
    expect(calcNet(5000, 2000, 300)).toBe(2700);
  });

  it('calculates buffer months', () => {
    expect(calcBufferMonths(6000, 2000)).toBe(3);
  });

  it('calculates future allocation', () => {
    const out = calcFutureAllocation(2000, 5000);
    expect(out.futAmt).toBeGreaterThanOrEqual(0);
    expect(out.futPct).toBeGreaterThanOrEqual(0);
  });

  it('calculates dti', () => {
    expect(calcDti(6000, 12000, 6000)).toBeCloseTo(0.25);
  });
});
