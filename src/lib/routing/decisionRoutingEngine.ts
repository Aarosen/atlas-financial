/**
 * DECISION ROUTING ENGINE
 * 
 * Orchestrates all decision routers to make deterministic financial decisions
 * Routes user requests to appropriate decision logic without Claude inference
 */

import type {
  IDecisionRouter,
  DecisionContext,
  RoutingResult,
  FinancialSnapshot,
  SituationAssessment,
  GoalRecommendation,
  RoutingConfig,
} from './types';
import { BaseRouter } from './baseRouter';

export class DecisionRoutingEngine {
  private routers: IDecisionRouter[] = [];
  private config: RoutingConfig;

  constructor(config: Partial<RoutingConfig> = {}) {
    this.config = {
      enableCrisisDetection: true,
      enableGoalRouting: true,
      enableDebtRouting: true,
      enableSavingsRouting: true,
      strictMode: false,
      ...config,
    };
  }

  /**
   * Register a decision router
   */
  registerRouter(router: IDecisionRouter): void {
    this.routers.push(router);
    // Sort by priority (highest first)
    this.routers.sort((a, b) => b.getPriority() - a.getPriority());
  }

  /**
   * Route a decision based on context
   */
  route(context: DecisionContext): RoutingResult {
    // Find first router that can handle this context
    const applicableRouter = this.routers.find(router => router.canHandle(context));

    if (!applicableRouter) {
      return this.createDefaultRoute(context);
    }

    // Get primary decision
    const primaryAction = applicableRouter.route(context);

    // Generate recommendations
    const recommendations = this.generateRecommendations(context);

    // Assess situation
    const assessment = this.assessSituation(context.snapshot);

    // Generate warnings
    const warnings = this.generateWarnings(context);

    // Generate next steps
    const nextSteps = this.generateNextSteps(context, primaryAction);

    return {
      primaryAction,
      recommendations,
      assessment,
      warnings,
      nextSteps,
    };
  }

  /**
   * Create default route when no specific router applies
   */
  private createDefaultRoute(context: DecisionContext): RoutingResult {
    const assessment = this.assessSituation(context.snapshot);
    const recommendations = this.generateRecommendations(context);

    return {
      primaryAction: {
        action: 'Continue current financial plan',
        priority: 'medium',
        reasoning: 'No immediate action required. Continue with current strategy.',
        nextSteps: ['Review progress monthly', 'Adjust plan as needed'],
        requiresHumanReview: false,
      },
      recommendations,
      assessment,
      warnings: [],
      nextSteps: this.generateNextSteps(context, {
        action: 'Continue current financial plan',
        priority: 'medium',
        reasoning: 'No immediate action required.',
        nextSteps: [],
        requiresHumanReview: false,
      }),
    };
  }

  /**
   * Generate goal recommendations
   */
  private generateRecommendations(context: DecisionContext): GoalRecommendation[] {
    const { snapshot } = context;
    const assessment = this.assessSituation(snapshot);
    const recommendations: GoalRecommendation[] = [];

    const monthlyExpenses = snapshot.essentialExpenses + snapshot.discretionaryExpenses;
    const monthlySurplus = snapshot.monthlyIncome - monthlyExpenses;

    // Debt payoff recommendation
    if (snapshot.totalDebt > 0 && monthlySurplus > 0) {
      const monthlyPayment = Math.max(monthlySurplus * 0.2, 100);
      const timelineMonths = Math.ceil(snapshot.totalDebt / monthlyPayment);

      recommendations.push({
        type: 'debt_payoff',
        priority: assessment.debtToIncomeRatio > 0.5 ? 'high' : 'medium',
        monthlyTarget: monthlyPayment,
        timelineMonths,
        reasoning: `Pay off ${snapshot.totalDebt} debt over ${timelineMonths} months`,
      });
    }

    // Emergency fund recommendation
    if (assessment.emergencyFundMonths < 6) {
      const emergencyTarget = monthlyExpenses * 6;
      const gap = emergencyTarget - snapshot.totalSavings;
      const monthlyContribution = Math.max(monthlySurplus * 0.1, 50);
      const timelineMonths = Math.ceil(gap / monthlyContribution);

      recommendations.push({
        type: 'emergency_fund',
        priority: assessment.emergencyFundMonths < 3 ? 'high' : 'medium',
        monthlyTarget: monthlyContribution,
        timelineMonths,
        reasoning: `Build emergency fund to ${emergencyTarget} (6 months expenses)`,
      });
    }

    // Savings recommendation
    if (monthlySurplus > 0 && snapshot.totalDebt === 0) {
      const monthlySavings = Math.max(monthlySurplus * 0.15, 100);

      recommendations.push({
        type: 'savings',
        priority: 'medium',
        monthlyTarget: monthlySavings,
        timelineMonths: 12,
        reasoning: 'Build savings for future goals and opportunities',
      });
    }

    // Investment recommendation
    if (assessment.situation === 'thriving' && snapshot.totalDebt === 0) {
      const monthlyInvestment = Math.max(monthlySurplus * 0.2, 200);

      recommendations.push({
        type: 'investment',
        priority: 'low',
        monthlyTarget: monthlyInvestment,
        timelineMonths: 120,
        reasoning: 'Invest for long-term wealth building',
      });
    }

    return recommendations;
  }

  /**
   * Generate warnings for concerning situations
   */
  private generateWarnings(context: DecisionContext): string[] {
    const { snapshot } = context;
    const warnings: string[] = [];

    if (snapshot.monthlyIncome === 0) {
      warnings.push('Critical: No monthly income. Seek immediate employment or assistance.');
    }

    const monthlyExpenses = snapshot.essentialExpenses + snapshot.discretionaryExpenses;
    if (snapshot.monthlyIncome < monthlyExpenses) {
      warnings.push(`Warning: Monthly deficit of ${snapshot.monthlyIncome - monthlyExpenses}. Expenses exceed income.`);
    }

    if (snapshot.highInterestDebt > snapshot.monthlyIncome * 3) {
      warnings.push('Warning: High-interest debt is significant. Prioritize payoff.');
    }

    if (snapshot.totalSavings === 0 && snapshot.monthlyIncome > 0) {
      warnings.push('Warning: No emergency savings. Build fund immediately.');
    }

    return warnings;
  }

  /**
   * Generate next steps
   */
  private generateNextSteps(context: DecisionContext, primaryAction: any): string[] {
    const steps = [...primaryAction.nextSteps];

    // Add tracking step
    steps.push('Track progress weekly and adjust as needed');

    // Add review step
    steps.push('Review plan monthly with actual numbers');

    return steps;
  }

  /**
   * Assess financial situation
   */
  private assessSituation(snapshot: FinancialSnapshot): SituationAssessment {
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
   * Get all registered routers
   */
  getRouters(): IDecisionRouter[] {
    return this.routers;
  }

  /**
   * Clear all routers
   */
  clearRouters(): void {
    this.routers = [];
  }
}
