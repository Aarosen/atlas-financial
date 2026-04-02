/**
 * CRISIS DECISION ROUTER
 * 
 * Routes decisions for users in financial crisis
 * Handles zero income, negative cash flow, and emergency situations
 */

import { BaseRouter } from '../baseRouter';
import type { DecisionContext, RoutingDecision } from '../types';

export class CrisisRouter extends BaseRouter {
  constructor() {
    super('CrisisRouter', 100); // High priority
  }

  canHandle(context: DecisionContext): boolean {
    const { snapshot, situation } = context;
    
    // Crisis if zero income or negative cash flow
    if (snapshot.monthlyIncome === 0) return true;
    
    const monthlyExpenses = snapshot.essentialExpenses + snapshot.discretionaryExpenses;
    if (snapshot.monthlyIncome < monthlyExpenses) return true;
    
    // Crisis if explicitly detected
    if (situation === 'crisis') return true;
    
    return false;
  }

  route(context: DecisionContext): RoutingDecision {
    const { snapshot, userMessage } = context;
    const monthlyExpenses = snapshot.essentialExpenses + snapshot.discretionaryExpenses;
    const monthlySurplus = snapshot.monthlyIncome - monthlyExpenses;

    // Assess situation
    const assessment = this.assessSituation(snapshot);

    // Determine immediate action
    let action = '';
    let reasoning = '';
    const nextSteps: string[] = [];

    if (snapshot.monthlyIncome === 0) {
      action = 'Immediate income generation required';
      reasoning = 'Zero monthly income detected. Must secure income source immediately.';
      nextSteps.push('Explore emergency income options (gig work, part-time jobs, unemployment benefits)');
      nextSteps.push('Review essential expenses for immediate cuts');
      nextSteps.push('Contact local assistance programs for emergency support');
    } else if (monthlySurplus < 0) {
      const deficit = Math.abs(monthlySurplus);
      action = `Reduce expenses by ${this.formatCurrency(deficit)} monthly`;
      reasoning = `Monthly deficit of ${this.formatCurrency(deficit)}. Expenses exceed income.`;
      nextSteps.push(`Cut discretionary spending (currently ${this.formatCurrency(snapshot.discretionaryExpenses)})`);
      nextSteps.push(`Review essential expenses for optimization`);
      nextSteps.push(`Seek additional income to close ${this.formatCurrency(deficit)} gap`);
    }

    return {
      action,
      priority: 'critical',
      reasoning,
      nextSteps,
      requiresHumanReview: true,
    };
  }
}
