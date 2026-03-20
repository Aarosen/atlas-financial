import fs from "fs";
import path from "path";

interface Scenario {
  id?: string;
  tags?: string[];
  expected_traits?: string[];
  failure_conditions?: string[];
}

const TARGET_COUNTS: Record<string, number> = {
  financial_reasoning: 18,
  action_plans: 14,
  personalization: 10,
  conversation_flow: 13,
  missing_data_discipline: 13,
  safety: 16,
  followup_context: 13,
  prompt_compliance: 10,
  emotional_intelligence: 11,
  stress_tests: 6,
};

const TOTAL_TARGET = 124;

const BASE_DIR = path.resolve(__dirname, "../../v1/atlas-evals");

function readJson(filePath: string): Scenario[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as Scenario[];
}

function validateRequiredFields(group: string, scenarios: Scenario[]): string[] {
  const issues: string[] = [];
  scenarios.forEach((scenario, idx) => {
    const label = `${group}[${idx}]`;
    if (!scenario.id) issues.push(`${label}: missing id`);
    if (!scenario.tags || scenario.tags.length === 0) issues.push(`${label}: missing tags`);
    if (!scenario.expected_traits || scenario.expected_traits.length === 0) {
      issues.push(`${label}: missing expected_traits`);
    }
    if (!scenario.failure_conditions || scenario.failure_conditions.length === 0) {
      issues.push(`${label}: missing failure_conditions`);
    }
  });
  return issues;
}

function validateDuplicateIds(allIds: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  allIds.forEach((id) => {
    if (seen.has(id)) dupes.add(id);
    seen.add(id);
  });
  return Array.from(dupes);
}

function main() {
  const missingFiles: string[] = [];
  const countIssues: string[] = [];
  const fieldIssues: string[] = [];
  const allIds: string[] = [];

  let totalCount = 0;

  for (const [group, expectedCount] of Object.entries(TARGET_COUNTS)) {
    const filePath = path.join(BASE_DIR, `${group}.json`);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(filePath);
      continue;
    }

    const scenarios = readJson(filePath);
    totalCount += scenarios.length;

    if (scenarios.length !== expectedCount) {
      countIssues.push(`${group}: expected ${expectedCount}, found ${scenarios.length}`);
    }

    fieldIssues.push(...validateRequiredFields(group, scenarios));
    scenarios.forEach((s) => {
      if (s.id) allIds.push(s.id);
    });
  }

  const dupes = validateDuplicateIds(allIds);

  const errors: string[] = [];
  if (missingFiles.length > 0) {
    errors.push(`Missing group files:\n${missingFiles.map((f) => `- ${f}`).join("\n")}`);
  }
  if (countIssues.length > 0) {
    errors.push(`Count mismatches:\n${countIssues.map((c) => `- ${c}`).join("\n")}`);
  }
  if (totalCount !== TOTAL_TARGET) {
    errors.push(`Total scenario count mismatch: expected ${TOTAL_TARGET}, found ${totalCount}`);
  }
  if (fieldIssues.length > 0) {
    errors.push(`Missing required fields:\n${fieldIssues.map((f) => `- ${f}`).join("\n")}`);
  }
  if (dupes.length > 0) {
    errors.push(`Duplicate ids detected:\n${dupes.map((d) => `- ${d}`).join("\n")}`);
  }

  if (errors.length > 0) {
    console.error("\nATLAS V1 SUITE VALIDATION FAILED\n");
    console.error(errors.join("\n\n"));
    process.exit(1);
  }

  console.log("Atlas v1 suite validation passed.");
}

if (require.main === module) {
  main();
}
