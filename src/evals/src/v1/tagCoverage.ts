import fs from "fs";
import path from "path";

interface Scenario {
  tags?: string[];
}

interface TagCoverageReport {
  total_cases: number;
  average_tags_per_case: number;
  average_tags_warning?: string;
  tag_counts: Record<string, number>;
  low_coverage_tags: Record<string, number>;
  heatmap: Record<string, Record<string, number>>;
}

const BASE_DIR = path.resolve(__dirname, "../../v1/atlas-evals");

function readJson(filePath: string): Scenario[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as Scenario[];
}

function buildHeatmapMarkdown(report: TagCoverageReport, groups: string[]): string {
  const tagRows = Object.keys(report.heatmap).sort(
    (a, b) => (report.tag_counts[b] ?? 0) - (report.tag_counts[a] ?? 0)
  );
  const header = `| Tag | ${groups.join(" | ")} |`;
  const divider = `|---|${groups.map(() => "---").join("|")}|`;
  const rows = tagRows.map((tag) => {
    const cells = groups.map((group) => String(report.heatmap[tag]?.[group] ?? 0));
    return `| ${tag} | ${cells.join(" | ")} |`;
  });
  return [header, divider, ...rows].join("\n");
}

function formatMarkdown(report: TagCoverageReport, groups: string[]): string {
  const sorted = Object.entries(report.tag_counts).sort((a, b) => b[1] - a[1]);
  const topTags = sorted.slice(0, 10).map(([tag, count]) => `- ${tag}: ${count}`).join("\n");
  const lowTags = Object.entries(report.low_coverage_tags)
    .sort((a, b) => a[1] - b[1])
    .map(([tag, count]) => `- ${tag}: ${count}`)
    .join("\n");
  const warning = report.average_tags_warning ? `\n⚠️ ${report.average_tags_warning}\n` : "";
  const heatmap = buildHeatmapMarkdown(report, groups);

  return `# Atlas v1 Tag Coverage\n\nTotal scenarios: ${report.total_cases}\nAverage tags per case: ${report.average_tags_per_case.toFixed(2)}${warning}\n## Top tags\n${topTags || "- none"}\n\n## Low coverage tags (<3)\n${lowTags || "- none"}\n\n## Tag heatmap (tags × eval groups)\n${heatmap}\n`;
}

function main() {
  const files = fs.readdirSync(BASE_DIR).filter((f) => f.endsWith(".json"));
  const tagCounts: Record<string, number> = {};
  const heatmap: Record<string, Record<string, number>> = {};
  let totalCases = 0;
  let totalTags = 0;

  for (const file of files) {
    const group = path.basename(file, ".json");
    const scenarios = readJson(path.join(BASE_DIR, file));
    totalCases += scenarios.length;
    scenarios.forEach((scenario) => {
      const tags = scenario.tags ?? [];
      totalTags += tags.length;
      tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
        heatmap[tag] = heatmap[tag] ?? {};
        heatmap[tag][group] = (heatmap[tag][group] ?? 0) + 1;
      });
    });
  }

  const lowCoverage: Record<string, number> = {};
  Object.entries(tagCounts).forEach(([tag, count]) => {
    if (count < 3) lowCoverage[tag] = count;
  });

  const averageTags = totalCases > 0 ? totalTags / totalCases : 0;
  let averageWarning: string | undefined;
  if (averageTags < 2) {
    averageWarning = "Average tags per case below 2.0 — consider adding tag coverage.";
  } else if (averageTags > 4) {
    averageWarning = "Average tags per case above 4.0 — consider tightening tag focus.";
  }

  const report: TagCoverageReport = {
    total_cases: totalCases,
    average_tags_per_case: averageTags,
    average_tags_warning: averageWarning,
    tag_counts: tagCounts,
    low_coverage_tags: lowCoverage,
    heatmap,
  };

  const jsonPath = path.join(process.cwd(), "atlas-tag-coverage-report.json");
  const mdPath = path.join(process.cwd(), "atlas-tag-coverage-report.md");

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, formatMarkdown(report, files.map((f) => path.basename(f, ".json"))));

  console.log(`Atlas tag coverage report saved to ${jsonPath}`);
}

if (require.main === module) {
  main();
}
