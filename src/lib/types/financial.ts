// Financial Profile Schema - P0-2 requirement
export interface FinancialProfile {
  userId: string;
  name: string;
  lifeStage: 'student' | 'early_career' | 'mid_career' | 'established' | 'pre_retirement' | 'retired';
  monthlyIncome: number;
  monthlyExpenses: number;
  debtAccounts: DebtAccount[];
  savingsBalance: number;
  monthlySavings: number;
  financialGoals: FinancialGoal[];
  knowledgeLevel: 'novice' | 'intermediate' | 'advanced';
  createdAt: Date;
  updatedAt: Date;
}

export interface DebtAccount {
  type: 'credit_card' | 'student_loan' | 'personal_loan' | 'auto_loan' | 'mortgage' | 'other';
  balance: number;
  apr: number;
  minimumPayment?: number;
}

export interface FinancialGoal {
  id: string;
  type: 'emergency_fund' | 'debt_payoff' | 'savings_target' | 'investment_start' | 'retirement' | 'other';
  targetAmount: number;
  targetDate: Date;
  currentProgress: number;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

// Metric Cards - P0-4 requirement (closes Demo vs Reality gap)
export interface FinancialMetrics {
  bufferMonths: number;
  futureOutlook: number; // percentage
  debtUrgency: 'low' | 'moderate' | 'high' | 'critical';
  monthlyNetCashFlow: number;
  recommendedAction: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface MetricCardPayload {
  type: 'metric_card';
  title: string;
  value: string;
  subtitle?: string;
  action?: string;
  explain?: string;
}

export interface AtlasInsight {
  type: 'financial_snapshot' | 'goal_progress' | 'debt_analysis' | 'savings_opportunity' | 'risk_alert';
  metrics: FinancialMetrics;
  explanation: string;
  actionItems: string[];
  timestamp: Date;
}

// Conversation History - P0-3 requirement
export interface ConversationMessage {
  id: string;
  userId: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  structuredData?: AtlasInsight;
  timestamp: Date;
}

export interface ConversationSession {
  id: string;
  userId: string;
  title: string;
  startedAt: Date;
  lastMessageAt: Date;
  messageCount: number;
  summary?: string;
}

// Rate Limiting - P0-6 requirement
export interface UserQuota {
  userId: string;
  tier: 'free' | 'plus' | 'pro';
  conversationsUsedThisMonth: number;
  conversationsLimit: number;
  messagesUsedThisMonth: number;
  messagesLimit: number;
  resetDate: Date;
}
