// Proactive Recommendations Engine - Phase 3E
// Identifies financial opportunities and surfaces recommendations before users ask

export interface FinancialOpportunity {
  id: string;
  category: 'savings' | 'debt' | 'investment' | 'tax' | 'retirement' | 'insurance';
  title: string;
  description: string;
  potentialImpact: number; // dollars per year
  urgency: 'low' | 'medium' | 'high' | 'critical';
  actionItems: string[];
  estimatedTimeToImplement: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface FinancialState {
  monthlyIncome: number;
  monthlyExpenses: number;
  totalSavings: number;
  highInterestDebt: number;
  lowInterestDebt: number;
  monthlyDebtPayments: number;
  retirementSavings: number;
  age: number;
  yearsToRetirement: number;
  riskTolerance: 'cautious' | 'balanced' | 'growth';
  lifeStage: 'student' | 'early_career' | 'mid_career' | 'late_career' | 'retired';
}

export class ProactiveRecommendationsEngine {
  /**
   * Analyze financial state and identify opportunities
   */
  identifyOpportunities(state: FinancialState): FinancialOpportunity[] {
    const opportunities: FinancialOpportunity[] = [];

    // Check for emergency fund gap
    const emergencyFundTarget = state.monthlyExpenses * 6;
    if (state.totalSavings < emergencyFundTarget) {
      opportunities.push({
        id: 'emergency_fund_gap',
        category: 'savings',
        title: 'Build Emergency Fund',
        description: `You have ${(state.totalSavings / state.monthlyExpenses).toFixed(1)} months of expenses saved. Financial experts recommend 6 months.`,
        potentialImpact: 0, // Peace of mind, not direct financial impact
        urgency: state.totalSavings < state.monthlyExpenses ? 'critical' : 'high',
        actionItems: [
          `Save $${(emergencyFundTarget - state.totalSavings).toLocaleString()} to reach 6-month target`,
          'Open high-yield savings account (currently 4-5% APY)',
          'Set up automatic transfers of $200-500/month',
        ],
        estimatedTimeToImplement: `${Math.ceil((emergencyFundTarget - state.totalSavings) / 500)} months`,
        riskLevel: 'low',
      });
    }

    // Check for high-interest debt
    if (state.highInterestDebt > 0) {
      const annualInterestCost = state.highInterestDebt * 0.18; // Assume 18% APR for credit cards
      opportunities.push({
        id: 'high_interest_debt',
        category: 'debt',
        title: 'Eliminate High-Interest Debt',
        description: `You're paying approximately $${annualInterestCost.toLocaleString()} per year in interest on high-interest debt.`,
        potentialImpact: annualInterestCost,
        urgency: 'critical',
        actionItems: [
          'Use debt avalanche method (pay highest interest rate first)',
          'Consider balance transfer to 0% APR card (if available)',
          'Negotiate lower rates with creditors',
          `Target payoff in ${Math.ceil(state.highInterestDebt / (state.monthlyIncome * 0.1))} months`,
        ],
        estimatedTimeToImplement: `${Math.ceil(state.highInterestDebt / (state.monthlyIncome * 0.1))} months`,
        riskLevel: 'low',
      });
    }

    // Check for retirement savings gap
    const recommendedRetirementSavings = this.calculateRecommendedRetirementSavings(state);
    if (state.retirementSavings < recommendedRetirementSavings) {
      opportunities.push({
        id: 'retirement_savings_gap',
        category: 'retirement',
        title: 'Increase Retirement Savings',
        description: `At your current savings rate, you may fall short of retirement goals. Target: $${recommendedRetirementSavings.toLocaleString()}`,
        potentialImpact: (recommendedRetirementSavings - state.retirementSavings) * 0.07, // 7% annual growth
        urgency: state.lifeStage === 'late_career' ? 'critical' : 'high',
        actionItems: [
          `Increase 401(k) contributions to at least 15% of income`,
          'Maximize employer match (free money)',
          'Consider Roth IRA for tax-free growth',
          'Review investment allocation for your age',
        ],
        estimatedTimeToImplement: 'Ongoing',
        riskLevel: 'low',
      });
    }

    // Check for tax optimization opportunities
    if (state.monthlyIncome > 5000) {
      opportunities.push({
        id: 'tax_optimization',
        category: 'tax',
        title: 'Tax Optimization Opportunities',
        description: 'Review tax-advantaged accounts and deductions to reduce tax burden.',
        potentialImpact: state.monthlyIncome * 12 * 0.15 * 0.1, // Estimate 10% of potential tax savings
        urgency: 'medium',
        actionItems: [
          'Maximize 401(k) contributions ($23,500 limit in 2025)',
          'Contribute to HSA if eligible (triple tax advantage)',
          'Consider tax-loss harvesting in taxable accounts',
          'Review itemized vs standard deduction',
        ],
        estimatedTimeToImplement: 'Before year-end',
        riskLevel: 'low',
      });
    }

    // Check for investment opportunities
    if (state.totalSavings > state.monthlyExpenses * 3 && state.riskTolerance !== 'cautious') {
      opportunities.push({
        id: 'investment_opportunity',
        category: 'investment',
        title: 'Invest Excess Savings',
        description: `You have excess savings beyond emergency fund. Consider investing for long-term growth.`,
        potentialImpact: (state.totalSavings - state.monthlyExpenses * 3) * 0.07, // 7% annual return
        urgency: 'medium',
        actionItems: [
          'Open brokerage account (Vanguard, Fidelity, Schwab)',
          'Start with low-cost index funds (VOO, VTI, BND)',
          'Dollar-cost average into market ($500-1000/month)',
          'Rebalance annually',
        ],
        estimatedTimeToImplement: 'Immediate',
        riskLevel: state.riskTolerance === 'balanced' ? 'medium' : 'low',
      });
    }

    // Check for insurance gaps
    if (state.lifeStage === 'early_career' || state.lifeStage === 'mid_career') {
      opportunities.push({
        id: 'insurance_review',
        category: 'insurance',
        title: 'Review Insurance Coverage',
        description: 'Ensure adequate coverage for life, disability, and health.',
        potentialImpact: 0, // Risk mitigation
        urgency: 'medium',
        actionItems: [
          'Get term life insurance (10x annual income)',
          'Review disability insurance (60% of income)',
          'Check health insurance coverage adequacy',
          'Consider umbrella policy if high net worth',
        ],
        estimatedTimeToImplement: '1-2 weeks',
        riskLevel: 'low',
      });
    }

    // Sort by urgency and impact
    return opportunities.sort((a, b) => {
      const urgencyOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      }
      return b.potentialImpact - a.potentialImpact;
    });
  }

  /**
   * Calculate recommended retirement savings based on age and income
   */
  private calculateRecommendedRetirementSavings(state: FinancialState): number {
    const annualIncome = state.monthlyIncome * 12;
    const yearsWorked = Math.max(0, state.age - 22); // Assume started working at 22
    const yearsToRetirement = Math.max(1, state.yearsToRetirement);

    // Fidelity benchmarks: 1x salary by 30, 3x by 40, 6x by 50, 10x by 60, 12x by 67
    let multiplier = 1;
    if (state.age >= 30) multiplier = 3;
    if (state.age >= 40) multiplier = 6;
    if (state.age >= 50) multiplier = 10;
    if (state.age >= 60) multiplier = 12;

    return annualIncome * multiplier;
  }

  /**
   * Generate recommendation text for Claude
   */
  formatRecommendationsForClaude(opportunities: FinancialOpportunity[]): string {
    if (opportunities.length === 0) {
      return '';
    }

    let text = '\nPROACTIVE RECOMMENDATIONS:\n\n';

    for (const opp of opportunities.slice(0, 3)) {
      // Show top 3 opportunities
      text += `**${opp.title}** (${opp.urgency} urgency)\n`;
      text += `${opp.description}\n`;

      if (opp.potentialImpact > 0) {
        text += `Potential impact: $${opp.potentialImpact.toLocaleString()}/year\n`;
      }

      text += `Action items:\n`;
      for (const action of opp.actionItems.slice(0, 2)) {
        // Show top 2 action items
        text += `- ${action}\n`;
      }
      text += '\n';
    }

    return text;
  }

  /**
   * Determine if recommendation should be surfaced in conversation
   */
  shouldSurfaceRecommendation(opportunity: FinancialOpportunity, messageCount: number, topicsDiscussed: string[]): boolean {
    // Always surface critical opportunities early
    if (opportunity.urgency === 'critical' && messageCount < 10) {
      return true;
    }

    // Surface if topic is being discussed
    if (topicsDiscussed.includes(opportunity.category)) {
      return true;
    }

    // Surface high-impact opportunities after some conversation
    if (opportunity.potentialImpact > 1000 && messageCount > 5) {
      return true;
    }

    return false;
  }
}

// Singleton instance
let proactiveEngineInstance: ProactiveRecommendationsEngine | null = null;

export function getProactiveRecommendationsEngine(): ProactiveRecommendationsEngine {
  if (!proactiveEngineInstance) {
    proactiveEngineInstance = new ProactiveRecommendationsEngine();
  }
  return proactiveEngineInstance;
}
