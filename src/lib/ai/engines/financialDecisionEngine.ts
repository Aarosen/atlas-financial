/**
 * FINANCIAL DECISION ENGINE
 * 
 * Deterministically decides which financial domain to focus on.
 * This is 100% deterministic - no LLM calls, no randomness.
 * Same input always produces same output.
 */

import type {
  FinancialDecision,
  ExtractedFinancialData,
  Message,
  Goal,
  FinancialDomain,
} from './types';

export class FinancialDecisionEngine {
  /**
   * Decide which financial domain to focus on
   * 
   * Decision logic:
   * 1. Check for emergency signals (savings < 1 month expenses OR emergency language)
   * 2. Check for high-interest debt (>$0)
   * 3. Check for investment readiness (emergency fund funded AND no high-interest debt)
   * 4. Check for retirement readiness (time horizon ≥10 years)
   * 5. Default to budget
   */
  decideFinancialDomain(
    data: ExtractedFinancialData,
    conversationHistory: Message[],
    priorGoals: Goal[]
  ): FinancialDecision {
    const requiredFields: string[] = [];
    const missingFields: string[] = [];

    // Track which fields we have
    if (data.monthlyIncome === undefined) missingFields.push('monthlyIncome');
    if (data.essentialExpenses === undefined) missingFields.push('essentialExpenses');
    if (data.totalSavings === undefined) missingFields.push('totalSavings');

    // 1. EMERGENCY FUND PRIORITY
    // If savings < 1 month of expenses, emergency fund is critical
    if (
      data.essentialExpenses !== undefined &&
      data.totalSavings !== undefined &&
      data.totalSavings < data.essentialExpenses
    ) {
      return {
        domain: 'emergency_fund',
        reasoning: `Emergency fund is critically underfunded. Current savings (${this.formatCurrency(data.totalSavings)}) is less than 1 month of expenses (${this.formatCurrency(data.essentialExpenses)}).`,
        requiredFields: ['monthlyIncome', 'essentialExpenses', 'discretionaryExpenses'],
        missingFields,
        urgency: 'critical',
        nextAction: 'Build emergency fund to 3-6 months of expenses',
        confidence: 0.95,
      };
    }

    // 2. HIGH-INTEREST DEBT PRIORITY
    // If high-interest debt exists and emergency fund is adequate, prioritize debt payoff
    if (
      data.highInterestDebt !== undefined &&
      data.highInterestDebt > 0 &&
      data.essentialExpenses !== undefined &&
      data.totalSavings !== undefined &&
      data.totalSavings >= data.essentialExpenses * 3
    ) {
      return {
        domain: 'debt_payoff',
        reasoning: `High-interest debt (${this.formatCurrency(data.highInterestDebt)} @ ${data.highInterestRate || 18}% APR) is costing you money. Emergency fund is adequate (${this.formatCurrency(data.totalSavings)}).`,
        requiredFields: ['monthlyIncome', 'essentialExpenses', 'highInterestDebt', 'highInterestRate'],
        missingFields,
        urgency: 'high',
        nextAction: 'Create debt payoff plan using avalanche method',
        confidence: 0.9,
      };
    }

    // 3. RETIREMENT PLANNING (PRIORITY OVER INVESTMENT)
    // If time horizon is 10+ years and no urgent financial needs
    if (
      data.timeHorizonYears !== undefined &&
      data.timeHorizonYears >= 10 &&
      (data.highInterestDebt === undefined || data.highInterestDebt === 0) &&
      data.essentialExpenses !== undefined &&
      data.totalSavings !== undefined &&
      data.totalSavings >= data.essentialExpenses * 3
    ) {
      return {
        domain: 'retirement',
        reasoning: `Long time horizon (${data.timeHorizonYears} years) and stable financial foundation. Ready to plan for retirement.`,
        requiredFields: ['monthlyIncome', 'timeHorizonYears', 'riskTolerance'],
        missingFields,
        urgency: 'low',
        nextAction: 'Calculate retirement number and create savings plan',
        confidence: 0.8,
      };
    }

    // 4. INVESTMENT READINESS
    // If emergency fund is 6+ months AND no high-interest debt, ready to invest
    if (
      data.essentialExpenses !== undefined &&
      data.totalSavings !== undefined &&
      data.totalSavings >= data.essentialExpenses * 6 &&
      (data.highInterestDebt === undefined || data.highInterestDebt === 0) &&
      data.timeHorizonYears !== undefined &&
      data.timeHorizonYears >= 5
    ) {
      return {
        domain: 'investment',
        reasoning: `Emergency fund is well-funded (${this.formatCurrency(data.totalSavings)}). No high-interest debt. Time horizon is ${data.timeHorizonYears} years - ready to invest.`,
        requiredFields: ['monthlyIncome', 'riskTolerance', 'timeHorizonYears'],
        missingFields,
        urgency: 'medium',
        nextAction: 'Determine asset allocation based on risk tolerance',
        confidence: 0.85,
      };
    }

    // 5. BUDGET BUILDING (DEFAULT)
    // If we don't have enough data to make a specific decision, focus on budgeting
    if (
      data.monthlyIncome !== undefined &&
      data.essentialExpenses !== undefined
    ) {
      return {
        domain: 'budget',
        reasoning: `Need to understand spending patterns before making larger financial decisions.`,
        requiredFields: ['monthlyIncome', 'essentialExpenses', 'discretionaryExpenses', 'totalSavings'],
        missingFields,
        urgency: 'medium',
        nextAction: 'Build a 50/30/20 budget to track spending',
        confidence: 0.7,
      };
    }

    // 6. GENERAL GUIDANCE (FALLBACK)
    // If we don't have enough data, ask for more information
    return {
      domain: 'general',
      reasoning: 'Need to gather more financial information to make a specific recommendation.',
      requiredFields: ['monthlyIncome', 'essentialExpenses', 'totalSavings'],
      missingFields,
      urgency: 'low',
      nextAction: 'Share your monthly income and expenses so I can help you prioritize',
      confidence: 0.5,
    };
  }

  /**
   * Format number as currency for display
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
}

// Export singleton instance
export const financialDecisionEngine = new FinancialDecisionEngine();
