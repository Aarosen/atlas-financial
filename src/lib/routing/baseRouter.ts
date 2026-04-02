/**
 * BASE DECISION ROUTER
 * 
 * Abstract base class for all decision routers
 * Provides common functionality for routing decisions
 */

import type {
  IDecisionRouter,
  DecisionContext,
  RoutingDecision,
  FinancialSnapshot,
  SituationAssessment,
} from './types';

export abstract class BaseRouter implements IDecisionRouter {
  protected priority: number;
  protected name: string;

  constructor(name: string, priority: number = 0) {
    this.name = name;
    this.priority = priority;
  }

  abstract canHandle(context: DecisionContext): boolean;
  abstract route(context: DecisionContext): RoutingDecision;

  getPriority(): number {
    return this.priority;
  }

  getName(): string {
    return this.name;
  }

  /**
   * Assess financial situation
   */
  protected assessSituation(snapshot: FinancialSnapshot): SituationAssessment {
    const monthlyNetIncome = snapshot.monthlyIncome;
    const monthlyExpenses = snapshot.essentialExpenses + snapshot.discretionaryExpenses;
    const monthlySurplus = monthlyNetIncome - monthlyExpenses;
    const savingsRate = monthlyNetIncome > 0 ? (monthlySurplus / monthlyNetIncome) * 100 : 0;
    const debtToIncomeRatio = monthlyNetIncome > 0 ? snapshot.totalDebt / monthlyNetIncome : 999;
    const emergencyFundMonths = monthlyExpenses > 0 ? snapshot.totalSavings / monthlyExpenses : 0;

    // Determine situation
    let situation: 'crisis' | 'emergency' | 'struggling' | 'stable' | 'thriving';
    let riskLevel: 'critical' | 'high' | 'medium' | 'low';

    if (monthlyNetIncome === 0 || monthlySurplus < 0) {
      situation = 'crisis';
      riskLevel = 'critical';
    } else if (emergencyFundMonths < 1 || debtToIncomeRatio > 1) {
      situation = 'emergency';
      riskLevel = 'high';
    } else if (savingsRate < 10 || debtToIncomeRatio > 0.5) {
      situation = 'struggling';
      riskLevel = 'medium';
    } else if (savingsRate < 20 || debtToIncomeRatio > 0.2) {
      situation = 'stable';
      riskLevel = 'low';
    } else {
      situation = 'thriving';
      riskLevel = 'low';
    }

    return {
      situation,
      monthlyNetIncome,
      monthlyExpenses,
      savingsRate,
      debtToIncomeRatio,
      emergencyFundMonths,
      riskLevel,
    };
  }

  /**
   * Calculate emergency fund target
   */
  protected calculateEmergencyFundTarget(snapshot: FinancialSnapshot): number {
    const monthlyExpenses = snapshot.essentialExpenses + snapshot.discretionaryExpenses;
    return monthlyExpenses * 6; // 6 months of expenses
  }

  /**
   * Calculate debt payoff timeline
   */
  protected calculateDebtPayoffTimeline(
    debt: number,
    monthlyPayment: number,
    interestRate: number = 0
  ): number {
    if (monthlyPayment <= 0) return 999;
    if (interestRate === 0) {
      return Math.ceil(debt / monthlyPayment);
    }

    // Using amortization formula
    const monthlyRate = interestRate / 100 / 12;
    if (monthlyRate === 0) return Math.ceil(debt / monthlyPayment);

    const months = Math.log(monthlyPayment / (monthlyPayment - debt * monthlyRate)) /
      Math.log(1 + monthlyRate);
    return Math.ceil(months);
  }

  /**
   * Determine goal priority based on situation
   */
  protected determinePriority(situation: 'crisis' | 'emergency' | 'struggling' | 'stable' | 'thriving'): 'critical' | 'high' | 'medium' | 'low' {
    switch (situation) {
      case 'crisis':
        return 'critical';
      case 'emergency':
        return 'high';
      case 'struggling':
        return 'high';
      case 'stable':
        return 'medium';
      case 'thriving':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Check if user message contains keywords
   */
  protected messageContainsKeywords(message: string, keywords: string[]): boolean {
    const lowerMessage = message.toLowerCase();
    return keywords.some(keyword => lowerMessage.includes(keyword.toLowerCase()));
  }

  /**
   * Extract numbers from message
   */
  protected extractNumbers(message: string): number[] {
    const matches = message.match(/\$?[\d,]+(?:\.\d{2})?/g) || [];
    return matches.map(m => {
      const cleaned = m.replace(/[$,]/g, '');
      return parseFloat(cleaned);
    });
  }

  /**
   * Format currency
   */
  protected formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
}
