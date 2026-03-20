import fs from "fs";
import path from "path";

interface DraftEval {
  id: string;
  input: string;
  expected_traits: string[];
  failure_conditions: string[];
  tags: string[];
  provenance: {
    source: "failure_cluster";
    source_cluster_id: string;
    source_reason: string;
    source_severity: string;
    source_root_causes: string[];
  };
}

interface LiveEval {
  id: string;
  input: string;
  expected_traits: string[];
  failure_conditions: string[];
  tags: string[];
  lifecycle?: {
    status: string;
    promoted_at?: string;
    draft_id?: string;
  };
}

interface PromotionResult {
  draft_id: string;
  status: "promoted" | "skipped";
  reason?: string;
  target_group: string;
  action?: "replaced" | "appended";
  replaced_case_id?: string;
}

interface PromotionReport {
  timestamp: string;
  total_approved: number;
  promoted: number;
  skipped: number;
  results: PromotionResult[];
  group_impacts: Record<string, { before: number; after: number }>;
  warnings: string[];
  validation_passed: boolean;
}

interface PromotionHistoryEntry {
  timestamp: string;
  draft_id: string;
  live_group: string;
  action: "promoted" | "skipped";
  reason: string;
  replaced_case_id?: string;
  provenance_summary: string;
}

const ATLAS_GROUPS = [
  "financial_reasoning",
  "action_plans",
  "personalization",
  "conversation_flow",
  "missing_data_discipline",
  "safety",
  "followup_context",
  "prompt_compliance",
  "emotional_intelligence",
  "stress_tests",
];

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

function readDrafts(): Map<string, DraftEval[]> {
  const draftsDir = path.join(process.cwd(), "src/evals/v1/generated-drafts");
  const drafts = new Map<string, DraftEval[]>();

  if (!fs.existsSync(draftsDir)) return drafts;

  ATLAS_GROUPS.forEach((group) => {
    const filePath = path.join(draftsDir, `${group}.json`);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      drafts.set(group, JSON.parse(raw) as DraftEval[]);
    }
  });

  return drafts;
}

function readLiveSuite(): Map<string, LiveEval[]> {
  const live = new Map<string, LiveEval[]>();

  ATLAS_GROUPS.forEach((group) => {
    const filePath = path.join(process.cwd(), "src/evals/v1/atlas-evals", `${group}.json`);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      live.set(group, JSON.parse(raw) as LiveEval[]);
    }
  });

  return live;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function isSimilar(a: string, b: string, threshold = 0.75): boolean {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return true;
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const similarity = 1 - distance / maxLen;
  return similarity > threshold;
}

function validateDraft(draft: DraftEval, group: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!draft.id) errors.push("Missing id");
  if (!draft.input) errors.push("Missing input");
  if (!draft.expected_traits || draft.expected_traits.length === 0) errors.push("Missing expected_traits");
  if (!draft.failure_conditions || draft.failure_conditions.length === 0) errors.push("Missing failure_conditions");
  if (!draft.tags || draft.tags.length === 0) errors.push("Missing tags");
  if (!draft.provenance) errors.push("Missing provenance");

  if (!ATLAS_GROUPS.includes(group)) errors.push(`Invalid target group: ${group}`);

  return { valid: errors.length === 0, errors };
}

function checkDuplicateId(draftId: string, liveSuite: Map<string, LiveEval[]>): boolean {
  for (const evals of liveSuite.values()) {
    if (evals.some((e) => e.id === draftId)) return true;
  }
  return false;
}

function checkNearDuplicate(input: string, group: string, liveSuite: Map<string, LiveEval[]>): boolean {
  const liveEvals = liveSuite.get(group) || [];
  return liveEvals.some((e) => isSimilar(input, e.input));
}

function selectCaseToReplace(group: string, liveSuite: Map<string, LiveEval[]>): string | null {
  const evals = liveSuite.get(group) || [];
  if (evals.length === 0) return null;

  const promoted = evals.filter((e) => e.lifecycle?.status === "promoted_from_draft");
  if (promoted.length > 0) {
    return promoted[0].id;
  }

  return evals[evals.length - 1].id;
}

function promoteDraft(
  draft: DraftEval,
  group: string,
  liveSuite: Map<string, LiveEval[]>,
  warnings: string[]
): PromotionResult {
  const validation = validateDraft(draft, group);
  if (!validation.valid) {
    return {
      draft_id: draft.id,
      status: "skipped",
      reason: `Validation failed: ${validation.errors.join("; ")}`,
      target_group: group,
    };
  }

  if (checkDuplicateId(draft.id, liveSuite)) {
    return {
      draft_id: draft.id,
      status: "skipped",
      reason: "Duplicate ID in live suite",
      target_group: group,
    };
  }

  if (checkNearDuplicate(draft.input, group, liveSuite)) {
    warnings.push(`Near-duplicate prompt detected for ${draft.id} in ${group}`);
    return {
      draft_id: draft.id,
      status: "skipped",
      reason: "Near-duplicate prompt (>75% similarity)",
      target_group: group,
    };
  }

  const liveEvals = liveSuite.get(group) || [];
  const caseToReplace = selectCaseToReplace(group, liveSuite);

  if (!caseToReplace) {
    return {
      draft_id: draft.id,
      status: "skipped",
      reason: "No live cases to replace in target group",
      target_group: group,
    };
  }

  const promotedEval: LiveEval = {
    ...draft,
    lifecycle: {
      status: "promoted_from_draft",
      promoted_at: new Date().toISOString().split("T")[0],
      draft_id: draft.id,
    },
  };

  const updatedEvals = liveEvals.map((e) => (e.id === caseToReplace ? promotedEval : e));
  liveSuite.set(group, updatedEvals);

  return {
    draft_id: draft.id,
    status: "promoted",
    target_group: group,
    action: "replaced",
    replaced_case_id: caseToReplace,
  };
}

function writeLiveSuite(liveSuite: Map<string, LiveEval[]>) {
  ATLAS_GROUPS.forEach((group) => {
    const evals = liveSuite.get(group) || [];
    const filePath = path.join(process.cwd(), "src/evals/v1/atlas-evals", `${group}.json`);
    fs.writeFileSync(filePath, JSON.stringify(evals, null, 2));
  });
}

function buildPromotionReport(results: PromotionResult[], liveSuite: Map<string, LiveEval[]>): PromotionReport {
  const promoted = results.filter((r) => r.status === "promoted");
  const skipped = results.filter((r) => r.status === "skipped");
  const warnings: string[] = [];

  const groupImpacts: Record<string, { before: number; after: number }> = {};
  ATLAS_GROUPS.forEach((group) => {
    const count = (liveSuite.get(group) || []).length;
    const target = TARGET_COUNTS[group];
    groupImpacts[group] = { before: count, after: count };
    // Only warn about target mismatches if we actually promoted something
    if (promoted.length > 0 && count !== target) {
      warnings.push(`${group}: ${count}/${target} (target distribution not met)`);
    }
  });

  return {
    timestamp: new Date().toISOString(),
    total_approved: promoted.length + skipped.length,
    promoted: promoted.length,
    skipped: skipped.length,
    results,
    group_impacts: groupImpacts,
    warnings,
    validation_passed: warnings.length === 0,
  };
}

function appendPromotionHistory(results: PromotionResult[]) {
  const historyPath = path.join(process.cwd(), "src/evals/promotion-history.jsonl");
  const entries = results.map((r) => {
    const result = r as PromotionResult;
    return {
      timestamp: new Date().toISOString(),
      draft_id: result.draft_id,
      live_group: result.target_group,
      action: result.status,
      reason: result.reason || "Promoted successfully",
      replaced_case_id: result.replaced_case_id,
      provenance_summary: `${result.target_group}/${result.draft_id}`,
    } as PromotionHistoryEntry;
  });

  let existing = "";
  if (fs.existsSync(historyPath)) {
    existing = fs.readFileSync(historyPath, "utf-8");
  }

  const newLines = entries.map((e) => JSON.stringify(e)).join("\n");
  const combined = existing ? existing + "\n" + newLines : newLines;
  fs.writeFileSync(historyPath, combined);
}

function buildMarkdownReport(report: PromotionReport): string {
  let md = "# Promotion Report\n\n";
  md += `**Timestamp:** ${report.timestamp}\n\n`;
  md += `## Summary\n`;
  md += `- **Total Approved:** ${report.total_approved}\n`;
  md += `- **Promoted:** ${report.promoted}\n`;
  md += `- **Skipped:** ${report.skipped}\n`;
  md += `- **Validation Passed:** ${report.validation_passed ? "✅ Yes" : "❌ No"}\n\n`;

  md += `## Group Impact\n`;
  Object.entries(report.group_impacts).forEach(([group, impact]) => {
    const target = TARGET_COUNTS[group];
    const status = impact.after === target ? "✅" : "⚠️";
    md += `- ${status} **${group}:** ${impact.after}/${target}\n`;
  });

  if (report.warnings.length > 0) {
    md += `\n## Warnings\n`;
    report.warnings.forEach((w) => {
      md += `- ⚠️ ${w}\n`;
    });
  }

  md += `\n## Promotion Results\n`;
  report.results.forEach((r) => {
    const icon = r.status === "promoted" ? "✅" : "⏭️";
    md += `- ${icon} **${r.draft_id}** → ${r.target_group}`;
    if (r.replaced_case_id) {
      md += ` (replaced ${r.replaced_case_id})`;
    }
    if (r.reason) {
      md += ` — ${r.reason}`;
    }
    md += "\n";
  });

  return md;
}

function main() {
  const drafts = readDrafts();
  const liveSuite = readLiveSuite();
  const results: PromotionResult[] = [];
  const warnings: string[] = [];

  let totalApproved = 0;
  drafts.forEach((groupDrafts, group) => {
    groupDrafts.forEach((draft) => {
      totalApproved += 1;
      const result = promoteDraft(draft, group, liveSuite, warnings);
      results.push(result);
    });
  });

  if (results.filter((r) => r.status === "promoted").length > 0) {
    writeLiveSuite(liveSuite);
  }

  const report = buildPromotionReport(results, liveSuite);
  report.warnings.push(...warnings);

  const reportPath = path.join(process.cwd(), "src/evals/atlas-promotion-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const mdPath = path.join(process.cwd(), "src/evals/atlas-promotion-report.md");
  fs.writeFileSync(mdPath, buildMarkdownReport(report));

  appendPromotionHistory(results);

  console.log(`Promotion complete: ${report.promoted} promoted, ${report.skipped} skipped`);
  console.log(`Validation: ${report.validation_passed ? "PASS" : "FAIL"}`);
  if (!report.validation_passed) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
