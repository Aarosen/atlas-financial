/**
 * Predictive Recommendation Engine
 * Requirement 9: Predictive Recommendations (What Should We Focus On?)
 * 
 * Analyzes customer's financial data and predicts what would have the highest impact,
 * suggesting it conversationally while remaining flexible to customer's preferences.
 */

export interface FinancialMetrics {
  monthlyIncome: number;
  monthlyExpenses: number;
  totalDebt: number;
  debtInterestRate: number;
  currentSavings: number;
  savingsGoal: number;
  monthlyDebtPayment: number;
}

export interface Recommendation {
  id: string;
  focusArea: 'debt_payoff' | 'emergency_fund' | 'savings_growth' | 'expense_reduction' | 'income_growth' | 'investing';
  title: string;
  description: string;
  impact: {
    metric: string;
    value: number;
    unit: string;
    timeframe: string;
  };
  reasoning: string;
  confidence: number;
}

export interface PredictiveAnalysis {
  topRecommendations: Recommendation[];
  monthlyNetIncome: number;
  debtToIncomeRatio: number;
  savingsRate: number;
  emergencyFundMonths: number;
  reasoning: string;
}

export function calculateFinancialMetrics(data: Partial<FinancialMetrics>): FinancialMetrics {
  return {
    monthlyIncome: data.monthlyIncome || 0,
    monthlyExpenses: data.monthlyExpenses || 0,
    totalDebt: data.totalDebt || 0,
    debtInterestRate: data.debtInterestRate || 0,
    currentSavings: data.currentSavings || 0,
    savingsGoal: data.savingsGoal || 0,
    monthlyDebtPayment: data.monthlyDebtPayment || 0,
  };
}

export function predictRecommendations(metrics: FinancialMetrics): PredictiveAnalysis {
  const monthlyNetIncome = metrics.monthlyIncome - metrics.monthlyExpenses;
  const debtToIncomeRatio = metrics.monthlyIncome > 0 ? metrics.totalDebt / (metrics.monthlyIncome * 12) : 0;
  const savingsRate = metrics.monthlyIncome > 0 ? (monthlyNetIncome / metrics.monthlyIncome) * 100 : 0;
  const emergencyFundMonths = metrics.monthlyExpenses > 0 ? metrics.currentSavings / metrics.monthlyExpenses : 0;

  const recommendations: Recommendation[] = [];

  // High-interest debt payoff recommendation
  if (metrics.totalDebt > 0 && metrics.debtInterestRate > 10) {
    const monthsToPayoff = metrics.monthlyDebtPayment > 0 ? metrics.totalDebt / metrics.monthlyDebtPayment : 0;
    const interestSaved = (metrics.totalDebt * metrics.debtInterestRate * monthsToPayoff) / 100 / 12;

    recommendations.push({
      id: 'debt_payoff_high_interest',
      focusArea: 'debt_payoff',
      title: 'Pay Off High-Interest Debt',
      description: `You have $${metrics.totalDebt.toLocaleString()} in debt at ${metrics.debtInterestRate}% APR. Focusing on this could save you significant interest.`,
      impact: {
        metric: 'Interest Saved',
        value: interestSaved,
        unit: 'dollars',
        timeframe: `${Math.ceil(monthsToPayoff)} months`,
      },
      reasoning: 'High-interest debt is costing you money every month. Paying it off first maximizes your financial progress.',
      confidence: 0.9,
    });
  }

  // Emergency fund recommendation
  if (emergencyFundMonths < 3) {
    const targetEmergencyFund = metrics.monthlyExpenses * 3;
    const amountNeeded = targetEmergencyFund - metrics.currentSavings;

    recommendations.push({
      id: 'emergency_fund',
      focusArea: 'emergency_fund',
      title: 'Build Emergency Fund',
      description: `You have ${emergencyFundMonths.toFixed(1)} months of expenses saved. A 3-month emergency fund would give you peace of mind.`,
      impact: {
        metric: 'Security',
        value: amountNeeded,
        unit: 'dollars to save',
        timeframe: `${Math.ceil(amountNeeded / monthlyNetIncome)} months`,
      },
      reasoning: 'An emergency fund prevents you from going into debt when unexpected expenses arise.',
      confidence: 0.85,
    });
  }

  // Savings growth recommendation
  if (monthlyNetIncome > 0 && metrics.currentSavings < metrics.savingsGoal) {
    const savingsGap = metrics.savingsGoal - metrics.currentSavings;
    const monthsToGoal = monthlyNetIncome > 0 ? savingsGap / monthlyNetIncome : 0;

    recommendations.push({
      id: 'savings_growth',
      focusArea: 'savings_growth',
      title: 'Accelerate Savings Growth',
      description: `You're ${((metrics.currentSavings / metrics.savingsGoal) * 100).toFixed(0)}% toward your $${metrics.savingsGoal.toLocaleString()} goal.`,
      impact: {
        metric: 'Goal Progress',
        value: savingsGap,
        unit: 'dollars to save',
        timeframe: `${Math.ceil(monthsToGoal)} months`,
      },
      reasoning: 'Consistent saving builds wealth and provides options for your future.',
      confidence: 0.8,
    });
  }

  // Expense reduction recommendation
  if (savingsRate < 10 && monthlyNetIncome < 500) {
    const targetExpenses = metrics.monthlyIncome * 0.7;
    const reductionNeeded = metrics.monthlyExpenses - targetExpenses;

    recommendations.push({
      id: 'expense_reduction',
      focusArea: 'expense_reduction',
      title: 'Reduce Monthly Expenses',
      description: `Your expenses are ${((metrics.monthlyExpenses / metrics.monthlyIncome) * 100).toFixed(0)}% of income. Reducing them could free up cash for savings.`,
      impact: {
        metric: 'Monthly Surplus',
        value: reductionNeeded,
        unit: 'dollars',
        timeframe: 'Ongoing',
      },
      reasoning: 'Lower expenses mean more money available for debt payoff or savings.',
      confidence: 0.75,
    });
  }

  // Income growth recommendation
  if (savingsRate < 15 && monthlyNetIncome < 500) {
    const targetIncome = metrics.monthlyExpenses / 0.7;
    const incomeNeeded = targetIncome - metrics.monthlyIncome;

    recommendations.push({
      id: 'income_growth',
      focusArea: 'income_growth',
      title: 'Increase Income',
      description: `Increasing your income by $${incomeNeeded.toLocaleString()} per month would significantly improve your financial situation.`,
      impact: {
        metric: 'Monthly Surplus',
        value: incomeNeeded,
        unit: 'dollars',
        timeframe: 'Variable',
      },
      reasoning: 'More income provides more flexibility for savings and debt payoff.',
      confidence: 0.7,
    });
  }

  // Investing recommendation
  if (emergencyFundMonths >= 3 && metrics.totalDebt === 0 && monthlyNetIncome > 500) {
    recommendations.push({
      id: 'investing',
      focusArea: 'investing',
      title: 'Start Investing',
      description: 'You have a solid financial foundation. Investing could help your money grow faster.',
      impact: {
        metric: 'Potential Growth',
        value: monthlyNetIncome * 12 * 0.07,
        unit: 'dollars (7% annual return)',
        timeframe: '1 year',
      },
      reasoning: 'With emergency fund and no debt, investing helps build long-term wealth.',
      confidence: 0.8,
    });
  }

  // Sort by confidence and return top 3
  const topRecommendations = recommendations
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  return {
    topRecommendations,
    monthlyNetIncome,
    debtToIncomeRatio,
    savingsRate,
    emergencyFundMonths,
    reasoning: `Based on your financial data, we recommend focusing on: ${topRecommendations.map(r => r.focusArea).join(', ')}`,
  };
}

export function formatRecommendationForConversation(rec: Recommendation): string {
  return `${rec.title}: ${rec.description} This could ${rec.impact.metric.toLowerCase()} by $${rec.impact.value.toLocaleString()} ${rec.impact.timeframe}.`;
}

export function shouldPresentRecommendation(rec: Recommendation, customerPreference?: string): boolean {
  if (!customerPreference) return rec.confidence >= 0.7;
  return rec.focusArea === customerPreference || rec.confidence >= 0.8;
}
