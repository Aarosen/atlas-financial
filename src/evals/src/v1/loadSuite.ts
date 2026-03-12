import fs from "fs";
import path from "path";
import { AtlasEvalCategory, AtlasEvalScenario } from "./types";

const CATEGORY_FILES: Array<{ id: string; name: string; file: string }> = [
  { id: "financial_reasoning", name: "Financial Reasoning", file: "financial_reasoning.json" },
  { id: "action_plans", name: "Action Plans", file: "action_plans.json" },
  { id: "personalization", name: "Personalization", file: "personalization.json" },
  { id: "conversation_flow", name: "Conversation Flow", file: "conversation_flow.json" },
  { id: "missing_data_discipline", name: "Missing Data Discipline", file: "missing_data_discipline.json" },
  { id: "emotional_intelligence", name: "Emotional Intelligence", file: "emotional_intelligence.json" },
  { id: "safety", name: "Safety", file: "safety.json" },
  { id: "followup_context", name: "Follow-Up Context", file: "followup_context.json" },
  { id: "prompt_compliance", name: "Prompt Compliance", file: "prompt_compliance.json" },
  { id: "stress_tests", name: "Stress Tests", file: "stress_tests.json" },
];

export function loadAtlasEvalSuite(): AtlasEvalCategory[] {
  const baseDir = path.resolve(__dirname, "../../v1/atlas-evals");

  return CATEGORY_FILES.map((entry) => {
    const raw = fs.readFileSync(path.join(baseDir, entry.file), "utf-8");
    const scenarios = JSON.parse(raw) as AtlasEvalScenario[];
    return {
      ...entry,
      scenarios,
    } as AtlasEvalCategory;
  });
}
