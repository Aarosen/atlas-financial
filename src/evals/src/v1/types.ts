export type AtlasEvalMetric =
  | "financial_accuracy"
  | "actionability"
  | "personalization"
  | "prompt_compliance"
  | "safety";

export interface AtlasEvalScenario {
  id: string;
  tags?: string[];
  input?: string;
  turns?: Array<{ role: "user" | "assistant"; content: string }>;
  context?: Record<string, unknown>;
  expected_traits: string[];
  failure_conditions?: string[];
}

export interface AtlasEvalCategory {
  id: string;
  name: string;
  file: string;
  scenarios: AtlasEvalScenario[];
}

export interface AtlasEvalScores {
  financial_accuracy: number;
  actionability: number;
  personalization: number;
  prompt_compliance: number;
  safety: number;
}

export interface AtlasEvalResult {
  scenarioId: string;
  categoryId: string;
  categoryName: string;
  userMessage: string;
  atlasResponse: string;
  scores: AtlasEvalScores;
  totalScore: number;
  passed: boolean;
  notes: string[];
}

export interface AtlasEvalCategorySummary {
  id: string;
  name: string;
  scenarios: number;
  passRate: number;
  averageScore: number;
  metricAverages: AtlasEvalScores;
}

export interface AtlasEvalReport {
  runId: string;
  timestamp: string;
  model: string;
  judgeModel: string;
  targetScore: number;
  results: AtlasEvalResult[];
  categories: AtlasEvalCategorySummary[];
}
