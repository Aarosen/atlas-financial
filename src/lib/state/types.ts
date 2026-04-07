export type Role = 'u' | 'a';

export type ChatMessage = {
  r: Role;
  t: string;
};

export type FinancialState = {
  monthlyIncome: number;
  essentialExpenses: number;
  totalSavings: number;
  highInterestDebt: number | null;
  lowInterestDebt: number | null;
  highInterestDebtAPR: number | null;
  lowInterestDebtAPR: number | null;
  retirementSavings: number | null;
  monthlyDebtPayments: number;
  primaryGoal: 'stability' | 'growth' | 'flexibility' | 'wealth_building';
  secondaryGoal?: string;
  riskTolerance: 'cautious' | 'balanced' | 'growth';
  timeHorizonYears: number;
  proposedPayment?: number;
};

// Multi-goal support
export type FinancialGoal = {
  id: string;
  type: 'debt_payoff' | 'emergency_fund' | 'savings' | 'investment' | 'retirement' | 'other';
  title: string;
  description?: string;
  targetAmount?: number;
  currentAmount?: number;
  deadline?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  monthlyContribution?: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
};

export type Tier = 'Foundation' | 'Stabilizing' | 'Strategic' | 'GrowthReady';

export type Lever =
  | 'stabilize_cashflow'
  | 'eliminate_high_interest_debt'
  | 'build_emergency_buffer'
  | 'increase_future_allocation'
  | 'optimize_discretionary_spend'
  | 'maximize_retirement_contributions';

export type TraceStep = {
  key: string;
  title: string;
  detail: string;
  data?: Record<string, number | string>;
};

export type Explainability = {
  tier: Tier;
  lever: Lever;
  reasonCodes: string[];
  inputsUsed: Record<string, string>;
  assumptions: string[];
  metrics: Record<string, number | string>;
  decisionTrace: TraceStep[];
  nextAction: { title: string; prompt: string; suggestedAmount: number };
};

export type Confidence = 'low' | 'med' | 'high';

export type Strategy = {
  tier: Tier;
  lever: Lever;
  urgency: 'Calm' | 'Advisory' | 'Protective';
  confidence: Confidence;
  bufMo: number;
  futPct: number;
  dExp: 'Low' | 'Moderate' | 'High' | 'Critical';
  metrics: Record<string, unknown>;
  expl: Record<string, unknown>;
  explainability: Explainability;
  sug: number;
  ts: number;
};
