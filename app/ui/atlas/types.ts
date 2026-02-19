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

export type Strategy = {
  tier: 'Foundation' | 'Stabilizing' | 'Strategic' | 'GrowthReady';
  lever: string;
  urgency: 'Calm' | 'Advisory' | 'Protective';
  bufMo: number;
  futPct: number;
  dExp: 'Low' | 'Moderate' | 'High' | 'Critical';
  metrics: Record<string, unknown>;
  expl: Record<string, unknown>;
  sug: number;
  ts: number;
};
