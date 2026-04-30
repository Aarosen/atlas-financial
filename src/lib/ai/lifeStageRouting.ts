/**
 * TASK 3.2: Life Stage Routing
 * 
 * Routes users to appropriate financial guidance based on their life stage.
 * Pre-retirement users get retirement readiness analysis, not contribution advice.
 */

export type LifeStage = 'early_career' | 'mid_career' | 'late_career' | 'pre_retirement' | 'retirement';

export interface LifeStageProfile {
  age: number;
  lifeStage: LifeStage;
  yearsToRetirement: number;
  retirementSavings: number;
  monthlyIncome: number;
  retirementTarget: number; // FIRE number
  onTrackStatus: 'ahead' | 'on_track' | 'behind';
  recommendedAction: string;
}

/**
 * Determine life stage based on age
 */
export function computeLifeStage(age: number): LifeStage {
  if (age < 30) return 'early_career';
  if (age < 45) return 'mid_career';
  if (age < 60) return 'late_career';
  if (age < 67) return 'pre_retirement';
  return 'retirement';
}

/**
 * Compute retirement readiness for a user
 * Uses 4% rule: FIRE number = annual expenses × 25
 */
export function computeRetirementReadiness(
  age: number,
  retirementAge: number | undefined,
  retirementSavings: number,
  monthlyExpenses: number,
  monthlyIncome: number
): LifeStageProfile {
  const targetAge = retirementAge || 67;
  const yearsToRetirement = Math.max(0, targetAge - age);
  const annualExpenses = monthlyExpenses * 12;
  const fireNumber = annualExpenses * 25; // 4% rule
  
  // Project retirement savings using 7% annual growth
  const monthlyContribution = Math.max(0, monthlyIncome - monthlyExpenses);
  const projectedSavings = projectRetirementSavings(
    retirementSavings,
    monthlyContribution,
    0.07,
    yearsToRetirement
  );

  const onTrackStatus = getOnTrackStatus(projectedSavings, fireNumber);
  const lifeStage = computeLifeStage(age);

  return {
    age,
    lifeStage,
    yearsToRetirement,
    retirementSavings,
    monthlyIncome,
    retirementTarget: fireNumber,
    onTrackStatus,
    recommendedAction: getRecommendedAction(lifeStage, onTrackStatus, yearsToRetirement),
  };
}

/**
 * Project retirement savings using compound growth
 */
function projectRetirementSavings(
  currentSavings: number,
  monthlyContribution: number,
  annualRate: number,
  years: number
): number {
  const monthlyRate = annualRate / 12;
  const months = years * 12;

  // Future value of lump sum
  const fvLump = currentSavings * Math.pow(1 + monthlyRate, months);

  // Future value of monthly contributions
  const fvContributions =
    monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);

  return fvLump + fvContributions;
}

/**
 * Determine if user is on track for retirement
 */
function getOnTrackStatus(
  projectedSavings: number,
  fireNumber: number
): 'ahead' | 'on_track' | 'behind' {
  const ratio = projectedSavings / fireNumber;
  if (ratio >= 1.0) return 'ahead';
  if (ratio >= 0.8) return 'on_track';
  return 'behind';
}

/**
 * Get recommended action based on life stage and retirement readiness
 */
function getRecommendedAction(
  lifeStage: LifeStage,
  onTrackStatus: 'ahead' | 'on_track' | 'behind',
  yearsToRetirement: number
): string {
  if (lifeStage === 'retirement') {
    return 'Focus on sustainable withdrawal strategy (4% rule) and tax optimization.';
  }

  if (lifeStage === 'pre_retirement') {
    if (onTrackStatus === 'ahead') {
      return `You're ahead of schedule! Consider optimizing tax-advantaged accounts or adjusting your retirement date earlier.`;
    }
    if (onTrackStatus === 'on_track') {
      return `You're on track for retirement in ${yearsToRetirement} years. Maintain current savings rate and monitor progress annually.`;
    }
    return `You're behind schedule. Consider increasing savings rate, working longer, or adjusting retirement age expectations.`;
  }

  if (lifeStage === 'late_career') {
    if (onTrackStatus === 'ahead') {
      return `Strong position! Maximize tax-advantaged contributions and consider catch-up contributions.`;
    }
    if (onTrackStatus === 'on_track') {
      return `You're on track. Increase contributions if possible to build a larger safety margin.`;
    }
    return `Increase savings rate significantly. You have ${yearsToRetirement} years to catch up.`;
  }

  // Early/mid career
  if (onTrackStatus === 'behind') {
    return `Start or increase retirement contributions now. Time is your biggest advantage — compound growth will do the heavy lifting.`;
  }

  return `You're on track. Maintain consistent contributions and increase them with raises.`;
}

/**
 * Build life stage context for system prompt injection
 */
export function buildLifeStageContext(profile: LifeStageProfile): string {
  return `[LIFE_STAGE_CONTEXT]
User Age: ${profile.age}
Life Stage: ${profile.lifeStage}
Years to Retirement: ${profile.yearsToRetirement}
Retirement Savings: $${profile.retirementSavings.toLocaleString()}
Retirement Target (FIRE): $${profile.retirementTarget.toLocaleString()}
On-Track Status: ${profile.onTrackStatus}
Recommended Action: ${profile.recommendedAction}
[END_LIFE_STAGE_CONTEXT]`;
}

/**
 * Determine if user should get retirement readiness analysis vs contribution advice
 */
export function shouldFocusOnRetirementReadiness(profile: LifeStageProfile): boolean {
  // Pre-retirement and late-career users should focus on readiness analysis
  if (profile.lifeStage === 'pre_retirement' || profile.lifeStage === 'retirement') {
    return true;
  }

  // Late-career users who are behind should focus on readiness
  if (profile.lifeStage === 'late_career' && profile.onTrackStatus === 'behind') {
    return true;
  }

  return false;
}
