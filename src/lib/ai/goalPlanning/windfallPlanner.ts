/**
 * TASK 2.3: Windfall Handling Module
 * Provides goal-specific planning for windfall allocation scenarios
 */

import type { FinancialState } from '@/lib/state/types';

export interface WindfallAllocation {
  windfallAmount: number;
  allocations: {
    highInterestDebt: number;
    emergencyFund: number;
    retirementSavings: number;
    investments: number;
    otherGoals: number;
  };
  rationale: string;
  timeline: string;
}

/**
 * Allocate windfall using prioritized waterfall approach
 * Priority order:
 * 1. High-interest debt (eliminate immediately)
 * 2. Emergency fund (3-6 months expenses)
 * 3. Retirement savings (tax-advantaged accounts)
 * 4. Investments (taxable brokerage)
 * 5. Other goals (discretionary)
 */
export function allocateWindfall(
  windfallAmount: number,
  highInterestDebt: number,
  essentialExpenses: number,
  currentSavings: number,
  currentRetirementSavings: number,
  monthlyIncome: number
): WindfallAllocation {
  let remaining = windfallAmount;
  const allocations = {
    highInterestDebt: 0,
    emergencyFund: 0,
    retirementSavings: 0,
    investments: 0,
    otherGoals: 0,
  };
  
  // PRIORITY 1: High-interest debt (eliminate completely if possible)
  const debtToEliminate = Math.min(remaining, highInterestDebt);
  allocations.highInterestDebt = debtToEliminate;
  remaining -= debtToEliminate;
  
  // PRIORITY 2: Emergency fund (target 6 months expenses)
  const emergencyTarget = essentialExpenses * 6;
  const emergencyGap = Math.max(0, emergencyTarget - currentSavings);
  const emergencyAllocation = Math.min(remaining, emergencyGap);
  allocations.emergencyFund = emergencyAllocation;
  remaining -= emergencyAllocation;
  
  // PRIORITY 3: Retirement savings (tax-advantaged)
  // Allocate up to annual contribution limit (~$23,500 for 401k)
  const retirementAllocation = Math.min(remaining, 23500);
  allocations.retirementSavings = retirementAllocation;
  remaining -= retirementAllocation;
  
  // PRIORITY 4: Investments (taxable brokerage)
  const investmentAllocation = Math.min(remaining, Math.round(remaining * 0.7));
  allocations.investments = investmentAllocation;
  remaining -= investmentAllocation;
  
  // PRIORITY 5: Other goals (discretionary)
  allocations.otherGoals = remaining;
  
  // Build rationale
  const rationale = buildWindfallRationale(allocations, highInterestDebt, emergencyTarget, currentSavings);
  
  // Build timeline
  const timeline = buildWindfallTimeline(allocations);
  
  return {
    windfallAmount,
    allocations,
    rationale,
    timeline,
  };
}

function buildWindfallRationale(
  allocations: WindfallAllocation['allocations'],
  highInterestDebt: number,
  emergencyTarget: number,
  currentSavings: number
): string {
  const parts: string[] = [];
  
  if (allocations.highInterestDebt > 0) {
    const remaining = highInterestDebt - allocations.highInterestDebt;
    if (remaining > 0) {
      parts.push(`Eliminate $${allocations.highInterestDebt.toLocaleString()} of high-interest debt (${remaining > 0 ? `$${remaining.toLocaleString()} remaining` : 'all paid off'})`);
    } else {
      parts.push(`Eliminate all $${allocations.highInterestDebt.toLocaleString()} of high-interest debt`);
    }
  }
  
  if (allocations.emergencyFund > 0) {
    const newTotal = currentSavings + allocations.emergencyFund;
    parts.push(`Build emergency fund to $${newTotal.toLocaleString()} (6 months expenses)`);
  }
  
  if (allocations.retirementSavings > 0) {
    parts.push(`Contribute $${allocations.retirementSavings.toLocaleString()} to retirement (tax-advantaged)`);
  }
  
  if (allocations.investments > 0) {
    parts.push(`Invest $${allocations.investments.toLocaleString()} in brokerage account`);
  }
  
  if (allocations.otherGoals > 0) {
    parts.push(`Allocate $${allocations.otherGoals.toLocaleString()} to other goals or discretionary spending`);
  }
  
  return parts.join('. ');
}

function buildWindfallTimeline(allocations: WindfallAllocation['allocations']): string {
  const steps: string[] = [];
  
  if (allocations.highInterestDebt > 0) {
    steps.push(`Week 1: Pay $${allocations.highInterestDebt.toLocaleString()} toward high-interest debt`);
  }
  
  if (allocations.emergencyFund > 0) {
    steps.push(`Week 2: Transfer $${allocations.emergencyFund.toLocaleString()} to savings account`);
  }
  
  if (allocations.retirementSavings > 0) {
    steps.push(`Week 3: Contribute $${allocations.retirementSavings.toLocaleString()} to 401k or IRA`);
  }
  
  if (allocations.investments > 0) {
    steps.push(`Week 4: Invest $${allocations.investments.toLocaleString()} in brokerage account`);
  }
  
  if (allocations.otherGoals > 0) {
    steps.push(`Ongoing: Use $${allocations.otherGoals.toLocaleString()} for goals or discretionary spending`);
  }
  
  return steps.join('. ');
}

/**
 * Build system prompt context for windfall planning
 */
export function buildWindfallContext(allocation: WindfallAllocation): string {
  return `WINDFALL ALLOCATION PLAN:
Windfall amount: $${allocation.windfallAmount.toLocaleString()}
High-interest debt payoff: $${allocation.allocations.highInterestDebt.toLocaleString()}
Emergency fund boost: $${allocation.allocations.emergencyFund.toLocaleString()}
Retirement contribution: $${allocation.allocations.retirementSavings.toLocaleString()}
Investment allocation: $${allocation.allocations.investments.toLocaleString()}
Other goals: $${allocation.allocations.otherGoals.toLocaleString()}
Rationale: ${allocation.rationale}
Timeline: ${allocation.timeline}`;
}

/**
 * Detect if user is discussing windfall
 */
export function isWindfallContext(text: string): boolean {
  const patterns = [
    /\b(windfall|bonus|inheritance|tax refund|settlement|lottery)\b/i,
    /\b(came into|received|got).{0,30}(money|cash|windfall)\b/i,
    /\b(allocate|spend|use).{0,30}(windfall|bonus|inheritance)\b/i,
  ];
  
  return patterns.some(p => p.test(text));
}
