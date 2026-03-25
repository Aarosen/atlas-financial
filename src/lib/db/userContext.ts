import {
  getFinancialProfile,
  getOpenActions,
  getRecentSessions,
  getBehaviorProfile,
  getSnapshotHistory,
  getGoals,
  getMilestones,
  FinancialProfile,
  UserAction,
  ConversationSession,
  UserBehaviorProfile,
  FinancialSnapshot,
  UserGoal,
  GoalMilestone,
} from './supabaseRepository';

export interface UserContext {
  userId: string;
  financialProfile: FinancialProfile | null;
  openActions: UserAction[];
  recentSessions: ConversationSession[];
  behaviorProfile: UserBehaviorProfile | null;
  snapshotHistory: FinancialSnapshot[];
  goals: UserGoal[];
  unacknowledgedMilestones: GoalMilestone[];
}

/**
 * Load complete user context from Supabase at session start
 * This is called before Claude sees any context, so it can inform the system prompt
 */
export async function loadUserContext(userId: string): Promise<UserContext> {
  try {
    const [
      financialProfile,
      openActions,
      recentSessions,
      behaviorProfile,
      snapshotHistory,
      goals,
    ] = await Promise.all([
      getFinancialProfile(userId),
      getOpenActions(userId),
      getRecentSessions(userId, 3),
      getBehaviorProfile(userId),
      getSnapshotHistory(userId, 10),
      getGoals(userId),
    ]);

    // Get unacknowledged milestones from all goals
    const allMilestones = await Promise.all(
      goals.map((goal) => getMilestones(goal.id))
    );
    const unacknowledgedMilestones = allMilestones
      .flat()
      .filter((m) => m.achieved_at && !m.acknowledged_at);

    return {
      userId,
      financialProfile,
      openActions,
      recentSessions,
      behaviorProfile,
      snapshotHistory,
      goals,
      unacknowledgedMilestones,
    };
  } catch (error) {
    console.error('Error loading user context:', error);
    // Return empty context on error - graceful degradation
    return {
      userId,
      financialProfile: null,
      openActions: [],
      recentSessions: [],
      behaviorProfile: null,
      snapshotHistory: [],
      goals: [],
      unacknowledgedMilestones: [],
    };
  }
}
