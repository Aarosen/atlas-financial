import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// FINANCIAL PROFILE OPERATIONS
// ============================================================================

export interface FinancialProfile {
  user_id: string;
  monthly_income: number | null;
  essential_expenses: number | null;
  discretionary_expenses: number | null;
  total_savings: number | null;
  high_interest_debt: number | null;
  low_interest_debt: number | null;
  monthly_debt_payments: number | null;
  primary_goal: string | null;
  secondary_goal: string | null;
  risk_tolerance: string | null;
  time_horizon_years: number | null;
  life_stage: string | null;
  profile_completeness_pct: number;
  created_at: string;
  updated_at: string;
}

export async function getFinancialProfile(userId: string): Promise<FinancialProfile | null> {
  const { data, error } = await supabase
    .from('financial_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching financial profile:', error);
    return null;
  }

  return data || null;
}

export async function upsertFinancialProfile(userId: string, profile: Partial<FinancialProfile>): Promise<void> {
  const { error } = await supabase
    .from('financial_profiles')
    .upsert(
      {
        user_id: userId,
        ...profile,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('Error upserting financial profile:', error);
    throw error;
  }
}

// ============================================================================
// ACTION TRACKING OPERATIONS
// ============================================================================

export interface UserAction {
  id: string;
  user_id: string;
  session_id: string;
  goal_id: string | null;
  action_text: string;
  action_category: 'savings' | 'debt_payoff' | 'budget_cut' | 'income' | 'invest' | 'other';
  target_amount: number | null;
  target_frequency: 'one-time' | 'weekly' | 'monthly' | null;
  recommended_at: string;
  committed_at: string | null;
  check_in_due_at: string;
  status: 'recommended' | 'committed' | 'completed' | 'partial' | 'skipped' | 'abandoned';
  completion_verified_at: string | null;
  user_reported_outcome: string | null;
  actual_amount: number | null;
  impact_per_month: number | null;
}

export async function createAction(action: Omit<UserAction, 'id' | 'recommended_at'>): Promise<UserAction> {
  const { data, error } = await supabase
    .from('user_actions')
    .insert({
      ...action,
      recommended_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating action:', error);
    throw error;
  }

  return data;
}

export async function getOpenActions(userId: string): Promise<UserAction[]> {
  const { data, error } = await supabase
    .from('user_actions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['committed', 'recommended'])
    .lte('check_in_due_at', new Date().toISOString())
    .order('check_in_due_at', { ascending: true });

  if (error) {
    console.error('Error fetching open actions:', error);
    return [];
  }

  return data || [];
}

export async function updateActionStatus(
  actionId: string,
  status: UserAction['status'],
  notes?: string,
  actualAmount?: number
): Promise<void> {
  const update: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'completed' || status === 'partial') {
    update.completion_verified_at = new Date().toISOString();
  }

  if (notes) {
    update.user_reported_outcome = notes;
  }

  if (actualAmount !== undefined) {
    update.actual_amount = actualAmount;
  }

  const { error } = await supabase
    .from('user_actions')
    .update(update)
    .eq('id', actionId);

  if (error) {
    console.error('Error updating action status:', error);
    throw error;
  }
}

// ============================================================================
// FINANCIAL SNAPSHOT OPERATIONS
// ============================================================================

export interface FinancialSnapshot {
  id: string;
  user_id: string;
  session_id: string | null;
  snapshot_date: string;
  monthly_income: number | null;
  essential_expenses: number | null;
  total_savings: number | null;
  high_interest_debt: number | null;
  low_interest_debt: number | null;
  net_worth: number | null;
  monthly_surplus: number | null;
  created_at: string;
}

export async function createSnapshot(snapshot: Omit<FinancialSnapshot, 'id' | 'created_at'>): Promise<FinancialSnapshot> {
  const { data, error } = await supabase
    .from('financial_snapshots')
    .insert({
      ...snapshot,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating snapshot:', error);
    throw error;
  }

  return data;
}

export async function getSnapshotHistory(userId: string, limit: number = 10): Promise<FinancialSnapshot[]> {
  const { data, error } = await supabase
    .from('financial_snapshots')
    .select('*')
    .eq('user_id', userId)
    .order('snapshot_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching snapshot history:', error);
    return [];
  }

  return (data || []).reverse(); // Return in chronological order (oldest first)
}

// ============================================================================
// GOAL OPERATIONS
// ============================================================================

export interface UserGoal {
  id: string;
  user_id: string;
  goal_type: 'emergency_fund' | 'debt_payoff' | 'savings_target' | 'invest_start' | 'other';
  goal_label: string | null;
  target_amount: number;
  starting_amount: number;
  current_amount: number | null;
  monthly_contribution: number | null;
  target_date: string | null;
  status: 'active' | 'achieved' | 'paused' | 'abandoned';
  created_at: string;
  achieved_at: string | null;
}

export async function getGoals(userId: string): Promise<UserGoal[]> {
  const { data, error } = await supabase
    .from('user_goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching goals:', error);
    return [];
  }

  return data || [];
}

export async function createGoal(goal: Omit<UserGoal, 'id' | 'created_at'>): Promise<UserGoal> {
  const { data, error } = await supabase
    .from('user_goals')
    .insert({
      ...goal,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating goal:', error);
    throw error;
  }

  return data;
}

// ============================================================================
// GOAL MILESTONE OPERATIONS
// ============================================================================

export interface GoalMilestone {
  id: string;
  goal_id: string;
  milestone_percentage: number;
  milestone_label: string | null;
  milestone_amount: number;
  achieved_at: string | null;
  acknowledged_at: string | null;
}

export async function getMilestones(goalId: string): Promise<GoalMilestone[]> {
  const { data, error } = await supabase
    .from('goal_milestones')
    .select('*')
    .eq('goal_id', goalId)
    .order('milestone_percentage', { ascending: true });

  if (error) {
    console.error('Error fetching milestones:', error);
    return [];
  }

  return data || [];
}

export async function updateMilestoneAcknowledged(milestoneId: string): Promise<void> {
  const { error } = await supabase
    .from('goal_milestones')
    .update({ acknowledged_at: new Date().toISOString() })
    .eq('id', milestoneId);

  if (error) {
    console.error('Error updating milestone:', error);
    throw error;
  }
}

// ============================================================================
// BEHAVIOR PROFILE OPERATIONS
// ============================================================================

export interface UserBehaviorProfile {
  user_id: string;
  total_commitments: number;
  commitments_followed_through: number;
  follow_through_rate: number;
  avg_days_to_complete: number | null;
  avg_session_gap_days: number | null;
  last_active_at: string | null;
  behavioral_tags: string[];
  preferred_check_in_frequency: 'weekly' | 'biweekly' | 'monthly' | null;
  behavior_profile_active: boolean;
  updated_at: string;
}

export async function getBehaviorProfile(userId: string): Promise<UserBehaviorProfile | null> {
  const { data, error } = await supabase
    .from('user_behavior_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching behavior profile:', error);
    return null;
  }

  return data || null;
}

export async function updateBehaviorProfile(userId: string, update: Partial<UserBehaviorProfile>): Promise<void> {
  const { error } = await supabase
    .from('user_behavior_profiles')
    .upsert(
      {
        user_id: userId,
        ...update,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('Error updating behavior profile:', error);
    throw error;
  }
}

// ============================================================================
// CONVERSATION OPERATIONS
// ============================================================================

export interface ConversationSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  primary_topic: string | null;
  key_decisions: string[];
  follow_up_needed: boolean;
  follow_up_notes: string | null;
  turn_count: number;
  session_goal: string | null;
  entry_point: string | null;
}

export async function createConversationSession(session: Omit<ConversationSession, 'id' | 'started_at'>): Promise<ConversationSession> {
  const { data, error } = await supabase
    .from('conversation_sessions')
    .insert({
      ...session,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating conversation session:', error);
    throw error;
  }

  return data;
}

export async function updateConversationSession(sessionId: string, update: Partial<ConversationSession>): Promise<void> {
  const { error } = await supabase
    .from('conversation_sessions')
    .update(update)
    .eq('id', sessionId);

  if (error) {
    console.error('Error updating conversation session:', error);
    throw error;
  }
}

export async function getRecentSessions(userId: string, limit: number = 3): Promise<ConversationSession[]> {
  const { data, error } = await supabase
    .from('conversation_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent sessions:', error);
    return [];
  }

  return data || [];
}
