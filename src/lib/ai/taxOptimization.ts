/**
 * Tax Optimization Guidance
 * Provides specific tax planning strategies for different income levels and scenarios
 */

export interface TaxOptimizationPlan {
  annualIncome: number;
  incomeLevel: 'low' | 'middle' | 'high' | 'very_high';
  effectiveTaxRate: number;
  strategies: TaxStrategy[];
  estimatedTaxSavings: number;
  guidance: string;
}

export interface TaxStrategy {
  name: string;
  category: 'deduction' | 'credit' | 'deferral' | 'income_shifting' | 'entity_structure';
  annualBenefit: number;
  difficulty: 'simple' | 'moderate' | 'complex';
  requiresProfessional: boolean;
  description: string;
}

// Income thresholds for tax planning
const INCOME_THRESHOLDS = {
  low: 50000,
  middle: 100000,
  high: 250000,
  very_high: 500000,
};

/**
 * Determine income level for tax planning
 */
function getIncomeLevel(annualIncome: number): TaxOptimizationPlan['incomeLevel'] {
  if (annualIncome < INCOME_THRESHOLDS.low) return 'low';
  if (annualIncome < INCOME_THRESHOLDS.middle) return 'middle';
  if (annualIncome < INCOME_THRESHOLDS.high) return 'high';
  return 'very_high';
}

/**
 * Estimate effective tax rate (simplified federal only)
 */
function estimateEffectiveTaxRate(annualIncome: number): number {
  // 2024 federal tax brackets (simplified)
  if (annualIncome <= 11600) return 0.10;
  if (annualIncome <= 47150) return 0.12;
  if (annualIncome <= 100525) return 0.22;
  if (annualIncome <= 191950) return 0.24;
  if (annualIncome <= 243725) return 0.32;
  if (annualIncome <= 609350) return 0.35;
  return 0.37;
}

/**
 * Get tax strategies based on income level
 */
function getTaxStrategies(
  annualIncome: number,
  incomeLevel: TaxOptimizationPlan['incomeLevel'],
  hasBusinessIncome: boolean,
  hasCapitalGains: boolean
): TaxStrategy[] {
  const strategies: TaxStrategy[] = [];

  // All income levels
  strategies.push({
    name: 'Maximize 401(k) Contributions',
    category: 'deferral',
    annualBenefit: 23500, // 2024 limit
    difficulty: 'simple',
    requiresProfessional: false,
    description: 'Contribute up to $23,500/year to reduce taxable income',
  });

  strategies.push({
    name: 'Traditional IRA Contributions',
    category: 'deferral',
    annualBenefit: 7000, // 2024 limit
    difficulty: 'simple',
    requiresProfessional: false,
    description: 'Deductible IRA contributions reduce taxable income',
  });

  // Middle income and above
  if (incomeLevel !== 'low') {
    strategies.push({
      name: 'HSA Contributions',
      category: 'deferral',
      annualBenefit: 4150, // 2024 individual limit
      difficulty: 'simple',
      requiresProfessional: false,
      description: 'Triple tax advantage: deductible, grows tax-free, tax-free withdrawals for medical',
    });

    strategies.push({
      name: 'Charitable Giving Strategy',
      category: 'deduction',
      annualBenefit: Math.round(annualIncome * 0.05), // Estimate 5% of income
      difficulty: 'moderate',
      requiresProfessional: true,
      description: 'Bunching charitable contributions in high-income years, donor-advised funds',
    });
  }

  // High income
  if (incomeLevel === 'high' || incomeLevel === 'very_high') {
    strategies.push({
      name: 'Backdoor Roth IRA',
      category: 'income_shifting',
      annualBenefit: 7000, // 2024 limit
      difficulty: 'moderate',
      requiresProfessional: true,
      description: 'Convert Traditional IRA to Roth for high earners above Roth income limits',
    });

    strategies.push({
      name: 'Mega Backdoor Roth',
      category: 'deferral',
      annualBenefit: 46000, // Approximate after-tax 401k limit
      difficulty: 'complex',
      requiresProfessional: true,
      description: 'After-tax 401k contributions converted to Roth (if plan allows)',
    });

    strategies.push({
      name: 'Tax-Loss Harvesting',
      category: 'deduction',
      annualBenefit: Math.round(annualIncome * 0.02), // Estimate 2% of income
      difficulty: 'moderate',
      requiresProfessional: false,
      description: 'Sell losing investments to offset capital gains and ordinary income',
    });
  }

  // Very high income
  if (incomeLevel === 'very_high') {
    strategies.push({
      name: 'Direct Indexing',
      category: 'income_shifting',
      annualBenefit: Math.round(annualIncome * 0.03), // Estimate 3% of income
      difficulty: 'complex',
      requiresProfessional: true,
      description: 'Own index components directly for granular tax-loss harvesting',
    });

    strategies.push({
      name: 'Opportunity Zone Investments',
      category: 'deferral',
      annualBenefit: Math.round(annualIncome * 0.05), // Estimate 5% of income
      difficulty: 'complex',
      requiresProfessional: true,
      description: 'Defer capital gains by investing in designated opportunity zones',
    });

    strategies.push({
      name: 'Entity Structure Optimization',
      category: 'entity_structure',
      annualBenefit: Math.round(annualIncome * 0.08), // Estimate 8% of income
      difficulty: 'complex',
      requiresProfessional: true,
      description: 'S-Corp, C-Corp, or LLC structure for business income optimization',
    });
  }

  // Business income specific
  if (hasBusinessIncome) {
    strategies.push({
      name: 'Qualified Business Income (QBI) Deduction',
      category: 'deduction',
      annualBenefit: Math.round(annualIncome * 0.20 * estimateEffectiveTaxRate(annualIncome)), // 20% deduction
      difficulty: 'moderate',
      requiresProfessional: true,
      description: 'Up to 20% deduction on qualified business income (subject to limitations)',
    });

    strategies.push({
      name: 'Home Office Deduction',
      category: 'deduction',
      annualBenefit: 5000, // Simplified method
      difficulty: 'simple',
      requiresProfessional: false,
      description: 'Deduct home office expenses (simplified or actual method)',
    });
  }

  // Capital gains specific
  if (hasCapitalGains) {
    strategies.push({
      name: 'Long-Term Capital Gains Planning',
      category: 'income_shifting',
      annualBenefit: Math.round(annualIncome * 0.15 * 0.15), // 15% rate vs 37% rate
      difficulty: 'moderate',
      requiresProfessional: true,
      description: 'Hold investments >1 year for preferential long-term capital gains rates',
    });
  }

  return strategies;
}

/**
 * Build tax optimization plan
 */
export function buildTaxOptimizationPlan(
  annualIncome: number,
  hasBusinessIncome: boolean = false,
  hasCapitalGains: boolean = false
): TaxOptimizationPlan {
  const incomeLevel = getIncomeLevel(annualIncome);
  const effectiveTaxRate = estimateEffectiveTaxRate(annualIncome);
  const strategies = getTaxStrategies(annualIncome, incomeLevel, hasBusinessIncome, hasCapitalGains);

  // Calculate estimated tax savings
  const estimatedTaxSavings = Math.round(
    strategies.reduce((sum, s) => sum + s.annualBenefit, 0) * effectiveTaxRate
  );

  const guidance = buildTaxGuidance(annualIncome, incomeLevel, strategies, estimatedTaxSavings);

  return {
    annualIncome,
    incomeLevel,
    effectiveTaxRate,
    strategies,
    estimatedTaxSavings,
    guidance,
  };
}

/**
 * Build tax guidance text
 */
function buildTaxGuidance(
  annualIncome: number,
  incomeLevel: TaxOptimizationPlan['incomeLevel'],
  strategies: TaxStrategy[],
  estimatedSavings: number
): string {
  const simpleStrategies = strategies.filter(s => s.difficulty === 'simple');
  const moderateStrategies = strategies.filter(s => s.difficulty === 'moderate');
  const complexStrategies = strategies.filter(s => s.difficulty === 'complex');

  let guidance = `TAX OPTIMIZATION PLAN FOR $${annualIncome.toLocaleString()} ANNUAL INCOME:

Estimated tax savings potential: $${estimatedSavings.toLocaleString()}/year

SIMPLE STRATEGIES (do yourself):`;

  simpleStrategies.forEach(s => {
    guidance += `\n- ${s.name}: ${s.description} (saves ~$${Math.round(s.annualBenefit * estimateEffectiveTaxRate(annualIncome)).toLocaleString()}/year)`;
  });

  if (moderateStrategies.length > 0) {
    guidance += `\n\nMODERATE STRATEGIES (consult CPA):`;
    moderateStrategies.forEach(s => {
      guidance += `\n- ${s.name}: ${s.description} (saves ~$${Math.round(s.annualBenefit * estimateEffectiveTaxRate(annualIncome)).toLocaleString()}/year)`;
    });
  }

  if (complexStrategies.length > 0) {
    guidance += `\n\nCOMPLEX STRATEGIES (requires CPA/tax attorney):`;
    complexStrategies.forEach(s => {
      guidance += `\n- ${s.name}: ${s.description} (saves ~$${Math.round(s.annualBenefit * estimateEffectiveTaxRate(annualIncome)).toLocaleString()}/year)`;
    });
  }

  guidance += `\n\nNEXT STEP: Schedule a consultation with a fee-only CPA or tax attorney to implement these strategies. The complexity increases with income level, and professional guidance is essential for high earners.`;

  return guidance;
}

/**
 * Build system prompt context for tax optimization
 */
export function buildTaxContext(plan: TaxOptimizationPlan): string {
  const simpleStrategies = plan.strategies.filter(s => s.difficulty === 'simple').map(s => s.name);
  const moderateStrategies = plan.strategies.filter(s => s.difficulty === 'moderate').map(s => s.name);
  const complexStrategies = plan.strategies.filter(s => s.difficulty === 'complex').map(s => s.name);

  return `[TAX_OPTIMIZATION_CONTEXT]
Annual Income: $${plan.annualIncome.toLocaleString()}
Income Level: ${plan.incomeLevel}
Effective Tax Rate: ${(plan.effectiveTaxRate * 100).toFixed(1)}%
Estimated Annual Tax Savings: $${plan.estimatedTaxSavings.toLocaleString()}
Simple Strategies: ${simpleStrategies.join(', ') || 'None'}
Moderate Strategies: ${moderateStrategies.join(', ') || 'None'}
Complex Strategies: ${complexStrategies.join(', ') || 'None'}
Guidance: ${plan.guidance}
[END_TAX_OPTIMIZATION_CONTEXT]`;
}
