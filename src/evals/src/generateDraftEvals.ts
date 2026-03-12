import fs from "fs";
import path from "path";

interface Candidate {
  cluster: string;
  input: string;
  expected_traits: string[];
  tags: string[];
  approval_status?: "approved" | "revise" | "reject";
}

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

interface GroupedDrafts {
  [group: string]: DraftEval[];
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

function readCandidates(): Candidate[] {
  const candidatesPath = path.join(process.cwd(), "src/evals/atlas-eval-candidates.json");
  if (!fs.existsSync(candidatesPath)) return [];
  const raw = fs.readFileSync(candidatesPath, "utf-8");
  return JSON.parse(raw) as Candidate[];
}

function readExistingEvals(): Map<string, Set<string>> {
  const existing = new Map<string, Set<string>>();
  ATLAS_GROUPS.forEach((group) => {
    const groupPath = path.join(process.cwd(), "src/evals/v1/atlas-evals", `${group}.json`);
    if (fs.existsSync(groupPath)) {
      const raw = fs.readFileSync(groupPath, "utf-8");
      const evals = JSON.parse(raw) as Array<{ id: string; input: string }>;
      existing.set(group, new Set(evals.map((e) => e.input.toLowerCase().trim())));
    } else {
      existing.set(group, new Set());
    }
  });
  return existing;
}

function assignGroup(candidate: Candidate, clusterKey: string): string {
  const combined = `${candidate.input} ${candidate.tags.join(" ")}`.toLowerCase();

  if (/missing|income|expenses|take.home|ask for|need to know|without/.test(combined)) {
    return "missing_data_discipline";
  }
  if (/already told|prior|previous|context|remember|forgot/.test(combined)) {
    return "followup_context";
  }
  if (/dangerous|harm|risky|payday|crypto|emergency fund.*volatile/.test(combined)) {
    return "safety";
  }
  if (/shame|anxious|worried|stressed|emotional|feeling|scared/.test(combined)) {
    return "emotional_intelligence";
  }
  if (/multiple question|ask.*and|stacked|generic|as an ai|let me know/.test(combined)) {
    return "prompt_compliance";
  }
  if (/math|calculate|timeline|payoff|afford|budget/.test(combined)) {
    return "financial_reasoning";
  }
  if (/action|step|next|plan|do this|start with/.test(combined)) {
    return "action_plans";
  }
  if (/personali|unique|specific|your situation|tailor/.test(combined)) {
    return "personalization";
  }
  if (/follow.?up|next turn|continuation|building on/.test(combined)) {
    return "conversation_flow";
  }
  if (/complex|multi.step|edge case|stress|hard/.test(combined)) {
    return "stress_tests";
  }

  return "financial_reasoning";
}

function generateDraftId(group: string, candidate: Candidate, index: number): string {
  const sanitized = candidate.input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .slice(0, 3)
    .join("_");
  return `generated_${group}_${sanitized}_${String(index).padStart(3, "0")}`;
}

function isDuplicateLike(input: string, existingInputs: Set<string>): boolean {
  const normalized = input.toLowerCase().trim();
  for (const existing of existingInputs) {
    const similarity = levenshteinSimilarity(normalized, existing);
    if (similarity > 0.75) return true;
  }
  return false;
}

function levenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(a, b);
  return 1 - distance / maxLen;
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

function generateFailureConditions(candidate: Candidate): string[] {
  const conditions: string[] = [];
  const combined = candidate.input.toLowerCase();

  if (/missing|income|expenses/.test(combined)) {
    conditions.push("advises without asking for required financial data");
    conditions.push("fails to explain why the requested number matters");
  }
  if (/already told|prior|context/.test(combined)) {
    conditions.push("re-asks for information already provided");
    conditions.push("ignores prior conversation context");
  }
  if (/afford|budget|save/.test(combined)) {
    conditions.push("gives affordability advice without sufficient inputs");
    conditions.push("ignores existing obligations");
  }
  if (/multiple|and|stacked/.test(combined)) {
    conditions.push("asks multiple questions at once");
    conditions.push("overwhelms user with too many topics");
  }
  if (/generic|as an ai/.test(combined)) {
    conditions.push("uses generic or templated phrasing");
    conditions.push("lacks personalization");
  }

  if (conditions.length === 0) {
    conditions.push("fails to address user's core concern");
    conditions.push("provides incomplete or misleading guidance");
  }

  return conditions;
}

function parseClusterMetadata(clusterKey: string): {
  reason: string;
  severity: string;
  rootCauses: string[];
} {
  return {
    reason: clusterKey.split(":")[0] || "unknown",
    severity: "medium",
    rootCauses: ["prompt_issue"],
  };
}

function generateDrafts(candidates: Candidate[], existing: Map<string, Set<string>>) {
  const approved = candidates.filter((c) => c.approval_status === "approved");
  const grouped: GroupedDrafts = {};
  const stats = { generated: 0, skipped: 0, duplicates: 0 };

  approved.forEach((candidate, idx) => {
    const group = assignGroup(candidate, candidate.cluster);
    const existingInputs = existing.get(group) || new Set();

    if (isDuplicateLike(candidate.input, existingInputs)) {
      stats.duplicates += 1;
      return;
    }

    const metadata = parseClusterMetadata(candidate.cluster);
    const draftId = generateDraftId(group, candidate, idx);

    const draft: DraftEval = {
      id: draftId,
      input: candidate.input,
      expected_traits: candidate.expected_traits,
      failure_conditions: generateFailureConditions(candidate),
      tags: candidate.tags,
      provenance: {
        source: "failure_cluster",
        source_cluster_id: candidate.cluster,
        source_reason: metadata.reason,
        source_severity: metadata.severity,
        source_root_causes: metadata.rootCauses,
      },
    };

    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(draft);
    stats.generated += 1;
  });

  return { grouped, stats };
}

function writeDrafts(grouped: GroupedDrafts) {
  const draftDir = path.join(process.cwd(), "src/evals/v1/generated-drafts");
  fs.mkdirSync(draftDir, { recursive: true });

  Object.entries(grouped).forEach(([group, drafts]) => {
    const filePath = path.join(draftDir, `${group}.json`);
    fs.writeFileSync(filePath, JSON.stringify(drafts, null, 2));
  });
}

function buildMarkdownReview(grouped: GroupedDrafts): string {
  let md = "# Generated Eval Drafts Review\n\n";
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += "## Instructions\n";
  md += "- Review each draft below\n";
  md += "- Mark as: **APPROVE**, **REVISE**, or **REJECT**\n";
  md += "- Approved drafts can be promoted to live suite\n\n";

  Object.entries(grouped).forEach(([group, drafts]) => {
    md += `## ${group} (${drafts.length})\n\n`;
    drafts.forEach((draft) => {
      md += `### ${draft.id}\n`;
      md += `**Prompt:** ${draft.input}\n\n`;
      md += `**Expected traits:**\n`;
      draft.expected_traits.forEach((t) => {
        md += `- ${t}\n`;
      });
      md += `\n**Failure conditions:**\n`;
      draft.failure_conditions.forEach((f) => {
        md += `- ${f}\n`;
      });
      md += `\n**Tags:** ${draft.tags.join(", ")}\n\n`;
      md += `**Provenance:**\n`;
      md += `- Cluster: ${draft.provenance.source_cluster_id}\n`;
      md += `- Reason: ${draft.provenance.source_reason}\n`;
      md += `- Severity: ${draft.provenance.source_severity}\n`;
      md += `- Root causes: ${draft.provenance.source_root_causes.join(", ")}\n\n`;
      md += `**Decision:** [ ] APPROVE [ ] REVISE [ ] REJECT\n\n`;
      md += "---\n\n";
    });
  });

  return md;
}

function main() {
  const candidates = readCandidates();
  const existing = readExistingEvals();

  const { grouped, stats } = generateDrafts(candidates, existing);

  writeDrafts(grouped);

  const markdown = buildMarkdownReview(grouped);
  const mdPath = path.join(process.cwd(), "src/evals/atlas-generated-eval-drafts.md");
  fs.writeFileSync(mdPath, markdown);

  console.log(`Generated ${stats.generated} drafts`);
  console.log(`Skipped ${stats.duplicates} duplicates`);
  console.log(`Drafts written to src/evals/v1/generated-drafts/`);
  console.log(`Review artifact: ${mdPath}`);
}

if (require.main === module) {
  main();
}
