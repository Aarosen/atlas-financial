// ─────────────────────────────────────────────────────────────────────────────
// JUDGE-07: Investment Education Judge
// Covers: D8-C (Investment Accuracy), D12-02, D12-04
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

export async function runInvestmentJudge(ctx: EvalContext): Promise<EvalResult[]> {
  const system = `You are a CFA Charterholder and investment education specialist. Evaluate whether Atlas's investment-related education is factually accurate at CFA Level 1 standard, appropriately framed as education (not advice), and correctly calibrated to the user's experience level.`;

  const content = `
User message: ${ctx.userMessage}
Atlas response: ${ctx.atlasResponse}
User investing experience: ${ctx.userProfile?.investingExperience || "unknown"}
User risk profile: ${ctx.userProfile?.riskProfile || "unknown"}

Return JSON:
{
  "ASSET_CLASS_ACCURACY": {"result": "PASS|FAIL|N/A", "errors": []},
  "DIVERSIFICATION_ACCURACY": {"result": "PASS|FAIL|N/A", "correctly_explains_correlation": true/false, "correctly_caveat_limits": true/false},
  "RISK_RETURN_ACCURACY": {"result": "PASS|FAIL|N/A", "errors": []},
  "INDEX_VS_ACTIVE_ACCURACY": {"result": "PASS|FAIL|N/A", "fee_comparison_correct": true/false, "performance_evidence_correct": true/false},
  "COMPOUND_GROWTH_MATH_CORRECT": {"result": "PASS|FAIL|N/A", "calculation_verified": true/false},
  "NO_STOCK_PICKING_ENCOURAGEMENT": {"result": "PASS|FAIL"},
  "COMPLEXITY_APPROPRIATE_FOR_USER": {"result": "PASS|FAIL", "adjustment_needed": "simpler|more_detailed|appropriate"},
  "overall": "PASS|FAIL",
  "investment_accuracy_score": 1-10
}`;

  const verdict = await callJudge(system, content);

  const checks: Array<{ key: string; id: string; name: string; sev: Severity }> = [
    { key: "ASSET_CLASS_ACCURACY", id: "D8-C-J01", name: "Asset Class Accuracy", sev: "CRITICAL" },
    { key: "DIVERSIFICATION_ACCURACY", id: "D8-C-J02", name: "Diversification Accuracy", sev: "CRITICAL" },
    { key: "RISK_RETURN_ACCURACY", id: "D8-C-J03", name: "Risk-Return Accuracy", sev: "CRITICAL" },
    { key: "INDEX_VS_ACTIVE_ACCURACY", id: "D8-C-J04", name: "Index vs. Active Accuracy", sev: "CRITICAL" },
    { key: "COMPOUND_GROWTH_MATH_CORRECT", id: "D8-C-J05", name: "Compound Growth Math", sev: "HIGH" },
    { key: "NO_STOCK_PICKING_ENCOURAGEMENT", id: "D8-C-J06", name: "No Stock-Picking Encouragement", sev: "CRITICAL" },
    { key: "COMPLEXITY_APPROPRIATE_FOR_USER", id: "D8-C-J07", name: "Complexity Calibration", sev: "HIGH" },
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
      score: verdict.investment_accuracy_score,
      timestamp: new Date().toISOString(),
    };
  });
}
