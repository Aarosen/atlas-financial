/**
 * INVESTMENT DECISION ROUTER
 * 
 * Routes decisions for users ready to invest
 * Handles investment strategies, portfolio allocation, and investment goals
 */

import { BaseRouter } from '../baseRouter';
import type { DecisionContext, RoutingDecision } from '../types';

export class InvestmentRouter extends BaseRouter {
  constructor() {
    super('InvestmentRouter', 60); // Medium priority
  }

  canHandle(context: DecisionContext): boolean {
    const { snapshot, situation } = context;
    const monthlyExpenses = snapshot.essentialExpenses + snapshot.discretionaryExpenses;
    const monthlySurplus = snapshot.monthlyIncome - monthlyExpenses;

    // Handle if in stable/thriving situation with adequate emergency fund and no high-interest debt
    if (situation === 'stable' || situation === 'thriving') {
      const emergencyFundMonths = monthlyExpenses > 0 ? snapshot.totalSavings / monthlyExpenses : 0;
      if (emergencyFundMonths >= 6 && snapshot.highInterestDebt === 0 && monthlySurplus > 0) {
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

    // Calculate investment amount
    const monthlyInvestment = Math.max(monthlySurplus * 0.2, 200);
    const annualInvestment = monthlyInvestment * 12;

    return {
      action: `Start investing ${this.formatCurrency(monthlyInvestment)}/month`,
      priority: this.determinePriority(assessment.situation),
      reasoning: `With emergency fund established, no high-interest debt, and positive cash flow, you're ready to invest for long-term wealth building.`,
      nextSteps: [
        `Open investment account (401k, IRA, brokerage)`,
        `Automate ${this.formatCurrency(monthlyInvestment)} monthly investment`,
        `Build diversified portfolio (stocks, bonds, index funds)`,
        `Target allocation: 70% stocks, 30% bonds (adjust for age)`,
        `Review and rebalance portfolio annually`,
        `Aim for ${this.formatCurrency(annualInvestment)} annual investment`,
      ],
      requiresHumanReview: false,
    };
  }
}
