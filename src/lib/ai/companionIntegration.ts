import { loadUserContext } from '@/lib/db/userContext';
import { 
  persistFinancialData, 
  createSessionSnapshot, 
  endConversationSession, 
  initializeConversationSession 
} from '@/lib/db/supabaseIntegration';
import { extractActionFromResponse, detectCommitmentFromMessage } from '@/lib/ai/actionExtractor';
import { buildAccountabilityBlock as buildAccountabilityBlockEngine } from '@/lib/ai/accountabilityEngine';
import { buildRoadmapBlock } from '@/lib/ai/actionSequencer';
import { buildBehavioralAdaptationBlock as buildBehavioralAdaptationBlockEngine } from '@/lib/ai/behavioralProfiler';
import { evaluateEscalation, buildEscalationBlock } from '@/lib/ai/escalationEngine';
import { buildMemorySummary, extractKeyDecisions, determineFollowUpNeeded, generateFollowUpNotes } from '@/lib/ai/memoryActivation';
import { coordinateGoals, buildMultiGoalBlock } from '@/lib/ai/multiGoalCoordinator';
import { calculateMetricChange, calculateNetWorthTrend } from '@/lib/calculations/progressCalculations';
import { createAction, updateActionStatus } from '@/lib/db/supabaseRepository';

/**
 * Build complete companion context for system prompt
 * Called at session start to inject all relevant context blocks
 */
export async function buildCompanionSystemPromptContext(
  userId: string,
  userMessage: string,
  extractedFields: Record<string, any>
): Promise<string> {
  try {
    // Load user context from Supabase
    const userContext = await loadUserContext(userId);

    let contextBlocks: string[] = [];

    // 1. Accountability block (if open commitments exist)
    if (userContext.openActions.length > 0) {
      const accountabilityBlock = buildAccountabilityBlockEngine(userContext.openActions);
      if (accountabilityBlock) {
        contextBlocks.push(accountabilityBlock);
      }
    }

    // 2. Memory summary (if recent sessions exist)
    if (userContext.recentSessions.length > 0) {
      const memorySummary = buildMemorySummary(userContext.recentSessions);
      if (memorySummary) {
        contextBlocks.push(`━━━ MEMORY CONTEXT ━━━\n${memorySummary}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      }
    }

    // 3. Progress block (if snapshots exist)
    if (userContext.snapshotHistory.length >= 2) {
      const savingsChange = calculateMetricChange(userContext.snapshotHistory, 'total_savings');
      const debtChange = calculateMetricChange(userContext.snapshotHistory, 'high_interest_debt');
      const netWorthTrend = calculateNetWorthTrend(userContext.snapshotHistory);

      let progressBlock = '━━━ FINANCIAL PROGRESS ━━━\n';
      if (savingsChange) {
        progressBlock += `Savings: $${savingsChange.from.toLocaleString()} → $${savingsChange.to.toLocaleString()} (${savingsChange.changePct > 0 ? '+' : ''}${savingsChange.changePct.toFixed(1)}%)\n`;
      }
      if (debtChange) {
        progressBlock += `Debt: $${debtChange.from.toLocaleString()} → $${debtChange.to.toLocaleString()} (${debtChange.changePct.toFixed(1)}%)\n`;
      }
      if (netWorthTrend) {
        progressBlock += `Trajectory: ${netWorthTrend.trend.toUpperCase()} at $${netWorthTrend.monthlyRateOfChange.toLocaleString()}/month\n`;
      }
      progressBlock += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
      contextBlocks.push(progressBlock);
    }

    // 4. Roadmap block (if financial profile exists)
    if (userContext.financialProfile) {
      const roadmapBlock = buildRoadmapBlock(userContext.financialProfile);
      contextBlocks.push(roadmapBlock);
    }

    // 5. Behavioral adaptation block (if profile is active)
    if (userContext.behaviorProfile && userContext.behaviorProfile.behavior_profile_active) {
      const behavioralBlock = buildBehavioralAdaptationBlockEngine(userContext.behaviorProfile);
      if (behavioralBlock) {
        contextBlocks.push(behavioralBlock);
      }
    }

    // 6. Multi-goal coordination block (if goals exist)
    if (userContext.goals.length > 0 && userContext.financialProfile) {
      const coordination = coordinateGoals(userContext.goals, userContext.financialProfile);
      const multiGoalBlock = buildMultiGoalBlock(coordination);
      contextBlocks.push(multiGoalBlock);
    }

    // 7. Escalation block (if escalation is triggered)
    const escalationSignal = evaluateEscalation(
      userMessage,
      userContext.financialProfile,
      userContext.behaviorProfile,
      userContext.snapshotHistory
    );
    if (escalationSignal.shouldEscalate) {
      const escalationBlock = buildEscalationBlock(escalationSignal);
      if (escalationBlock) {
        contextBlocks.push(escalationBlock);
      }
    }

    return contextBlocks.join('\n');
  } catch (error) {
    console.error('Error building companion context:', error);
    return '';
  }
}

/**
 * Process user message for companion features
 * Called after user sends a message to detect commitments and extract data
 */
export async function processUserMessageForCompanion(
  userId: string,
  userMessage: string,
  apiKey: string
): Promise<{
  commitment: any;
  extractedFields: Record<string, any>;
}> {
  try {
    // Detect commitment from user message
    const commitment = await detectCommitmentFromMessage(userMessage, apiKey);

    // Extract financial data (already done in route, but can be called here too)
    const extractedFields: Record<string, any> = {};

    return {
      commitment,
      extractedFields,
    };
  } catch (error) {
    console.error('Error processing user message:', error);
    return {
      commitment: { commitment_detected: false },
      extractedFields: {},
    };
  }
}

/**
 * Process Atlas response for companion features
 * Called after Claude generates a response to extract actions and track them
 */
export async function processAtlasResponseForCompanion(
  userId: string,
  sessionId: string,
  atlasResponse: string,
  apiKey: string
): Promise<void> {
  try {
    // Extract action from response
    const extractedAction = await extractActionFromResponse(atlasResponse, apiKey);

    if (extractedAction.action_detected) {
      // Create action in Supabase
      const checkInDate = new Date();
      checkInDate.setDate(checkInDate.getDate() + (extractedAction.check_in_days || 30));

      await createAction({
        user_id: userId,
        session_id: sessionId,
        goal_id: null,
        action_text: extractedAction.action_text || '',
        action_category: extractedAction.action_category || 'other',
        target_amount: extractedAction.target_amount || null,
        target_frequency: extractedAction.target_frequency || null,
        check_in_due_at: checkInDate.toISOString(),
        status: 'recommended',
        committed_at: null,
        completion_verified_at: null,
        user_reported_outcome: null,
        actual_amount: null,
        impact_per_month: null,
      });
    }
  } catch (error) {
    console.error('Error processing Atlas response:', error);
  }
}

/**
 * Handle user commitment to an action
 * Called when commitment is detected in user message
 */
export async function handleUserCommitment(
  userId: string,
  commitment: any,
  apiKey: string
): Promise<void> {
  try {
    if (!commitment.commitment_detected) {
      return;
    }

    // Find most recent recommended action
    // This would require querying the database for the most recent action
    // For now, this is a placeholder for the logic

    if (commitment.commitment_type === 'will_do') {
      // Mark action as committed
      // await updateActionStatus(actionId, 'committed');
    } else if (commitment.commitment_type === 'done') {
      // Mark action as completed
      // await updateActionStatus(actionId, 'completed', commitment.user_notes, commitment.user_reported_amount);
    } else if (commitment.commitment_type === 'partial') {
      // Mark action as partial
      // await updateActionStatus(actionId, 'partial', commitment.user_notes, commitment.user_reported_amount);
    }
  } catch (error) {
    console.error('Error handling user commitment:', error);
  }
}

/**
 * End conversation session and persist final state
 * Called when user closes conversation or session times out
 */
export async function endCompanionSession(
  userId: string,
  sessionId: string,
  conversationText: string,
  financialData: Record<string, any>
): Promise<void> {
  try {
    // Extract key decisions from conversation
    const keyDecisions = await extractKeyDecisions(conversationText, process.env.ANTHROPIC_API_KEY || '');

    // Determine if follow-up is needed
    // This would require querying for open actions
    const followUpNeeded = true; // Placeholder

    // Generate follow-up notes
    // const followUpNotes = generateFollowUpNotes(openActions);

    // Create financial snapshot
    if (Object.keys(financialData).length > 0) {
      await createSessionSnapshot(userId, sessionId, financialData);
    }

    // End the session
    await endConversationSession(sessionId, {
      key_decisions: keyDecisions,
      follow_up_needed: followUpNeeded,
      follow_up_notes: undefined, // Would be populated from generateFollowUpNotes
    });
  } catch (error) {
    console.error('Error ending companion session:', error);
  }
}

/**
 * Initialize a new companion session
 * Called at the start of a new conversation
 */
export async function initializeCompanionSession(
  userId: string,
  entryPoint?: string
): Promise<string> {
  try {
    const session = await initializeConversationSession(userId, entryPoint);
    return session.id;
  } catch (error) {
    console.error('Error initializing companion session:', error);
    throw error;
  }
}
