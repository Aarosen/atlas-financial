/**
 * TASK 3.1: Variable Income Planning Module
 * Handles planning for users with irregular/gig income
 */

export interface VariableIncomePlan {
  incomeType: 'fixed' | 'variable' | 'mixed';
  monthlyIncomeMin: number;
  monthlyIncomeMax: number;
  monthlyIncomeAverage: number;
  baselineIncome: number; // Conservative low-month estimate
  spikeIncome: number; // High-month income
  budgetBased: number; // Income to budget from (baseline)
  spikeAllocation: {
    emergencyFund: number; // % of spike
    debtPayoff: number; // % of spike
    retirement: number; // % of spike
    savings: number; // % of spike
  };
  monthlyBudget: number;
  volatilityRisk: 'low' | 'medium' | 'high';
  recommendations: string[];
}

/**
 * Calculate variable income budget using low-month baseline
 * Prevents feast-or-famine cycle by budgeting conservatively
 * Allocates spikes to goals in priority order
 */
export function calculateVariableIncomePlan(
  monthlyIncomeMin: number,
  monthlyIncomeMax: number,
  monthlyExpenses: number,
  highInterestDebt: number,
  totalSavings: number,
  retirementSavings: number
): VariableIncomePlan {
  // Calculate baseline (low month) and spike (high month)
  const baselineIncome = monthlyIncomeMin;
  const spikeIncome = monthlyIncomeMax - monthlyIncomeMin;
  const averageIncome = (monthlyIncomeMin + monthlyIncomeMax) / 2;
  
  // Volatility assessment
  const volatilityPercent = (spikeIncome / monthlyIncomeMax) * 100;
  const volatilityRisk = 
    volatilityPercent > 50 ? 'high' :
    volatilityPercent > 25 ? 'medium' :
    'low';
  
  // Budget from baseline (conservative approach)
  const monthlyBudget = baselineIncome - monthlyExpenses;
  
  // Allocate spike income to goals in priority order
  const spikeAllocation = {
    emergencyFund: 0.4, // 40% to emergency fund
    debtPayoff: 0.3,    // 30% to high-interest debt
    retirement: 0.2,    // 20% to retirement
    savings: 0.1,       // 10% to savings
  };
  
  // Generate recommendations
  const recommendations: string[] = [];
  
  if (volatilityRisk === 'high') {
    recommendations.push('Your income varies significantly. Budget conservatively from your low-month income.');
    recommendations.push('Build a 6-month emergency fund to handle income gaps.');
  }
  
  if (monthlyBudget < 0) {
    recommendations.push('Your baseline income doesn\'t cover expenses. Increase income or reduce expenses.');
  } else if (monthlyBudget < 500) {
    recommendations.push('Limited surplus from baseline income. Use spike income strategically for goals.');
  }
  
  recommendations.push('Allocate spike income: 40% emergency fund, 30% debt, 20% retirement, 10% savings.');
  recommendations.push('Track actual income monthly to identify patterns and adjust budget accordingly.');
  
  return {
    incomeType: monthlyIncomeMin === monthlyIncomeMax ? 'fixed' : 'variable',
    monthlyIncomeMin,
    monthlyIncomeMax,
    monthlyIncomeAverage: averageIncome,
    baselineIncome,
    spikeIncome,
    budgetBased: monthlyBudget,
    spikeAllocation,
    monthlyBudget,
    volatilityRisk,
    recommendations,
  };
}

/**
 * Build system prompt context for variable income planning
 */
export function buildVariableIncomeContext(plan: VariableIncomePlan): string {
  const spikeAllocationText = Object.entries(plan.spikeAllocation)
    .map(([goal, percent]) => `${goal}: ${Math.round(percent * 100)}%`)
    .join(', ');
  
  return `VARIABLE INCOME PLAN:
Income type: ${plan.incomeType}
Low month income: $${plan.monthlyIncomeMin.toLocaleString()}
High month income: $${plan.monthlyIncomeMax.toLocaleString()}
Average income: $${plan.monthlyIncomeAverage.toLocaleString()}
Baseline (low month) income: $${plan.baselineIncome.toLocaleString()}
Spike income (high - low): $${plan.spikeIncome.toLocaleString()}
Monthly budget (baseline - expenses): $${plan.monthlyBudget.toLocaleString()}
Volatility risk: ${plan.volatilityRisk}
Spike allocation: ${spikeAllocationText}
Recommendations: ${plan.recommendations.join('. ')}`;
}

/**
 * Detect if user has variable/gig income
 */
export function isVariableIncomeContext(text: string): boolean {
  const patterns = [
    /\b(variable|irregular|gig|freelance|self-employed|contract|seasonal)\b/i,
    /\b(some months|some weeks).{0,30}(make|earn|income)\b/i,
    /\b(income).{0,30}(varies|fluctuates|changes|inconsistent)\b/i,
    /\b(one month).{0,30}(next month).{0,30}(different|varies)\b/i,
  ];
  
  return patterns.some(p => p.test(text));
}
