/**
 * DECISION ROUTING ENGINE - Type Definitions
 * 
 * Defines interfaces for deterministic financial decision routing
 * Moves all financial decisions from Claude inference to rule-based logic
 */

/**
 * Financial situation classification
 */
export type FinancialSituation = 
  | 'crisis'
  | 'emergency'
  | 'struggling'
  | 'stable'
  | 'thriving';

/**
 * Priority levels for financial goals
 */
export type GoalPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Financial snapshot from user data
 */
export interface FinancialSnapshot {
  monthlyIncome: number;
  essentialExpenses: number;
  discretionaryExpenses: number;
  totalSavings: number;
  totalDebt: number;
  highInterestDebt: number;
  lowInterestDebt: number;
  emergencyFundTarget: number;
  monthlyInterestRate?: number;
}

/**
 * Decision context with all relevant information
 */
export interface DecisionContext {
  snapshot: FinancialSnapshot;
  situation: FinancialSituation;
  userMessage: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  goals?: Array<{ type: string; priority: GoalPriority }>;
}

/**
 * Routing decision result
 */
export interface RoutingDecision {
  action: string;
  priority: GoalPriority;
  reasoning: string;
  nextSteps: string[];
  requiresHumanReview: boolean;
}

/**
 * Decision router interface
 */
export interface IDecisionRouter {
  /**
   * Determine if this router can handle the decision context
   */
  canHandle(context: DecisionContext): boolean;

  /**
   * Make a routing decision
   */
  route(context: DecisionContext): RoutingDecision;

  /**
   * Get router priority (higher = evaluated first)
   */
  getPriority(): number;

  /**
   * Get router name
   */
  getName(): string;
}

/**
 * Financial situation assessment result
 */
export interface SituationAssessment {
  situation: FinancialSituation;
  monthlyNetIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  debtToIncomeRatio: number;
  emergencyFundMonths: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Goal recommendation
 */
export interface GoalRecommendation {
  type: 'debt_payoff' | 'emergency_fund' | 'savings' | 'investment' | 'retirement' | 'other';
  priority: GoalPriority;
  monthlyTarget: number;
  timelineMonths: number;
  reasoning: string;
}

/**
 * Decision routing configuration
 */
export interface RoutingConfig {
  enableCrisisDetection: boolean;
  enableGoalRouting: boolean;
  enableDebtRouting: boolean;
  enableSavingsRouting: boolean;
  strictMode: boolean;
}

/**
 * Routing result with multiple recommendations
 */
export interface RoutingResult {
  primaryAction: RoutingDecision;
  recommendations: GoalRecommendation[];
  assessment: SituationAssessment;
  warnings: string[];
  nextSteps: string[];
}
