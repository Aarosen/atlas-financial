/**
 * TASK 2.1: Home Purchase Planning Module
 * Provides goal-specific planning for home purchase scenarios
 * Uses REAL market data from Zillow API — never hardcodes prices
 */

import type { FinancialState } from '@/lib/state/types';
import { getMarketData, projectHomePrice, assessAffordability } from '@/lib/services/realEstateMarketService';

export interface HomePurchasePlan {
  homePrice: number;
  downPaymentPercent: number;
  downPaymentAmount: number;
  loanAmount: number;
  interestRate: number;
  loanTermYears: number;
  monthlyPayment: number;
  closingCosts: number;
  totalCashNeeded: number;
  currentSavings: number;
  savingsGap: number;
  monthsToSave: number;
  monthlyContributionNeeded: number;
  isAffordable: boolean;
  affordabilityReason: string;
}

/**
 * Calculate home purchase affordability and timeline
 * Uses standard mortgage assumptions:
 * - 20% down payment (or less if user specifies)
 * - 30-year mortgage
 * - Current market interest rates (user-provided or estimated)
 * - Closing costs ~2-5% of home price
 */
export function calculateHomePurchasePlan(
  homePrice: number,
  currentSavings: number,
  monthlyIncome: number,
  monthlyExpenses: number,
  downPaymentPercent: number = 20,
  interestRate: number = 7.0,
  closingCostPercent: number = 3
): HomePurchasePlan {
  // Calculate down payment and loan amount
  const downPaymentAmount = Math.round(homePrice * (downPaymentPercent / 100));
  const loanAmount = homePrice - downPaymentAmount;
  
  // Calculate closing costs
  const closingCosts = Math.round(homePrice * (closingCostPercent / 100));
  
  // Total cash needed (down payment + closing costs)
  const totalCashNeeded = downPaymentAmount + closingCosts;
  
  // Calculate monthly mortgage payment using standard formula
  // M = P * [r(1+r)^n] / [(1+r)^n - 1]
  // where P = loan amount, r = monthly rate, n = number of payments
  const loanTermYears = 30;
  const monthlyRate = interestRate / 100 / 12;
  const numberOfPayments = loanTermYears * 12;
  const monthlyPayment = Math.round(
    loanAmount * 
    (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1)
  );
  
  // Calculate savings gap and timeline
  const savingsGap = Math.max(0, totalCashNeeded - currentSavings);
  const monthlySurplus = monthlyIncome - monthlyExpenses;
  const monthsToSave = monthlySurplus > 0 ? Math.ceil(savingsGap / monthlySurplus) : 999;
  const monthlyContributionNeeded = savingsGap > 0 ? Math.ceil(savingsGap / 36) : 0; // 3-year timeline
  
  // Affordability check: monthly payment should not exceed 28% of gross income
  const maxAffordablePayment = Math.round(monthlyIncome * 0.28);
  const isAffordable = monthlyPayment <= maxAffordablePayment;
  
  const affordabilityReason = isAffordable
    ? `Monthly payment of $${monthlyPayment.toLocaleString()} is ${Math.round((monthlyPayment / monthlyIncome) * 100)}% of your income (safe threshold is 28%).`
    : `Monthly payment of $${monthlyPayment.toLocaleString()} exceeds 28% of your income ($${maxAffordablePayment.toLocaleString()}). Consider a lower price or larger down payment.`;
  
  return {
    homePrice,
    downPaymentPercent,
    downPaymentAmount,
    loanAmount,
    interestRate,
    loanTermYears,
    monthlyPayment,
    closingCosts,
    totalCashNeeded,
    currentSavings,
    savingsGap,
    monthsToSave,
    monthlyContributionNeeded,
    isAffordable,
    affordabilityReason,
  };
}

/**
 * Calculate home purchase plan using REAL market data
 * Fetches current prices from Zillow and projects appreciation
 */
export async function calculateHomePurchasePlanWithMarketData(
  city: string,
  state: string,
  yearsToSave: number,
  monthlyIncome: number,
  currentSavings: number,
  monthlyExpenses: number
): Promise<{
  plan: HomePurchasePlan;
  marketData: any;
  affordability: any;
  isRealistic: boolean;
  message: string;
}> {
  try {
    // Fetch real market data
    const marketData = await getMarketData(city, state);
    
    // Project price based on real appreciation rate
    const projection = projectHomePrice(
      marketData.medianHomePrice,
      yearsToSave,
      marketData.yearOverYearChange
    );

    // Assess affordability
    const affordability = assessAffordability(
      projection.projectedPrice,
      monthlyIncome,
      currentSavings,
      yearsToSave
    );

    // Build the plan
    const downPaymentPercent = 20;
    const downPaymentAmount = Math.round(projection.projectedPrice * (downPaymentPercent / 100));
    const loanAmount = projection.projectedPrice - downPaymentAmount;
    const closingCosts = Math.round(projection.projectedPrice * 0.03);
    const totalCashNeeded = downPaymentAmount + closingCosts;

    const loanTermYears = 30;
    const interestRate = 7.0;
    const monthlyRate = interestRate / 100 / 12;
    const numberOfPayments = loanTermYears * 12;
    const monthlyPayment = Math.round(
      loanAmount *
      (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1)
    );

    const savingsGap = Math.max(0, totalCashNeeded - currentSavings);
    const monthlySurplus = monthlyIncome - monthlyExpenses;
    const monthsToSave = monthlySurplus > 0 ? Math.ceil(savingsGap / monthlySurplus) : 999;
    const monthlyContributionNeeded = savingsGap > 0 ? Math.ceil(savingsGap / (yearsToSave * 12)) : 0;

    const plan: HomePurchasePlan = {
      homePrice: projection.projectedPrice,
      downPaymentPercent,
      downPaymentAmount,
      loanAmount,
      interestRate,
      loanTermYears,
      monthlyPayment,
      closingCosts,
      totalCashNeeded,
      currentSavings,
      savingsGap,
      monthsToSave,
      monthlyContributionNeeded,
      isAffordable: affordability.isAffordable,
      affordabilityReason: affordability.reason,
    };

    return {
      plan,
      marketData,
      affordability,
      isRealistic: affordability.isAffordable,
      message: affordability.reason,
    };
  } catch (error) {
    throw new Error(`Failed to calculate home purchase plan: ${error}`);
  }
}

/**
 * Build system prompt context for home purchase planning
 */
export function buildHomePurchaseContext(plan: HomePurchasePlan): string {
  const timeline = plan.monthsToSave < 999 
    ? `${Math.floor(plan.monthsToSave / 12)} years and ${plan.monthsToSave % 12} months`
    : 'indefinite (insufficient surplus)';
  
  return `HOME PURCHASE PLAN:
Home price: $${plan.homePrice.toLocaleString()}
Down payment: ${plan.downPaymentPercent}% ($${plan.downPaymentAmount.toLocaleString()})
Loan amount: $${plan.loanAmount.toLocaleString()}
Interest rate: ${plan.interestRate}%
Monthly payment: $${plan.monthlyPayment.toLocaleString()}
Closing costs: $${plan.closingCosts.toLocaleString()}
Total cash needed: $${plan.totalCashNeeded.toLocaleString()}
Current savings: $${plan.currentSavings.toLocaleString()}
Savings gap: $${plan.savingsGap.toLocaleString()}
Timeline to save: ${timeline}
Monthly contribution needed: $${plan.monthlyContributionNeeded.toLocaleString()}
Affordability: ${plan.affordabilityReason}`;
}

/**
 * Detect if user is discussing home purchase
 */
export function isHomePurchaseContext(text: string): boolean {
  const patterns = [
    /\b(home|house|property|real estate|mortgage|down payment)\b/i,
    /\b(buy|purchase|acquire).{0,30}(home|house|property)\b/i,
    /\b(saving|save).{0,30}(home|house|down payment)\b/i,
  ];
  
  return patterns.some(p => p.test(text));
}
