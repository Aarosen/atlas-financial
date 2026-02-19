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
  monthlyDebtPayments: number;
  primaryGoal: 'stability' | 'growth' | 'flexibility' | 'wealth_building';
  secondaryGoal?: string;
  riskTolerance: 'cautious' | 'balanced' | 'growth';
  timeHorizonYears: number;
};

export type Tier = 'Foundation' | 'Stabilizing' | 'Strategic' | 'GrowthReady';

export type Lever =
  | 'stabilize_cashflow'
  | 'eliminate_high_interest_debt'
  | 'build_emergency_buffer'
  | 'increase_future_allocation'
  | 'optimize_discretionary_spend';

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
