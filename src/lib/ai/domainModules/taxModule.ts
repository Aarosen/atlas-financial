/**
 * Tax Domain Module
 * Provides CFP/CPA-grade tax education and planning guidance
 * Covers federal tax brackets, deductions, retirement accounts, capital gains, self-employment tax
 */

export interface TaxContext {
  income: number;
  filingStatus: 'single' | 'married_filing_jointly' | 'married_filing_separately' | 'head_of_household';
  state?: string;
  hasCapitalGains?: boolean;
  capitalGainsAmount?: number;
  hasSelfEmploymentIncome?: boolean;
  selfEmploymentIncome?: number;
  retirementContributions?: number;
  hasItemizedDeductions?: boolean;
  itemizedDeductionsAmount?: number;
}

export interface TaxAnalysis {
  federalTaxBracket: {
    rate: number;
    range: [number, number];
    year: number;
  };
  estimatedTaxLiability: number;
  effectiveTaxRate: number;
  marginalTaxRate: number;
  recommendations: string[];
  warnings: string[];
  educationalMoments: string[];
}

const TAX_BRACKETS_2025: Record<string, Array<{ min: number; max: number; rate: number }>> = {
  single: [
    { min: 0, max: 11600, rate: 0.10 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243725, rate: 0.32 },
    { min: 243725, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 },
  ],
  married_filing_jointly: [
    { min: 0, max: 23200, rate: 0.10 },
    { min: 23200, max: 94300, rate: 0.12 },
    { min: 94300, max: 201050, rate: 0.22 },
    { min: 201050, max: 383900, rate: 0.24 },
    { min: 383900, max: 487450, rate: 0.32 },
    { min: 487450, max: 731200, rate: 0.35 },
    { min: 731200, max: Infinity, rate: 0.37 },
  ],
  married_filing_separately: [
    { min: 0, max: 11600, rate: 0.10 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243725, rate: 0.32 },
    { min: 243725, max: 365600, rate: 0.35 },
    { min: 365600, max: Infinity, rate: 0.37 },
  ],
  head_of_household: [
    { min: 0, max: 16550, rate: 0.10 },
    { min: 16550, max: 63100, rate: 0.12 },
    { min: 63100, max: 100500, rate: 0.22 },
    { min: 100500, max: 191950, rate: 0.24 },
    { min: 191950, max: 243700, rate: 0.32 },
    { min: 243700, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 },
  ],
};

const STANDARD_DEDUCTION_2025: Record<TaxContext['filingStatus'], number> = {
  single: 14600,
  married_filing_jointly: 29200,
  married_filing_separately: 14600,
  head_of_household: 21900,
};

const CONTRIBUTION_LIMITS_2025 = {
  traditional_ira: 7000,
  roth_ira: 7000,
  ira_catchup_age_50_plus: 1000,
  traditional_401k: 23500,
  roth_401k: 23500,
  traditional_401k_catchup_age_50_plus: 7500,
  hsa_individual: 4300,
  hsa_family: 8550,
  hsa_catchup_age_55_plus: 1000,
};

export function calculateFederalTaxBracket(
  income: number,
  filingStatus: TaxContext['filingStatus']
): TaxAnalysis['federalTaxBracket'] {
  const brackets = TAX_BRACKETS_2025[filingStatus] || TAX_BRACKETS_2025.single;
  const bracket = brackets.find((b: { min: number; max: number; rate: number }) => income >= b.min && income < b.max);

  if (!bracket) {
    return {
      rate: 0.37,
      range: [609350, Infinity],
      year: 2025,
    };
  }

  return {
    rate: bracket.rate,
    range: [bracket.min, bracket.max],
    year: 2025,
  };
}

export function calculateEstimatedTaxLiability(ctx: TaxContext): number {
  const brackets = TAX_BRACKETS_2025[ctx.filingStatus] || TAX_BRACKETS_2025.single;
  let taxableIncome = ctx.income;

  // Subtract standard deduction
  const standardDeduction = STANDARD_DEDUCTION_2025[ctx.filingStatus];
  taxableIncome = Math.max(0, taxableIncome - standardDeduction);

  // Subtract retirement contributions
  if (ctx.retirementContributions) {
    taxableIncome = Math.max(0, taxableIncome - ctx.retirementContributions);
  }

  // Handle itemized deductions
  if (ctx.hasItemizedDeductions && ctx.itemizedDeductionsAmount) {
    taxableIncome = Math.max(0, taxableIncome - ctx.itemizedDeductionsAmount);
  }

  // Calculate federal income tax
  let federalTax = 0;

  for (const bracket of brackets) {
    if (taxableIncome <= bracket.min) break;

    const incomeInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
    federalTax += incomeInBracket * bracket.rate;
  }

  // Add self-employment tax (15.3% on 92.35% of SE income)
  let seTax = 0;
  if (ctx.hasSelfEmploymentIncome && ctx.selfEmploymentIncome) {
    const seIncome = ctx.selfEmploymentIncome * 0.9235;
    seTax = seIncome * 0.153;
  }

  return federalTax + seTax;
}

export function calculateEffectiveTaxRate(ctx: TaxContext): number {
  const taxLiability = calculateEstimatedTaxLiability(ctx);
  return ctx.income > 0 ? (taxLiability / ctx.income) * 100 : 0;
}

export function calculateMarginalTaxRate(ctx: TaxContext): number {
  const bracket = calculateFederalTaxBracket(ctx.income, ctx.filingStatus);
  return bracket.rate * 100;
}

export function generateTaxRecommendations(ctx: TaxContext): string[] {
  const recommendations: string[] = [];

  // IRA contribution recommendations
  if (ctx.income < 150000 && !ctx.retirementContributions) {
    recommendations.push(
      'Consider contributing to a Traditional IRA (up to $7,000 in 2025) for a potential tax deduction.'
    );
  }

  // HSA recommendations
  if (ctx.income < 200000) {
    recommendations.push(
      'If you have a high-deductible health plan, an HSA is a triple tax-advantaged account: contributions are deductible, growth is tax-free, and withdrawals for medical expenses are tax-free.'
    );
  }

  // Self-employment tax planning
  if (ctx.hasSelfEmploymentIncome) {
    recommendations.push(
      'As a self-employed individual, you can deduct half of your self-employment tax and should consider quarterly estimated tax payments to avoid penalties.'
    );
  }

  // Capital gains planning
  if (ctx.hasCapitalGains && ctx.capitalGainsAmount) {
    recommendations.push(
      'Long-term capital gains (held > 1 year) are taxed at preferential rates (0%, 15%, or 20%) compared to ordinary income. Consider timing of sales strategically.'
    );
  }

  return recommendations;
}

export function generateTaxWarnings(ctx: TaxContext): string[] {
  const warnings: string[] = [];

  // High income warnings
  if (ctx.income > 500000) {
    warnings.push(
      'At your income level, consider consulting with a CPA or tax professional for advanced planning strategies like charitable giving, business structure optimization, and alternative minimum tax (AMT) considerations.'
    );
  }

  // Self-employment warnings
  if (ctx.hasSelfEmploymentIncome) {
    warnings.push(
      'Self-employed individuals must file quarterly estimated tax payments. Missing these can result in penalties and interest.'
    );
  }

  // Capital gains warnings
  if (ctx.hasCapitalGains && ctx.capitalGainsAmount && ctx.capitalGainsAmount > 100000) {
    warnings.push(
      'Large capital gains may trigger net investment income tax (3.8%) if your modified adjusted gross income exceeds certain thresholds.'
    );
  }

  return warnings;
}

export function generateTaxEducation(ctx: TaxContext): string[] {
  const moments: string[] = [];

  moments.push(
    'Your marginal tax rate is the percentage you pay on your next dollar of income. Your effective tax rate is what you pay on average across all your income. These are different, and understanding the difference helps you make better financial decisions.'
  );

  moments.push(
    'Tax-deferred accounts like Traditional IRAs and 401(k)s reduce your taxable income now, but you pay taxes when you withdraw in retirement. Roth accounts are the opposite: you pay taxes now, but withdrawals are tax-free later.'
  );

  moments.push(
    'The standard deduction is a fixed amount you can subtract from your income before calculating taxes. Most people benefit from taking the standard deduction, but if you have significant deductible expenses (mortgage interest, charitable donations, state/local taxes up to $10,000), itemizing might save you more.'
  );

  return moments;
}

export function analyzeTaxSituation(ctx: TaxContext): TaxAnalysis {
  return {
    federalTaxBracket: calculateFederalTaxBracket(ctx.income, ctx.filingStatus),
    estimatedTaxLiability: calculateEstimatedTaxLiability(ctx),
    effectiveTaxRate: calculateEffectiveTaxRate(ctx),
    marginalTaxRate: calculateMarginalTaxRate(ctx),
    recommendations: generateTaxRecommendations(ctx),
    warnings: generateTaxWarnings(ctx),
    educationalMoments: generateTaxEducation(ctx),
  };
}
