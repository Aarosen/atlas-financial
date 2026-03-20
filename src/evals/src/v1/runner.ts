import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { loadAtlasEvalSuite } from "./loadSuite";
import { scoreScenario, getJudgeModel } from "./judge";
import { AtlasEvalCategorySummary, AtlasEvalReport, AtlasEvalScores } from "./types";

const ATLAS_MODEL = process.env.ATLAS_EVAL_MODEL || "claude-3-haiku-20240307";
const TARGET_SCORE = 22;

// Initialize client lazily to avoid validation errors in offline mode
let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("Error: ANTHROPIC_API_KEY environment variable is not set");
      console.error("Please set ANTHROPIC_API_KEY before running eval:atlas-v1");
      process.exit(1);
    }
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return client;
}

const ATLAS_SYSTEM_PROMPT = `You are Atlas, a financial intelligence companion for US young professionals (22–35).
Be warm, clear, and practical. Never say \"as an AI\". Ask ONE question at a time.
If key data is missing, ask for it before giving advice. Give specific numbers when possible.
End with a single follow-up question or action.`;

async function callAtlas(system: string, messages: Array<{ role: "user" | "assistant"; content: string }>) {
  // Return mock response if API key is not available (for offline/testing mode)
  if (!process.env.ANTHROPIC_API_KEY) {
    return `This is a mock Atlas response. To run actual evaluations, set ANTHROPIC_API_KEY environment variable.
    
Based on your question, here's a practical financial recommendation with specific numbers and a clear next action.`;
  }

  const atlasClient = getClient();
  const response = await atlasClient.messages.create({
    model: ATLAS_MODEL,
    max_tokens: 700,
    system,
    messages,
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

function buildAtlasMessages(scenario: { input?: string; turns?: Array<{ role: "user" | "assistant"; content: string }> }) {
  if (scenario.turns && scenario.turns.length > 0) {
    return scenario.turns;
  }
  return [{ role: "user" as const, content: scenario.input ?? "" }];
}

function buildMetricAverages(results: Array<{ scores: AtlasEvalScores }>): AtlasEvalScores {
  const totals = results.reduce(
    (acc, r) => {
      acc.financial_accuracy += r.scores.financial_accuracy;
      acc.actionability += r.scores.actionability;
      acc.personalization += r.scores.personalization;
      acc.prompt_compliance += r.scores.prompt_compliance;
      acc.safety += r.scores.safety;
      return acc;
    },
    {
      financial_accuracy: 0,
      actionability: 0,
      personalization: 0,
      prompt_compliance: 0,
      safety: 0,
    }
  );

  const count = results.length || 1;
  return {
    financial_accuracy: totals.financial_accuracy / count,
    actionability: totals.actionability / count,
    personalization: totals.personalization / count,
    prompt_compliance: totals.prompt_compliance / count,
    safety: totals.safety / count,
  };
}

export async function runAtlasV1Suite() {
  const categories = loadAtlasEvalSuite();
  const results = [] as AtlasEvalReport["results"];

  for (const category of categories) {
    for (const scenario of category.scenarios) {
      const contextBlock = scenario.context ? `\n\nUSER CONTEXT:\n${JSON.stringify(scenario.context, null, 2)}` : "";
      const systemPrompt = `${ATLAS_SYSTEM_PROMPT}${contextBlock}`;
      const messages = buildAtlasMessages(scenario);
      const userMessage = messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n");

      const atlasResponse = await callAtlas(systemPrompt, messages);
      const scored = await scoreScenario({
        scenario,
        categoryId: category.id,
        categoryName: category.name,
        userMessage,
        atlasResponse,
      });

      results.push(scored);
      console.log(`✓ ${category.name} :: ${scenario.id} — ${scored.totalScore}/25`);
    }
  }

  const categorySummaries: AtlasEvalCategorySummary[] = categories.map((category) => {
    const categoryResults = results.filter((r) => r.categoryId === category.id);
    const averageScore = categoryResults.reduce((sum, r) => sum + r.totalScore, 0) / (categoryResults.length || 1);
    const passRate = categoryResults.filter((r) => r.passed).length / (categoryResults.length || 1);
    return {
      id: category.id,
      name: category.name,
      scenarios: categoryResults.length,
      passRate,
      averageScore,
      metricAverages: buildMetricAverages(categoryResults),
    };
  });

  const runId = `atlas-v1-${Date.now()}`;
  const report: AtlasEvalReport = {
    runId,
    timestamp: new Date().toISOString(),
    model: ATLAS_MODEL,
    judgeModel: getJudgeModel(),
    targetScore: TARGET_SCORE,
    results,
    categories: categorySummaries,
  };

  const outputPath = path.join(process.cwd(), `atlas-v1-report-${runId}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  console.log("\nAtlas v1 Eval Suite Summary");
  console.log("─".repeat(60));
  for (const summary of categorySummaries) {
    console.log(
      `${summary.name}: ${(summary.passRate * 100).toFixed(0)}% pass | Avg ${summary.averageScore.toFixed(1)}/25`
    );
  }
  console.log(`\n📄 Report saved to ${outputPath}`);
}

if (require.main === module) {
  runAtlasV1Suite().catch((err) => {
    console.error("Atlas v1 eval runner failed:", err);
    process.exit(1);
  });
}
