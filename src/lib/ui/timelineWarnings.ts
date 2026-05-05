/**
 * Timeline Realism Checker
 * Flags unrealistic timelines (>24 months) and suggests alternatives
 * Prevents users from feeling hopeless when facing multi-year goals
 */

export interface TimelineWarning {
  isUnrealistic: boolean;
  months: number;
  years: number;
  severity: 'realistic' | 'caution' | 'critical';
  warning: string;
  alternatives: string[];
}

const REALISTIC_TIMELINE_MONTHS = 24; // 2 years is realistic, >2 years needs alternatives
const CRITICAL_TIMELINE_MONTHS = 60; // 5+ years is critical

/**
 * Assess if a timeline is realistic and suggest alternatives
 */
export function assessTimeline(
  months: number,
  goalType: 'emergency_fund' | 'debt_payoff' | 'savings' | 'retirement',
  currentAmount: number,
  targetAmount: number,
  monthlyAllocation: number,
  monthlyIncome: number,
  essentialExpenses: number
): TimelineWarning {
  const years = Math.round(months / 12 * 10) / 10; // Round to 1 decimal
  
  let severity: 'realistic' | 'caution' | 'critical' = 'realistic';
  let warning = '';
  const alternatives: string[] = [];
  
  if (months > CRITICAL_TIMELINE_MONTHS) {
    severity = 'critical';
    warning = `This goal will take ${years} years at the current pace. That's a long time to stay focused on one goal.`;
    alternatives.push(
      `Increase monthly allocation: Even +$${Math.round(monthlyAllocation * 0.5)}/month cuts the timeline to ${Math.round((months * monthlyAllocation) / (monthlyAllocation * 1.5) / 12 * 10) / 10} years.`,
      `Find a one-time boost: A ${Math.round((targetAmount - currentAmount) * 0.2).toLocaleString()} windfall (bonus, tax refund, side income) cuts the timeline by 20%.`,
      `Adjust the target: A ${Math.round(targetAmount * 0.8).toLocaleString()} target (80% of goal) is achievable in ${Math.round((months * 0.8) / 12 * 10) / 10} years.`
    );
  } else if (months > REALISTIC_TIMELINE_MONTHS) {
    severity = 'caution';
    warning = `This goal will take ${years} years. That's longer than most people stay focused on a single goal.`;
    alternatives.push(
      `Increase monthly allocation: +$${Math.round(monthlyAllocation * 0.25)}/month cuts the timeline to ${Math.round((months * monthlyAllocation) / (monthlyAllocation * 1.25) / 12 * 10) / 10} years.`,
      `Combine with other goals: Can you merge this with another priority to stay motivated?`
    );
  }
  
  return {
    isUnrealistic: severity !== 'realistic',
    months,
    years,
    severity,
    warning,
    alternatives,
  };
}

/**
 * Build warning text for unrealistic timelines
 */
export function buildTimelineWarningText(warning: TimelineWarning): string {
  if (!warning.isUnrealistic) {
    return '';
  }
  
  const altText = warning.alternatives.length > 0
    ? `\n\nAlternatives to shorten the timeline:\n${warning.alternatives.map((alt, i) => `${i + 1}. ${alt}`).join('\n')}`
    : '';
  
  return `⚠️ ${warning.warning}${altText}`;
}

/**
 * Suggest income-based alternatives when timeline is unrealistic
 */
export function suggestIncomeAlternatives(
  monthlyIncome: number,
  essentialExpenses: number,
  currentSurplus: number,
  targetAmount: number,
  currentAmount: number
): string[] {
  const gap = targetAmount - currentAmount;
  const potentialIncomeIncrease = Math.round(monthlyIncome * 0.1); // 10% raise
  const freelanceIncome = Math.round(monthlyIncome * 0.15); // 15% side income
  
  const alternatives: string[] = [];
  
  if (potentialIncomeIncrease > 0) {
    const newMonths = Math.ceil(gap / (currentSurplus + potentialIncomeIncrease));
    alternatives.push(
      `A 10% raise (+$${potentialIncomeIncrease}/month) cuts the timeline from ${Math.ceil(gap / currentSurplus)} months to ${newMonths} months.`
    );
  }
  
  if (freelanceIncome > 0) {
    const newMonths = Math.ceil(gap / (currentSurplus + freelanceIncome));
    alternatives.push(
      `One freelance project per month (+$${freelanceIncome}/month) cuts the timeline to ${newMonths} months.`
    );
  }
  
  return alternatives;
}
