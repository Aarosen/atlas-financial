export interface Debt {
  name: string;
  balance: number;
  rate: number;
  min_payment: number;
  type: 'credit_card' | 'student_loan' | 'auto' | 'medical' | 'personal' | 'other';
}

export interface Goal {
  type: string;
  target_amount: number;
  target_date?: string;
  current_amount: number;
  status: 'active' | 'paused' | 'completed';
}

export interface FinancialProfile {
  id: string;
  user_id: string;
  updated_at: string;
  monthly_income: number | null;
  income_type: 'salary' | 'hourly' | 'variable' | 'multiple' | 'none' | null;
  monthly_fixed_expenses: number | null;
  monthly_variable_expenses: number | null;
  total_savings: number | null;
  savings_breakdown: Record<string, number>;
  total_debt: number | null;
  debt_breakdown: Debt[];
  primary_goal: string | null;
  goals: Goal[];
  financial_stress_level: 1 | 2 | 3 | 4 | 5 | null;
  has_retirement_account: boolean | null;
  retirement_contribution_rate: number | null;
  profile_completeness: number;
}

export interface UserProfile {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  display_name: string | null;
  preferred_language: string;
  onboarding_complete: boolean;
  profile_completeness: number;
}

export interface ConversationSummary {
  topic: string;
  decisions: string[];
  followUpNeeded: boolean;
  followUpNotes: string | null;
}

export interface Conversation {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  primary_topic: string | null;
  profile_updates: Record<string, any>;
  key_decisions: string[];
  follow_up_needed: boolean;
  follow_up_notes: string | null;
}

export interface FinancialEvent {
  id: string;
  user_id: string;
  event_type: string;
  event_data: Record<string, any>;
  occurred_at: string;
  source: string;
}
