/**
 * TASK 4: Employer Match Detection & Priority
 * 
 * Detects employer 401k/retirement match and prioritizes it as ALWAYS #1
 * before debt payoff, even high-interest debt.
 * 
 * Employer match = 100% guaranteed return on day one
 * This beats any debt payoff strategy
 */

export interface EmployerMatchProfile {
  hasMatch: boolean;
  matchPercent: number;
  isContributing: boolean;
  monthlyMatchValue: number;
  monthlyIncome: number;
  recommendation: string;
  priority: 'critical' | 'high';
}

/**
 * Detect employer match from user message and profile
 */
export function detectEmployerMatch(
  userMessage: string,
  monthlyIncome: number | undefined,
  currentlyContributing: boolean | undefined,
  employerMatchPercent: number | undefined
): EmployerMatchProfile | null {
  // If we don't have match data, can't provide profile
  if (!employerMatchPercent || employerMatchPercent <= 0) {
    return null;
  }

  const income = monthlyIncome || 0;
  const monthlyMatchValue = Math.round(income * employerMatchPercent / 100);

  const isContributing = currentlyContributing === true;

  return {
    hasMatch: true,
    matchPercent: employerMatchPercent,
    isContributing,
    monthlyMatchValue,
    monthlyIncome: income,
    recommendation: buildMatchRecommendation(
      employerMatchPercent,
      monthlyMatchValue,
      isContributing
    ),
    priority: isContributing ? 'high' : 'critical',
  };
}

/**
 * Build recommendation for employer match
 */
function buildMatchRecommendation(
  matchPercent: number,
  monthlyValue: number,
  isContributing: boolean
): string {
  if (isContributing) {
    return `You're capturing your ${matchPercent}% employer match ($${monthlyValue}/month). Good — that's $${monthlyValue * 12}/year in free money. Keep this going.`;
  }

  return `You're leaving $${monthlyValue}/month in employer match on the table. That's $${monthlyValue * 12}/year in FREE MONEY. Before paying down any debt, start contributing enough to capture the full ${matchPercent}% match. It's a 100% guaranteed return on day one — nothing beats that.`;
}

/**
 * Compare employer match vs debt payoff
 * Shows why match always wins
 */
export function compareMatchVsDebt(
  matchPercent: number,
  monthlyMatchValue: number,
  highInterestDebtAPR: number | undefined,
  highInterestDebtBalance: number | undefined
): string {
  if (!highInterestDebtAPR || !highInterestDebtBalance || highInterestDebtBalance === 0) {
    return `Employer match at ${matchPercent}% is a guaranteed return. Capture it first.`;
  }

  const debtAPR = highInterestDebtAPR;
  const matchReturn = matchPercent * 2; // Assume 100% match = 2x return (100% + 100% growth)

  return `MATCH vs DEBT MATH:
• Employer match: ${matchPercent}% guaranteed return = $${monthlyMatchValue}/month FREE MONEY
• High-interest debt: ${debtAPR}% cost = $${Math.round(highInterestDebtBalance * debtAPR / 100 / 12)}/month in interest
• RULE: Capture the match FIRST (guaranteed 100% return), then attack the debt (${debtAPR}% cost)
• Why? The match is free money. The debt is a cost. Always take the free money first.`;
}

/**
 * Build system prompt context for employer match
 */
export function buildEmployerMatchContext(profile: EmployerMatchProfile): string {
  return `[EMPLOYER_MATCH_CONTEXT]
Employer Match: ${profile.matchPercent}%
Monthly Match Value: $${profile.monthlyMatchValue}
Currently Contributing: ${profile.isContributing ? 'YES' : 'NO'}
Priority: ${profile.priority}
Recommendation: ${profile.recommendation}
[END_EMPLOYER_MATCH_CONTEXT]`;
}

/**
 * Determine if employer match should override debt payoff advice
 */
export function shouldPrioritizeMatch(
  profile: EmployerMatchProfile,
  hasHighInterestDebt: boolean
): boolean {
  // If not contributing, ALWAYS prioritize match (it's critical)
  if (!profile.isContributing) {
    return true;
  }

  // If already contributing, still mention it but don't override debt advice
  return false;
}
