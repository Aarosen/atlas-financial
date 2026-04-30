/**
 * TASK 5: Irregular Income Handling
 * 
 * Handles variable/gig/freelance income with low-month baseline planning
 * and income spike allocation rules.
 */

export interface IrregularIncomeProfile {
  isIrregular: boolean;
  incomeType: 'fixed' | 'variable' | 'gig' | 'freelance' | 'contract' | 'seasonal';
  minMonthlyIncome: number;
  maxMonthlyIncome: number;
  averageMonthlyIncome: number;
  baselineIncome: number; // Use min for planning
  recommendation: string;
}

/**
 * Detect irregular income from user message and extracted data
 */
export function detectIrregularIncome(
  userMessage: string,
  monthlyIncome: number | undefined,
  monthlyIncomeMin: number | undefined,
  monthlyIncomeMax: number | undefined,
  incomeType: string | undefined
): IrregularIncomeProfile | null {
  // Check if user mentions variable income
  const variablePatterns = /(varies|depends|gig|freelance|contract|variable|between|sometimes|fluctuates|inconsistent|side.*income|part.*time|seasonal|commission|bonus)/i;
  const mentionsVariable = variablePatterns.test(userMessage);

  // Check if extracted data shows variable income
  const hasVariableData = (monthlyIncomeMin !== undefined && monthlyIncomeMax !== undefined && monthlyIncomeMin !== monthlyIncomeMax) ||
    incomeType === 'variable' || incomeType === 'gig' || incomeType === 'freelance';

  if (!mentionsVariable && !hasVariableData) {
    return null;
  }

  // Determine income type
  let type: IrregularIncomeProfile['incomeType'] = 'variable';
  if (incomeType === 'gig') type = 'gig';
  if (incomeType === 'freelance') type = 'freelance';
  if (incomeType === 'contract') type = 'contract';
  if (incomeType === 'seasonal') type = 'seasonal';

  // Use provided min/max or estimate from single value
  const min = monthlyIncomeMin || (monthlyIncome ? Math.round(monthlyIncome * 0.7) : 0);
  const max = monthlyIncomeMax || (monthlyIncome ? Math.round(monthlyIncome * 1.3) : 0);
  const avg = (min + max) / 2;
  const baseline = min; // Always plan with low month

  return {
    isIrregular: true,
    incomeType: type,
    minMonthlyIncome: min,
    maxMonthlyIncome: max,
    averageMonthlyIncome: avg,
    baselineIncome: baseline,
    recommendation: buildIrregularIncomeRecommendation(type, min, max, avg, baseline),
  };
}

/**
 * Build recommendation for irregular income
 */
function buildIrregularIncomeRecommendation(
  type: IrregularIncomeProfile['incomeType'],
  min: number,
  max: number,
  avg: number,
  baseline: number
): string {
  const spikeAmount = max - baseline;
  const spikePercent = Math.round((spikeAmount / baseline) * 100);

  return `Your income varies from $${min}/month to $${max}/month (average $${Math.round(avg)}/month).

PLANNING RULE: Budget using your LOW month ($${baseline}) as the baseline. This ensures you can cover essentials even in slow months.

INCOME SPIKE RULE: When you have a high month (above $${baseline}), allocate the extra $${spikeAmount} BEFORE lifestyle inflation absorbs it. Options:
1. Emergency fund (if below 6 months expenses)
2. High-interest debt payoff
3. Retirement contributions
4. Savings for irregular months

This prevents the "feast or famine" cycle where high months disappear into lifestyle spending.`;
}

/**
 * Calculate sustainable budget for irregular income
 */
export function calculateIrregularIncomeBudget(
  profile: IrregularIncomeProfile,
  essentialExpenses: number,
  discretionaryExpenses: number
): {
  baselineSurplus: number;
  averageSurplus: number;
  spikeAllocation: number;
  recommendation: string;
} {
  const totalExpenses = essentialExpenses + discretionaryExpenses;

  const baselineSurplus = Math.max(0, profile.baselineIncome - totalExpenses);
  const averageSurplus = Math.max(0, profile.averageMonthlyIncome - totalExpenses);
  const spikeAllocation = profile.maxMonthlyIncome - profile.baselineIncome;

  let recommendation = `BASELINE BUDGET (low month):
Income: $${profile.baselineIncome}
Expenses: $${totalExpenses}
Surplus: $${baselineSurplus}

AVERAGE MONTH:
Income: $${Math.round(profile.averageMonthlyIncome)}
Surplus: $${Math.round(averageSurplus)}

INCOME SPIKE (high month):
Extra income: $${spikeAllocation}
Allocate to: Emergency fund → Debt → Retirement → Savings`;

  if (baselineSurplus <= 0) {
    recommendation += `\n\nWARNING: Your low month barely covers expenses. Focus on building a 1-month emergency fund ASAP using spike income. Once you have that buffer, you can handle slow months without stress.`;
  }

  return {
    baselineSurplus,
    averageSurplus,
    spikeAllocation,
    recommendation,
  };
}

/**
 * Build system prompt context for irregular income
 */
export function buildIrregularIncomeContext(profile: IrregularIncomeProfile): string {
  return `[IRREGULAR_INCOME_CONTEXT]
Income Type: ${profile.incomeType}
Low Month: $${profile.minMonthlyIncome}
High Month: $${profile.maxMonthlyIncome}
Average: $${Math.round(profile.averageMonthlyIncome)}
Baseline for Planning: $${profile.baselineIncome}
Recommendation: ${profile.recommendation}
[END_IRREGULAR_INCOME_CONTEXT]`;
}

/**
 * Detect if user should get irregular income guidance
 */
export function shouldProvideIrregularIncomeGuidance(profile: IrregularIncomeProfile): boolean {
  return profile.isIrregular && (profile.maxMonthlyIncome - profile.minMonthlyIncome) > profile.minMonthlyIncome * 0.2;
}
