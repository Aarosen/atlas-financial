/**
 * ATLAS ENGINE EXPORTS
 * 
 * Central export point for all 12 core decision engines.
 * Each engine is 100% deterministic with no LLM calls.
 */

// Type definitions
export * from './types';

// Engine implementations
export { FinancialDecisionEngine, financialDecisionEngine } from './financialDecisionEngine';
export { DataExtractionEngine, dataExtractionEngine } from './dataExtractionEngine';
export { ValidationEngine, validationEngine } from './validationEngine';
export { QuestionSequencingEngine, questionSequencingEngine } from './questionSequencingEngine';
export { ContextInjectionEngine, contextInjectionEngine } from './contextInjectionEngine';
export { ComplianceEngine, complianceEngine } from './complianceEngine';
export { CrisisDetectionEngine, crisisDetectionEngine } from './crisisDetectionEngine';
export { ResponseTemplateEngine, responseTemplateEngine } from './responseTemplateEngine';
export { CommunicationStyleEngine, communicationStyleEngine } from './communicationStyleEngine';
export { MultiProviderRoutingEngine, multiProviderRoutingEngine } from './multiProviderRoutingEngine';
export { MonitoringEngine, monitoringEngine } from './monitoringEngine';

/**
 * ATLAS ENGINE ORCHESTRATOR
 * 
 * Coordinates all 12 engines in the decision hierarchy.
 * This is the main entry point for chat route integration.
 */

import type {
  ExtractedFinancialData,
  FinancialDecision,
  Message,
  Goal,
  NextQuestion,
  ContextBlock,
  ComplianceRisk,
  CrisisSignal,
  ResponseTemplate,
  CommunicationStyle,
  ProviderRoutingDecision,
  ConversationMetrics,
} from './types';

import { dataExtractionEngine } from './dataExtractionEngine';
import { validationEngine } from './validationEngine';
import { financialDecisionEngine } from './financialDecisionEngine';
import { questionSequencingEngine } from './questionSequencingEngine';
import { contextInjectionEngine } from './contextInjectionEngine';
import { complianceEngine } from './complianceEngine';
import { crisisDetectionEngine } from './crisisDetectionEngine';
import { responseTemplateEngine } from './responseTemplateEngine';
import { communicationStyleEngine } from './communicationStyleEngine';
import { multiProviderRoutingEngine } from './multiProviderRoutingEngine';
import { monitoringEngine } from './monitoringEngine';

export interface EngineOrchestrationResult {
  extraction: { data: ExtractedFinancialData; confidence: number };
  validation: { isValid: boolean; issues: any[] };
  decision: FinancialDecision;
  nextQuestion: NextQuestion | null;
  contextBlocks: ContextBlock[];
  compliance: ComplianceRisk;
  crisis: CrisisSignal;
  template: ResponseTemplate;
  style: CommunicationStyle;
  routing: ProviderRoutingDecision;
  metrics: ConversationMetrics;
}

export class AtlasEngineOrchestrator {
  /**
   * Run all engines in decision hierarchy order
   * 
   * This is the main orchestration function called by chat route.
   * Returns complete decision context for LLM to fill template.
   */
  orchestrate(
    userMessage: string,
    conversationHistory: Message[],
    priorGoals: Goal[] = [],
    userTier: 'free' | 'pro' | 'enterprise' = 'free'
  ): EngineOrchestrationResult {
    // LEVEL 1: SAFETY (Crisis Detection, Compliance Screening)
    const crisis = crisisDetectionEngine.detectCrisis(
      userMessage,
      {} as ExtractedFinancialData,
      conversationHistory
    );

    const compliance = complianceEngine.detectComplianceRisk(userMessage, conversationHistory);

    // If crisis or compliance violation detected, return early
    if (crisis.detected || compliance.detected) {
      return this.buildCrisisResponse(crisis, compliance, conversationHistory);
    }

    // LEVEL 2: DATA VALIDATION (Validation Engine)
    const extraction = dataExtractionEngine.extractFinancialData(userMessage, conversationHistory);
    const validation = validationEngine.validateFinancialData(extraction.data);

    // LEVEL 3: FINANCIAL DECISION (Financial Decision Engine)
    const decision = financialDecisionEngine.decideFinancialDomain(
      extraction.data,
      conversationHistory,
      priorGoals
    );

    // LEVEL 4: QUESTION SEQUENCING (Question Sequencing Engine)
    const nextQuestion = questionSequencingEngine.getNextQuestion(
      extraction.data,
      decision,
      conversationHistory
    );

    // LEVEL 5: CONTEXT INJECTION (Context Injection Engine)
    const contextBlocks = contextInjectionEngine.buildContextBlocks(
      extraction.data,
      decision,
      conversationHistory,
      priorGoals
    );

    // LEVEL 6: RESPONSE GENERATION (Response Template Engine)
    const template = responseTemplateEngine.buildResponseTemplate(
      decision,
      extraction.data,
      conversationHistory
    );

    // LEVEL 7: COMMUNICATION STYLE (Communication Style Engine)
    const style = communicationStyleEngine.determineCommunicationStyle(conversationHistory);

    // MULTI-PROVIDER ROUTING (Provider Selection)
    const routing = multiProviderRoutingEngine.selectProvider(decision, extraction.data, userTier);

    // MONITORING (Metrics Tracking)
    const metrics = monitoringEngine.trackMetrics(
      decision,
      extraction.data,
      routing.fallbackChain,
      routing.estimatedCost,
      routing.estimatedLatency,
      false
    );

    return {
      extraction: { data: extraction.data, confidence: extraction.confidence },
      validation,
      decision,
      nextQuestion,
      contextBlocks,
      compliance,
      crisis: { detected: false, severity: 'none', response: '', escalateToHuman: false },
      template,
      style,
      routing,
      metrics,
    };
  }

  /**
   * Build crisis response (early return from orchestration)
   */
  private buildCrisisResponse(
    crisis: CrisisSignal,
    compliance: ComplianceRisk,
    conversationHistory: Message[]
  ): EngineOrchestrationResult {
    const style = communicationStyleEngine.determineCommunicationStyle(conversationHistory);

    return {
      extraction: { data: {}, confidence: 0 },
      validation: { isValid: false, issues: [] },
      decision: {
        domain: 'general',
        reasoning: crisis.detected ? 'Crisis detected' : 'Compliance violation detected',
        requiredFields: [],
        missingFields: [],
        urgency: 'critical',
        nextAction: crisis.detected ? 'Provide crisis resources' : 'Redirect to professional',
        confidence: 1.0,
      },
      nextQuestion: null,
      contextBlocks: [],
      compliance,
      crisis,
      template: {
        structure: 'direct_answer',
        slots: { response: crisis.response || compliance.response || '' },
        constraints: { tone: 'urgent' },
        instructions: 'Provide immediate response to crisis or compliance issue',
      },
      style,
      routing: {
        selectedProvider: 'claude',
        reason: 'Crisis/compliance detected - use fastest provider',
        fallbackChain: ['openai', 'gemini', 'together'],
        estimatedCost: 0.01,
        estimatedLatency: 500,
      },
      metrics: {
        providersUsed: ['claude'],
        totalCost: 0.01,
        totalLatency: 500,
        calculationsRun: 0,
        decisionsCorrect: true,
        complianceViolations: compliance.detected ? 1 : 0,
        crisisDetected: crisis.detected,
        timestamp: Date.now(),
      },
    };
  }
}

// Export singleton instance
export const atlasEngineOrchestrator = new AtlasEngineOrchestrator();
