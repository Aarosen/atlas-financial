export interface FailureSampleInput {
  sessionId: string;
  userMessage: string;
  atlasResponse: string;
  emotion?: string;
  topic?: string;
  timestamp: string;
  conversationLength?: number;
  evalBlockers?: string[];
}

export type FailureSeverity = "critical" | "high" | "medium" | "low";
export type RootCause =
  | "model_capability"
  | "prompt_issue"
  | "missing_data_issue"
  | "tool_calculation_issue"
  | "memory_context_issue";

const DEFAULT_SAMPLE_RATE = Number(process.env.ATLAS_FAILURE_SAMPLE_RATE ?? 0.02);
const DAILY_CAP = Number(process.env.ATLAS_FAILURE_SAMPLE_CAP ?? 500);

const dailyCount: Record<string, number> = {};

const CORRECTION_PATTERNS = [
  /that's not what i asked/i,
  /that doesn't make sense/i,
  /you're wrong/i,
  /no that's not right/i,
  /you misunderstood/i,
];

const PROMPT_VIOLATION_PATTERNS = [/as an ai/i, /let me know if you have any other questions/i];
const MISSING_DATA_PATTERNS = [/what's your (income|expenses|take.home)/i, /need your (income|expenses)/i];
const MULTI_QUESTION_PATTERN = /\?.*\?/;
const MEMORY_FAILURE_PATTERNS = [/you already told me/i, /i already said/i, /as mentioned/i];
const MATH_ERROR_PATTERNS = [/doesn't add up/i, /math is wrong/i, /incorrect/i];

const CRITICAL_PATTERNS = [
  /payday loan/i,
  /emergency fund.*(crypto|stocks|options)/i,
  /ignore high[-\s]?interest debt/i,
  /borrow for speculation/i,
  /tax evasion|conceal income|hide income/i,
  /you can afford it/i,
];

function getDayKey(timestamp: string) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function redact(text: string) {
  return text.replace(/\$?\d[\d,]*(?:\.\d+)?/g, "[REDACTED_NUMBER]");
}

function inferTags(text: string): string[] {
  const t = text.toLowerCase();
  const tags = new Set<string>();
  if (/debt|credit card|loan|apr|interest/.test(t)) tags.add("debt");
  if (/save|savings|emergency fund|rainy day/.test(t)) tags.add("savings");
  if (/budget|expenses|spending/.test(t)) tags.add("budgeting");
  if (/invest|stocks|ira|401k|roth/.test(t)) tags.add("investing");
  if (/emergency fund/.test(t)) tags.add("emergency_fund");
  if (/afford|car payment|rent|mortgage/.test(t)) tags.add("affordability");
  if (/crypto|margin|day trading|guarantee|payday loan|bnpl/.test(t)) tags.add("risk_behavior");
  if (/calculate|how much|timeline|per year|per month/.test(t)) tags.add("math_reasoning");
  if (/income|take home|expenses/.test(t)) tags.add("missing_data");
  return Array.from(tags);
}

function detectReason(input: FailureSampleInput): string | null {
  if (CORRECTION_PATTERNS.some((p) => p.test(input.userMessage))) return "correction";
  if (PROMPT_VIOLATION_PATTERNS.some((p) => p.test(input.atlasResponse))) return "prompt_rule_violation";
  if (input.evalBlockers && input.evalBlockers.length > 0) return "safety";
  if ((input.conversationLength ?? 0) <= 1) return "abandonment_candidate";
  return null;
}

function classifySeverity(input: FailureSampleInput, reason: string): { severity: FailureSeverity; severityReason: string } {
  const combined = `${input.userMessage} ${input.atlasResponse}`;
  if (CRITICAL_PATTERNS.some((p) => p.test(combined))) {
    return { severity: "critical", severityReason: "Critical financial harm pattern detected" };
  }
  if (reason === "safety") {
    return { severity: "critical", severityReason: "Safety eval blocker" };
  }
  if (reason === "correction") {
    return { severity: "high", severityReason: "User correction indicates wrong reasoning" };
  }
  if (reason === "prompt_rule_violation") {
    return { severity: "medium", severityReason: "Prompt/flow violation" };
  }
  if (reason === "abandonment_candidate") {
    return { severity: "medium", severityReason: "Early abandonment indicates flow issue" };
  }
  return { severity: "low", severityReason: "Tone/verbosity issue" };
}

function classifyRootCauses(input: FailureSampleInput, reason: string): { rootCauses: RootCause[]; rootCauseReason: string } {
  const combined = `${input.userMessage} ${input.atlasResponse}`;
  const causes = new Set<RootCause>();
  const reasons: string[] = [];

  if (MULTI_QUESTION_PATTERN.test(input.atlasResponse) || PROMPT_VIOLATION_PATTERNS.some((p) => p.test(input.atlasResponse))) {
    causes.add("prompt_issue");
    reasons.push("Prompt/flow violation detected");
  }

  if (MISSING_DATA_PATTERNS.some((p) => p.test(input.atlasResponse)) || /afford|budget|save|invest/.test(combined)) {
    if (/without/i.test(input.userMessage) || /can i afford|how much should i save|how much can i invest/i.test(input.userMessage)) {
      causes.add("missing_data_issue");
      reasons.push("Advice likely given without required inputs");
    }
  }

  if (MEMORY_FAILURE_PATTERNS.some((p) => p.test(input.userMessage)) || /already told you|told you before/i.test(input.userMessage)) {
    causes.add("memory_context_issue");
    reasons.push("User indicates prior context was ignored");
  }

  if (MATH_ERROR_PATTERNS.some((p) => p.test(input.userMessage)) || /payoff|timeline|months|per year|per month/.test(combined)) {
    causes.add("tool_calculation_issue");
    reasons.push("Math or calculation issue suspected");
  }

  if (reason === "correction" && !causes.has("tool_calculation_issue") && !causes.has("missing_data_issue")) {
    causes.add("model_capability");
    reasons.push("User correction suggests reasoning weakness");
  }

  if (causes.size === 0) {
    causes.add("prompt_issue");
    reasons.push("Defaulted to prompt issue");
  }

  return { rootCauses: Array.from(causes), rootCauseReason: reasons.join("; ") };
}

export async function maybeQueueFailureSample(origin: string, input: FailureSampleInput) {
  const dayKey = getDayKey(input.timestamp);
  dailyCount[dayKey] = dailyCount[dayKey] ?? 0;
  if (dailyCount[dayKey] >= DAILY_CAP) return;
  if (Math.random() > DEFAULT_SAMPLE_RATE) return;

  const reason = detectReason(input);
  if (!reason) return;

  dailyCount[dayKey] += 1;

  const severityInfo = classifySeverity(input, reason);
  const rootInfo = classifyRootCauses(input, reason);
  const payload = {
    sessionId: input.sessionId,
    userMessage: redact(input.userMessage),
    atlasResponse: redact(input.atlasResponse),
    emotion: input.emotion,
    topic: input.topic,
    timestamp: input.timestamp,
    reason,
    tags: inferTags(`${input.userMessage} ${input.atlasResponse}`),
    severity: severityInfo.severity,
    severity_reason: severityInfo.severityReason,
    root_causes: rootInfo.rootCauses,
    root_cause_reason: rootInfo.rootCauseReason,
  };

  try {
    await fetch(`${origin}/api/evals/failure-sample`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-atlas-eval-key": process.env.ATLAS_EVAL_KEY || "",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // ignore sampling errors
  }
}
