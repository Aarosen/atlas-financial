// ─────────────────────────────────────────────────────────────────────────────
// JUDGE-05: Personal Finance & Multi-Agent Coherence Judge
// Covers: D8-A (Personal Finance), D9 (Multi-Agent), D10 (Proactive)
// ─────────────────────────────────────────────────────────────────────────────

import Anthropic from "@anthropic-ai/sdk";
import { EvalContext, EvalResult, Severity } from "../../types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const JUDGE_MODEL = "claude-opus-4-6";

async function callJudge(systemPrompt: string, userContent: string): Promise<Record<string, any>> {
  const response = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `${systemPrompt}\n\n---\n\n${userContent}\n\nRespond ONLY with valid JSON. No explanation, no markdown fences.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Judge returned invalid JSON:", text.substring(0, 200));
    throw new Error(`Judge parse error: ${e}`);
  }
}

export async function runPersonalFinanceJudge(ctx: EvalContext): Promise<EvalResult[]> {
  const system = `You are a CFP professional and financial planning educator with expertise in personal finance fundamentals, budgeting, debt management, and behavioral finance.

Evaluate the Atlas response for:
1. Budgeting framework accuracy (50/30/20 rule, etc.)
2. Debt management strategy correctness
3. Emergency fund guidance appropriateness
4. Cross-agent coherence (if multiple agents involved)
5. Proactive risk surfacing`;

  const content = `
User message: ${ctx.userMessage}
Atlas response: ${ctx.atlasResponse}
Agents invoked: ${ctx.agentsInvoked?.join(", ") || "N/A"}
User profile: ${JSON.stringify(ctx.userProfile ?? {}, null, 2)}

Return JSON:
{
  "BUDGETING_FRAMEWORK_ACCURACY": {"result": "PASS|FAIL|N/A", "framework_cited": "...", "errors": []},
  "DEBT_MANAGEMENT_ACCURACY": {"result": "PASS|FAIL|N/A", "strategy": "avalanche|snowball|other", "correctly_recommended": true/false},
  "EMERGENCY_FUND_GUIDANCE": {"result": "PASS|FAIL|N/A", "recommendation_months": 0, "appropriate_for_user": true/false},
  "CROSS_AGENT_COHERENCE": {"result": "PASS|FAIL|N/A", "contradictions_found": [], "unified_voice": true/false},
  "PROACTIVE_RISK_SURFACED": {"result": "PASS|FAIL|N/A", "risks_present_but_unsurfaced": []},
  "overall": "PASS|FAIL",
  "domain_accuracy_score": 1-10
}`;

  const verdict = await callJudge(system, content);

  const checks: Array<{ key: string; id: string; name: string; sev: Severity }> = [
    { key: "BUDGETING_FRAMEWORK_ACCURACY", id: "D8-A-J01", name: "Budgeting Framework Accuracy", sev: "CRITICAL" },
    { key: "DEBT_MANAGEMENT_ACCURACY", id: "D8-A-J02", name: "Debt Management Accuracy", sev: "CRITICAL" },
    { key: "EMERGENCY_FUND_GUIDANCE", id: "D8-A-J03", name: "Emergency Fund Guidance", sev: "HIGH" },
    { key: "CROSS_AGENT_COHERENCE", id: "D9-J01", name: "Cross-Agent Coherence", sev: "CRITICAL" },
    { key: "PROACTIVE_RISK_SURFACED", id: "D10-J01", name: "Proactive Risk Surfacing", sev: "HIGH" },
  ];

  return checks.map(check => {
    const v = verdict[check.key];
    const fail = v?.result === "FAIL";
    return {
      id: check.id,
      name: check.name,
      dimension: check.id.startsWith("D8") ? "D8" : check.id.startsWith("D9") ? "D9" : "D10",
      result: (v?.result ?? "N/A") as any,
      severity: check.sev,
      threshold: "PASS required",
      actual: v?.result ?? "N/A",
      reason: typeof v === "object" ? JSON.stringify(v) : String(v ?? ""),
      blocker: fail && check.sev === "CRITICAL",
      score: verdict.domain_accuracy_score,
      timestamp: new Date().toISOString(),
    };
  });
}
