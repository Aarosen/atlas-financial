-- TABLE 1: users (user metadata)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  display_name TEXT,
  preferred_language TEXT DEFAULT 'en',
  onboarding_complete BOOLEAN DEFAULT FALSE
);

-- TABLE 2: financial_profiles (core financial data)
CREATE TABLE IF NOT EXISTS financial_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  monthly_income NUMERIC,
  income_type TEXT CHECK (income_type IN ('salary','hourly','variable','multiple','none')),
  monthly_fixed_expenses NUMERIC,
  monthly_variable_expenses NUMERIC,
  total_savings NUMERIC DEFAULT 0,
  savings_breakdown JSONB DEFAULT '{}',
  total_debt NUMERIC DEFAULT 0,
  debt_breakdown JSONB DEFAULT '[]',
  primary_goal TEXT,
  financial_stress_level INT CHECK (financial_stress_level BETWEEN 1 AND 5),
  has_retirement_account BOOLEAN,
  retirement_contribution_rate NUMERIC,
  profile_completeness INT DEFAULT 0
);

-- TABLE 3: conversation_sessions (session tracking)
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT UNIQUE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  primary_topic TEXT,
  message_count INT DEFAULT 0,
  profile_updates JSONB DEFAULT '{}',
  key_decisions JSONB DEFAULT '[]',
  follow_up_needed BOOLEAN DEFAULT FALSE,
  follow_up_notes TEXT
);

-- TABLE 4: user_actions (commitment tracking)
CREATE TABLE IF NOT EXISTS user_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_text TEXT NOT NULL,
  action_type TEXT CHECK (action_type IN ('debt_payoff','savings','income','expense','investment','other')),
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  completed BOOLEAN DEFAULT FALSE,
  estimated_impact TEXT,
  session_id UUID REFERENCES conversation_sessions(id) ON DELETE SET NULL
);

-- TABLE 5: financial_snapshots (longitudinal history)
CREATE TABLE IF NOT EXISTS financial_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  snapshot_date TIMESTAMPTZ DEFAULT NOW(),
  monthly_income NUMERIC,
  monthly_expenses NUMERIC,
  total_savings NUMERIC,
  total_debt NUMERIC,
  net_worth NUMERIC,
  snapshot_data JSONB DEFAULT '{}'
);

-- TABLE 6: user_goals (multi-goal tracking)
CREATE TABLE IF NOT EXISTS user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  goal_text TEXT NOT NULL,
  goal_type TEXT CHECK (goal_type IN ('debt_payoff','emergency_fund','savings','investment','retirement','income','other')),
  target_amount NUMERIC,
  current_progress NUMERIC DEFAULT 0,
  target_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  completed BOOLEAN DEFAULT FALSE,
  priority INT DEFAULT 0,
  goal_data JSONB DEFAULT '{}'
);

-- TABLE 7: behavior_profiles (user behavior tracking)
CREATE TABLE IF NOT EXISTS behavior_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  total_sessions INT DEFAULT 0,
  total_messages INT DEFAULT 0,
  avg_session_length INT DEFAULT 0,
  last_session_at TIMESTAMPTZ,
  response_preference TEXT CHECK (response_preference IN ('short','explain','detailed')),
  literacy_level TEXT CHECK (literacy_level IN ('novice','intermediate','advanced')),
  engagement_score INT DEFAULT 0,
  behavior_data JSONB DEFAULT '{}'
);

-- TABLE 8: cron_logs (job execution tracking)
CREATE TABLE IF NOT EXISTS cron_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT CHECK (status IN ('success','failed','pending')),
  result_data JSONB DEFAULT '{}',
  error_message TEXT
);

-- ROW LEVEL SECURITY
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users own their profile"
  ON users FOR ALL USING (auth.uid() = auth_id);
CREATE POLICY "Users own their financial profile"
  ON financial_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their sessions"
  ON conversation_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their actions"
  ON user_actions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their snapshots"
  ON financial_snapshots FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their goals"
  ON user_goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their behavior profile"
  ON behavior_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view their cron logs"
  ON cron_logs FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_timestamp
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_financial_profiles_timestamp
  BEFORE UPDATE ON financial_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_behavior_profiles_timestamp
  BEFORE UPDATE ON behavior_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_financial_profiles_user_id ON financial_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_id ON conversation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_started_at ON conversation_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_actions_user_id ON user_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_completed ON user_actions(completed);
CREATE INDEX IF NOT EXISTS idx_financial_snapshots_user_id ON financial_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_snapshots_date ON financial_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_goals_user_id ON user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_completed ON user_goals(completed);
CREATE INDEX IF NOT EXISTS idx_behavior_profiles_user_id ON behavior_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_cron_logs_job_name ON cron_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_logs_executed_at ON cron_logs(executed_at DESC);
