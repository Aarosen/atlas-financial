import fs from "fs";
import path from "path";

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

interface TagCoverageInfo {
  tag: string;
  count: number;
  cases: string[];
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

const CRITICAL_TAGS = [
  "emotional_shame",
  "taxes",
  "emergency_fund",
  "memory_context_issue",
  "affordability",
  "debt",
  "investing",
  "savings",
];

const MIN_TAG_COVERAGE = 3;

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

function findSimilarCases(evalId: string, input: string, group: string, liveSuite: Map<string, LiveEval[]>): string | null {
  const groupEvals = liveSuite.get(group) || [];
  for (const e of groupEvals) {
    if (e.id !== evalId && isSimilar(input, e.input, 0.75)) {
      return e.id;
    }
  }
  return null;
}

function findPromotedReplacements(evalId: string, group: string, liveSuite: Map<string, LiveEval[]>): string | null {
  const groupEvals = liveSuite.get(group) || [];
  for (const e of groupEvals) {
    if (e.lifecycle?.status === "promoted_from_draft" && e.lifecycle?.draft_id) {
      return e.id;
    }
  }
  return null;
}

function isWeakCase(e: LiveEval): boolean {
  if (!e.tags || e.tags.length === 0) return true;
  if (!e.expected_traits || e.expected_traits.length < 2) return true;
  if (!e.failure_conditions || e.failure_conditions.length < 2) return true;
  if (e.input.length < 30) return true;
  return false;
}

function isStaleCase(e: LiveEval): boolean {
  if (!e.lifecycle) return false;
  if (e.lifecycle.status === "promoted_from_draft") return false;
  const createdDate = e.lifecycle.promoted_at || "2024-01-01";
  const monthsOld = (new Date().getTime() - new Date(createdDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
  return monthsOld > 12;
}

function buildTagCoverage(liveSuite: Map<string, LiveEval[]>): Map<string, TagCoverageInfo> {
  const coverage = new Map<string, TagCoverageInfo>();

  liveSuite.forEach((evals) => {
    evals.forEach((e) => {
      (e.tags || []).forEach((tag) => {
        if (!coverage.has(tag)) {
          coverage.set(tag, { tag, count: 0, cases: [] });
        }
        const info = coverage.get(tag)!;
        info.count += 1;
        info.cases.push(e.id);
      });
    });
  });

  return coverage;
}

function checkTagImpact(evalId: string, group: string, liveSuite: Map<string, LiveEval[]>): string[] {
  const e = (liveSuite.get(group) || []).find((x) => x.id === evalId);
  if (!e || !e.tags) return [];

  const coverage = buildTagCoverage(liveSuite);
  const atRisk: string[] = [];

  e.tags.forEach((tag) => {
    const info = coverage.get(tag);
    if (info && info.count <= MIN_TAG_COVERAGE && CRITICAL_TAGS.includes(tag)) {
      atRisk.push(tag);
    }
  });

  return atRisk;
}

function generateCandidates(liveSuite: Map<string, LiveEval[]>): RetirementCandidate[] {
  const candidates: RetirementCandidate[] = [];

  liveSuite.forEach((evals, group) => {
    evals.forEach((eval) => {
      let candidate: RetirementCandidate | null = null;

      const promotedReplacement = findPromotedReplacements(eval.id, group, liveSuite);
      if (promotedReplacement) {
        candidate = {
          live_case_id: eval.id,
          group,
          reason: "superseded_by_promoted_case",
          evidence: `Replaced by promoted draft ${promotedReplacement}`,
          replacement_case_id: promotedReplacement,
        };
      }

      if (!candidate && isWeakCase(eval)) {
        candidate = {
          live_case_id: eval.id,
          group,
          reason: "weak_case",
          evidence: "Missing required fields, tags, or realistic prompt",
        };
      }

      if (!candidate && isStaleCase(eval)) {
        candidate = {
          live_case_id: eval.id,
          group,
          reason: "stale",
          evidence: "Case is >12 months old and may not reflect current product behavior",
        };
      }

      if (!candidate) {
        const similarId = findSimilarCases(eval.id, eval.input, group, liveSuite);
        if (similarId) {
          candidate = {
            live_case_id: eval.id,
            group,
            reason: "redundant",
            evidence: `Highly similar to existing case ${similarId}`,
            similar_case_id: similarId,
          };
        }
      }

      if (candidate) {
        const tagsAtRisk = checkTagImpact(eval.id, group, liveSuite);
        if (tagsAtRisk.length > 0) {
          candidate.tags_at_risk = tagsAtRisk;
        }
        candidates.push(candidate);
      }
    });
  });

  return candidates;
}

function buildMarkdownReview(candidates: RetirementCandidate[]): string {
  let md = "# Retirement Candidates Review\n\n";
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += "## Instructions\n";
  md += "- Review each candidate below\n";
  md += "- Mark as: **APPROVE**, **REJECT**, or **DEFER**\n";
  md += "- Approved candidates will be retired from live suite\n";
  md += "- Watch for tag coverage warnings (⚠️)\n\n";

  const byGroup = new Map<string, RetirementCandidate[]>();
  candidates.forEach((c) => {
    if (!byGroup.has(c.group)) {
      byGroup.set(c.group, []);
    }
    byGroup.get(c.group)!.push(c);
  });

  byGroup.forEach((groupCandidates, group) => {
    md += `## ${group} (${groupCandidates.length})\n\n`;
    groupCandidates.forEach((candidate) => {
      md += `### ${candidate.live_case_id}\n`;
      md += `**Reason:** ${candidate.reason}\n`;
      md += `**Evidence:** ${candidate.evidence}\n`;
      if (candidate.similar_case_id) {
        md += `**Similar to:** ${candidate.similar_case_id}\n`;
      }
      if (candidate.replacement_case_id) {
        md += `**Replacement:** ${candidate.replacement_case_id}\n`;
      }
      if (candidate.tags_at_risk && candidate.tags_at_risk.length > 0) {
        md += `**⚠️ Tags at Risk:** ${candidate.tags_at_risk.join(", ")}\n`;
      }
      md += `\n**Decision:** [ ] APPROVE [ ] REJECT [ ] DEFER\n\n`;
      md += "---\n\n";
    });
  });

  return md;
}

function main() {
  const liveSuite = readLiveSuite();
  const candidates = generateCandidates(liveSuite);

  const candidatesPath = path.join(process.cwd(), "src/evals/atlas-retirement-candidates.json");
  fs.writeFileSync(candidatesPath, JSON.stringify(candidates, null, 2));

  const mdPath = path.join(process.cwd(), "src/evals/atlas-retirement-candidates.md");
  fs.writeFileSync(mdPath, buildMarkdownReview(candidates));

  console.log(`Generated ${candidates.length} retirement candidates`);
  console.log(`Review artifact: ${mdPath}`);
}

if (require.main === module) {
  main();
}
