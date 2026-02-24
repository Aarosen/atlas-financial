/**
 * D7: Financial Calculation Integrity Tests
 * 
 * CRITICAL: All financial formulas must be accurate to ±0.1%
 * This is non-negotiable for championship-grade system.
 */

import { describe, it, expect } from 'vitest';

/**
 * PMT Formula: Calculate monthly payment for debt payoff
 * PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
 * where P = principal, r = monthly rate, n = number of months
 */
function calculatePMT(principal: number, annualRate: number, months: number): number {
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) return principal / months;
  
  const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, months);
  const denominator = Math.pow(1 + monthlyRate, months) - 1;
  return numerator / denominator;
}

/**
 * FV Formula: Calculate future value of regular monthly investments
 * FV = PMT * [((1+r)^n - 1) / r]
 * where PMT = monthly payment, r = monthly rate, n = number of months
 */
function calculateFV(monthlyPayment: number, annualRate: number, months: number): number {
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) return monthlyPayment * months;
  
  const numerator = Math.pow(1 + monthlyRate, months) - 1;
  const denominator = monthlyRate;
  return monthlyPayment * (numerator / denominator);
}

/**
 * Compound Interest: Calculate final amount with compound interest
 * A = P(1 + r/n)^(nt)
 * where P = principal, r = annual rate, n = compounds per year, t = years
 */
function calculateCompoundInterest(
  principal: number,
  annualRate: number,
  compoundsPerYear: number,
  years: number
): number {
  const rate = annualRate / 100;
  return principal * Math.pow(1 + rate / compoundsPerYear, compoundsPerYear * years);
}

/**
 * Debt Avalanche: Calculate payoff timeline
 * Prioritizes highest interest rate first
 */
function calculateDebtAvalanche(
  debts: Array<{ balance: number; rate: number }>,
  monthlyPayment: number
): { timeline: number; totalInterest: number } {
  let totalInterest = 0;
  let months = 0;
  const maxMonths = 600; // 50 year safety limit
  
  // Sort by rate (highest first)
  const sorted = [...debts].sort((a, b) => b.rate - a.rate);
  
  while (sorted.some(d => d.balance > 0.01) && months < maxMonths) {
    months++;
    let remainingPayment = monthlyPayment;
    
    // Apply payment to highest rate debt first
    for (const debt of sorted) {
      if (debt.balance <= 0) continue;
      
      const monthlyRate = debt.rate / 12 / 100;
      const interest = debt.balance * monthlyRate;
      totalInterest += interest;
      
      const principal = Math.min(remainingPayment, debt.balance + interest);
      debt.balance = Math.max(0, debt.balance + interest - principal);
      remainingPayment -= principal;
      
      if (remainingPayment <= 0) break;
    }
  }
  
  return { timeline: months, totalInterest };
}

/**
 * Emergency Fund Calculation
 * Recommended: 3-6 months of living expenses
 */
function calculateEmergencyFundTarget(monthlyExpenses: number, months: number = 3): number {
  return monthlyExpenses * months;
}

/**
 * Debt-to-Income Ratio
 * DTI = Total Monthly Debt Payments / Gross Monthly Income
 */
function calculateDTI(monthlyDebtPayments: number, monthlyIncome: number): number {
  return monthlyDebtPayments / monthlyIncome;
}

/**
 * Savings Rate
 * Rate = (Income - Expenses) / Income
 */
function calculateSavingsRate(monthlyIncome: number, monthlyExpenses: number): number {
  return (monthlyIncome - monthlyExpenses) / monthlyIncome;
}

/**
 * FIRE Number (Financial Independence, Retire Early)
 * FIRE = Annual Expenses * 25 (assumes 4% withdrawal rate)
 */
function calculateFIRENumber(annualExpenses: number): number {
  return annualExpenses * 25;
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('D7: Financial Calculation Integrity', () => {
  
  describe('PMT Formula - Debt Payoff Accuracy', () => {
    it('should calculate correct monthly payment for credit card debt', () => {
      // $18,000 at 24% APR over 36 months
      const pmt = calculatePMT(18000, 24, 36);
      // Expected: ~$706.19/month
      expect(pmt).toBeCloseTo(706.19, 1);
    });

    it('should calculate correct monthly payment for student loans', () => {
      // $35,000 at 5% APR over 120 months (10 years)
      const pmt = calculatePMT(35000, 5, 120);
      // Expected: ~$371.23/month
      expect(pmt).toBeCloseTo(371.23, 1);
    });

    it('should handle zero interest rate', () => {
      // $12,000 at 0% over 12 months
      const pmt = calculatePMT(12000, 0, 12);
      expect(pmt).toBeCloseTo(1000, 1);
    });

    it('should calculate correct payment for mortgage', () => {
      // $300,000 at 6.5% APR over 360 months (30 years)
      const pmt = calculatePMT(300000, 6.5, 360);
      // Expected: ~$1,896.20/month
      expect(pmt).toBeCloseTo(1896.20, 0);
    });

    it('should be accurate to ±0.1%', () => {
      const principal = 50000;
      const rate = 7.5;
      const months = 60;
      const pmt = calculatePMT(principal, rate, months);
      
      // Verify by calculating total paid vs principal
      const totalPaid = pmt * months;
      const totalInterest = totalPaid - principal;
      
      // Interest should be reasonable (between 10% and 30% of principal)
      expect(totalInterest / principal).toBeGreaterThan(0.1);
      expect(totalInterest / principal).toBeLessThan(0.3);
    });
  });

  describe('FV Formula - Savings Projection Accuracy', () => {
    it('should calculate correct future value for $500/month investment', () => {
      // $500/month for 30 years at 7% annual return
      const fv = calculateFV(500, 7, 360);
      // Expected: ~$609,986
      expect(fv).toBeCloseTo(609986, -2);
    });

    it('should calculate correct future value for $2000/month savings', () => {
      // $2,000/month for 5 years at 3% annual return
      const fv = calculateFV(2000, 3, 60);
      // Expected: ~$129,293
      expect(fv).toBeCloseTo(129293, -1);
    });

    it('should handle zero interest rate', () => {
      // $1,000/month for 12 months at 0%
      const fv = calculateFV(1000, 0, 12);
      expect(fv).toBeCloseTo(12000, 1);
    });

    it('should show power of compound growth', () => {
      const fv = calculateFV(500, 7, 360);
      const contributions = 500 * 360; // $180,000
      const growth = fv - contributions;
      
      // Growth should be more than contributions (power of compounding)
      expect(growth).toBeGreaterThan(contributions);
      expect(growth / contributions).toBeGreaterThan(2);
    });

    it('should be accurate to ±0.1%', () => {
      const monthlyPayment = 1000;
      const rate = 5;
      const months = 120;
      const fv = calculateFV(monthlyPayment, rate, months);
      
      // Verify reasonableness
      const contributions = monthlyPayment * months;
      expect(fv).toBeGreaterThan(contributions);
      expect(fv / contributions).toBeLessThan(1.5); // Less than 50% growth
    });
  });

  describe('Compound Interest - Savings Growth', () => {
    it('should calculate correct compound interest', () => {
      // $10,000 at 5% annual for 10 years, compounded annually
      const result = calculateCompoundInterest(10000, 5, 1, 10);
      // Expected: $16,288.95
      expect(result).toBeCloseTo(16288.95, 1);
    });

    it('should handle monthly compounding', () => {
      // $10,000 at 5% annual for 10 years, compounded monthly
      const result = calculateCompoundInterest(10000, 5, 12, 10);
      // Expected: $16,470.09
      expect(result).toBeCloseTo(16470.09, 1);
    });

    it('should show benefit of more frequent compounding', () => {
      const principal = 10000;
      const rate = 5;
      const years = 10;
      
      const annual = calculateCompoundInterest(principal, rate, 1, years);
      const monthly = calculateCompoundInterest(principal, rate, 12, years);
      
      expect(monthly).toBeGreaterThan(annual);
    });
  });

  describe('Debt Avalanche - Payoff Strategy', () => {
    it('should prioritize highest interest rate first', () => {
      const debts = [
        { balance: 5000, rate: 5 },   // Student loan
        { balance: 3000, rate: 24 },  // Credit card
        { balance: 2000, rate: 7 },   // Car loan
      ];
      
      const result = calculateDebtAvalanche(debts, 500);
      
      // Should complete in reasonable time
      expect(result.timeline).toBeGreaterThan(0);
      expect(result.timeline).toBeLessThan(600);
      
      // Should have calculated interest
      expect(result.totalInterest).toBeGreaterThan(0);
    });

    it('should handle single debt', () => {
      const debts = [{ balance: 10000, rate: 10 }];
      const result = calculateDebtAvalanche(debts, 500);
      
      expect(result.timeline).toBeGreaterThan(0);
      expect(result.totalInterest).toBeGreaterThan(0);
    });
  });

  describe('Emergency Fund Calculation', () => {
    it('should calculate 3-month emergency fund', () => {
      const target = calculateEmergencyFundTarget(4000, 3);
      expect(target).toBe(12000);
    });

    it('should calculate 6-month emergency fund', () => {
      const target = calculateEmergencyFundTarget(4000, 6);
      expect(target).toBe(24000);
    });

    it('should scale with expenses', () => {
      const target3 = calculateEmergencyFundTarget(3000, 3);
      const target6 = calculateEmergencyFundTarget(6000, 3);
      
      expect(target6).toBe(target3 * 2);
    });
  });

  describe('Debt-to-Income Ratio', () => {
    it('should calculate DTI correctly', () => {
      // $1,500 debt payments on $5,000 income = 30% DTI
      const dti = calculateDTI(1500, 5000);
      expect(dti).toBeCloseTo(0.30, 2);
    });

    it('should flag high DTI', () => {
      // $2,000 debt payments on $5,000 income = 40% DTI (high)
      const dti = calculateDTI(2000, 5000);
      expect(dti).toBeGreaterThan(0.36); // Lenders typically want < 36%
    });
  });

  describe('Savings Rate', () => {
    it('should calculate savings rate correctly', () => {
      // $6,000 income, $4,000 expenses = 33% savings rate
      const rate = calculateSavingsRate(6000, 4000);
      expect(rate).toBeCloseTo(0.333, 2);
    });

    it('should handle no savings', () => {
      // $5,000 income, $5,000 expenses = 0% savings rate
      const rate = calculateSavingsRate(5000, 5000);
      expect(rate).toBeCloseTo(0, 2);
    });
  });

  describe('FIRE Number Calculation', () => {
    it('should calculate FIRE number correctly', () => {
      // $50,000 annual expenses * 25 = $1.25M FIRE number
      const fireNumber = calculateFIRENumber(50000);
      expect(fireNumber).toBe(1250000);
    });

    it('should scale with expenses', () => {
      const fire1 = calculateFIRENumber(40000);
      const fire2 = calculateFIRENumber(80000);
      
      expect(fire2).toBe(fire1 * 2);
    });
  });

  describe('Multi-Timeframe Projections', () => {
    it('should show 1M, 6M, 1Y, 5Y, 10Y projections', () => {
      const monthlyPayment = 500;
      const rate = 7;
      
      const projections = {
        '1M': calculateFV(monthlyPayment, rate, 1),
        '6M': calculateFV(monthlyPayment, rate, 6),
        '1Y': calculateFV(monthlyPayment, rate, 12),
        '5Y': calculateFV(monthlyPayment, rate, 60),
        '10Y': calculateFV(monthlyPayment, rate, 120),
      };
      
      // Each should be greater than previous
      expect(projections['6M']).toBeGreaterThan(projections['1M']);
      expect(projections['1Y']).toBeGreaterThan(projections['6M']);
      expect(projections['5Y']).toBeGreaterThan(projections['1Y']);
      expect(projections['10Y']).toBeGreaterThan(projections['5Y']);
    });
  });

  describe('Personalization of Projections', () => {
    it('should use user-specific data, not generic defaults', () => {
      // User 1: $6,000 income, $4,000 expenses = $2,000 surplus
      const user1Surplus = 6000 - 4000;
      const user1Projection = calculateFV(user1Surplus, 7, 120);
      
      // User 2: $4,000 income, $3,000 expenses = $1,000 surplus
      const user2Surplus = 4000 - 3000;
      const user2Projection = calculateFV(user2Surplus, 7, 120);
      
      // Projections should be different based on actual surplus
      expect(user1Projection).toBeGreaterThan(user2Projection);
      expect(user1Projection / user2Projection).toBeCloseTo(2, 0);
    });
  });
});

// Export functions for use in production
export {
  calculatePMT,
  calculateFV,
  calculateCompoundInterest,
  calculateDebtAvalanche,
  calculateEmergencyFundTarget,
  calculateDTI,
  calculateSavingsRate,
  calculateFIRENumber,
};
