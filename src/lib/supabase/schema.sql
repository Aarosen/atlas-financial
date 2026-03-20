-- TABLE 1: user_profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  display_name TEXT,
  preferred_language TEXT DEFAULT 'en',
  onboarding_complete BOOLEAN DEFAULT FALSE,
  profile_completeness INT DEFAULT 0
);

-- TABLE 2: financial_profiles (the core)
CREATE TABLE IF NOT EXISTS financial_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
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
  goals JSONB DEFAULT '[]',
  financial_stress_level INT CHECK (financial_stress_level BETWEEN 1 AND 5),
  has_retirement_account BOOLEAN,
  retirement_contribution_rate NUMERIC,
  profile_completeness INT DEFAULT 0
);

-- TABLE 3: conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  primary_topic TEXT,
  profile_updates JSONB DEFAULT '{}',
  key_decisions JSONB DEFAULT '[]',
  follow_up_needed BOOLEAN DEFAULT FALSE,
  follow_up_notes TEXT
);

-- TABLE 4: financial_events (longitudinal history)
CREATE TABLE IF NOT EXISTS financial_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'user_reported'
);

-- ROW LEVEL SECURITY
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users own their profile"
  ON user_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their financial profile"
  ON financial_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their conversations"
  ON conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their events"
  ON financial_events FOR ALL USING (auth.uid() = user_id);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_financial_profiles_timestamp
  BEFORE UPDATE ON financial_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_profiles_timestamp
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_financial_profiles_user_id ON financial_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_started_at ON conversations(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_events_user_id ON financial_events(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_events_occurred_at ON financial_events(occurred_at DESC);
