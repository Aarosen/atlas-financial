// ─────────────────────────────────────────────────────────────────────────────
// Online Eval Monitor — Drop into your Atlas production pipeline
//
// HOW TO USE:
//   In your Atlas response handler, after getting the AI response,
//   call: await onlineEvalMonitor.check(userMessage, atlasResponse, profile)
//
//   Set EVAL_WEBHOOK_URL in your env to receive alerts (Slack, PagerDuty, etc.)
// ─────────────────────────────────────────────────────────────────────────────

import { EvalContext, EvalResult } from "../types";
import { runKeywordGuardrail } from "../evals/code/keywordGuardrail";
import { runLimitsValidator }  from "../evals/code/limitsValidator";
import { runSafetyJudge }      from "../evals/llm/judgeRunner";

// Sampling rates — adjust based on your traffic volume and budget
const SAMPLING = {
  safety_code:    1.00,  // 100% — always run, it's free
  limits_code:    1.00,  // 100% — always run
  safety_llm:     1.00,  // 100% — critical, worth the API cost
  accuracy_llm:   0.20,  // 20% sample
  teaching_llm:   0.05,  // 5% sample
  tone_llm:       0.05,  // 5% sample
};

const ALERT_THRESHOLDS = {
  critical_fail:     true,   // always alert
  thumbsdown_rate:   0.06,   // alert if > 6% in a cohort
  hallucination_rate: 0.008, // alert if > 0.8%
};

interface MonitorResult {
  sessionId:  string;
  timestamp:  string;
  passed:     boolean;
  blockers:   EvalResult[];
  allResults: EvalResult[];
}

export async function checkResponse(
  userMessage:   string,
  atlasResponse: string,
  sessionId:     string,
  userProfile?:  Record<string, any>,
  options?: { concernType?: string; literacyLevel?: string; topicType?: string }
): Promise<MonitorResult> {

  const ctx: EvalContext = {
    userMessage,
    atlasResponse,
    userProfile:   userProfile as any,
    concernType:   options?.concernType,
    literacyLevel: options?.literacyLevel as any,
    topicType:     options?.topicType,
  };

  const allResults: EvalResult[] = [];

  // ── ALWAYS: Code-based safety (free, < 1ms) ──────────────────────────────
  if (Math.random() < SAMPLING.safety_code) {
    allResults.push(...runKeywordGuardrail(ctx));
  }

  if (Math.random() < SAMPLING.limits_code) {
    allResults.push(...runLimitsValidator(ctx));
  }

  // ── Check for immediate critical code failure ────────────────────────────
  const codeBlockers = allResults.filter(r => r.blocker && r.result === "FAIL");
  if (codeBlockers.length > 0) {
    await sendAlert("CRITICAL_CODE", codeBlockers, sessionId, atlasResponse);
  }

  // ── SAMPLED: LLM safety judge (always sampled at 100% — it's critical) ──
  if (Math.random() < SAMPLING.safety_llm) {
    try {
      const safetyResults = await runSafetyJudge(ctx);
      allResults.push(...safetyResults);
      const llmBlockers = safetyResults.filter(r => r.blocker && r.result === "FAIL");
      if (llmBlockers.length > 0) {
        await sendAlert("CRITICAL_LLM_SAFETY", llmBlockers, sessionId, atlasResponse);
      }
    } catch (err) {
      console.error(`[Monitor] LLM judge error for session ${sessionId}:`, err);
    }
  }

  // ── Log to your observability platform ───────────────────────────────────
  await logToObservability(sessionId, allResults);

  const blockers = allResults.filter(r => r.blocker && r.result === "FAIL");
  return { sessionId, timestamp: new Date().toISOString(), passed: blockers.length === 0, blockers, allResults };
}

// ── Alert system — wire to Slack / PagerDuty / email ────────────────────────
async function sendAlert(type: string, blockers: EvalResult[], sessionId: string, response: string): Promise<void> {
  const webhookUrl = process.env.EVAL_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error(`🚨 [ATLAS EVAL ALERT] ${type} — Session: ${sessionId}`);
    console.error("   Blockers:", blockers.map(b => b.name).join(", "));
    return;
  }

  const payload = {
    text:      `🚨 *ATLAS EVAL ALERT: ${type}*`,
    blocks: [
      { type: "section", text: { type: "mrkdwn",
        text: `*🚨 Atlas Eval Alert: ${type}*\n*Session:* ${sessionId}\n*Time:* ${new Date().toISOString()}` }},
      { type: "section", text: { type: "mrkdwn",
        text: `*Failures:*\n${blockers.map(b => `• \`[${b.id}]\` ${b.name}: ${b.reason.substring(0, 80)}`).join("\n")}` }},
      { type: "section", text: { type: "mrkdwn",
        text: `*Response excerpt:*\n\`\`\`${response.substring(0, 200)}\`\`\`` }},
    ],
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[Monitor] Failed to send alert:", err);
  }
}

// ── Observability logging — wire to Arize, TruLens, Datadog, etc. ───────────
async function logToObservability(sessionId: string, results: EvalResult[]): Promise<void> {
  // Replace this with your actual observability platform
  // Example: Arize AI, TruLens, Langfuse, Datadog
  if (process.env.NODE_ENV === "development") {
    console.log(`[Monitor] Session ${sessionId}: ${results.filter(r => r.result === "PASS").length}/${results.length} passed`);
  }
  // TODO: integrate with your platform:
  // await arize.log({ sessionId, evals: results });
}
