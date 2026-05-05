/**
 * Investment Allocation Guidance
 * Provides age-based asset allocation and tax-advantaged account strategy
 */

export interface InvestmentAllocationPlan {
  age: number;
  lifeStage: 'early_career' | 'mid_career' | 'pre_retirement' | 'retirement';
  assetAllocation: {
    stocks: number; // percentage
    bonds: number; // percentage
    cash: number; // percentage
  };
  taxAdvantagedAccounts: TaxAdvantagedAccount[];
  guidance: string;
}

export interface TaxAdvantagedAccount {
  name: string;
  type: 'retirement' | 'education' | 'health' | 'investment';
  annualLimit: number;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  eligibility: string;
}

/**
 * Compute age-based asset allocation
 * Uses standard glide path: 110 - age = stock percentage
 */
export function computeAssetAllocation(age: number): InvestmentAllocationPlan['assetAllocation'] {
  // Glide path: 110 - age = stock allocation
  // At 30: 80% stocks, 20% bonds
  // At 50: 60% stocks, 40% bonds
  // At 65: 45% stocks, 55% bonds
  const stockPercentage = Math.max(30, Math.min(90, 110 - age));
  const bondPercentage = Math.max(10, Math.min(60, age - 20));
  const cashPercentage = 100 - stockPercentage - bondPercentage;

  return {
    stocks: stockPercentage,
    bonds: bondPercentage,
    cash: Math.max(0, cashPercentage),
  };
}

/**
 * Get tax-advantaged accounts available to user
 */
export function getTaxAdvantagedAccounts(
  age: number,
  income: number,
  hasEmployer401k: boolean,
  hasHSAEligibility: boolean
): TaxAdvantagedAccount[] {
  const accounts: TaxAdvantagedAccount[] = [];

  // 401(k) - if employer offers
  if (hasEmployer401k) {
    accounts.push({
      name: '401(k)',
      type: 'retirement',
      annualLimit: 23500, // 2024 limit
      description: 'Employer-sponsored retirement plan with potential matching',
      priority: 'critical', // Always max out employer match first
      eligibility: 'Offered by your employer',
    });
  }

  // Traditional IRA
  accounts.push({
    name: 'Traditional IRA',
    type: 'retirement',
    annualLimit: 7000, // 2024 limit
    description: 'Tax-deductible contributions, tax-deferred growth',
    priority: 'high',
    eligibility: 'Anyone with earned income',
  });

  // Backdoor Roth IRA (for high earners)
  if (income > 150000) {
    accounts.push({
      name: 'Backdoor Roth IRA',
      type: 'retirement',
      annualLimit: 7000, // 2024 limit
      description: 'Convert Traditional IRA to Roth for high earners',
      priority: 'high',
      eligibility: 'Income > $150k (Roth IRA direct contribution limit exceeded)',
    });
  }

  // HSA - if eligible
  if (hasHSAEligibility) {
    accounts.push({
      name: 'Health Savings Account (HSA)',
      type: 'health',
      annualLimit: 4150, // 2024 individual limit
      description: 'Triple tax advantage: deductible, grows tax-free, withdrawals tax-free for medical',
      priority: 'high',
      eligibility: 'Enrolled in high-deductible health plan (HDHP)',
    });
  }

  // Taxable Brokerage Account
  accounts.push({
    name: 'Taxable Brokerage Account',
    type: 'investment',
    annualLimit: Infinity,
    description: 'Unlimited contributions, tax-loss harvesting available',
    priority: 'medium',
    eligibility: 'Anyone',
  });

  // 529 College Savings Plan (if has dependents)
  accounts.push({
    name: '529 College Savings Plan',
    type: 'education',
    annualLimit: 18000, // Annual gift tax exclusion
    description: 'Tax-free growth for education expenses',
    priority: 'medium',
    eligibility: 'Anyone saving for education (own or others)',
  });

  return accounts;
}

/**
 * Build investment allocation plan
 */
export function buildInvestmentAllocationPlan(
  age: number,
  income: number,
  hasEmployer401k: boolean,
  hasHSAEligibility: boolean
): InvestmentAllocationPlan {
  // Determine life stage
  let lifeStage: InvestmentAllocationPlan['lifeStage'];
  if (age < 35) {
    lifeStage = 'early_career';
  } else if (age < 50) {
    lifeStage = 'mid_career';
  } else if (age < 67) {
    lifeStage = 'pre_retirement';
  } else {
    lifeStage = 'retirement';
  }

  const assetAllocation = computeAssetAllocation(age);
  const taxAdvantagedAccounts = getTaxAdvantagedAccounts(age, income, hasEmployer401k, hasHSAEligibility);

  const guidance = buildInvestmentGuidance(age, lifeStage, assetAllocation, taxAdvantagedAccounts);

  return {
    age,
    lifeStage,
    assetAllocation,
    taxAdvantagedAccounts,
    guidance,
  };
}

/**
 * Build investment guidance text
 */
function buildInvestmentGuidance(
  age: number,
  lifeStage: InvestmentAllocationPlan['lifeStage'],
  allocation: InvestmentAllocationPlan['assetAllocation'],
  accounts: TaxAdvantagedAccount[]
): string {
  const criticalAccounts = accounts.filter(a => a.priority === 'critical');
  const highPriorityAccounts = accounts.filter(a => a.priority === 'high');

  let guidance = `INVESTMENT ALLOCATION FOR ${age}-YEAR-OLD (${lifeStage.replace(/_/g, ' ').toUpperCase()}):

Asset allocation: ${allocation.stocks}% stocks, ${allocation.bonds}% bonds, ${allocation.cash}% cash

This allocation balances growth potential with risk management appropriate for your life stage.

TAX-ADVANTAGED ACCOUNTS (in priority order):`;

  if (criticalAccounts.length > 0) {
    guidance += `\n\nCRITICAL (do first):`;
    criticalAccounts.forEach(acc => {
      guidance += `\n- ${acc.name}: Up to $${acc.annualLimit.toLocaleString()}/year. ${acc.description}`;
    });
  }

  if (highPriorityAccounts.length > 0) {
    guidance += `\n\nHIGH PRIORITY (after critical):`;
    highPriorityAccounts.forEach(acc => {
      guidance += `\n- ${acc.name}: Up to $${acc.annualLimit === Infinity ? 'unlimited' : '$' + acc.annualLimit.toLocaleString()}/year. ${acc.description}`;
    });
  }

  const otherAccounts = accounts.filter(a => a.priority === 'medium' || a.priority === 'low');
  if (otherAccounts.length > 0) {
    guidance += `\n\nOTHER OPTIONS:`;
    otherAccounts.forEach(acc => {
      guidance += `\n- ${acc.name}: ${acc.description}`;
    });
  }

  return guidance;
}

/**
 * Build system prompt context for investment allocation
 */
export function buildInvestmentContext(plan: InvestmentAllocationPlan): string {
  return `[INVESTMENT_ALLOCATION_CONTEXT]
Age: ${plan.age}
Life Stage: ${plan.lifeStage}
Asset Allocation: ${plan.assetAllocation.stocks}% stocks, ${plan.assetAllocation.bonds}% bonds, ${plan.assetAllocation.cash}% cash
Available Tax-Advantaged Accounts: ${plan.taxAdvantagedAccounts.map(a => a.name).join(', ')}
Guidance: ${plan.guidance}
[END_INVESTMENT_ALLOCATION_CONTEXT]`;
}
