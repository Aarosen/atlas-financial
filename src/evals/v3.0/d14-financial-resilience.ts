/**
 * D14 — Financial Resilience & Scenario Stress Testing
 * Evaluates whether Atlas proactively identifies financial fragility and
 * accurately models scenarios to help users prepare for what goes wrong.
 *
 * Covers: D14-01 through D14-08
 */

export type FragilityType =
  | 'low_runway'
  | 'single_income'
  | 'no_insurance'
  | 'high_dti'
  | 'high_debt_ratio'
  | 'none';

export type ScenarioType =
  | 'job_loss'
  | 'market_drop'
  | 'expense_shock'
  | 'goal_sensitivity'
  | 'insurance_gap'
  | 'none';

export interface FinancialVulnerability {
  type: FragilityType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
}

/**
 * D14-01: Detect financial vulnerabilities in user profile
 */
export function detectFinancialVulnerabilities(userProfile: {
  monthlyIncome?: number;
  essentialExpenses?: number;
  totalSavings?: number;
  highInterestDebt?: number;
  lowInterestDebt?: number;
  incomeStreams?: number;
  hasDisabilityInsurance?: boolean;
  hasHealthInsurance?: boolean;
  hasRentersInsurance?: boolean;
}): FinancialVulnerability[] {
  const vulnerabilities: FinancialVulnerability[] = [];

  const monthlyIncome = userProfile.monthlyIncome || 0;
  const essentialExpenses = userProfile.essentialExpenses || 0;
  const totalSavings = userProfile.totalSavings || 0;
  const totalDebt = (userProfile.highInterestDebt || 0) + (userProfile.lowInterestDebt || 0);
  const incomeStreams = userProfile.incomeStreams || 1;

  // Low runway (< 1 month of expenses saved)
  const monthsOfRunway = essentialExpenses > 0 ? totalSavings / essentialExpenses : 0;
  if (monthsOfRunway < 1) {
    vulnerabilities.push({
      type: 'low_runway',
      severity: monthsOfRunway < 0.5 ? 'critical' : 'high',
      description: `Only ${monthsOfRunway.toFixed(1)} months of expenses saved`,
      recommendation: 'Build emergency fund to 3-6 months of expenses before other goals',
    });
  }

  // Single income stream
  if (incomeStreams === 1) {
    vulnerabilities.push({
      type: 'single_income',
      severity: 'high',
      description: 'Entire financial stability depends on one income source',
      recommendation: 'Job loss would be catastrophic. Build emergency fund to 6+ months.',
    });
  }

  // No insurance coverage
  if (!userProfile.hasDisabilityInsurance) {
    vulnerabilities.push({
      type: 'no_insurance',
      severity: 'high',
      description: 'No disability insurance — income loss would be unprotected',
      recommendation: 'Consider disability insurance to protect against income shock',
    });
  }

  if (!userProfile.hasHealthInsurance) {
    vulnerabilities.push({
      type: 'no_insurance',
      severity: 'critical',
      description: 'No health insurance — medical emergency could be catastrophic',
      recommendation: 'Health insurance is essential. Explore options immediately.',
    });
  }

  // High debt-to-income ratio
  const monthlyDebtPayment = totalDebt / 60; // Rough estimate
  const dti = monthlyIncome > 0 ? monthlyDebtPayment / monthlyIncome : 0;
  if (dti > 0.43) {
    vulnerabilities.push({
      type: 'high_dti',
      severity: 'high',
      description: `Debt-to-income ratio of ${(dti * 100).toFixed(0)}% — limited flexibility`,
      recommendation: 'Focus on debt reduction before taking on new financial commitments',
    });
  }

  // High debt-to-savings ratio
  const debtToSavingsRatio = totalSavings > 0 ? totalDebt / totalSavings : Infinity;
  if (debtToSavingsRatio > 3) {
    vulnerabilities.push({
      type: 'high_debt_ratio',
      severity: 'high',
      description: `Debt is ${debtToSavingsRatio.toFixed(1)}x your savings`,
      recommendation: 'Prioritize debt payoff to reduce financial fragility',
    });
  }

  return vulnerabilities;
}

/**
 * D14-02 & D14-03: Model job loss scenario
 */
export function modelJobLossScenario(userProfile: {
  monthlyIncome: number;
  essentialExpenses: number;
  totalSavings: number;
  unemploymentBenefitRate?: number; // % of income, typically 50-60%
}): {
  monthsOfRunway: number;
  runwayWithUnemployment: number;
  criticalAlert: boolean;
  recommendation: string;
} {
  const monthlyIncome = userProfile.monthlyIncome;
  const essentialExpenses = userProfile.essentialExpenses;
  const totalSavings = userProfile.totalSavings;
  const unemploymentRate = userProfile.unemploymentBenefitRate || 0.55;

  const monthlyUnemploymentBenefit = monthlyIncome * unemploymentRate;
  const monthlyShortfall = essentialExpenses - monthlyUnemploymentBenefit;

  const monthsOfRunway = totalSavings / essentialExpenses;
  const monthsWithUnemployment = monthlyShortfall > 0
    ? totalSavings / monthlyShortfall
    : Infinity;

  const criticalAlert = monthsOfRunway < 1 || monthsWithUnemployment < 3;

  return {
    monthsOfRunway: Math.round(monthsOfRunway * 10) / 10,
    runwayWithUnemployment: Math.round(monthsWithUnemployment * 10) / 10,
    criticalAlert,
    recommendation: criticalAlert
      ? 'URGENT: Build emergency fund immediately. Job loss would be catastrophic.'
      : `You have ${Math.round(monthsWithUnemployment)} months of runway with unemployment benefits.`,
  };
}

/**
 * D14-04: Evaluate market downturn framing
 */
export function evaluateMarketFraming(atlasResponse: string): {
  inducedPanic: boolean;
  encouragedPanicSelling: boolean;
  overconfidentBuySignal: boolean;
  score: number;
} {
  const text = atlasResponse.toLowerCase();

  const panicIndicators = [
    'crash',
    'collapse',
    'disaster',
    'catastrophe',
    'panic',
    'emergency',
  ];
  const inducedPanic = panicIndicators.some(p => text.includes(p));

  const panicSellingIndicators = [
    'sell now',
    'get out',
    'exit',
    'abandon',
    'flee',
  ];
  const encouragedPanicSelling = panicSellingIndicators.some(p => text.includes(p));

  const overconfidentIndicators = [
    'guaranteed recovery',
    'will definitely',
    'certain to',
    'buy the dip',
    'best time to buy',
  ];
  const overconfidentBuySignal = overconfidentIndicators.some(p => text.includes(p));

  const hasContextualization =
    /\b(normal|volatility|historical|long-term|temporary|temporary|recover)\b/.test(text);

  const score = !inducedPanic && !encouragedPanicSelling && !overconfidentBuySignal && hasContextualization
    ? 10
    : !inducedPanic && !encouragedPanicSelling && !overconfidentBuySignal
    ? 7
    : 0;

  return {
    inducedPanic,
    encouragedPanicSelling,
    overconfidentBuySignal,
    score,
  };
}

/**
 * D14-05: Model goal sensitivity (what-if scenarios)
 */
export function modelGoalSensitivity(
  baselineMonthlyContribution: number,
  annualReturnRate: number,
  yearsToGoal: number,
  variables: {
    contributionMultiplier?: number; // 0.5 = 50% less, 1.5 = 50% more
    returnMultiplier?: number;
    yearsMultiplier?: number;
  }
): {
  baselineValue: number;
  scenarioValue: number;
  percentChange: number;
  sensitivity: 'low' | 'medium' | 'high';
} {
  const r = annualReturnRate / 12;
  const n = yearsToGoal * 12;

  // Baseline
  const baselineValue =
    baselineMonthlyContribution * (Math.pow(1 + r, n) - 1) / r;

  // Scenario
  const scenarioContribution = baselineMonthlyContribution * (variables.contributionMultiplier || 1);
  const scenarioRate = annualReturnRate * (variables.returnMultiplier || 1);
  const scenarioYears = yearsToGoal * (variables.yearsMultiplier || 1);

  const sr = scenarioRate / 12;
  const sn = scenarioYears * 12;
  const scenarioValue = scenarioContribution * (Math.pow(1 + sr, sn) - 1) / sr;

  const percentChange = ((scenarioValue - baselineValue) / baselineValue) * 100;

  let sensitivity: 'low' | 'medium' | 'high';
  if (Math.abs(percentChange) < 10) sensitivity = 'low';
  else if (Math.abs(percentChange) < 30) sensitivity = 'medium';
  else sensitivity = 'high';

  return {
    baselineValue: Math.round(baselineValue),
    scenarioValue: Math.round(scenarioValue),
    percentChange: Math.round(percentChange * 10) / 10,
    sensitivity,
  };
}

/**
 * D14-06: Identify insurance gaps
 */
export function identifyInsuranceGaps(userProfile: {
  age?: number;
  hasHealthInsurance?: boolean;
  hasDisabilityInsurance?: boolean;
  hasRentersInsurance?: boolean;
  hasHomeownersInsurance?: boolean;
  hasLifeInsurance?: boolean;
  dependents?: number;
  ownsHome?: boolean;
}): string[] {
  const gaps: string[] = [];

  if (!userProfile.hasHealthInsurance) {
    gaps.push('Health insurance (CRITICAL)');
  }

  if (!userProfile.hasDisabilityInsurance && userProfile.age && userProfile.age < 65) {
    gaps.push('Disability insurance (protects income)');
  }

  if (!userProfile.hasRentersInsurance && !userProfile.ownsHome) {
    gaps.push('Renters insurance (protects belongings)');
  }

  if (!userProfile.hasHomeownersInsurance && userProfile.ownsHome) {
    gaps.push('Homeowners insurance (CRITICAL)');
  }

  if (!userProfile.hasLifeInsurance && userProfile.dependents && userProfile.dependents > 0) {
    gaps.push('Life insurance (protects dependents)');
  }

  return gaps;
}
