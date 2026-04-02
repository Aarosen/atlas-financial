/**
 * RESPONSE TEMPLATING SYSTEM - Type Definitions
 * 
 * Defines interfaces for standardized response templates
 * Ensures consistent output format across all LLM providers
 */

/**
 * Response types supported by the templating system
 */
export type ResponseType = 
  | 'financial_advice'
  | 'goal_recommendation'
  | 'crisis_response'
  | 'action_plan'
  | 'progress_update'
  | 'question_answer'
  | 'error_response';

/**
 * Response severity levels
 */
export type ResponseSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * Standard response structure
 */
export interface StandardResponse {
  type: ResponseType;
  severity: ResponseSeverity;
  title: string;
  content: string;
  actionItems?: string[];
  nextSteps?: string[];
  metadata?: Record<string, any>;
}

/**
 * Financial advice response
 */
export interface FinancialAdviceResponse extends StandardResponse {
  type: 'financial_advice';
  currentSituation: string;
  recommendation: string;
  reasoning: string;
  expectedOutcome: string;
  timeframe?: string;
}

/**
 * Goal recommendation response
 */
export interface GoalRecommendationResponse extends StandardResponse {
  type: 'goal_recommendation';
  goalType: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  monthlyTarget: number;
  timelineMonths: number;
  reasoning: string;
}

/**
 * Crisis response
 */
export interface CrisisResponse extends StandardResponse {
  type: 'crisis_response';
  crisisType: string;
  immediateActions: string[];
  resources: Array<{
    name: string;
    contact: string;
    description: string;
  }>;
  escalationRequired: boolean;
}

/**
 * Action plan response
 */
export interface ActionPlanResponse extends StandardResponse {
  type: 'action_plan';
  goal: string;
  steps: Array<{
    order: number;
    action: string;
    duration: string;
    success_criteria: string;
  }>;
  timeline: string;
  checkpoints: string[];
}

/**
 * Progress update response
 */
export interface ProgressUpdateResponse extends StandardResponse {
  type: 'progress_update';
  metric: string;
  currentValue: number;
  targetValue: number;
  progressPercent: number;
  trend: 'improving' | 'stable' | 'declining';
  insights: string[];
}

/**
 * Question answer response
 */
export interface QuestionAnswerResponse extends StandardResponse {
  type: 'question_answer';
  question: string;
  answer: string;
  explanation: string;
  relatedTopics?: string[];
}

/**
 * Error response
 */
export interface ErrorResponse extends StandardResponse {
  type: 'error_response';
  errorCode: string;
  errorMessage: string;
  suggestedAction: string;
}

/**
 * Response template configuration
 */
export interface TemplateConfig {
  includeMetadata: boolean;
  includeNextSteps: boolean;
  maxContentLength?: number;
  formatAsMarkdown: boolean;
}

/**
 * Formatted response for delivery
 */
export interface FormattedResponse {
  text: string;
  metadata: Record<string, any>;
  type: ResponseType;
}

/**
 * Response template interface
 */
export interface IResponseTemplate {
  /**
   * Get template name
   */
  getName(): string;

  /**
   * Check if template can handle response type
   */
  canHandle(type: ResponseType): boolean;

  /**
   * Format response using template
   */
  format(response: StandardResponse, config?: Partial<TemplateConfig>): FormattedResponse;

  /**
   * Validate response structure
   */
  validate(response: StandardResponse): { valid: boolean; errors: string[] };
}
