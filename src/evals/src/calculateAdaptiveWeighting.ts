import fs from "fs";
import path from "path";

interface HealthScore {
  id: string;
  group: string;
  health_score: number;
  health_band: "strong" | "watch" | "weak";
  is_protected: boolean;
  subscores: {
    redundancy_risk: number;
  };
}

interface PortfolioMetrics {
  group_metrics: Array<{
    group: string;
    average_health: number;
  }>;
  tag_metrics: Array<{
    tag: string;
    count: number;
    status: string;
  }>;
}

interface GroupWeighting {
  group: string;
  base_weight: number;
  adaptive_modifier: number;
  rarity_modifier: number;
  redundancy_discount: number;
  final_weight: number;
  weight_reason: string;
  raw_average: number;
  weighted_score: number;
}

interface AdaptiveWeightingReport {
  timestamp: string;
  group_weightings: GroupWeighting[];
  weighted_vs_raw_comparison: Array<{
    group: string;
    raw_average: number;
    weighted_score: number;
    delta: number;
    strategic_impact: string;
  }>;
  production_driven_adjustments: Array<{
    failure_pattern: string;
    affected_groups: string[];
    modifier: number;
  }>;
  high_impact_evals: Array<{
    id: string;
    group: string;
    weight_contribution: number;
    reason: string;
  }>;
  governance_impact_preview: string[];
  weight_drift_warnings: string[];
}

const BASE_WEIGHTS: Record<string, number> = {
  safety: 1.5,
  missing_data_discipline: 1.4,
  financial_reasoning: 1.4,
  followup_context: 1.3,
  stress_tests: 1.2,
  action_plans: 1.1,
  conversation_flow: 1.0,
  personalization: 1.0,
  prompt_compliance: 1.0,
  emotional_intelligence: 0.9,
};

const CORE_PATH_GROUPS = ["safety", "financial_reasoning", "missing_data_discipline", "followup_context"];
const CRITICAL_TAGS = ["emotional_shame", "taxes", "emergency_fund", "memory_context_issue", "affordability", "debt", "investing", "savings"];
const WEIGHT_BOUNDS = { min: 0.8, max: 1.6 };

function readHealthScores(): HealthScore[] {
  const reportPath = path.join(process.cwd(), "src/evals/atlas-eval-health-report.json");
  if (!fs.existsSync(reportPath)) return [];
  const raw = fs.readFileSync(reportPath, "utf-8");
  return JSON.parse(raw) as HealthScore[];
}

function readPortfolioMetrics(): PortfolioMetrics | null {
  const reportPath = path.join(process.cwd(), "src/evals/atlas-portfolio-balance-report.json");
  if (!fs.existsSync(reportPath)) return null;
  const raw = fs.readFileSync(reportPath, "utf-8");
  return JSON.parse(raw) as PortfolioMetrics;
}

function readWeightingHistory(): any[] {
  const historyPath = path.join(process.cwd(), "src/evals/weighting-history.jsonl");
  if (!fs.existsSync(historyPath)) return [];
  const lines = fs.readFileSync(historyPath, "utf-8").split("\n").filter((l) => l.trim());
  return lines.map((l) => JSON.parse(l));
}

function calculateAdaptiveModifier(group: string, portfolio: PortfolioMetrics | null): number {
  let modifier = 0;

  if (!portfolio) return modifier;

  const failurePatternBoosts: Record<string, string[]> = {
    missing_data_issue: ["missing_data_discipline"],
    memory_context_issue: ["followup_context"],
    tool_calculation_issue: ["financial_reasoning", "stress_tests"],
    prompt_issue: ["conversation_flow", "prompt_compliance"],
    model_capability: ["safety", "financial_reasoning"],
  };

  for (const [pattern, groups] of Object.entries(failurePatternBoosts)) {
    if (groups.includes(group)) {
      modifier += 0.05;
    }
  }

  return Math.min(modifier, 0.15);
}

function calculateRarityModifier(group: string, portfolio: PortfolioMetrics | null): number {
  if (!portfolio) return 1.0;

  const undercoveredTags = portfolio.tag_metrics.filter((t) => t.status === "undercovered" && CRITICAL_TAGS.includes(t.tag));
  if (undercoveredTags.length === 0) return 1.0;

  const groupHasRareTags = undercoveredTags.some((t) => {
    const tagGroups = portfolio.tag_metrics.find((tm) => tm.tag === t.tag);
    return tagGroups !== undefined;
  });

  if (groupHasRareTags) {
    return 1.1;
  }

  return 1.0;
}

function calculateRedundancyDiscount(group: string, healthScores: HealthScore[]): number {
  const groupScores = healthScores.filter((s) => s.group === group);
  if (groupScores.length === 0) return 1.0;

  const avgRedundancy = groupScores.reduce((sum, s) => sum + s.subscores.redundancy_risk, 0) / groupScores.length;

  if (avgRedundancy > 70) {
    return 0.9;
  } else if (avgRedundancy > 60) {
    return 0.95;
  }

  return 1.0;
}

function calculateGroupWeightings(healthScores: HealthScore[], portfolio: PortfolioMetrics | null): GroupWeighting[] {
  const groupAverages = new Map<string, number>();

  healthScores.forEach((score) => {
    if (!groupAverages.has(score.group)) {
      groupAverages.set(score.group, 0);
    }
    groupAverages.set(score.group, (groupAverages.get(score.group) || 0) + score.health_score);
  });

  const groupCounts = new Map<string, number>();
  healthScores.forEach((score) => {
    groupCounts.set(score.group, (groupCounts.get(score.group) || 0) + 1);
  });

  const weightings: GroupWeighting[] = [];

  Object.entries(BASE_WEIGHTS).forEach(([group, baseWeight]) => {
    const count = groupCounts.get(group) || 0;
    const rawAverage = count > 0 ? (groupAverages.get(group) || 0) / count : 0;

    const adaptiveModifier = calculateAdaptiveModifier(group, portfolio);
    const rarityModifier = calculateRarityModifier(group, portfolio);
    const redundancyDiscount = calculateRedundancyDiscount(group, healthScores);

    let finalWeight = baseWeight * (1 + adaptiveModifier) * rarityModifier * redundancyDiscount;
    finalWeight = Math.max(WEIGHT_BOUNDS.min, Math.min(WEIGHT_BOUNDS.max, finalWeight));

    const weightedScore = rawAverage * finalWeight;

    let weightReason = `base weight ${baseWeight}`;
    if (adaptiveModifier > 0) {
      weightReason += `, +${(adaptiveModifier * 100).toFixed(0)}% production-driven`;
    }
    if (rarityModifier > 1.0) {
      weightReason += `, rare coverage boost`;
    }
    if (redundancyDiscount < 1.0) {
      weightReason += `, ${((1 - redundancyDiscount) * 100).toFixed(0)}% redundancy discount`;
    }

    weightings.push({
      group,
      base_weight: baseWeight,
      adaptive_modifier: Math.round(adaptiveModifier * 100) / 100,
      rarity_modifier: Math.round(rarityModifier * 100) / 100,
      redundancy_discount: Math.round(redundancyDiscount * 100) / 100,
      final_weight: Math.round(finalWeight * 100) / 100,
      weight_reason: weightReason,
      raw_average: Math.round(rawAverage),
      weighted_score: Math.round(weightedScore),
    });
  });

  return weightings;
}

function identifyProductionDrivenAdjustments(weightings: GroupWeighting[]): Array<{ failure_pattern: string; affected_groups: string[]; modifier: number }> {
  const adjustments: Array<{ failure_pattern: string; affected_groups: string[]; modifier: number }> = [];

  const patterns = [
    { pattern: "missing_data_issue", groups: ["missing_data_discipline"] },
    { pattern: "memory_context_issue", groups: ["followup_context"] },
    { pattern: "tool_calculation_issue", groups: ["financial_reasoning", "stress_tests"] },
    { pattern: "prompt_issue", groups: ["conversation_flow", "prompt_compliance"] },
  ];

  patterns.forEach(({ pattern, groups }) => {
    const affectedWeightings = weightings.filter((w) => groups.includes(w.group) && w.adaptive_modifier > 0);
    if (affectedWeightings.length > 0) {
      adjustments.push({
        failure_pattern: pattern,
        affected_groups: groups,
        modifier: Math.max(...affectedWeightings.map((w) => w.adaptive_modifier)),
      });
    }
  });

  return adjustments;
}

function identifyHighImpactEvals(healthScores: HealthScore[], weightings: GroupWeighting[]): Array<{ id: string; group: string; weight_contribution: number; reason: string }> {
  const highImpact: Array<{ id: string; group: string; weight_contribution: number; reason: string }> = [];

  const weightMap = new Map(weightings.map((w) => [w.group, w.final_weight]));

  const strongProtected = healthScores
    .filter((s) => s.health_band === "strong" && s.is_protected)
    .map((score) => {
      const weight = weightMap.get(score.group) || 1.0;
      return {
        id: score.id,
        group: score.group,
        weight_contribution: Math.round(score.health_score * weight),
        reason: "strong + protected + core coverage",
      };
    })
    .sort((a, b) => b.weight_contribution - a.weight_contribution)
    .slice(0, 10);

  highImpact.push(...strongProtected);

  return highImpact;
}

function calculateWeightDrift(weightings: GroupWeighting[], history: any[]): string[] {
  const warnings: string[] = [];

  if (history.length < 2) return warnings;

  const lastRun = history[history.length - 1];
  if (!lastRun.group_weightings) return warnings;

  const lastWeights = new Map(lastRun.group_weightings.map((w: any) => [w.group, w.final_weight as number]));

  weightings.forEach((w) => {
    const lastWeight = lastWeights.get(w.group);
    if (lastWeight !== undefined && typeof lastWeight === "number") {
      const drift = Math.abs(w.final_weight - lastWeight);
      if (drift > 0.2) {
        warnings.push(`${w.group} weight shifted ${drift > 0 ? "+" : ""}${(drift * 100).toFixed(0)}% (${lastWeight.toFixed(2)} → ${w.final_weight.toFixed(2)})`);
      }
    }
  });

  return warnings;
}

function generateGovernanceImpactPreview(weightings: GroupWeighting[]): string[] {
  const impacts: string[] = [];

  const corePathWeightings = weightings.filter((w) => CORE_PATH_GROUPS.includes(w.group));
  const avgCoreWeight = corePathWeightings.reduce((sum, w) => sum + w.final_weight, 0) / corePathWeightings.length;

  const nonCoreWeightings = weightings.filter((w) => !CORE_PATH_GROUPS.includes(w.group));
  const avgNonCoreWeight = nonCoreWeightings.reduce((sum, w) => sum + w.final_weight, 0) / nonCoreWeightings.length;

  if (avgCoreWeight > avgNonCoreWeight * 1.2) {
    impacts.push("Core-path groups weighted significantly higher; governance will prioritize safety, financial reasoning, missing-data discipline, and followup context");
  }

  const highestWeighted = weightings.reduce((max, w) => (w.final_weight > max.final_weight ? w : max));
  impacts.push(`Highest-weighted group: ${highestWeighted.group} (${highestWeighted.final_weight.toFixed(2)}x)`);

  const lowestWeighted = weightings.reduce((min, w) => (w.final_weight < min.final_weight ? w : min));
  impacts.push(`Lowest-weighted group: ${lowestWeighted.group} (${lowestWeighted.final_weight.toFixed(2)}x)`);

  return impacts;
}

function buildMarkdownReport(report: AdaptiveWeightingReport): string {
  let md = "# Adaptive Eval Weighting Report\n\n";
  md += `Generated: ${report.timestamp}\n\n`;

  md += `## Group Weighting Summary\n\n`;
  md += `| Group | Base | Adaptive | Rarity | Redundancy | Final | Raw Avg | Weighted |\n`;
  md += `|-------|------|----------|--------|------------|-------|---------|----------|\n`;
  report.group_weightings.forEach((w) => {
    md += `| ${w.group} | ${w.base_weight.toFixed(2)} | +${(w.adaptive_modifier * 100).toFixed(0)}% | ${w.rarity_modifier.toFixed(2)} | ${w.redundancy_discount.toFixed(2)} | ${w.final_weight.toFixed(2)} | ${w.raw_average} | ${w.weighted_score} |\n`;
  });
  md += "\n";

  md += `## Weighted vs Raw Comparison\n\n`;
  report.weighted_vs_raw_comparison.forEach((comp) => {
    const deltaIcon = comp.delta > 0 ? "📈" : comp.delta < 0 ? "📉" : "➡️";
    md += `### ${comp.group}\n`;
    md += `- **Raw Average:** ${comp.raw_average}\n`;
    md += `- **Weighted Score:** ${comp.weighted_score}\n`;
    md += `- **Delta:** ${deltaIcon} ${comp.delta > 0 ? "+" : ""}${comp.delta}\n`;
    md += `- **Impact:** ${comp.strategic_impact}\n\n`;
  });

  if (report.production_driven_adjustments.length > 0) {
    md += `## Production-Driven Adjustments\n\n`;
    report.production_driven_adjustments.forEach((adj) => {
      md += `- **${adj.failure_pattern}** → ${adj.affected_groups.join(", ")} (+${(adj.modifier * 100).toFixed(0)}%)\n`;
    });
    md += "\n";
  }

  if (report.high_impact_evals.length > 0) {
    md += `## High-Impact Evals (Highest Strategic Weight)\n\n`;
    report.high_impact_evals.slice(0, 10).forEach((item) => {
      md += `- **${item.id}** (${item.group}): ${item.weight_contribution} strategic points\n`;
      md += `  - ${item.reason}\n`;
    });
    md += "\n";
  }

  if (report.governance_impact_preview.length > 0) {
    md += `## Governance Impact Preview\n\n`;
    report.governance_impact_preview.forEach((impact) => {
      md += `- ${impact}\n`;
    });
    md += "\n";
  }

  if (report.weight_drift_warnings.length > 0) {
    md += `## Weight Drift Warnings\n\n`;
    report.weight_drift_warnings.forEach((warning) => {
      md += `- ⚠️ ${warning}\n`;
    });
    md += "\n";
  }

  return md;
}

function appendWeightingHistory(report: AdaptiveWeightingReport) {
  const historyPath = path.join(process.cwd(), "src/evals/weighting-history.jsonl");
  const entry = {
    timestamp: report.timestamp,
    group_weightings: report.group_weightings,
    weighted_vs_raw_comparison: report.weighted_vs_raw_comparison,
  };

  let existing = "";
  if (fs.existsSync(historyPath)) {
    existing = fs.readFileSync(historyPath, "utf-8");
  }

  const newLine = JSON.stringify(entry);
  const combined = existing ? existing + "\n" + newLine : newLine;
  fs.writeFileSync(historyPath, combined);
}

function main() {
  const healthScores = readHealthScores();
  const portfolio = readPortfolioMetrics();
  const history = readWeightingHistory();

  if (healthScores.length === 0) {
    console.log("No health scores found. Run eval:score:health first.");
    return;
  }

  const groupWeightings = calculateGroupWeightings(healthScores, portfolio);
  const productionAdjustments = identifyProductionDrivenAdjustments(groupWeightings);
  const highImpactEvals = identifyHighImpactEvals(healthScores, groupWeightings);
  const weightDriftWarnings = calculateWeightDrift(groupWeightings, history);
  const governanceImpact = generateGovernanceImpactPreview(groupWeightings);

  const weightedVsRaw = groupWeightings.map((w) => ({
    group: w.group,
    raw_average: w.raw_average,
    weighted_score: w.weighted_score,
    delta: w.weighted_score - w.raw_average,
    strategic_impact: w.weight_reason,
  }));

  const report: AdaptiveWeightingReport = {
    timestamp: new Date().toISOString(),
    group_weightings: groupWeightings,
    weighted_vs_raw_comparison: weightedVsRaw,
    production_driven_adjustments: productionAdjustments,
    high_impact_evals: highImpactEvals,
    governance_impact_preview: governanceImpact,
    weight_drift_warnings: weightDriftWarnings,
  };

  const reportPath = path.join(process.cwd(), "src/evals/atlas-adaptive-weighting-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const mdPath = path.join(process.cwd(), "src/evals/atlas-adaptive-weighting-report.md");
  fs.writeFileSync(mdPath, buildMarkdownReport(report));

  appendWeightingHistory(report);

  console.log(`Adaptive weighting analysis complete: ${groupWeightings.length} groups weighted`);
  console.log(`Report: ${reportPath}`);
}

if (require.main === module) {
  main();
}
