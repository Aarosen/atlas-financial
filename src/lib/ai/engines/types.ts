/**
 * ATLAS ENGINE TYPE DEFINITIONS
 * 
 * Core interfaces for all 12 decision engines.
 * These types enforce consistency across the platform.
 */

// ============================================================================
// FINANCIAL DECISION ENGINE
// ============================================================================

export type FinancialDomain = 
  | 'emergency_fund' 
  | 'debt_payoff' 
  | 'budget' 
  | 'investment' 
  | 'retirement' 
  | 'general';

export interface FinancialDecision {
  domain: FinancialDomain;
  reasoning: string;
  requiredFields: string[];
  missingFields: string[];
  urgency: 'critical' | 'high' | 'medium' | 'low';
  nextAction: string;
  confidence: number; // 0-1, how confident is this decision
}

// ============================================================================
// DATA EXTRACTION ENGINE
// ============================================================================

export interface ExtractedFinancialData {
  monthlyIncome?: number;
  essentialExpenses?: number;
  discretionaryExpenses?: number;
  totalSavings?: number;
  highInterestDebt?: number;
  lowInterestDebt?: number;
  monthlyDebtPayments?: number;
  highInterestRate?: number;
  lowInterestRate?: number;
  primaryGoal?: 'stability' | 'growth' | 'flexibility' | 'wealth_building';
  timeHorizonYears?: number;
  riskTolerance?: 'cautious' | 'balanced' | 'growth';
  biggestConcern?: string;
  proposedPayment?: number;
}

export interface ExtractionResult {
  data: ExtractedFinancialData;
  confidence: number; // 0-1, how confident in extraction
  uncertainFields: string[]; // Fields with low confidence
  timestamp: number;
}

// ============================================================================
// VALIDATION ENGINE
// ============================================================================

export interface ValidationIssue {
  field: string;
  issue: string;
  severity: 'error' | 'warning';
  suggestedValue?: number | string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  requiresUserConfirmation: boolean;
  suggestedCorrection?: Partial<ExtractedFinancialData>;
}

// ============================================================================
// QUESTION SEQUENCING ENGINE
// ============================================================================

export interface NextQuestion {
  field: string;
  question: string;
  context: string;
  priority: number; // 1-10, higher = more important
  followUpTo?: string; // Field this question follows up on
  helpText?: string;
}

// ============================================================================
// CONTEXT INJECTION ENGINE
// ============================================================================

export interface ContextBlock {
  name: string;
  content: string;
  priority: number; // Lower number = higher priority
  characterCount: number;
  type: 'system' | 'state' | 'calculation' | 'strategy' | 'goal' | 'knowledge' | 'memory';
}

// ============================================================================
// COMPLIANCE ENGINE
// ============================================================================

export type ComplianceRiskType = 
  | 'investment_advice' 
  | 'tax_advice' 
  | 'legal_advice' 
  | 'medical_advice' 
  | 'none';

export interface ComplianceRisk {
  detected: boolean;
  riskType?: ComplianceRiskType;
  severity: 'critical' | 'high' | 'medium' | 'none';
  response?: string;
  redirectTo?: string; // Professional to redirect to
}

// ============================================================================
// CRISIS DETECTION ENGINE
// ============================================================================

export type CrisisType = 
  | 'homelessness' 
  | 'hunger' 
  | 'bankruptcy' 
  | 'abuse' 
  | 'suicide' 
  | 'other' 
  | 'none';

export interface CrisisSignal {
  detected: boolean;
  type?: CrisisType;
  severity: 'critical' | 'high' | 'medium' | 'none';
  response: string;
  resources?: CrisisResource[];
  escalateToHuman: boolean;
}

export interface CrisisResource {
  name: string;
  description: string;
  url?: string;
  phone?: string;
  availability: string;
}

// ============================================================================
// RESPONSE TEMPLATE ENGINE
// ============================================================================

export type ResponseStructure = 
  | 'direct_answer'
  | 'calculation_result'
  | 'question'
  | 'action_plan'
  | 'explanation';

export interface ResponseTemplate {
  structure: ResponseStructure;
  slots: {
    [key: string]: string | number | boolean | undefined;
  };
  constraints: {
    maxSentences?: number;
    maxQuestions?: number;
    requiresCalculation?: boolean;
    requiresAction?: boolean;
    tone?: 'warm' | 'professional' | 'urgent' | 'supportive';
  };
  instructions: string;
}

// ============================================================================
// COMMUNICATION STYLE ENGINE
// ============================================================================

export type Tone = 'warm' | 'professional' | 'urgent' | 'supportive';
export type Complexity = 'simple' | 'moderate' | 'advanced';
export type Language = 'en' | 'es' | 'fr' | 'zh';

export interface CommunicationStyle {
  tone: Tone;
  complexity: Complexity;
  language: Language;
  personalization: {
    userName?: string;
    referencePriorGoals?: boolean;
    usedMetaphors?: boolean;
  };
}

// ============================================================================
// MULTI-PROVIDER ROUTING ENGINE
// ============================================================================

export type ProviderName = 'claude' | 'openai' | 'gemini' | 'together';

export interface ProviderRoutingDecision {
  selectedProvider: ProviderName;
  reason: string;
  fallbackChain: ProviderName[];
  estimatedCost: number;
  estimatedLatency: number;
}

// ============================================================================
// MONITORING ENGINE
// ============================================================================

export interface ConversationMetrics {
  providersUsed: ProviderName[];
  totalCost: number;
  totalLatency: number;
  calculationsRun: number;
  decisionsCorrect: boolean;
  userSatisfaction?: number;
  complianceViolations: number;
  crisisDetected: boolean;
  timestamp: number;
}

// ============================================================================
// SHARED TYPES
// ============================================================================

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface Goal {
  id: string;
  type: string;
  status: 'active' | 'completed' | 'abandoned';
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface CalculationResult {
  type: string;
  primaryMetric: number;
  primaryMetricLabel: string;
  secondaryMetric?: number;
  secondaryMetricLabel?: string;
  timeline?: string;
  recommendation: string;
}

// ============================================================================
// LLM PROVIDER TYPES
// ============================================================================

export interface LLMRequest {
  messages: Message[];
  system: string;
  maxTokens: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
}

export interface LLMResponse {
  text: string;
  stopReason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'error';
  inputTokens: number;
  outputTokens: number;
  model: string;
  latencyMs: number;
  costUsd: number;
}

export interface LLMStreamEvent {
  type: 'delta' | 'done' | 'error';
  delta?: string;
  response?: LLMResponse;
  error?: { message: string; code: string };
}

export interface LLMProvider {
  // Metadata
  name: ProviderName;
  models: string[];
  supportsStreaming: boolean;
  contextWindow: number;
  costPer1MInputTokens: number;
  costPer1MOutputTokens: number;

  // Core methods
  call(request: LLMRequest): Promise<LLMResponse>;
  stream(request: LLMRequest): AsyncIterable<LLMStreamEvent>;

  // Health check
  isAvailable(): Promise<boolean>;
  getStatus(): Promise<{ available: boolean; latencyMs: number }>;
}

export interface ProviderConfig {
  apiKey: string;
  model: string;
  maxRetries?: number;
  timeoutMs?: number;
  temperature?: number;
}

// ============================================================================
// ENGINE INTERFACE DEFINITIONS
// ============================================================================

export interface IFinancialDecisionEngine {
  decideFinancialDomain(
    data: ExtractedFinancialData,
    conversationHistory: Message[],
    priorGoals: Goal[]
  ): FinancialDecision;
}

export interface IDataExtractionEngine {
  extractFinancialData(
    userMessage: string,
    conversationHistory: Message[]
  ): ExtractionResult;
}

export interface IValidationEngine {
  validateFinancialData(
    data: ExtractedFinancialData
  ): ValidationResult;
}

export interface IQuestionSequencingEngine {
  getNextQuestion(
    data: ExtractedFinancialData,
    decision: FinancialDecision,
    conversationHistory: Message[]
  ): NextQuestion | null;
}

export interface IContextInjectionEngine {
  buildContextBlocks(
    data: ExtractedFinancialData,
    decision: FinancialDecision,
    conversationHistory: Message[],
    priorGoals: Goal[]
  ): ContextBlock[];
}

export interface IComplianceEngine {
  detectComplianceRisk(
    userMessage: string,
    conversationHistory: Message[]
  ): ComplianceRisk;
}

export interface ICrisisDetectionEngine {
  detectCrisis(
    userMessage: string,
    data: ExtractedFinancialData,
    conversationHistory: Message[]
  ): CrisisSignal;
}

export interface IResponseTemplateEngine {
  buildResponseTemplate(
    decision: FinancialDecision,
    data: ExtractedFinancialData,
    conversationHistory: Message[]
  ): ResponseTemplate;
}

export interface ICommunicationStyleEngine {
  determineCommunicationStyle(
    conversationHistory: Message[],
    userProfile?: { language?: Language; tone?: Tone }
  ): CommunicationStyle;

  adaptResponse(
    response: string,
    style: CommunicationStyle
  ): string;
}

export interface IMultiProviderRoutingEngine {
  selectProvider(
    decision: FinancialDecision,
    data: ExtractedFinancialData,
    userTier?: 'free' | 'pro' | 'enterprise'
  ): ProviderRoutingDecision;
}

export interface IMonitoringEngine {
  trackMetrics(
    decision: FinancialDecision,
    data: ExtractedFinancialData,
    providersUsed: ProviderName[],
    cost: number,
    latency: number
  ): ConversationMetrics;
}
