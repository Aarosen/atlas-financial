import fs from "fs";
import path from "path";

type RootCause =
  | "model_capability"
  | "prompt_issue"
  | "missing_data_issue"
  | "tool_calculation_issue"
  | "memory_context_issue";

interface FailureSample {
  userMessage: string;
  atlasResponse: string;
  reason: string;
  severity?: "critical" | "high" | "medium" | "low";
  severity_reason?: string;
  root_causes?: RootCause[];
  root_cause_reason?: string;
  tags?: string[];
  emotion?: string;
  topic?: string;
  timestamp: string;
}

interface Cluster {
  key: string;
  count: number;
  reason: string;
  tag: string;
  severityCounts: Record<string, number>;
  dominantSeverity: string;
  rootCauseCounts: Record<string, number>;
  dominantRootCauses: string[];
  example: FailureSample;
}

const BASE_DIR = path.join(process.cwd(), "src/evals/failure-samples");

function readSamples(): FailureSample[] {
  if (!fs.existsSync(BASE_DIR)) return [];
  const files = fs.readdirSync(BASE_DIR).filter((f) => f.startsWith("failures-") && f.endsWith(".json"));
  const samples: FailureSample[] = [];
  files.forEach((file) => {
    const raw = fs.readFileSync(path.join(BASE_DIR, file), "utf-8");
    samples.push(...(JSON.parse(raw) as FailureSample[]));
  });
  return samples;
}

function severityRank(severity: string) {
  const order = { critical: 4, high: 3, medium: 2, low: 1 } as Record<string, number>;
  return order[severity] ?? 0;
}

function clusterSamples(samples: FailureSample[]): Cluster[] {
  const clusters: Record<string, Cluster> = {};
  samples.forEach((sample) => {
    const tag = sample.tags?.[0] ?? "unknown";
    const key = `${sample.reason}:${tag}`;
    if (!clusters[key]) {
      clusters[key] = {
        key,
        count: 0,
        reason: sample.reason,
        tag,
        severityCounts: { critical: 0, high: 0, medium: 0, low: 0 },
        dominantSeverity: "low",
        rootCauseCounts: {
          model_capability: 0,
          prompt_issue: 0,
          missing_data_issue: 0,
          tool_calculation_issue: 0,
          memory_context_issue: 0,
        },
        dominantRootCauses: [],
        example: sample,
      };
    }
    clusters[key].count += 1;
    const sev = sample.severity ?? "low";
    clusters[key].severityCounts[sev] = (clusters[key].severityCounts[sev] ?? 0) + 1;
    (sample.root_causes ?? []).forEach((cause) => {
      clusters[key].rootCauseCounts[cause] = (clusters[key].rootCauseCounts[cause] ?? 0) + 1;
    });
  });
  return Object.values(clusters)
    .map((cluster) => {
      const dominant = Object.entries(cluster.severityCounts)
        .sort((a, b) => severityRank(b[0]) - severityRank(a[0]) || b[1] - a[1])
        .map(([sev]) => sev)[0];
      const rootCausePairs = Object.entries(cluster.rootCauseCounts).filter(([, count]) => count > 0);
      const maxRoot = rootCausePairs.sort((a, b) => b[1] - a[1])[0]?.[1] ?? 0;
      const dominantRoots = rootCausePairs.filter(([, count]) => count === maxRoot).map(([cause]) => cause);
      return { ...cluster, dominantSeverity: dominant, dominantRootCauses: dominantRoots };
    })
    .sort((a, b) => {
      const sevDiff = severityRank(b.dominantSeverity) - severityRank(a.dominantSeverity);
      if (sevDiff !== 0) return sevDiff;
      return b.count - a.count;
    });
}

function buildCandidates(clusters: Cluster[]) {
  return clusters.map((cluster) => ({
    cluster: cluster.key,
    input: cluster.example.userMessage,
    expected_traits: [
      `addresses ${cluster.tag} correctly`,
      "asks for missing data when needed",
      "keeps tone aligned with emotion",
    ],
    tags: [cluster.tag, cluster.reason],
  }));
}

function buildSeveritySummary(clusters: Cluster[]) {
  const totals = { critical: 0, high: 0, medium: 0, low: 0 } as Record<string, number>;
  clusters.forEach((cluster) => {
    Object.entries(cluster.severityCounts).forEach(([sev, count]) => {
      totals[sev] = (totals[sev] ?? 0) + count;
    });
  });
  return `Critical: ${totals.critical}\nHigh: ${totals.high}\nMedium: ${totals.medium}\nLow: ${totals.low}`;
}

function buildRootCauseSummary(clusters: Cluster[]) {
  const totals: Record<string, number> = {
    model_capability: 0,
    prompt_issue: 0,
    missing_data_issue: 0,
    tool_calculation_issue: 0,
    memory_context_issue: 0,
  };
  clusters.forEach((cluster) => {
    Object.entries(cluster.rootCauseCounts).forEach(([cause, count]) => {
      totals[cause] = (totals[cause] ?? 0) + count;
    });
  });

  return `model_capability: ${totals.model_capability}\nprompt_issue: ${totals.prompt_issue}\nmissing_data_issue: ${totals.missing_data_issue}\ntool_calculation_issue: ${totals.tool_calculation_issue}\nmemory_context_issue: ${totals.memory_context_issue}`;
}

function buildRootCauseActions() {
  return `- model_capability → consider routing or task decomposition\n- prompt_issue → revise prompt / self-check / guardrails\n- missing_data_issue → tighten missing-data discipline rules\n- tool_calculation_issue → patch toolkit or verification layer\n- memory_context_issue → improve history packing / retrieval`;
}

function buildMarkdown(clusters: Cluster[]) {
  if (clusters.length === 0) {
    return "# Atlas Failure Clusters\n\nNo failure samples available.";
  }

  const severitySummary = buildSeveritySummary(clusters);
  const rootCauseSummary = buildRootCauseSummary(clusters);
  const rootCauseActions = buildRootCauseActions();
  const topClusters = clusters.slice(0, 10)
    .map((c) => `- **${c.key}** (${c.count}) — ${c.dominantSeverity}`) 
    .join("\n");

  const detailedClusters = clusters.slice(0, 10).map((c) => {
    const sevCounts = Object.entries(c.severityCounts)
      .filter(([, count]) => count > 0)
      .map(([sev, count]) => `${sev}: ${count}`)
      .join(", ");
    const rootCounts = Object.entries(c.rootCauseCounts)
      .filter(([, count]) => count > 0)
      .map(([cause, count]) => `${cause}: ${count}`)
      .join(", ");
    return `### ${c.key}\n- Count: ${c.count}\n- Dominant severity: ${c.dominantSeverity}\n- Severity counts: ${sevCounts}\n- Candidate evals: 1\n\n**User:** ${c.example.userMessage}\n\n**Atlas:** ${c.example.atlasResponse}\n`;
  }).join("\n\n");

  return `# Atlas Failure Clusters (Weekly)\n\n## Severity summary\n${severitySummary}\n\n## Root-cause summary\n${rootCauseSummary}\n\n## Root-cause actions\n${rootCauseActions}\n\n## Top clusters\n${topClusters}\n\n## Cluster details\n${detailedClusters}\n`;
}

function main() {
  const samples = readSamples();
  const clusters = clusterSamples(samples);
  const candidates = buildCandidates(clusters);

  const mdPath = path.join(process.cwd(), "src/evals/atlas-failure-clusters.md");
  const jsonPath = path.join(process.cwd(), "src/evals/atlas-eval-candidates.json");

  fs.writeFileSync(mdPath, buildMarkdown(clusters));
  fs.writeFileSync(jsonPath, JSON.stringify(candidates, null, 2));

  console.log(`Failure clusters written to ${mdPath}`);
}

if (require.main === module) {
  main();
}
