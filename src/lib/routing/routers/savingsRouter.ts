/**
 * SAVINGS DECISION ROUTER
 * 
 * Routes decisions for users building savings
 * Handles savings goals, savings rate optimization, and savings strategies
 */

import { BaseRouter } from '../baseRouter';
import type { DecisionContext, RoutingDecision } from '../types';

export class SavingsRouter extends BaseRouter {
  constructor() {
    super('SavingsRouter', 70); // Medium-high priority
  }

  canHandle(context: DecisionContext): boolean {
    const { snapshot } = context;
    const monthlyExpenses = snapshot.essentialExpenses + snapshot.discretionaryExpenses;
    const monthlySurplus = snapshot.monthlyIncome - monthlyExpenses;

    // Handle if positive cash flow exists and no high-priority debt
    if (monthlySurplus > 0 && snapshot.highInterestDebt === 0) {
      // Check if emergency fund is adequate
      const emergencyFundMonths = monthlyExpenses > 0 ? snapshot.totalSavings / monthlyExpenses : 0;
      if (emergencyFundMonths >= 3) {
        return true;
      }
    }

    return false;
  }

  route(context: DecisionContext): RoutingDecision {
    const { snapshot, userMessage } = context;
    const monthlyExpenses = snapshot.essentialExpenses + snapshot.discretionaryExpenses;
    const monthlySurplus = snapshot.monthlyIncome - monthlyExpenses;
    const assessment = this.assessSituation(snapshot);

    // Calculate savings target
    const monthlySavingsTarget = Math.max(monthlySurplus * 0.15, 100);
    const annualSavingsTarget = monthlySavingsTarget * 12;

    // Determine savings goal
    let action = '';
    let reasoning = '';
    const nextSteps: string[] = [];

    if (snapshot.totalDebt === 0) {
      action = `Build savings at ${this.formatCurrency(monthlySavingsTarget)}/month`;
      reasoning = `With emergency fund established and no debt, focus on building additional savings for goals and opportunities.`;
      nextSteps.push(`Automate ${this.formatCurrency(monthlySavingsTarget)} monthly transfer to savings`);
      nextSteps.push(`Set specific savings goals (vacation, car, home down payment, etc.)`);
      nextSteps.push(`Track progress toward ${this.formatCurrency(annualSavingsTarget)} annual savings`);
      nextSteps.push(`Review and adjust savings rate quarterly`);
    } else {
      action = `Balance savings and debt payoff`;
      reasoning = `With some remaining debt, balance between building savings and paying down debt.`;
      const debtPayment = monthlySurplus * 0.6;
      const savingsAmount = monthlySurplus * 0.4;
      nextSteps.push(`Allocate ${this.formatCurrency(debtPayment)} to debt payoff`);
      nextSteps.push(`Allocate ${this.formatCurrency(savingsAmount)} to savings`);
      nextSteps.push(`Maintain emergency fund while paying debt`);
    }

    return {
      action,
      priority: this.determinePriority(assessment.situation),
      reasoning,
      nextSteps,
      requiresHumanReview: false,
    };
  }
}
