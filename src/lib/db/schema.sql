-- Stores the canonical financial profile for each user
-- Replaces the in-memory FinancialProfileDb map and IndexedDB 'fin' store
CREATE TABLE IF NOT EXISTS financial_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_income NUMERIC,
  essential_expenses NUMERIC,
  discretionary_expenses NUMERIC,
  total_savings NUMERIC,
  high_interest_debt NUMERIC,
  low_interest_debt NUMERIC,
  monthly_debt_payments NUMERIC,
  primary_goal TEXT,
  secondary_goal TEXT,
  risk_tolerance TEXT,
  time_horizon_years INTEGER,
  life_stage TEXT,
  profile_completeness_pct INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores every conversation session
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  primary_topic TEXT,
  key_decisions TEXT[] DEFAULT '{}',
  follow_up_needed BOOLEAN DEFAULT FALSE,
  follow_up_notes TEXT,
  turn_count INTEGER DEFAULT 0,
  session_goal TEXT,
  entry_point TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores individual messages within each session
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES conversation_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  turn_index INTEGER NOT NULL
);

-- Stores every action Atlas has ever recommended to a user
CREATE TABLE IF NOT EXISTS user_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES conversation_sessions(id) ON DELETE CASCADE NOT NULL,
  goal_id UUID,
  action_text TEXT NOT NULL,
  action_category TEXT NOT NULL CHECK (action_category IN ('savings','debt_payoff','budget_cut','income','invest','other')),
  target_amount NUMERIC,
  target_frequency TEXT CHECK (target_frequency IN ('one-time', 'weekly', 'monthly')),
  recommended_at TIMESTAMPTZ DEFAULT NOW(),
  committed_at TIMESTAMPTZ,
  check_in_due_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'recommended' CHECK (status IN ('recommended','committed','completed','partial','skipped','abandoned')),
  completion_verified_at TIMESTAMPTZ,
  user_reported_outcome TEXT,
  actual_amount NUMERIC,
  impact_per_month NUMERIC,
  email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores periodic financial snapshots for progress tracking
CREATE TABLE IF NOT EXISTS financial_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES conversation_sessions(id) ON DELETE SET NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  monthly_income NUMERIC,
  essential_expenses NUMERIC,
  total_savings NUMERIC,
  high_interest_debt NUMERIC,
  low_interest_debt NUMERIC,
  net_worth NUMERIC,
  monthly_surplus NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores the user's named financial goals
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('emergency_fund','debt_payoff','savings_target','invest_start','other')),
  goal_label TEXT,
  description TEXT,
  target_amount NUMERIC NOT NULL,
  starting_amount NUMERIC NOT NULL,
  current_amount NUMERIC,
  monthly_contribution NUMERIC,
  target_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','achieved','paused','abandoned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  achieved_at TIMESTAMPTZ
);

-- Stores milestone checkpoints within each goal
CREATE TABLE IF NOT EXISTS goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES user_goals(id) ON DELETE CASCADE NOT NULL,
  milestone_percentage INTEGER NOT NULL,
  milestone_label TEXT,
  milestone_amount NUMERIC NOT NULL,
  achieved_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores derived behavioral patterns for each user
CREATE TABLE IF NOT EXISTS user_behavior_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_commitments INTEGER DEFAULT 0,
  commitments_followed_through INTEGER DEFAULT 0,
  follow_through_rate NUMERIC DEFAULT 0,
  avg_days_to_complete NUMERIC,
  avg_session_gap_days NUMERIC,
  last_active_at TIMESTAMPTZ,
  behavioral_tags TEXT[] DEFAULT '{}',
  preferred_check_in_frequency TEXT CHECK (preferred_check_in_frequency IN ('weekly', 'biweekly', 'monthly')),
  behavior_profile_active BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_financial_profiles_user_id ON financial_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_id ON conversation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_started_at ON conversation_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_session_id ON conversation_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_user_id ON conversation_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_user_id ON user_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_session_id ON user_actions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_status ON user_actions(status);
CREATE INDEX IF NOT EXISTS idx_user_actions_check_in_due ON user_actions(check_in_due_at);
CREATE INDEX IF NOT EXISTS idx_financial_snapshots_user_id ON financial_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_snapshots_snapshot_date ON financial_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_milestones_goal_id ON goal_milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_profiles_user_id ON user_behavior_profiles(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE financial_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behavior_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own data
CREATE POLICY "Users can view their own financial profiles"
  ON financial_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own financial profiles"
  ON financial_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own financial profiles"
  ON financial_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own conversation sessions"
  ON conversation_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversation sessions"
  ON conversation_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversation sessions"
  ON conversation_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own conversation messages"
  ON conversation_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversation messages"
  ON conversation_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own actions"
  ON user_actions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own actions"
  ON user_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own actions"
  ON user_actions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own financial snapshots"
  ON financial_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own financial snapshots"
  ON financial_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own goals"
  ON user_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
  ON user_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON user_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own goal milestones"
  ON goal_milestones FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM user_goals WHERE id = goal_milestones.goal_id));

CREATE POLICY "Users can view their own behavior profiles"
  ON user_behavior_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own behavior profiles"
  ON user_behavior_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_financial_profiles_updated_at
  BEFORE UPDATE ON financial_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_actions_updated_at
  BEFORE UPDATE ON user_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_behavior_profiles_updated_at
  BEFORE UPDATE ON user_behavior_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Stores cron job execution logs
CREATE TABLE IF NOT EXISTS cron_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  ran_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'error')),
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_cron_logs_ran_at ON cron_logs(ran_at);
CREATE INDEX IF NOT EXISTS idx_cron_logs_job_name ON cron_logs(job_name);
