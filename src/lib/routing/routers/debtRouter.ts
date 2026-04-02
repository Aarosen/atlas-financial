/**
 * DEBT DECISION ROUTER
 * 
 * Routes decisions for users with significant debt
 * Handles high-interest debt, debt payoff strategies, and debt consolidation
 */

import { BaseRouter } from '../baseRouter';
import type { DecisionContext, RoutingDecision } from '../types';

export class DebtRouter extends BaseRouter {
  constructor() {
    super('DebtRouter', 90); // High priority
  }

  canHandle(context: DecisionContext): boolean {
    const { snapshot } = context;
    
    // Handle if significant debt exists
    if (snapshot.totalDebt === 0) return false;
    
    // High priority if high-interest debt
    if (snapshot.highInterestDebt > 0) return true;
    
    // Handle if debt-to-income ratio is concerning
    if (snapshot.monthlyIncome > 0) {
      const debtToIncome = snapshot.totalDebt / snapshot.monthlyIncome;
      if (debtToIncome > 0.3) return true;
    }
    
    return false;
  }

  route(context: DecisionContext): RoutingDecision {
    const { snapshot, userMessage } = context;
    const assessment = this.assessSituation(snapshot);

    // Prioritize high-interest debt
    if (snapshot.highInterestDebt > 0) {
      const monthlyPayment = this.calculateMonthlyPayment(snapshot);
      const timeline = this.calculateDebtPayoffTimeline(
        snapshot.highInterestDebt,
        monthlyPayment,
        snapshot.monthlyInterestRate || 18
      );

      return {
        action: `Pay off high-interest debt (${this.formatCurrency(snapshot.highInterestDebt)})`,
        priority: this.determinePriority(assessment.situation),
        reasoning: `High-interest debt costs ${this.formatCurrency(snapshot.highInterestDebt * (snapshot.monthlyInterestRate || 18) / 100 / 12)} monthly in interest. Eliminate this first.`,
        nextSteps: [
          `Allocate ${this.formatCurrency(monthlyPayment)} monthly to high-interest debt`,
          `Timeline: ${timeline} months to payoff`,
          `Freeze new high-interest debt`,
          `Consider balance transfer or consolidation if rate > 15%`,
        ],
        requiresHumanReview: false,
      };
    }

    // Handle general debt
    const monthlyPayment = this.calculateMonthlyPayment(snapshot);
    const timeline = this.calculateDebtPayoffTimeline(snapshot.totalDebt, monthlyPayment);

    return {
      action: `Create debt payoff plan (${this.formatCurrency(snapshot.totalDebt)} total)`,
      priority: this.determinePriority(assessment.situation),
      reasoning: `Total debt of ${this.formatCurrency(snapshot.totalDebt)} requires strategic payoff plan.`,
      nextSteps: [
        `Allocate ${this.formatCurrency(monthlyPayment)} monthly to debt payoff`,
        `Timeline: ${timeline} months to become debt-free`,
        `Use avalanche method (highest interest first) or snowball (smallest balance first)`,
        `Track progress monthly`,
      ],
      requiresHumanReview: false,
    };
  }

  /**
   * Calculate monthly debt payment
   */
  private calculateMonthlyPayment(snapshot: any): number {
    const monthlyIncome = snapshot.monthlyIncome;
    const monthlyExpenses = snapshot.essentialExpenses + snapshot.discretionaryExpenses;
    const monthlySurplus = monthlyIncome - monthlyExpenses;

    // Allocate 20% of surplus to debt, minimum $100
    const debtPayment = Math.max(monthlySurplus * 0.2, 100);
    return Math.round(debtPayment);
  }
}
