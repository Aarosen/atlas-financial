/**
 * TASK 3.1: Context Retention Across Turns
 * 
 * Prevents phase regression and maintains conversation context across turns.
 * Ensures discovery → analysis → guidance → action never goes backward.
 */

export type ConversationPhase = 'discovery' | 'analysis' | 'guidance' | 'action' | 'crisis';

export interface SessionContext {
  phase: ConversationPhase;
  turnCount: number;
  missingFields: string[];
  answeredFields: Record<string, boolean>;
  lastQuestion?: string;
  financialSnapshot?: Record<string, any>;
  goals?: any[];
  urgencyLevel?: 'calm' | 'advisory' | 'protective' | 'critical';
  timestamp?: number;
}

/**
 * Determine the next phase based on current state
 * Ensures phase only advances, never regresses
 */
export function advancePhase(
  currentPhase: ConversationPhase,
  missingFields: string[],
  hasData: boolean,
  isCrisis: boolean
): ConversationPhase {
  // Crisis overrides all phases
  if (isCrisis) {
    return 'crisis';
  }

  // Phase progression rules (can only advance, never regress)
  switch (currentPhase) {
    case 'crisis':
      // Once in crisis, stay in crisis until resolved
      return 'crisis';

    case 'discovery':
      // Move to analysis once we have some financial data
      if (hasData && missingFields.length < 3) {
        return 'analysis';
      }
      return 'discovery';

    case 'analysis':
      // Move to guidance once we have most required fields
      if (missingFields.length === 0) {
        return 'guidance';
      }
      // Never regress back to discovery
      return 'analysis';

    case 'guidance':
      // Move to action once user commits to a plan
      // (This would be detected by user message patterns like "let's do it" or "how do I start")
      return 'guidance';

    case 'action':
      // Stay in action phase
      return 'action';

    default:
      return 'discovery';
  }
}

/**
 * Merge incoming sessionState with current context
 * Prevents phase regression by enforcing monotonic phase advancement
 */
export function mergeSessionContext(
  incomingState: Partial<SessionContext> | undefined,
  currentState: SessionContext | undefined,
  newPhase: ConversationPhase
): SessionContext {
  const current = currentState || {
    phase: 'discovery',
    turnCount: 0,
    missingFields: [],
    answeredFields: {},
  };

  // Enforce phase monotonicity: never regress
  const phaseOrder: Record<ConversationPhase, number> = {
    discovery: 0,
    analysis: 1,
    guidance: 2,
    action: 3,
    crisis: 999, // Crisis overrides all
  };

  const currentPhaseLevel = phaseOrder[current.phase];
  const newPhaseLevel = phaseOrder[newPhase];

  // Use the higher phase level (prevents regression)
  const finalPhase: ConversationPhase =
    newPhaseLevel >= currentPhaseLevel
      ? newPhase
      : current.phase;

  return {
    phase: finalPhase,
    turnCount: (current.turnCount || 0) + 1,
    missingFields: incomingState?.missingFields ?? current.missingFields ?? [],
    answeredFields: {
      ...current.answeredFields,
      ...(incomingState?.answeredFields ?? {}),
    },
    lastQuestion: incomingState?.lastQuestion ?? current.lastQuestion,
    financialSnapshot: {
      ...current.financialSnapshot,
      ...(incomingState?.financialSnapshot ?? {}),
    },
    goals: incomingState?.goals ?? current.goals ?? [],
    urgencyLevel: incomingState?.urgencyLevel ?? current.urgencyLevel ?? 'calm',
    timestamp: Date.now(),
  };
}

/**
 * Build context block for system prompt injection
 * Tells Claude about conversation phase and what to expect next
 */
export function buildContextRetentionBlock(context: SessionContext): string {
  const phaseInstructions: Record<ConversationPhase, string> = {
    discovery: `CONVERSATION PHASE: Discovery. User is providing initial financial information. Ask clarifying questions to understand their situation. Do NOT provide recommendations yet.`,
    analysis: `CONVERSATION PHASE: Analysis. User has provided core financial data. Analyze their situation and identify the primary financial challenge. Begin to surface specific recommendations.`,
    guidance: `CONVERSATION PHASE: Guidance. User's financial situation is clear. Provide specific, actionable guidance with concrete next steps. Focus on their primary goal.`,
    action: `CONVERSATION PHASE: Action. User is implementing recommendations. Provide tactical support and progress tracking. Celebrate wins and adjust course as needed.`,
    crisis: `CONVERSATION PHASE: Crisis. User is in financial distress. Provide immediate resources and safety-first guidance. Do NOT provide optimization advice.`,
  };

  let block = `[CONTEXT_RETENTION]\n${phaseInstructions[context.phase]}\n`;

  if (context.missingFields && context.missingFields.length > 0) {
    block += `\nMISSING FIELDS: ${context.missingFields.join(', ')}. Ask about these if relevant to the conversation.`;
  }

  if (context.turnCount && context.turnCount > 5) {
    block += `\nCONVERSATION HISTORY: This is turn ${context.turnCount}. User has been engaged. Provide deeper analysis and more specific recommendations.`;
  }

  block += `\n[END_CONTEXT_RETENTION]`;

  return block;
}

/**
 * Validate that phase progression is monotonic
 * Used for testing and debugging
 */
export function validatePhaseProgression(phases: ConversationPhase[]): boolean {
  const phaseOrder: Record<ConversationPhase, number> = {
    discovery: 0,
    analysis: 1,
    guidance: 2,
    action: 3,
    crisis: 999,
  };

  for (let i = 1; i < phases.length; i++) {
    const prevLevel = phaseOrder[phases[i - 1]];
    const currLevel = phaseOrder[phases[i]];

    // Allow staying in same phase or advancing, but not regressing
    if (currLevel < prevLevel && phases[i] !== 'crisis') {
      return false; // Regression detected
    }
  }

  return true; // Valid progression
}
