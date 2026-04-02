/**
 * EMERGENCY FUND DECISION ROUTER
 * 
 * Routes decisions for building emergency fund
 * Handles emergency fund targets, savings strategies, and fund adequacy
 */

import { BaseRouter } from '../baseRouter';
import type { DecisionContext, RoutingDecision } from '../types';

export class EmergencyFundRouter extends BaseRouter {
  constructor() {
    super('EmergencyFundRouter', 85); // High priority
  }

  canHandle(context: DecisionContext): boolean {
    const { snapshot } = context;
    const monthlyExpenses = snapshot.essentialExpenses + snapshot.discretionaryExpenses;
    const emergencyFundMonths = monthlyExpenses > 0 ? snapshot.totalSavings / monthlyExpenses : 0;

    // Handle if emergency fund is inadequate (less than 3 months)
    if (emergencyFundMonths < 3) return true;

    return false;
  }

  route(context: DecisionContext): RoutingDecision {
    const { snapshot } = context;
    const monthlyExpenses = snapshot.essentialExpenses + snapshot.discretionaryExpenses;
    const emergencyFundTarget = this.calculateEmergencyFundTarget(snapshot);
    const emergencyFundGap = emergencyFundTarget - snapshot.totalSavings;
    const emergencyFundMonths = monthlyExpenses > 0 ? snapshot.totalSavings / monthlyExpenses : 0;

    const assessment = this.assessSituation(snapshot);
    const monthlySurplus = snapshot.monthlyIncome - monthlyExpenses;
    const monthlyEmergencyContribution = Math.max(monthlySurplus * 0.1, 50);

    const timelineMonths = emergencyFundGap > 0 
      ? Math.ceil(emergencyFundGap / monthlyEmergencyContribution)
      : 0;

    return {
      action: `Build emergency fund to ${this.formatCurrency(emergencyFundTarget)}`,
      priority: this.determinePriority(assessment.situation),
      reasoning: `Current emergency fund covers ${emergencyFundMonths.toFixed(1)} months of expenses. Target is 6 months (${this.formatCurrency(emergencyFundTarget)}). Gap: ${this.formatCurrency(emergencyFundGap)}.`,
      nextSteps: [
        `Open high-yield savings account (4-5% APY)`,
        `Automate ${this.formatCurrency(monthlyEmergencyContribution)} monthly transfer`,
        `Timeline: ${timelineMonths} months to reach target`,
        `Keep emergency fund separate from spending accounts`,
        `Once funded, maintain and protect this fund`,
      ],
      requiresHumanReview: false,
    };
  }
}
