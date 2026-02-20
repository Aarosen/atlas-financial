// ─────────────────────────────────────────────────────────────────────────────
// Atlas Evals — Core Types
// ─────────────────────────────────────────────────────────────────────────────

export type Severity   = "CRITICAL" | "HIGH" | "STANDARD";
export type Result     = "PASS" | "FAIL" | "WARN" | "N/A";
export type EvalMode   = "offline" | "online" | "gate";

// ── A single eval result ─────────────────────────────────────────────────────
export interface EvalResult {
  id:         string;      // e.g. "D1-01"
  name:       string;
  dimension:  string;      // e.g. "D1"
  result:     Result;
  severity:   Severity;
  score?:     number;      // 0–1 or 1–10 depending on eval
  threshold:  string;
  actual:     string;
  reason:     string;
  blocker:    boolean;     // true if CRITICAL + FAIL = halt deploy
  quote?:     string;      // relevant excerpt from Atlas response
  timestamp:  string;
}

// ── Input context for every eval ─────────────────────────────────────────────
export interface EvalContext {
  userMessage:    string;
  atlasResponse:  string;
  userProfile?:   UserProfile;
  sessionLog?:    SessionMessage[];
  agentsInvoked?: string[];
  topicType?:     string;
  literacyLevel?: "beginner" | "intermediate" | "advanced";
  concernType?:   string;
  commPreference?: string;
  emotionalState?: string;
}

export interface UserProfile {
  age?:              number;
  monthlyIncome?:    number;
  monthlyExpenses?:  number;
  debtBalance?:      number;
  debtRate?:         number;
  savings?:          number;
  incomeType?:       string;
  literacyLevel?:    string;
  goals?:            string[];
  masteredConcepts?: string[];
}

export interface SessionMessage {
  role:       "atlas" | "user";
  content:    string;
  type?:      "question" | "teaching" | "response" | "action";
  conceptId?: string;
  timestamp?: string;
}

// ── Aggregate report ─────────────────────────────────────────────────────────
export interface EvalReport {
  runId:       string;
  mode:        EvalMode;
  timestamp:   string;
  totalEvals:  number;
  passed:      number;
  failed:      number;
  warnings:    number;
  blockers:    EvalResult[];   // CRITICAL failures
  gatePass:    boolean;        // true = safe to deploy
  results:     EvalResult[];
  summary:     DimensionSummary[];
}

export interface DimensionSummary {
  dimension:  string;
  name:       string;
  passRate:   number;
  avgScore?:  number;
  critical:   number;
  status:     "PASS" | "FAIL" | "WARN";
}
