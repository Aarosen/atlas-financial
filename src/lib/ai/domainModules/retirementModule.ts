/**
 * Retirement Planning Domain Module
 * Provides CFP-grade retirement planning education and analysis
 * Covers retirement savings goals, contribution strategies, withdrawal planning, Social Security
 */

export interface RetirementContext {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  annualContribution: number;
  annualExpenses: number;
  expectedReturn: number; // as decimal, e.g., 0.07 for 7%
  inflationRate: number;
  hasSocialSecurity: boolean;
  estimatedSocialSecurityAtFullRetirement?: number;
  lifeExpectancy: number;
}

export interface RetirementAnalysis {
  projectedRetirementSavings: number;
  fireNumber: number; // 25x annual expenses
  retirementReadiness: 'on_track' | 'behind' | 'ahead';
  yearsToRetirement: number;
  recommendations: string[];
  educationalMoments: string[];
}

const CONTRIBUTION_LIMITS_2025 = {
  traditional_401k: 23500,
  roth_401k: 23500,
  traditional_ira: 7000,
  roth_ira: 7000,
  catchup_401k_age_50: 7500,
  catchup_ira_age_50: 1000,
};

const RMD_AGE = 73; // SECURE 2.0 changed from 72

export function calculateFutureValue(
  presentValue: number,
  annualContribution: number,
  years: number,
  annualReturn: number
): number {
  let balance = presentValue;

  for (let year = 0; year < years; year++) {
    balance = balance * (1 + annualReturn) + annualContribution;
  }

  return balance;
}

export function calculateFireNumber(annualExpenses: number): number {
  // FIRE rule: 25x annual expenses (assumes 4% withdrawal rate)
  return annualExpenses * 25;
}

export function calculateRetirementReadiness(
  projectedSavings: number,
  fireNumber: number
): RetirementAnalysis['retirementReadiness'] {
  const ratio = projectedSavings / fireNumber;

  if (ratio >= 1.0) return 'ahead';
  if (ratio >= 0.8) return 'on_track';
  return 'behind';
}

export function projectRetirementSavings(ctx: RetirementContext): number {
  const yearsToRetirement = ctx.retirementAge - ctx.currentAge;

  // Adjust contribution for inflation
  let adjustedContribution = ctx.annualContribution;
  let adjustedSavings = ctx.currentSavings;

  for (let year = 0; year < yearsToRetirement; year++) {
    adjustedSavings = adjustedSavings * (1 + ctx.expectedReturn) + adjustedContribution;
    adjustedContribution *= 1 + ctx.inflationRate;
  }

  return adjustedSavings;
}

export function calculateWithdrawalRate(
  retirementSavings: number,
  yearsInRetirement: number
): number {
  // Simple calculation: divide savings by years
  // More sophisticated: use 4% rule
  return (retirementSavings * 0.04) / 12; // Monthly withdrawal
}

export function generateRetirementRecommendations(ctx: RetirementContext): string[] {
  const recommendations: string[] = [];
  const yearsToRetirement = ctx.retirementAge - ctx.currentAge;

  // Contribution recommendations
  if (ctx.annualContribution < CONTRIBUTION_LIMITS_2025.traditional_401k) {
    recommendations.push(
      `You could contribute up to $${CONTRIBUTION_LIMITS_2025.traditional_401k.toLocaleString()} to a 401(k) in 2025. Increasing contributions now compounds significantly over ${yearsToRetirement} years.`
    );
  }

  // Catch-up contributions for age 50+
  if (ctx.currentAge >= 50) {
    recommendations.push(
      `At age 50+, you can make catch-up contributions: an additional $${CONTRIBUTION_LIMITS_2025.catchup_401k_age_50.toLocaleString()} to a 401(k) and $${CONTRIBUTION_LIMITS_2025.catchup_ira_age_50.toLocaleString()} to an IRA.`
    );
  }

  // Social Security planning
  if (ctx.hasSocialSecurity) {
    recommendations.push(
      'Social Security claiming age affects your benefit: claiming at 62 reduces benefits by ~30%, claiming at full retirement age (66-67) gives full benefits, and delaying to 70 increases benefits by ~24% per year. Consider your health and longevity expectations.'
    );
  }

  // Diversification for retirement
  recommendations.push(
    'As you approach retirement, gradually shift from growth-oriented investments (stocks) to more conservative allocations (bonds, stable value). A common rule: hold your age in bonds (e.g., 60-year-old holds 60% bonds).'
  );

  return recommendations;
}

export function generateRetirementEducation(ctx: RetirementContext): string[] {
  const moments: string[] = [];

  moments.push(
    'The "4% rule" is a retirement planning guideline: if you withdraw 4% of your portfolio in year one (adjusted for inflation each year), your money should last 30+ years. This assumes a balanced portfolio and requires discipline.'
  );

  moments.push(
    'Required Minimum Distributions (RMDs) begin at age 73 (as of 2023). You must withdraw a percentage of your Traditional IRA and 401(k) balances each year. Roth IRAs have no RMDs during your lifetime, making them valuable for legacy planning.'
  );

  moments.push(
    'Tax-deferred accounts (Traditional 401k, Traditional IRA) reduce taxes now but are taxed as ordinary income in retirement. Roth accounts are taxed now but grow tax-free. A mix of both can provide tax flexibility in retirement.'
  );

  moments.push(
    'Longevity risk is the risk of outliving your money. Planning to age 95 or 100 is prudent for many people. This is why consistent contributions and conservative withdrawal rates matter.'
  );

  return moments;
}

export function analyzeRetirementSituation(ctx: RetirementContext): RetirementAnalysis {
  const projectedSavings = projectRetirementSavings(ctx);
  const fireNumber = calculateFireNumber(ctx.annualExpenses);
  const yearsToRetirement = ctx.retirementAge - ctx.currentAge;

  return {
    projectedRetirementSavings: projectedSavings,
    fireNumber: fireNumber,
    retirementReadiness: calculateRetirementReadiness(projectedSavings, fireNumber),
    yearsToRetirement: yearsToRetirement,
    recommendations: generateRetirementRecommendations(ctx),
    educationalMoments: generateRetirementEducation(ctx),
  };
}
