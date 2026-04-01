/**
 * DETERMINISTIC FINANCIAL CALCULATIONS
 *
 * Pre-calculates exact financial metrics before Claude generates responses.
 * This ensures numbers are mathematically precise, not LLM-approximated.
 */

import type { FinancialProfile } from './conversationOrchestrator';
import { compareDebtStrategies, formatDebtPayoffBlock, type Debt, type DebtPayoffComparison } from './debtPayoffCalculations';

const EMERGENCY_FUND_TARGET_MONTHS = 6; // REM-O: Standardized to 6 months (industry standard)

/**
 * REM-N: Compound future value of lump sum + recurring contributions
 * @param pv - Present value (existing savings)
 * @param pmt - Monthly contribution amount
 * @param annualRate - Annual growth rate as decimal (e.g., 0.07 for 7%)
 * @param years - Number of years
 * @returns Future value
 */
function compoundFutureValue(pv: number, pmt: number, annualRate: number, years: number): number {
  if (annualRate === 0) return pv + pmt * 12 * years;
  const r = annualRate / 12; // monthly rate
  const n = years * 12;     // total months
  const fvLump = pv * Math.pow(1 + r, n);
  const fvContributions = pmt * ((Math.pow(1 + r, n) - 1) / r);
  return fvLump + fvContributions;
}

export interface AffordabilityCalculation {
  discretionary: number;
  remaining: number;
  ratio: number;
  assessment: 'comfortable' | 'manageable' | 'tight';
  recommendation: string;
}

export interface EmergencyFundCalculation {
  target: number;
  gap: number;
  currentCoverage: number;
  targetMonths: number;
  monthlyContribution: number;
  monthsToReach: number | null;
  alreadyFunded: boolean;
  cannotAffordContributions: boolean;
}

export interface InvestmentCalculation {
  monthlyDiscretionary: number;
  emergencyFundTarget: number;
  emergencyFundGap: number;
  recommendedMonthlyInvestment: number;
  timelineMonths: number;
  allocationStrategy: string;
}

export interface RetirementCalculation {
  fireNumber: number;
  currentNetWorth: number;
  gap: number;
  recommendedMonthlyContribution: number;
  yearsToRetirement: number;
  targetRetirementYear: number;
  onTrackStatus: string;
}

export interface BudgetCalculation {
  monthlyIncome: number;
  essentialExpenses: number;
  discretionaryExpenses: number;
  essentialRatio: number;
  discretionaryRatio: number;
  savingsRatio: number;
  gap50Rule: number;
  gap30Rule: number;
  gap20Rule: number;
  reallocateAmount: number;
  priority: string;
}

export interface FinancialCalculationsResult {
  affordability?: AffordabilityCalculation;
  emergencyFund?: EmergencyFundCalculation;
  debtPayoff?: DebtPayoffComparison;
  investment?: InvestmentCalculation;
  retirement?: RetirementCalculation;
  budget?: BudgetCalculation;
}

/**
 * Calculate affordability metrics for a proposed payment
 */
function calculateAffordability(
  monthlyIncome: number | undefined,
  essentialExpenses: number | undefined,
  proposedPayment: number | undefined
): AffordabilityCalculation | undefined {
  if (
    monthlyIncome === undefined ||
    monthlyIncome <= 0 ||
    essentialExpenses === undefined ||
    essentialExpenses <= 0 ||
    proposedPayment === undefined ||
    proposedPayment <= 0
  ) {
    return undefined;
  }

  const discretionary = monthlyIncome - essentialExpenses;
  if (discretionary <= 0) return undefined;

  const ratio = proposedPayment / discretionary;
  const remaining = discretionary - proposedPayment;

  let assessment: 'comfortable' | 'manageable' | 'tight';
  if (ratio < 0.15) {
    assessment = 'comfortable';
  } else if (ratio < 0.25) {
    assessment = 'manageable';
  } else {
    assessment = 'tight';
  }

  const recommendation =
    assessment === 'tight'
      ? `Tight but possible — leaves $${Math.round(remaining)}/month for savings and emergencies.`
      : `Comfortable. Leaves $${Math.round(remaining)}/month for savings and other goals.`;

  return {
    discretionary: Math.round(discretionary),
    remaining: Math.round(remaining),
    ratio: Math.round(ratio * 10000) / 10000, // 4 decimal places
    assessment,
    recommendation,
  };
}

/**
 * Calculate emergency fund metrics
 */
function calculateEmergencyFund(
  essentialExpenses: number | undefined,
  totalSavings: number | undefined,
  monthlyIncome: number | undefined
): EmergencyFundCalculation | undefined {
  if (
    essentialExpenses === undefined ||
    essentialExpenses <= 0 ||
    totalSavings === undefined ||
    monthlyIncome === undefined ||
    monthlyIncome <= 0
  ) {
    return undefined;
  }

  const target = essentialExpenses * EMERGENCY_FUND_TARGET_MONTHS;
  const gap = Math.max(0, target - totalSavings);
  const currentCoverage = Math.round((totalSavings / essentialExpenses) * 10) / 10; // 1 decimal place

  // Check if already funded
  if (gap <= 0) {
    return {
      target: Math.round(target),
      gap: 0,
      currentCoverage,
      targetMonths: EMERGENCY_FUND_TARGET_MONTHS,
      monthlyContribution: 0,
      monthsToReach: 0,
      alreadyFunded: true,
      cannotAffordContributions: false,
    };
  }

  // Calculate monthly contribution (20% of discretionary)
  const discretionary = monthlyIncome - essentialExpenses;
  if (discretionary <= 0) {
    return {
      target: Math.round(target),
      gap: Math.round(gap),
      currentCoverage,
      targetMonths: EMERGENCY_FUND_TARGET_MONTHS,
      monthlyContribution: 0,
      monthsToReach: null,
      alreadyFunded: false,
      cannotAffordContributions: true,
    };
  }

  const monthlyContribution = discretionary * 0.2;
  if (monthlyContribution <= 0) {
    return {
      target: Math.round(target),
      gap: Math.round(gap),
      currentCoverage,
      targetMonths: EMERGENCY_FUND_TARGET_MONTHS,
      monthlyContribution: 0,
      monthsToReach: null,
      alreadyFunded: false,
      cannotAffordContributions: true,
    };
  }

  const monthsToReach = Math.ceil(gap / monthlyContribution);

  return {
    target: Math.round(target),
    gap: Math.round(gap),
    currentCoverage,
    targetMonths: EMERGENCY_FUND_TARGET_MONTHS,
    monthlyContribution: Math.round(monthlyContribution),
    monthsToReach,
    alreadyFunded: false,
    cannotAffordContributions: false,
  };
}

/**
 * Calculate budget metrics using 50/30/20 rule
 */
function calculateBudget(
  monthlyIncome: number | undefined,
  essentialExpenses: number | undefined,
  discretionaryExpenses: number | undefined
): BudgetCalculation | undefined {
  if (!monthlyIncome || monthlyIncome <= 0 || !essentialExpenses) {
    return undefined;
  }

  const discretionary = discretionaryExpenses ?? 0;
  const savings = Math.max(0, monthlyIncome - essentialExpenses - discretionary);

  const essentialRatio = essentialExpenses / monthlyIncome;
  const discretionaryRatio = discretionary / monthlyIncome;
  const savingsRatio = savings / monthlyIncome;

  // 50/30/20 targets
  const target50 = monthlyIncome * 0.5;
  const target30 = monthlyIncome * 0.3;
  const target20 = monthlyIncome * 0.2;

  // Gaps from targets (positive = over target)
  const gap50Rule = essentialExpenses - target50;
  const gap30Rule = discretionary - target30;
  const gap20Rule = -savings + target20; // Negative savings means we're under target

  // Determine priority reallocation
  let reallocateAmount = 0;
  let priority = '';

  if (gap20Rule > 0) {
    // Not saving enough
    reallocateAmount = Math.min(gap20Rule, discretionary * 0.2); // Reallocate up to 20% of discretionary
    priority = `Increase savings by $${Math.round(reallocateAmount)}/month (currently ${(savingsRatio * 100).toFixed(0)}%, target 20%)`;
  } else if (gap30Rule > 0) {
    // Spending too much on discretionary
    reallocateAmount = Math.min(gap30Rule, discretionary * 0.3); // Reallocate up to 30% of discretionary
    priority = `Reduce discretionary spending by $${Math.round(reallocateAmount)}/month (currently ${(discretionaryRatio * 100).toFixed(0)}%, target 30%)`;
  } else if (gap50Rule > 0) {
    // Essentials are too high
    reallocateAmount = Math.min(gap50Rule, essentialExpenses * 0.1); // Reallocate up to 10% of essentials
    priority = `Reduce essential expenses by $${Math.round(reallocateAmount)}/month (currently ${(essentialRatio * 100).toFixed(0)}%, target 50%)`;
  } else {
    priority = 'Budget is well-balanced against 50/30/20 targets';
  }

  return {
    monthlyIncome: Math.round(monthlyIncome),
    essentialExpenses: Math.round(essentialExpenses),
    discretionaryExpenses: Math.round(discretionary),
    essentialRatio,
    discretionaryRatio,
    savingsRatio,
    gap50Rule: Math.round(gap50Rule),
    gap30Rule: Math.round(gap30Rule),
    gap20Rule: Math.round(gap20Rule),
    reallocateAmount: Math.round(reallocateAmount),
    priority,
  };
}

/**
 * Main entry point: calculate all relevant metrics based on goal and profile
 */
export function calculateFinancials(
  profile: FinancialProfile,
  goal: string,
  proposedPayment?: number
): FinancialCalculationsResult {
  const result: FinancialCalculationsResult = {};

  // Affordability check
  if (goal === 'affordability_check' && proposedPayment) {
    result.affordability = calculateAffordability(
      profile.monthlyIncome,
      profile.essentialExpenses,
      proposedPayment
    );
  }

  // Emergency fund
  if (goal === 'emergency_fund') {
    result.emergencyFund = calculateEmergencyFund(
      profile.essentialExpenses,
      profile.totalSavings,
      profile.monthlyIncome
    );
  }

  // Budget build
  if (goal === 'budget_build') {
    result.budget = calculateBudget(
      profile.monthlyIncome,
      profile.essentialExpenses,
      profile.discretionaryExpenses
    );
  }

  // Debt payoff
  if (goal === 'debt_payoff') {
    const debts = buildDebtsArray(profile);
    if (debts.length > 0 && profile.monthlyIncome && profile.essentialExpenses) {
      const discretionary = profile.monthlyIncome - profile.essentialExpenses;
      if (discretionary > 0) {
        result.debtPayoff = compareDebtStrategies(debts, discretionary);
      }
    }
  }

  // SAD-5: Investment start - calculate allocation and monthly contribution
  if (goal === 'investment_start') {
    if (profile.monthlyIncome && profile.essentialExpenses && profile.totalSavings !== undefined) {
      const discretionary = profile.monthlyIncome - profile.essentialExpenses;
      const emergencyFundTarget = profile.essentialExpenses * EMERGENCY_FUND_TARGET_MONTHS; // REM-O: Use standardized constant
      const emergencyFundGap = Math.max(0, emergencyFundTarget - (profile.totalSavings || 0));
      
      result.investment = {
        monthlyDiscretionary: discretionary,
        emergencyFundTarget,
        emergencyFundGap,
        recommendedMonthlyInvestment: Math.max(0, discretionary * 0.15), // 15% of discretionary
        timelineMonths: emergencyFundGap > 0 ? Math.ceil(emergencyFundGap / (discretionary * 0.5)) : 0,
        allocationStrategy: profile.riskTolerance === 'cautious' ? '60/40 stocks/bonds' : profile.riskTolerance === 'growth' ? '90/10 stocks/bonds' : '70/30 stocks/bonds',
      };
    }
  }

  // SAD-5: Retirement planning - calculate FIRE number and years to retirement
  if (goal === 'retirement_planning') {
    if (profile.monthlyIncome && profile.essentialExpenses && profile.totalSavings !== undefined && profile.timeHorizonYears) {
      const discretionary = profile.monthlyIncome - profile.essentialExpenses;
      const annualExpenses = profile.essentialExpenses * 12;
      const fireNumber = annualExpenses * 25; // 4% rule
      const currentNetWorth = (profile.totalSavings || 0) - ((profile.highInterestDebt || 0) + (profile.lowInterestDebt || 0));
      const gap = Math.max(0, fireNumber - currentNetWorth);
      const recommendedMonthly = discretionary * 0.20; // 20% of discretionary
      
      // REM-N: Use compound future value instead of linear math
      const ASSUMED_ANNUAL_RETURN = 0.07; // 7% nominal growth — standard conservative planning assumption
      const horizonYearsResolved = profile.timeHorizonYears || 25;
      const projectedFV = compoundFutureValue(
        currentNetWorth,
        recommendedMonthly,
        ASSUMED_ANNUAL_RETURN,
        horizonYearsResolved
      );
      const onTrack = projectedFV >= fireNumber;
      
      // Compute actual years-to-FIRE by iterating compound growth
      let yearsToFire = 999;
      if (recommendedMonthly > 0 || currentNetWorth > 0) {
        for (let y = 1; y <= 50; y++) {
          if (compoundFutureValue(currentNetWorth, recommendedMonthly, ASSUMED_ANNUAL_RETURN, y) >= fireNumber) {
            yearsToFire = y;
            break;
          }
        }
      }
      
      result.retirement = {
        fireNumber,
        currentNetWorth,
        gap,
        recommendedMonthlyContribution: recommendedMonthly,
        yearsToRetirement: Math.min(yearsToFire, horizonYearsResolved),
        targetRetirementYear: new Date().getFullYear() + Math.min(yearsToFire, horizonYearsResolved),
        onTrackStatus: onTrack ? 'on track' : 'needs acceleration',
      };
    }
  }

  return result;
}

/**
 * Build debts array from financial profile
 */
function buildDebtsArray(profile: FinancialProfile): Debt[] {
  const debts: Debt[] = [];

  const highInterestDebt = profile.highInterestDebt ?? 0;
  if (highInterestDebt > 0) {
    debts.push({
      name: 'High-interest debt',
      balance: highInterestDebt,
      interestRate: profile.highInterestRate ?? 18.5, // Use actual rate if provided, default to 18.5% for credit cards
      minimumPayment: (highInterestDebt * 0.02) || 25, // 2% minimum
    });
  }

  const lowInterestDebt = profile.lowInterestDebt ?? 0;
  if (lowInterestDebt > 0) {
    debts.push({
      name: 'Low-interest debt',
      balance: lowInterestDebt,
      interestRate: profile.lowInterestRate ?? 5.5, // Use actual rate if provided, default to 5.5% for personal loans
      minimumPayment: (lowInterestDebt * 0.01) || 25, // 1% minimum
    });
  }

  return debts;
}

/**
 * Format budget calculation as a system prompt block
 */
export function formatBudgetBlock(calc: BudgetCalculation): string {
  return `
CALCULATION RESULTS (use these exact numbers):
- Monthly income: $${calc.monthlyIncome}
- Essential expenses: $${calc.essentialExpenses} (${(calc.essentialRatio * 100).toFixed(0)}% of income, target 50%)
- Discretionary spending: $${calc.discretionaryExpenses} (${(calc.discretionaryRatio * 100).toFixed(0)}% of income, target 30%)
- Monthly savings: $${Math.round(calc.monthlyIncome - calc.essentialExpenses - calc.discretionaryExpenses)} (${(calc.savingsRatio * 100).toFixed(0)}% of income, target 20%)
- Priority action: ${calc.priority}`;
}

/**
 * Format affordability calculation as a system prompt block
 */
export function formatAffordabilityBlock(calc: AffordabilityCalculation): string {
  return `
CALCULATION RESULTS (use these exact numbers):
- Discretionary income: $${calc.discretionary}
- Proposed payment: $${Math.round(calc.discretionary * calc.ratio)}
- Payment-to-discretionary ratio: ${(calc.ratio * 100).toFixed(1)}%
- Assessment: ${calc.assessment.toUpperCase()}
- Recommendation: ${calc.recommendation}`;
}

/**
 * Format emergency fund calculation as a system prompt block
 */
export function formatEmergencyFundBlock(calc: EmergencyFundCalculation): string {
  let block = `
CALCULATION RESULTS (use these exact numbers):
- Target emergency fund: $${calc.target} (${calc.targetMonths} months of expenses)
- Current savings: $${calc.target - calc.gap}
- Current coverage: ${calc.currentCoverage} months of expenses
- Gap to target: $${calc.gap}`;

  if (calc.alreadyFunded) {
    block += `\n- Status: FULLY FUNDED ✓`;
  } else if (calc.cannotAffordContributions) {
    block += `\n- Status: Cannot currently contribute (no discretionary income)`;
  } else {
    block += `\n- Monthly contribution (20% of discretionary): $${calc.monthlyContribution}`;
    block += `\n- Months to reach target: ${calc.monthsToReach}`;
  }

  return block;
}

/**
 * Format investment calculation as a system prompt block
 */
export function formatInvestmentBlock(calc: InvestmentCalculation): string {
  return `
CALCULATION RESULTS (use these exact numbers):
- Monthly discretionary income: $${Math.round(calc.monthlyDiscretionary)}
- Emergency fund target: $${Math.round(calc.emergencyFundTarget)}
- Emergency fund gap: $${Math.round(calc.emergencyFundGap)}
- Recommended monthly investment: $${Math.round(calc.recommendedMonthlyInvestment)} (15% of discretionary)
- Timeline to start investing: ${calc.timelineMonths} months (after emergency fund)
- Recommended allocation: ${calc.allocationStrategy}`;
}

/**
 * Format retirement calculation as a system prompt block
 */
export function formatRetirementBlock(calc: RetirementCalculation): string {
  return `
CALCULATION RESULTS (use these exact numbers):
- FIRE number (25x annual expenses): $${Math.round(calc.fireNumber)}
- Current net worth: $${Math.round(calc.currentNetWorth)}
- Gap to FIRE: $${Math.round(calc.gap)}
- Recommended monthly contribution: $${Math.round(calc.recommendedMonthlyContribution)} (20% of discretionary)
- Years to retirement: ${calc.yearsToRetirement}
- Target retirement year: ${calc.targetRetirementYear}
- Status: ${calc.onTrackStatus.toUpperCase()}`;
}
