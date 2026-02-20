// ─────────────────────────────────────────────────────────────────────────────
// JUDGE-08: Retirement Planning Accuracy Judge
// Covers: D8-D (Retirement Planning Accuracy)
// ─────────────────────────────────────────────────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";
import { EvalContext, EvalResult, Severity } from "../../types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const JUDGE_MODEL = "claude-opus-4-6";

async function callJudge(systemPrompt: string, userContent: string): Promise<Record<string, any>> {
  const response = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 2000,
    messages: [{ role: "user", content: `${systemPrompt}\n\n---\n\n${userContent}\n\nRespond ONLY with valid JSON.` }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Judge parse error: ${e}`);
  }
}

export async function runRetirementJudge(ctx: EvalContext): Promise<EvalResult[]> {
  const system = `You are a retirement planning specialist and CERTIFIED FINANCIAL PLANNER™ with deep expertise in ERISA, SECURE 2.0, and retirement income planning.

KEY 2025 REFERENCE DATA:
  - 401k contribution limit: $23,500
  - 401k catch-up (50+): $7,500 additional
  - 401k catch-up (60-63): $11,250 additional (SECURE 2.0)
  - IRA limit: $7,000 + $1,000 catch-up
  - RMD start age: 73 (SECURE 2.0)
  - Early withdrawal penalty: 10% (+ income tax) before age 59½
  - Full retirement age (SSA): 67 for those born 1960+
  - FIRE 4% rule: based on 30-year horizon, Trinity Study`;

  const content = `
User message: ${ctx.userMessage}
Atlas response: ${ctx.atlasResponse}
User age and retirement timeline: ${JSON.stringify(ctx.userProfile ?? {}, null, 2)}

Return JSON:
{
  "CONTRIBUTION_LIMITS_ACCURATE": {"result": "PASS|FAIL|N/A", "cited_limits": {}, "correct_limits": {}, "errors": []},
  "RMD_RULES_ACCURATE": {"result": "PASS|FAIL|N/A", "errors": []},
  "EARLY_WITHDRAWAL_RULES_ACCURATE": {"result": "PASS|FAIL|N/A", "exceptions_mentioned": [], "errors": []},
  "SSA_BASICS_ACCURATE": {"result": "PASS|FAIL|N/A", "errors": []},
  "FIRE_CALCULATION_ACCURATE": {"result": "PASS|FAIL|N/A", "rate_cited": 0.0, "correct_caveats_present": true/false, "errors": []},
  "APPROPRIATE_TIMELINE_FRAMING": {"result": "PASS|FAIL", "reason": "..."},
  "overall": "PASS|FAIL",
  "retirement_accuracy_score": 1-10
}`;

  const verdict = await callJudge(system, content);

  const checks: Array<{ key: string; id: string; name: string; sev: Severity }> = [
    { key: "CONTRIBUTION_LIMITS_ACCURATE", id: "D8-D-J01", name: "Contribution Limits Accuracy", sev: "CRITICAL" },
    { key: "RMD_RULES_ACCURATE", id: "D8-D-J02", name: "RMD Rules Accuracy", sev: "CRITICAL" },
    { key: "EARLY_WITHDRAWAL_RULES_ACCURATE", id: "D8-D-J03", name: "Early Withdrawal Rules", sev: "CRITICAL" },
    { key: "SSA_BASICS_ACCURATE", id: "D8-D-J04", name: "Social Security Basics", sev: "HIGH" },
    { key: "FIRE_CALCULATION_ACCURATE", id: "D8-D-J05", name: "FIRE Calculation Accuracy", sev: "HIGH" },
    { key: "APPROPRIATE_TIMELINE_FRAMING", id: "D8-D-J06", name: "Timeline Framing", sev: "HIGH" },
  ];

  return checks.map(check => {
    const v = verdict[check.key];
    const fail = v?.result === "FAIL";
    return {
      id: check.id,
      name: check.name,
      dimension: "D8",
      result: (v?.result ?? "N/A") as any,
      severity: check.sev,
      threshold: "PASS required",
      actual: v?.result ?? "N/A",
      reason: typeof v === "object" ? JSON.stringify(v) : String(v ?? ""),
      blocker: fail && check.sev === "CRITICAL",
      score: verdict.retirement_accuracy_score,
      timestamp: new Date().toISOString(),
    };
  });
}
