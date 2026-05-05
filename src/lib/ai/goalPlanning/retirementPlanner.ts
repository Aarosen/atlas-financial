/**
 * TASK 2.2: Early Retirement / FIRE Planning Module
 * Provides goal-specific planning for retirement and FIRE scenarios
 */

import type { FinancialState } from '@/lib/state/types';

export interface RetirementPlan {
  currentAge: number;
  retirementAge: number;
  yearsToRetirement: number;
  currentRetirementSavings: number;
  annualExpenses: number;
  fireNumber: number; // 25x annual expenses (4% rule)
  projectedSavingsAtRetirement: number;
  savingsGap: number;
  monthlyContributionNeeded: number;
  annualReturnRate: number;
  isOnTrack: boolean;
  readinessPercent: number;
  readinessReason: string;
}

/**
 * Calculate retirement readiness using 4% rule (FIRE methodology)
 * FIRE number = 25 × annual expenses (allows 4% annual withdrawal)
 * Assumes 7% annual investment return
 */
export function calculateRetirementPlan(
  currentAge: number,
  retirementAge: number,
  currentRetirementSavings: number,
  monthlyExpenses: number,
  monthlyContribution: number = 0,
  annualReturnRate: number = 0.07
): RetirementPlan {
  const yearsToRetirement = Math.max(0, retirementAge - currentAge);
  const annualExpenses = monthlyExpenses * 12;
  
  // FIRE number: 25x annual expenses (4% rule)
  const fireNumber = Math.round(annualExpenses * 25);
  
  // Project savings at retirement with monthly contributions
  // FV = PV(1+r)^n + PMT × [((1+r)^n - 1) / r]
  const monthlyRate = Math.pow(1 + annualReturnRate, 1/12) - 1;
  const numberOfMonths = yearsToRetirement * 12;
  
  const projectedSavings = 
    currentRetirementSavings * Math.pow(1 + monthlyRate, numberOfMonths) +
    monthlyContribution * 
    (Math.pow(1 + monthlyRate, numberOfMonths) - 1) / monthlyRate;
  
  const projectedSavingsAtRetirement = Math.round(projectedSavings);
  const savingsGap = Math.max(0, fireNumber - projectedSavingsAtRetirement);
  
  // Calculate monthly contribution needed to reach FIRE number
  const monthlyNeeded = savingsGap > 0
    ? Math.ceil(
        savingsGap / 
        (Math.pow(1 + monthlyRate, numberOfMonths) - 1) * monthlyRate
      )
    : 0;
  
  const readinessPercent = Math.min(100, Math.round((projectedSavingsAtRetirement / fireNumber) * 100));
  const isOnTrack = projectedSavingsAtRetirement >= fireNumber;
  
  const readinessReason = isOnTrack
    ? `You're on track! Projected savings of $${projectedSavingsAtRetirement.toLocaleString()} exceeds your FIRE number of $${fireNumber.toLocaleString()}.`
    : `You need $${savingsGap.toLocaleString()} more. Increase contributions by $${monthlyNeeded.toLocaleString()}/month to reach your FIRE number.`;
  
  return {
    currentAge,
    retirementAge,
    yearsToRetirement,
    currentRetirementSavings,
    annualExpenses,
    fireNumber,
    projectedSavingsAtRetirement,
    savingsGap,
    monthlyContributionNeeded: monthlyNeeded,
    annualReturnRate,
    isOnTrack,
    readinessPercent,
    readinessReason,
  };
}

/**
 * Build system prompt context for retirement planning
 */
export function buildRetirementContext(plan: RetirementPlan): string {
  return `RETIREMENT PLAN:
Current age: ${plan.currentAge}
Target retirement age: ${plan.retirementAge}
Years to retirement: ${plan.yearsToRetirement}
Current retirement savings: $${plan.currentRetirementSavings.toLocaleString()}
Annual expenses: $${plan.annualExpenses.toLocaleString()}
FIRE number (25x expenses): $${plan.fireNumber.toLocaleString()}
Projected savings at retirement: $${plan.projectedSavingsAtRetirement.toLocaleString()}
Savings gap: $${plan.savingsGap.toLocaleString()}
Monthly contribution needed: $${plan.monthlyContributionNeeded.toLocaleString()}
Readiness: ${plan.readinessPercent}%
Status: ${plan.readinessReason}`;
}

/**
 * Detect if user is discussing retirement or FIRE
 */
export function isRetirementContext(text: string): boolean {
  const patterns = [
    /\b(retire|retirement|fire|financial independence)\b/i,
    /\b(retire|early retirement).{0,30}(age|years?|when)\b/i,
    /\b(how long).{0,30}(retire|work|save)\b/i,
    /\b(retire).{0,30}(at|by|when).{0,20}(\d+|early)\b/i,
  ];
  
  return patterns.some(p => p.test(text));
}
