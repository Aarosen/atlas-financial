/**
 * ATLAS AI Conversation Adaptation Layer
 * 
 * Integrates adaptive conversation engine and intelligent response engine
 * into the actual conversation flow. Replaces rigid question sequencing
 * with context-aware, mentoring-focused dialogue.
 */

import type { FinancialState } from '@/lib/state/types';
import type { ConversationContext, AdaptiveResponse } from './adaptiveConversationEngine';
import type { IntelligentResponseContext, EnhancedIntelligentResponse } from './intelligentResponseEngine';
import {
  generateAdaptiveResponse,
  isReadyForActionPlan,
  generateActionPlan,
} from './adaptiveConversationEngine';
import { enhanceResponseIntelligently, shouldIncludeActionPlan, generateNextSteps } from './intelligentResponseEngine';

export interface ConversationTurn {
  userMessage: string;
  assistantResponse: string;
  timestamp: number;
}

export interface AdaptiveConversationState {
  turns: ConversationTurn[];
  financialState: FinancialState;
  adaptiveMetadata: {
    detectedConcern: string;
    userSignals: string[];
    conversationPhase: 'discovery' | 'strategy' | 'implementation' | 'optimization';
    comprehensionLevel: 'beginner' | 'intermediate' | 'advanced';
    readyForActionPlan: boolean;
  };
}

/**
 * Process user message through adaptive conversation layer
 */
export function processUserMessageAdaptively(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  financialState: FinancialState,
  baseResponse: string
): {
  adaptiveResponse: AdaptiveResponse;
  enhancedResponse: EnhancedIntelligentResponse;
  finalResponse: string;
  shouldAskFollowUp: boolean;
  followUpQuestion: string | null;
  readyForActionPlan: boolean;
  actionPlan: string | null;
} {
  // Step 1: Generate adaptive response (detects signals, adjusts strategy)
  const adaptiveContext: ConversationContext = {
    userMessage,
    conversationHistory,
    financialState,
    turnCount: conversationHistory.length,
    sessionDuration: calculateSessionDuration(conversationHistory),
    detectedConcern: detectFinancialConcern(userMessage),
  };

  const adaptiveResponse = generateAdaptiveResponse(adaptiveContext);

  // Step 2: Enhance response with intelligent elements (mentoring, adaptation, synthesis)
  const intelligentContext: IntelligentResponseContext = {
    userMessage,
    baseResponse: adaptiveResponse.baseResponse,
    conversationHistory,
    financialState,
    turnCount: conversationHistory.length,
  };

  const enhancedResponse = enhanceResponseIntelligently(intelligentContext);

  // Step 3: Combine adaptations
  let finalResponse = enhancedResponse.enhanced;

  // Add goal/lever adjustments if present
  if (adaptiveResponse.adaptations.goalAdjustment) {
    finalResponse += `\n\n**Goal Adjustment:** ${adaptiveResponse.adaptations.goalAdjustment}`;
  }

  if (adaptiveResponse.adaptations.leverRecommendation) {
    finalResponse += `\n\n**Recommended Levers:** ${adaptiveResponse.adaptations.leverRecommendation}`;
  }

  // Step 4: Check if ready for action plan
  const readyForActionPlan = isReadyForActionPlan(adaptiveContext);
  let actionPlan: string | null = null;

  if (readyForActionPlan && shouldIncludeActionPlan(intelligentContext)) {
    actionPlan = generateActionPlan(adaptiveContext);
    finalResponse += `\n\n${actionPlan}`;
  }

  return {
    adaptiveResponse,
    enhancedResponse,
    finalResponse,
    shouldAskFollowUp: adaptiveResponse.shouldAskFollowUp,
    followUpQuestion: adaptiveResponse.followUpQuestion,
    readyForActionPlan,
    actionPlan,
  };
}

/**
 * Calculate session duration from conversation history
 */
function calculateSessionDuration(history: Array<{ role: 'user' | 'assistant'; content: string }>): number {
  // Estimate: ~30 seconds per turn
  return Math.max(60000, history.length * 30000);
}

/**
 * Detect financial concern from user message
 */
function detectFinancialConcern(userMessage: string): string {
  const msg = userMessage.toLowerCase();

  if (/\b(debt|credit|loan|payment|interest)\b/.test(msg)) return 'debt_management';
  if (/\b(saving|emergency|fund|account)\b/.test(msg)) return 'savings';
  if (/\b(invest|retirement|401k|ira|stock|portfolio)\b/.test(msg)) return 'investing';
  if (/\b(budget|spend|expense|reduce|cut)\b/.test(msg)) return 'budgeting';
  if (/\b(income|earn|salary|raise|side|gig)\b/.test(msg)) return 'income_growth';
  if (/\b(tax|deduction|refund|irs)\b/.test(msg)) return 'tax_optimization';

  return 'general_guidance';
}

/**
 * Build adaptive conversation state for tracking
 */
export function buildAdaptiveConversationState(
  turns: ConversationTurn[],
  financialState: FinancialState,
  detectedConcern: string,
  userSignals: string[],
  conversationPhase: 'discovery' | 'strategy' | 'implementation' | 'optimization',
  comprehensionLevel: 'beginner' | 'intermediate' | 'advanced',
  readyForActionPlan: boolean
): AdaptiveConversationState {
  return {
    turns,
    financialState,
    adaptiveMetadata: {
      detectedConcern,
      userSignals,
      conversationPhase,
      comprehensionLevel,
      readyForActionPlan,
    },
  };
}

/**
 * Determine if conversation should continue or conclude
 */
export function shouldConcludeConversation(state: AdaptiveConversationState): boolean {
  const { readyForActionPlan, conversationPhase } = state.adaptiveMetadata;
  const hasMinimumTurns = state.turns.length >= 5;

  return readyForActionPlan && hasMinimumTurns && conversationPhase !== 'discovery';
}

/**
 * Generate conversation conclusion with synthesis
 */
export function generateConversationConclusion(state: AdaptiveConversationState): string {
  const { financialState, adaptiveMetadata } = state;
  const { detectedConcern, conversationPhase } = adaptiveMetadata;

  const nextSteps = generateNextSteps(financialState);

  let conclusion = `\n\n---\n\n**Your Personalized Action Plan:**\n\n${nextSteps.map((step, i) => `${step}`).join('\n')}\n\n`;

  conclusion += `**What happens next:**\n`;
  conclusion += `1. Start with Step 1 this week\n`;
  conclusion += `2. Track your progress\n`;
  conclusion += `3. Check in with me in 2 weeks\n`;
  conclusion += `4. Adjust as needed based on what you learn\n\n`;

  conclusion += `You've got this. Small steps compound into big results. Let's get started.`;

  return conclusion;
}

/**
 * Detect if user is asking for something outside financial guidance
 */
export function isOutOfScope(userMessage: string): boolean {
  const outOfScopePatterns = [
    /\b(medical|health|doctor|prescription|therapy|mental)\b/i,
    /\b(legal|lawyer|court|lawsuit|divorce)\b/i,
    /\b(relationship|dating|marriage|family|kids)\b/i,
    /\b(job search|resume|interview|hiring)\b/i,
  ];

  return outOfScopePatterns.some(pattern => pattern.test(userMessage));
}

/**
 * Generate out-of-scope response
 */
export function generateOutOfScopeResponse(userMessage: string): string {
  if (/\b(medical|health|doctor)\b/i.test(userMessage)) {
    return `That's an important topic, but it's outside my expertise. Please consult with a healthcare professional. However, I can help you plan for healthcare costs and insurance needs if that would be useful.`;
  }

  if (/\b(legal|lawyer|court)\b/i.test(userMessage)) {
    return `That requires legal expertise. I'd recommend consulting with a qualified attorney. But I can help you understand the financial implications of legal decisions if needed.`;
  }

  if (/\b(relationship|dating|marriage|family)\b/i.test(userMessage)) {
    return `That's outside my wheelhouse, but I can help with the financial side of relationships—joint budgeting, combining finances, financial goals as a couple, etc.`;
  }

  return `That's a bit outside my expertise, but I'm happy to help with the financial aspects if there are any.`;
}

/**
 * Evaluate response quality for continuous improvement
 */
export function evaluateResponseQuality(
  userMessage: string,
  response: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): {
  qualityScore: number;
  issues: string[];
  improvements: string[];
} {
  const issues: string[] = [];
  const improvements: string[] = [];
  let qualityScore = 100;

  // Check for robotic patterns
  if (/^(here's|let me|i think|based on)/i.test(response)) {
    issues.push('Response starts with generic phrase');
    improvements.push('Start with empathy or direct answer');
    qualityScore -= 10;
  }

  // Check for lack of personalization
  if (!response.includes('your') && !response.includes('you')) {
    issues.push('Response lacks personalization');
    improvements.push('Reference user\'s specific situation');
    qualityScore -= 15;
  }

  // Check for action steps
  if (!/\b(step|next|action|do this|try|start)\b/i.test(response)) {
    issues.push('Response lacks clear next steps');
    improvements.push('Include specific action items');
    qualityScore -= 10;
  }

  // Check for mentoring
  if (!/\b(why|because|this matters|important|key|remember)\b/i.test(response)) {
    issues.push('Response lacks teaching moment');
    improvements.push('Explain the "why" behind recommendations');
    qualityScore -= 10;
  }

  // Check for synthesis (if multi-turn)
  if (conversationHistory.length > 4 && !response.includes('connect') && !response.includes('together')) {
    issues.push('Response misses opportunity to synthesize');
    improvements.push('Connect this answer to previous discussion');
    qualityScore -= 5;
  }

  return {
    qualityScore: Math.max(0, qualityScore),
    issues,
    improvements,
  };
}

/**
 * Apply quality improvements to response
 */
export function improveResponseQuality(
  response: string,
  userMessage: string,
  financialState: FinancialState,
  issues: string[]
): string {
  let improved = response;

  // Fix generic opening
  if (issues.includes('Response starts with generic phrase')) {
    improved = improved.replace(/^(here's|let me|i think|based on)\s+/i, '');
  }

  // Add personalization if missing
  if (issues.includes('Response lacks personalization')) {
    if (financialState.monthlyIncome) {
      improved += `\n\nFor your situation with $${financialState.monthlyIncome.toFixed(0)}/month income...`;
    }
  }

  // Add action steps if missing
  if (issues.includes('Response lacks clear next steps')) {
    improved += `\n\n**Your next step:** Pick one action from above and do it this week.`;
  }

  // Add teaching if missing
  if (issues.includes('Response lacks teaching moment')) {
    improved += `\n\n**Why this matters:** This builds the foundation for everything else.`;
  }

  return improved;
}
