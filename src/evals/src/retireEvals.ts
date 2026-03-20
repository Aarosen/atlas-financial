import fs from "fs";
import path from "path";

interface RetirementCandidate {
  live_case_id: string;
  group: string;
  reason: "redundant" | "stale" | "weak_case" | "superseded_by_promoted_case" | "low_signal" | "invalid_schema_legacy";
  evidence: string;
  similar_case_id?: string;
  replacement_case_id?: string;
  approval_status?: "approved" | "rejected" | "deferred";
  tags_at_risk?: string[];
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

interface RetirementResult {
  live_case_id: string;
  group: string;
  status: "retired" | "skipped";
  reason: string;
}

interface RetirementReport {
  timestamp: string;
  total_reviewed: number;
  retired: number;
  skipped: number;
  results: RetirementResult[];
  group_impacts: Record<string, { before: number; after: number }>;
  warnings: string[];
  validation_passed: boolean;
}

interface RetirementHistoryEntry {
  timestamp: string;
  live_case_id: string;
  group: string;
  action: "retired" | "skipped";
  reason: string;
  retirement_reason: string;
  tags_at_risk?: string[];
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

function readCandidates(): RetirementCandidate[] {
  const candidatesPath = path.join(process.cwd(), "src/evals/atlas-retirement-candidates.json");
  if (!fs.existsSync(candidatesPath)) return [];
  const raw = fs.readFileSync(candidatesPath, "utf-8");
  return JSON.parse(raw) as RetirementCandidate[];
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

function validateRetirement(candidate: RetirementCandidate, liveSuite: Map<string, LiveEval[]>): { valid: boolean; error?: string } {
  if (!ATLAS_GROUPS.includes(candidate.group)) {
    return { valid: false, error: `Invalid group: ${candidate.group}` };
  }

  const groupEvals = liveSuite.get(candidate.group) || [];
  const liveCase = groupEvals.find((e) => e.id === candidate.live_case_id);
  if (!liveCase) {
    return { valid: false, error: `Live case not found: ${candidate.live_case_id}` };
  }

  return { valid: true };
}

function retireCandidate(
  candidate: RetirementCandidate,
  liveSuite: Map<string, LiveEval[]>,
  warnings: string[]
): RetirementResult {
  const validation = validateRetirement(candidate, liveSuite);
  if (!validation.valid) {
    return {
      live_case_id: candidate.live_case_id,
      group: candidate.group,
      status: "skipped",
      reason: validation.error || "Validation failed",
    };
  }

  if (candidate.approval_status !== "approved") {
    return {
      live_case_id: candidate.live_case_id,
      group: candidate.group,
      status: "skipped",
      reason: `Not approved (status: ${candidate.approval_status || "missing"})`,
    };
  }

  if (candidate.tags_at_risk && candidate.tags_at_risk.length > 0) {
    warnings.push(
      `Retiring ${candidate.live_case_id} will reduce coverage for critical tags: ${candidate.tags_at_risk.join(", ")}`
    );
  }

  const groupEvals = liveSuite.get(candidate.group) || [];
  const filtered = groupEvals.filter((e) => e.id !== candidate.live_case_id);
  liveSuite.set(candidate.group, filtered);

  return {
    live_case_id: candidate.live_case_id,
    group: candidate.group,
    status: "retired",
    reason: candidate.reason,
  };
}

function writeLiveSuite(liveSuite: Map<string, LiveEval[]>) {
  ATLAS_GROUPS.forEach((group) => {
    const evals = liveSuite.get(group) || [];
    const filePath = path.join(process.cwd(), "src/evals/v1/atlas-evals", `${group}.json`);
    fs.writeFileSync(filePath, JSON.stringify(evals, null, 2));
  });
}

function buildRetirementReport(results: RetirementResult[], liveSuite: Map<string, LiveEval[]>): RetirementReport {
  const retired = results.filter((r) => r.status === "retired");
  const skipped = results.filter((r) => r.status === "skipped");
  const warnings: string[] = [];

  const groupImpacts: Record<string, { before: number; after: number }> = {};
  ATLAS_GROUPS.forEach((group) => {
    const count = (liveSuite.get(group) || []).length;
    const target = TARGET_COUNTS[group];
    groupImpacts[group] = { before: count, after: count };
    // Only warn about target mismatches if we actually retired something
    if (retired.length > 0 && count < target) {
      warnings.push(`${group}: ${count}/${target} (below target distribution)`);
    }
  });

  return {
    timestamp: new Date().toISOString(),
    total_reviewed: retired.length + skipped.length,
    retired: retired.length,
    skipped: skipped.length,
    results,
    group_impacts: groupImpacts,
    warnings,
    validation_passed: warnings.length === 0,
  };
}

function appendRetirementHistory(results: RetirementResult[], candidates: Map<string, RetirementCandidate>) {
  const historyPath = path.join(process.cwd(), "src/evals/retirement-history.jsonl");
  const entries = results.map((r) => {
    const candidate = candidates.get(`${r.group}:${r.live_case_id}`);
    return {
      timestamp: new Date().toISOString(),
      live_case_id: r.live_case_id,
      group: r.group,
      action: r.status,
      reason: r.reason,
      retirement_reason: candidate?.reason,
      tags_at_risk: candidate?.tags_at_risk,
    } as RetirementHistoryEntry;
  });

  let existing = "";
  if (fs.existsSync(historyPath)) {
    existing = fs.readFileSync(historyPath, "utf-8");
  }

  const newLines = entries.map((e) => JSON.stringify(e)).join("\n");
  const combined = existing ? existing + "\n" + newLines : newLines;
  fs.writeFileSync(historyPath, combined);
}

function buildMarkdownReport(report: RetirementReport): string {
  let md = "# Retirement Report\n\n";
  md += `**Timestamp:** ${report.timestamp}\n\n`;
  md += `## Summary\n`;
  md += `- **Total Reviewed:** ${report.total_reviewed}\n`;
  md += `- **Retired:** ${report.retired}\n`;
  md += `- **Skipped:** ${report.skipped}\n`;
  md += `- **Validation Passed:** ${report.validation_passed ? "✅ Yes" : "❌ No"}\n\n`;

  md += `## Group Impact\n`;
  Object.entries(report.group_impacts).forEach(([group, impact]) => {
    const target = TARGET_COUNTS[group];
    const status = impact.after >= target ? "✅" : "⚠️";
    md += `- ${status} **${group}:** ${impact.after}/${target}\n`;
  });

  if (report.warnings.length > 0) {
    md += `\n## Warnings\n`;
    report.warnings.forEach((w) => {
      md += `- ⚠️ ${w}\n`;
    });
  }

  md += `\n## Retirement Results\n`;
  report.results.forEach((r) => {
    const icon = r.status === "retired" ? "🗑️" : "⏭️";
    md += `- ${icon} **${r.live_case_id}** (${r.group}) — ${r.reason}\n`;
  });

  return md;
}

function main() {
  const candidates = readCandidates();
  const liveSuite = readLiveSuite();
  const results: RetirementResult[] = [];
  const warnings: string[] = [];

  const candidateMap = new Map<string, RetirementCandidate>();
  candidates.forEach((c) => {
    candidateMap.set(`${c.group}:${c.live_case_id}`, c);
  });

  candidates.forEach((candidate) => {
    const result = retireCandidate(candidate, liveSuite, warnings);
    results.push(result);
  });

  if (results.filter((r) => r.status === "retired").length > 0) {
    writeLiveSuite(liveSuite);
  }

  const report = buildRetirementReport(results, liveSuite);
  report.warnings.push(...warnings);

  const reportPath = path.join(process.cwd(), "src/evals/atlas-retirement-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const mdPath = path.join(process.cwd(), "src/evals/atlas-retirement-report.md");
  fs.writeFileSync(mdPath, buildMarkdownReport(report));

  appendRetirementHistory(results, candidateMap);

  console.log(`Retirement complete: ${report.retired} retired, ${report.skipped} skipped`);
  console.log(`Validation: ${report.validation_passed ? "PASS" : "FAIL"}`);
  if (!report.validation_passed) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
