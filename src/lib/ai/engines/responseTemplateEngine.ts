/**
 * RESPONSE TEMPLATE ENGINE
 * 
 * Deterministically builds response templates for LLM to fill.
 * 100% deterministic - no LLM calls.
 * Ensures consistent output format across all providers.
 */

import type {
  ResponseTemplate,
  ResponseStructure,
  FinancialDecision,
  ExtractedFinancialData,
  Message,
} from './types';

export class ResponseTemplateEngine {
  /**
   * Build response template based on financial decision
   */
  buildResponseTemplate(
    decision: FinancialDecision,
    data: ExtractedFinancialData,
    conversationHistory: Message[]
  ): ResponseTemplate {
    // If missing required fields, ask question
    if (decision.missingFields.length > 0) {
      return this.buildQuestionTemplate(decision, data);
    }

    // If we have data, provide calculation result
    if (this.hasCalculationData(data, decision)) {
      return this.buildCalculationTemplate(decision, data);
    }

    // Default to explanation
    return this.buildExplanationTemplate(decision, data);
  }

  /**
   * Build question template
   */
  private buildQuestionTemplate(
    decision: FinancialDecision,
    data: ExtractedFinancialData
  ): ResponseTemplate {
    return {
      structure: 'question',
      slots: {
        domain: decision.domain,
        missingFields: decision.missingFields.join(', '),
      },
      constraints: {
        maxSentences: 3,
        maxQuestions: 1,
        requiresCalculation: false,
        requiresAction: false,
        tone: 'warm',
      },
      instructions: `Ask for the next missing field: ${decision.missingFields[0]}.
Be warm and conversational. Explain why you need this information.
Keep response to 2-3 sentences maximum.
Ask only ONE question.
Do NOT ask multiple questions or list options.`,
    };
  }

  /**
   * Build calculation template
   */
  private buildCalculationTemplate(
    decision: FinancialDecision,
    data: ExtractedFinancialData
  ): ResponseTemplate {
    const calculations = this.generateCalculations(decision, data);

    return {
      structure: 'calculation_result',
      slots: {
        domain: decision.domain,
        primaryMetric: calculations.primaryMetric,
        primaryMetricLabel: calculations.primaryMetricLabel,
        secondaryMetric: calculations.secondaryMetric,
        secondaryMetricLabel: calculations.secondaryMetricLabel,
        recommendation: calculations.recommendation,
      },
      constraints: {
        maxSentences: 5,
        maxQuestions: 1,
        requiresCalculation: true,
        requiresAction: true,
        tone: 'warm',
      },
      instructions: `Present the calculation result clearly:
1. State the primary metric and what it means
2. Provide secondary metric if available
3. Explain the recommendation
4. End with ONE specific next action
Keep response to 4-5 sentences.
Use exact numbers from the calculation.
Do NOT invent numbers.
Do NOT ask multiple questions.`,
    };
  }

  /**
   * Build explanation template
   */
  private buildExplanationTemplate(
    decision: FinancialDecision,
    data: ExtractedFinancialData
  ): ResponseTemplate {
    return {
      structure: 'explanation',
      slots: {
        domain: decision.domain,
        urgency: decision.urgency,
      },
      constraints: {
        maxSentences: 6,
        maxQuestions: 1,
        requiresCalculation: false,
        requiresAction: true,
        tone: 'warm',
      },
      instructions: `Explain the financial domain and why it matters:
1. Acknowledge their situation
2. Explain why this domain is important
3. Provide actionable guidance
4. End with ONE specific next action
Keep response to 5-6 sentences.
Be warm and supportive.
Do NOT ask multiple questions.
Do NOT provide generic advice.`,
    };
  }

  /**
   * Check if we have enough data for calculation
   */
  private hasCalculationData(
    data: ExtractedFinancialData,
    decision: FinancialDecision
  ): boolean {
    const requiredFields = decision.requiredFields;
    return requiredFields.every(field => {
      const value = (data as any)[field];
      return value !== undefined && value !== null;
    });
  }

  /**
   * Generate calculation results
   */
  private generateCalculations(
    decision: FinancialDecision,
    data: ExtractedFinancialData
  ): {
    primaryMetric: number;
    primaryMetricLabel: string;
    secondaryMetric?: number;
    secondaryMetricLabel?: string;
    recommendation: string;
  } {
    switch (decision.domain) {
      case 'emergency_fund':
        return this.calculateEmergencyFund(data);
      case 'debt_payoff':
        return this.calculateDebtPayoff(data);
      case 'budget':
        return this.calculateBudget(data);
      case 'investment':
        return this.calculateInvestment(data);
      case 'retirement':
        return this.calculateRetirement(data);
      default:
        return {
          primaryMetric: 0,
          primaryMetricLabel: 'Unknown',
          recommendation: 'Need more information',
        };
    }
  }

  private calculateEmergencyFund(data: ExtractedFinancialData) {
    const essentialExpenses = data.essentialExpenses || 0;
    const targetMonths = 6;
    const targetAmount = essentialExpenses * targetMonths;
    const currentSavings = data.totalSavings || 0;
    const gap = Math.max(0, targetAmount - currentSavings);
    const monthlyIncome = data.monthlyIncome || 0;
    const monthlyAvailable = monthlyIncome - essentialExpenses;
    const monthsToFund = monthlyAvailable > 0 ? Math.ceil(gap / monthlyAvailable) : 0;

    return {
      primaryMetric: gap,
      primaryMetricLabel: `Emergency Fund Gap: $${gap.toLocaleString()}`,
      secondaryMetric: monthsToFund,
      secondaryMetricLabel: `Months to Fund: ${monthsToFund}`,
      recommendation: `Build your emergency fund to $${targetAmount.toLocaleString()} (6 months of expenses). Save $${Math.ceil(monthlyAvailable).toLocaleString()}/month to reach this goal in ${monthsToFund} months.`,
    };
  }

  private calculateDebtPayoff(data: ExtractedFinancialData) {
    const debt = data.highInterestDebt || 0;
    const rate = (data.highInterestRate || 18) / 100 / 12; // Monthly rate
    const monthlyPayment = data.monthlyDebtPayments || (data.monthlyIncome || 0) * 0.1;

    // Simple calculation: months to payoff
    let months = 0;
    let balance = debt;
    while (balance > 0 && months < 360) {
      const interest = balance * rate;
      balance = balance + interest - monthlyPayment;
      months++;
    }

    const totalInterest = months * monthlyPayment - debt;

    return {
      primaryMetric: months,
      primaryMetricLabel: `Payoff Timeline: ${months} months`,
      secondaryMetric: totalInterest,
      secondaryMetricLabel: `Total Interest: $${totalInterest.toLocaleString()}`,
      recommendation: `Pay $${Math.ceil(monthlyPayment).toLocaleString()}/month to eliminate $${debt.toLocaleString()} of debt in ${months} months. You'll save $${Math.ceil(totalInterest).toLocaleString()} in interest.`,
    };
  }

  private calculateBudget(data: ExtractedFinancialData) {
    const income = data.monthlyIncome || 0;
    const essential = data.essentialExpenses || 0;
    const discretionary = data.discretionaryExpenses || 0;
    const savings = income - essential - discretionary;

    const essentialPct = income > 0 ? (essential / income) * 100 : 0;
    const discretionaryPct = income > 0 ? (discretionary / income) * 100 : 0;
    const savingsPct = income > 0 ? (savings / income) * 100 : 0;

    return {
      primaryMetric: savingsPct,
      primaryMetricLabel: `Savings Rate: ${savingsPct.toFixed(0)}%`,
      secondaryMetric: income,
      secondaryMetricLabel: `Monthly Income: $${income.toLocaleString()}`,
      recommendation: `Your budget: ${essentialPct.toFixed(0)}% essential ($${essential.toLocaleString()}), ${discretionaryPct.toFixed(0)}% discretionary ($${discretionary.toLocaleString()}), ${savingsPct.toFixed(0)}% savings ($${savings.toLocaleString()}). Aim for 50/30/20 rule.`,
    };
  }

  private calculateInvestment(data: ExtractedFinancialData) {
    const monthlyInvestment = (data.monthlyIncome || 0) * 0.2; // 20% of income
    const years = data.timeHorizonYears || 10;
    const returnRate = 0.07; // 7% annual return

    // Future value calculation
    const fv = monthlyInvestment * 12 * (Math.pow(1 + returnRate, years) - 1) / returnRate;

    return {
      primaryMetric: fv,
      primaryMetricLabel: `Projected Value: $${fv.toLocaleString()}`,
      secondaryMetric: monthlyInvestment * 12 * years,
      secondaryMetricLabel: `Total Invested: $${(monthlyInvestment * 12 * years).toLocaleString()}`,
      recommendation: `Investing $${Math.ceil(monthlyInvestment).toLocaleString()}/month at 7% annual return could grow to $${Math.ceil(fv).toLocaleString()} in ${years} years.`,
    };
  }

  private calculateRetirement(data: ExtractedFinancialData) {
    const annualExpenses = (data.essentialExpenses || 0) * 12;
    const fireNumber = annualExpenses * 25; // 4% rule
    const currentSavings = data.totalSavings || 0;
    const gap = Math.max(0, fireNumber - currentSavings);

    return {
      primaryMetric: fireNumber,
      primaryMetricLabel: `FIRE Number: $${fireNumber.toLocaleString()}`,
      secondaryMetric: gap,
      secondaryMetricLabel: `Gap to FIRE: $${gap.toLocaleString()}`,
      recommendation: `Your FIRE number is $${fireNumber.toLocaleString()} (25x annual expenses). You need $${gap.toLocaleString()} more to achieve financial independence.`,
    };
  }
}

// Export singleton instance
export const responseTemplateEngine = new ResponseTemplateEngine();
