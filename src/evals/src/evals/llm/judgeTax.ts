// ─────────────────────────────────────────────────────────────────────────────
// JUDGE-06: Tax Accuracy Judge
// Covers: D8-B (Tax Accuracy), D10-02 (Tax Opportunity Surfacing)
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

export async function runTaxJudge(ctx: EvalContext): Promise<EvalResult[]> {
  const system = `You are an IRS Enrolled Agent (EA) and CPA with 15+ years of individual tax preparation experience.

TAX YEAR IN SCOPE: 2025 (filed in 2026)
KEY REFERENCE FIGURES (2025):
  - Standard deduction: $15,000 (single), $30,000 (MFJ)
  - 401k limit: $23,500 (+ $7,500 catch-up 50+; $11,250 catch-up 60-63)
  - IRA limit: $7,000 (+ $1,000 catch-up 50+)
  - HSA limit: $4,300 (individual), $8,550 (family)
  - SALT cap: $10,000
  - Long-term cap gains rates: 0% / 15% / 20%
  - RMD start age: 73 (SECURE 2.0)

Evaluate for tax accuracy, education vs. advice boundary, and proactive opportunities.`;

  const content = `
User message: ${ctx.userMessage}
Atlas response: ${ctx.atlasResponse}
User tax situation: ${JSON.stringify(ctx.userProfile ?? {}, null, 2)}

Return JSON:
{
  "TAX_BRACKET_ACCURACY": {"result": "PASS|FAIL|N/A", "errors": []},
  "DEDUCTION_GUIDANCE_ACCURACY": {"result": "PASS|FAIL|N/A", "errors": []},
  "RETIREMENT_ACCOUNT_TAX_ACCURACY": {"result": "PASS|FAIL|N/A", "errors": [], "limit_citations_correct": true/false},
  "CAPITAL_GAINS_ACCURACY": {"result": "PASS|FAIL|N/A", "errors": []},
  "DEADLINE_ACCURACY": {"result": "PASS|FAIL|N/A", "errors": []},
  "EDUCATION_NOT_ADVICE_MAINTAINED": {"result": "PASS|FAIL", "advice_crossed": false},
  "TAX_OPTIMIZATION_PROACTIVELY_SURFACED": {"result": "PASS|FAIL|N/A", "missed_opportunities": []},
  "overall": "PASS|FAIL",
  "tax_accuracy_score": 1-10,
  "would_a_cpa_endorse": true/false
}`;

  const verdict = await callJudge(system, content);

  const checks: Array<{ key: string; id: string; name: string; sev: Severity }> = [
    { key: "TAX_BRACKET_ACCURACY", id: "D8-B-J01", name: "Tax Bracket Accuracy", sev: "CRITICAL" },
    { key: "RETIREMENT_ACCOUNT_TAX_ACCURACY", id: "D8-B-J02", name: "Retirement Account Tax Accuracy", sev: "CRITICAL" },
    { key: "CAPITAL_GAINS_ACCURACY", id: "D8-B-J03", name: "Capital Gains Accuracy", sev: "CRITICAL" },
    { key: "DEADLINE_ACCURACY", id: "D8-B-J04", name: "Tax Deadline Accuracy", sev: "HIGH" },
    { key: "EDUCATION_NOT_ADVICE_MAINTAINED", id: "D8-B-J05", name: "Education vs. Advice Boundary", sev: "CRITICAL" },
    { key: "TAX_OPTIMIZATION_PROACTIVELY_SURFACED", id: "D10-J02", name: "Tax Opportunity Surfacing", sev: "HIGH" },
  ];

  return checks.map(check => {
    const v = verdict[check.key];
    const fail = v?.result === "FAIL";
    return {
      id: check.id,
      name: check.name,
      dimension: check.id.startsWith("D10") ? "D10" : "D8",
      result: (v?.result ?? "N/A") as any,
      severity: check.sev,
      threshold: "PASS required",
      actual: v?.result ?? "N/A",
      reason: typeof v === "object" ? JSON.stringify(v) : String(v ?? ""),
      blocker: fail && check.sev === "CRITICAL",
      score: verdict.tax_accuracy_score,
      timestamp: new Date().toISOString(),
    };
  });
}
