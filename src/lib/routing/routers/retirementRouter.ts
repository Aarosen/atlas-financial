/**
 * RETIREMENT DECISION ROUTER
 * 
 * Routes decisions for users planning retirement
 * Handles retirement savings, retirement goals, and long-term planning
 */

import { BaseRouter } from '../baseRouter';
import type { DecisionContext, RoutingDecision } from '../types';

export class RetirementRouter extends BaseRouter {
  constructor() {
    super('RetirementRouter', 55); // Medium priority
  }

  canHandle(context: DecisionContext): boolean {
    const { snapshot, situation, userMessage } = context;

    // Handle if in thriving situation or explicitly asking about retirement
    if (situation === 'thriving') {
      return true;
    }

    // Check if user message mentions retirement
    if (this.messageContainsKeywords(userMessage, ['retirement', 'retire', '401k', 'IRA', 'pension'])) {
      const monthlyExpenses = snapshot.essentialExpenses + snapshot.discretionaryExpenses;
      const monthlySurplus = snapshot.monthlyIncome - monthlyExpenses;
      if (monthlySurplus > 0) {
        return true;
      }
    }

    return false;
  }

  route(context: DecisionContext): RoutingDecision {
    const { snapshot } = context;
    const monthlyExpenses = snapshot.essentialExpenses + snapshot.discretionaryExpenses;
    const monthlySurplus = snapshot.monthlyIncome - monthlyExpenses;
    const assessment = this.assessSituation(snapshot);

    // Calculate retirement savings target
    const monthlyRetirementSavings = Math.max(monthlySurplus * 0.25, 300);
    const annualRetirementSavings = monthlyRetirementSavings * 12;

    // Estimate retirement needs (25x annual expenses)
    const annualExpenses = monthlyExpenses * 12;
    const retirementTarget = annualExpenses * 25;

    return {
      action: `Build retirement savings of ${this.formatCurrency(retirementTarget)}`,
      priority: this.determinePriority(assessment.situation),
      reasoning: `With strong financial foundation, focus on long-term retirement planning. Target is ${this.formatCurrency(retirementTarget)} (25x annual expenses).`,
      nextSteps: [
        `Maximize employer 401k match (free money)`,
        `Contribute ${this.formatCurrency(monthlyRetirementSavings)} monthly to retirement accounts`,
        `Use tax-advantaged accounts (401k, IRA, Roth IRA)`,
        `Build diversified portfolio for long-term growth`,
        `Review retirement plan annually`,
        `Adjust contributions as income increases`,
        `Target ${this.formatCurrency(annualRetirementSavings)} annual retirement savings`,
      ],
      requiresHumanReview: false,
    };
  }
}
