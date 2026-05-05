/**
 * TASK 3.3: What-If Scenario Modeling Module
 * Allows users to model different financial scenarios and compare outcomes
 */

export type ScenarioType = 'income_change' | 'expense_change' | 'rate_change' | 'goal_timeline' | 'debt_payoff_speed';

export interface Scenario {
  name: string;
  type: ScenarioType;
  description: string;
  changes: Record<string, number | string>;
}

export interface ScenarioResult {
  scenario: Scenario;
  monthlyBudget: number;
  monthsToGoal: number;
  yearsToGoal: number;
  totalCost: number;
  interestPaid: number;
  feasibility: 'achievable' | 'challenging' | 'unrealistic';
  keyMetrics: Record<string, number | string>;
  recommendations: string[];
}

export interface ScenarioComparison {
  baseline: ScenarioResult;
  scenarios: ScenarioResult[];
  bestScenario: ScenarioResult;
  worstScenario: ScenarioResult;
  insights: string[];
}

/**
 * Model a what-if scenario
 */
export function modelScenario(
  scenario: Scenario,
  baselineMonthlyIncome: number,
  baselineMonthlyExpenses: number,
  baselineDebt: number,
  baselineDebtAPR: number,
  baselineGoalAmount: number,
  baselineCurrentAmount: number
): ScenarioResult {
  // Apply scenario changes
  let monthlyIncome = baselineMonthlyIncome;
  let monthlyExpenses = baselineMonthlyExpenses;
  let debt = baselineDebt;
  let debtAPR = baselineDebtAPR;
  let goalAmount = baselineGoalAmount;
  let currentAmount = baselineCurrentAmount;
  
  switch (scenario.type) {
    case 'income_change':
      monthlyIncome = baselineMonthlyIncome + (scenario.changes.amount as number);
      break;
    
    case 'expense_change':
      monthlyExpenses = baselineMonthlyExpenses + (scenario.changes.amount as number);
      break;
    
    case 'rate_change':
      debtAPR = baselineDebtAPR + (scenario.changes.rate as number);
      break;
    
    case 'goal_timeline':
      goalAmount = baselineGoalAmount + (scenario.changes.amount as number);
      break;
    
    case 'debt_payoff_speed':
      // Increase monthly debt payment
      monthlyExpenses = baselineMonthlyExpenses - (scenario.changes.extraPayment as number);
      break;
  }
  
  // Calculate outcomes
  const monthlyBudget = monthlyIncome - monthlyExpenses;
  const goalGap = Math.max(0, goalAmount - currentAmount);
  const monthsToGoal = monthlyBudget > 0 ? Math.ceil(goalGap / monthlyBudget) : 999;
  const yearsToGoal = Math.floor(monthsToGoal / 12);
  
  // Calculate interest paid
  const monthlyRate = debtAPR / 100 / 12;
  const monthsToPayDebt = debt > 0 ? Math.ceil(Math.log(1 + (monthlyBudget * monthlyRate) / debt) / Math.log(1 + monthlyRate)) : 0;
  let interestPaid = 0;
  let remainingDebt = debt;
  for (let i = 0; i < monthsToPayDebt; i++) {
    const interest = Math.round(remainingDebt * monthlyRate);
    interestPaid += interest;
    remainingDebt = Math.max(0, remainingDebt - (monthlyBudget - interest));
  }
  
  // Determine feasibility
  let feasibility: 'achievable' | 'challenging' | 'unrealistic' = 'achievable';
  if (monthlyBudget < 0) {
    feasibility = 'unrealistic';
  } else if (monthlyBudget < 500) {
    feasibility = 'challenging';
  }
  
  // Calculate total cost
  const totalCost = goalAmount + interestPaid;
  
  // Generate recommendations
  const recommendations: string[] = [];
  if (monthlyBudget < 0) {
    recommendations.push('This scenario is not feasible. Expenses exceed income.');
  } else if (monthlyBudget < 500) {
    recommendations.push('Limited monthly surplus. Consider increasing income or reducing expenses.');
  } else {
    recommendations.push(`You can allocate $${monthlyBudget}/month to goals.`);
  }
  
  if (yearsToGoal > 10) {
    recommendations.push('This timeline is quite long. Consider increasing contributions or adjusting goals.');
  }
  
  return {
    scenario,
    monthlyBudget,
    monthsToGoal,
    yearsToGoal,
    totalCost,
    interestPaid,
    feasibility,
    keyMetrics: {
      monthlyIncome,
      monthlyExpenses,
      debt,
      debtAPR,
      goalAmount,
      currentAmount,
    },
    recommendations,
  };
}

/**
 * Compare multiple scenarios
 */
export function compareScenarios(
  baseline: ScenarioResult,
  scenarios: ScenarioResult[]
): ScenarioComparison {
  const allResults = [baseline, ...scenarios];
  
  // Find best and worst scenarios
  const bestScenario = allResults.reduce((best, current) =>
    current.yearsToGoal < best.yearsToGoal ? current : best
  );
  
  const worstScenario = allResults.reduce((worst, current) =>
    current.yearsToGoal > worst.yearsToGoal ? current : worst
  );
  
  // Generate insights
  const insights: string[] = [];
  
  const timeDifference = worstScenario.yearsToGoal - bestScenario.yearsToGoal;
  if (timeDifference > 5) {
    insights.push(`Scenario choice matters significantly: ${timeDifference} year difference between best and worst.`);
  }
  
  const costDifference = worstScenario.totalCost - bestScenario.totalCost;
  if (costDifference > 10000) {
    insights.push(`Total cost varies by $${costDifference.toLocaleString()} across scenarios.`);
  }
  
  const achievableScenarios = allResults.filter(r => r.feasibility === 'achievable').length;
  if (achievableScenarios === 0) {
    insights.push('None of these scenarios are currently feasible. Consider increasing income or reducing expenses.');
  } else if (achievableScenarios === 1) {
    insights.push('Only one scenario is feasible. Focus on that path.');
  }
  
  return {
    baseline,
    scenarios,
    bestScenario,
    worstScenario,
    insights,
  };
}

/**
 * Build system prompt context for scenario modeling
 */
export function buildScenarioContext(comparison: ScenarioComparison): string {
  const scenarioSummaries = comparison.scenarios
    .map(s => `${s.scenario.name}: ${s.yearsToGoal} years, $${s.totalCost.toLocaleString()} total cost`)
    .join('; ');
  
  return `SCENARIO COMPARISON:
Baseline: ${comparison.baseline.yearsToGoal} years, $${comparison.baseline.totalCost.toLocaleString()} total cost
Best scenario: ${comparison.bestScenario.scenario.name} (${comparison.bestScenario.yearsToGoal} years)
Worst scenario: ${comparison.worstScenario.scenario.name} (${comparison.worstScenario.yearsToGoal} years)
Scenarios: ${scenarioSummaries}
Insights: ${comparison.insights.join('. ')}`;
}

/**
 * Detect if user is asking about what-if scenarios
 */
export function isScenarioContext(text: string): boolean {
  const patterns = [
    /\b(what if|what happens if|suppose|imagine|if i|if we).{0,30}(increase|decrease|change|raise|lower)\b/i,
    /\b(compare|scenario|option|alternative|different path)\b/i,
    /\b(how much|how long).{0,30}(if|would).{0,30}(increase|decrease|change)\b/i,
  ];
  
  return patterns.some(p => p.test(text));
}
