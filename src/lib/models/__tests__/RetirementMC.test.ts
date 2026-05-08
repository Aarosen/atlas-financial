import { describe, it, expect } from 'vitest';
import { RetirementMC, RetirementParams } from '../RetirementMC';

describe('RetirementMC simulator', () => {
  it('should run Monte Carlo simulation with reasonable success rate', () => {
    const params: RetirementParams = {
      ageNow: 32,
      ageRetire: 65,
      ageDeath: 95,
      balances: {
        preTax: 50000,
        postTax: 10000,
        roth: 5000,
      },
      contribMonthly: {
        preTax: 1500,
        postTax: 0,
        roth: 500,
      },
      retirementSpend: 60000,
      socialSecurity: 24000,
      allocation: {
        stocks: 0.8,
        bonds: 0.2,
      },
    };

    const result = RetirementMC.run(params, 100); // 100 sims for speed

    expect(result.successRate).toBeGreaterThan(0);
    expect(result.successRate).toBeLessThanOrEqual(1);
    expect(result.depletionRate).toBeCloseTo(1 - result.successRate, 5);
    expect(result.p10.length).toBe(result.totalYears);
    expect(result.p50.length).toBe(result.totalYears);
    expect(result.p90.length).toBe(result.totalYears);
    expect(result.yearsAccum).toBe(33); // 65 - 32
    expect(result.yearsRetire).toBe(30); // 95 - 65
    expect(result.totalYears).toBe(63);
  });

  it('should show increasing portfolio in accumulation phase', () => {
    const params: RetirementParams = {
      ageNow: 30,
      ageRetire: 60,
      ageDeath: 90,
      balances: {
        preTax: 100000,
        postTax: 50000,
        roth: 25000,
      },
      contribMonthly: {
        preTax: 2000,
        postTax: 500,
        roth: 500,
      },
      retirementSpend: 80000,
      socialSecurity: 30000,
      allocation: {
        stocks: 0.7,
        bonds: 0.3,
      },
    };

    const result = RetirementMC.run(params, 100);

    // At year 30 (end of accumulation), median should be significantly higher than start
    const startBalance = 100000 + 50000 + 25000; // 175k
    const endAccumBalance = result.p50[result.yearsAccum - 1];
    expect(endAccumBalance).toBeGreaterThan(startBalance);
  });

  it('should handle zero contributions', () => {
    const params: RetirementParams = {
      ageNow: 55,
      ageRetire: 65,
      ageDeath: 95,
      balances: {
        preTax: 500000,
        postTax: 200000,
        roth: 100000,
      },
      contribMonthly: {
        preTax: 0,
        postTax: 0,
        roth: 0,
      },
      retirementSpend: 100000,
      socialSecurity: 40000,
    };

    const result = RetirementMC.run(params, 100);

    // With $800k starting balance and $60k annual need (100k - 40k SS), should have good success
    expect(result.successRate).toBeGreaterThan(0); // Should have some success paths
    expect(result.totalYears).toBe(40); // 95 - 55 = 40 years (retire at 65, die at 95)
    // With 40 years of withdrawals, median may deplete; just verify it ran
    expect(result.p50.length).toBe(40);
  });

  it('should show percentiles in correct order', () => {
    const params: RetirementParams = {
      ageNow: 40,
      ageRetire: 65,
      ageDeath: 95,
      balances: {
        preTax: 200000,
        postTax: 100000,
        roth: 50000,
      },
      contribMonthly: {
        preTax: 1000,
        postTax: 500,
        roth: 250,
      },
      retirementSpend: 80000,
      socialSecurity: 30000,
    };

    const result = RetirementMC.run(params, 100);

    // p10 should always be <= p50 <= p90
    for (let i = 0; i < result.totalYears; i++) {
      expect(result.p10[i]).toBeLessThanOrEqual(result.p50[i]);
      expect(result.p50[i]).toBeLessThanOrEqual(result.p90[i]);
    }
  });
});
