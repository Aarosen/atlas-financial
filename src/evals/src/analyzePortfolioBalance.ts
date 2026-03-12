import fs from "fs";
import path from "path";

interface HealthScore {
  id: string;
  group: string;
  health_score: number;
  subscores: {
    usefulness: number;
    redundancy_risk: number;
    freshness: number;
    coverage_contribution: number;
  };
  health_band: "strong" | "watch" | "weak";
  is_protected: boolean;
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

interface GroupMetrics {
  group: string;
  target_count: number;
  actual_count: number;
  count_delta: number;
  average_health: number;
  strong_count: number;
  watch_count: number;
  weak_count: number;
  protected_count: number;
  protected_percentage: number;
  production_derived_count: number;
  average_redundancy_risk: number;
  average_freshness: number;
  rebalance_status: string[];
}

interface TagMetrics {
  tag: string;
  count: number;
  groups: string[];
  concentration_group?: string;
  status: "undercovered" | "healthy" | "oversaturated" | "concentrated";
}

interface PortfolioMetrics {
  timestamp: string;
  total_cases: number;
  strong_count: number;
  watch_count: number;
  weak_count: number;
  protected_count: number;
  average_health: number;
  average_redundancy_risk: number;
  average_freshness: number;
  average_coverage_contribution: number;
  group_metrics: GroupMetrics[];
  tag_metrics: TagMetrics[];
  recommendations: string[];
  imbalance_signals: string[];
  protected_capacity_warnings: string[];
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
  financial_reasoning: 13,
  action_plans: 11,
  personalization: 11,
  conversation_flow: 10,
  missing_data_discipline: 13,
  safety: 14,
  followup_context: 11,
  prompt_compliance: 9,
  emotional_intelligence: 10,
  stress_tests: 7,
};

const CRITICAL_TAGS = [
  "emotional_shame",
  "taxes",
  "emergency_fund",
  "memory_context_issue",
  "affordability",
  "debt",
  "investing",
  "savings",
  "safety",
];

function readHealthScores(): HealthScore[] {
  const reportPath = path.join(process.cwd(), "src/evals/atlas-eval-health-report.json");
  if (!fs.existsSync(reportPath)) return [];
  const raw = fs.readFileSync(reportPath, "utf-8");
  return JSON.parse(raw) as HealthScore[];
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

function analyzeGroupBalance(healthScores: HealthScore[]): GroupMetrics[] {
  const groupMap = new Map<string, HealthScore[]>();

  healthScores.forEach((score) => {
    if (!groupMap.has(score.group)) {
      groupMap.set(score.group, []);
    }
    groupMap.get(score.group)!.push(score);
  });

  return ATLAS_GROUPS.map((group) => {
    const scores = groupMap.get(group) || [];
    const target = TARGET_COUNTS[group];

    const strongCount = scores.filter((s) => s.health_band === "strong").length;
    const watchCount = scores.filter((s) => s.health_band === "watch").length;
    const weakCount = scores.filter((s) => s.health_band === "weak").length;
    const protectedCount = scores.filter((s) => s.is_protected).length;
    const productionCount = scores.filter((s) => s.subscores.freshness >= 80).length;

    const avgHealth = scores.length > 0 ? scores.reduce((sum, s) => sum + s.health_score, 0) / scores.length : 0;
    const avgRedundancy = scores.length > 0 ? scores.reduce((sum, s) => sum + s.subscores.redundancy_risk, 0) / scores.length : 0;
    const avgFreshness = scores.length > 0 ? scores.reduce((sum, s) => sum + s.subscores.freshness, 0) / scores.length : 0;

    const rebalanceStatus: string[] = [];

    if (scores.length < target) {
      rebalanceStatus.push("underweight");
    } else if (scores.length > target) {
      rebalanceStatus.push("overweight");
    } else {
      rebalanceStatus.push("healthy");
    }

    if (weakCount > scores.length * 0.3) {
      rebalanceStatus.push("low_quality");
    }

    if (avgRedundancy > 60) {
      rebalanceStatus.push("high_redundancy");
    }

    if (avgFreshness < 50) {
      rebalanceStatus.push("low_freshness");
    }

    return {
      group,
      target_count: target,
      actual_count: scores.length,
      count_delta: scores.length - target,
      average_health: Math.round(avgHealth),
      strong_count: strongCount,
      watch_count: watchCount,
      weak_count: weakCount,
      protected_count: protectedCount,
      protected_percentage: scores.length > 0 ? Math.round((protectedCount / scores.length) * 100) : 0,
      production_derived_count: productionCount,
      average_redundancy_risk: Math.round(avgRedundancy),
      average_freshness: Math.round(avgFreshness),
      rebalance_status: rebalanceStatus,
    };
  });
}

function analyzeTagBalance(liveSuite: Map<string, LiveEval[]>, healthScores: HealthScore[]): TagMetrics[] {
  const tagMap = new Map<string, { count: number; groups: Set<string> }>();

  liveSuite.forEach((evals, group) => {
    evals.forEach((e) => {
      (e.tags || []).forEach((tag) => {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, { count: 0, groups: new Set() });
        }
        const info = tagMap.get(tag)!;
        info.count += 1;
        info.groups.add(group);
      });
    });
  });

  return Array.from(tagMap.entries())
    .map(([tag, info]) => {
      let status: "undercovered" | "healthy" | "oversaturated" | "concentrated";

      if (info.count <= 3) {
        status = "undercovered";
      } else if (info.count >= 20) {
        status = "oversaturated";
      } else if (info.groups.size === 1) {
        status = "concentrated";
      } else {
        status = "healthy";
      }

      return {
        tag,
        count: info.count,
        groups: Array.from(info.groups),
        concentration_group: info.groups.size === 1 ? Array.from(info.groups)[0] : undefined,
        status,
      };
    })
    .sort((a, b) => b.count - a.count);
}

function generateRecommendations(groupMetrics: GroupMetrics[], tagMetrics: TagMetrics[], healthScores: HealthScore[]): string[] {
  const recommendations: string[] = [];

  const underweight = groupMetrics.filter((g) => g.rebalance_status.includes("underweight"));
  underweight.forEach((g) => {
    const deficit = g.target_count - g.actual_count;
    recommendations.push(`Promote ${deficit} case(s) to ${g.group} (currently ${g.actual_count}/${g.target_count})`);
  });

  const weakCases = healthScores.filter((s) => s.health_band === "weak" && !s.is_protected);
  if (weakCases.length > 0) {
    recommendations.push(`Review ${weakCases.length} weak cases for retirement`);
  }

  const highRedundancy = healthScores.filter((s) => s.subscores.redundancy_risk >= 75);
  if (highRedundancy.length > 0) {
    recommendations.push(`Audit ${highRedundancy.length} high-redundancy cases for consolidation`);
  }

  const undercoveredTags = tagMetrics.filter((t) => t.status === "undercovered" && CRITICAL_TAGS.includes(t.tag));
  undercoveredTags.forEach((t) => {
    recommendations.push(`Increase coverage for critical tag "${t.tag}" (currently ${t.count} cases)`);
  });

  const concentratedTags = tagMetrics.filter((t) => t.status === "concentrated" && CRITICAL_TAGS.includes(t.tag));
  concentratedTags.forEach((t) => {
    recommendations.push(`Diversify "${t.tag}" across groups (currently only in ${t.concentration_group})`);
  });

  return recommendations;
}

function generateImbalanceSignals(groupMetrics: GroupMetrics[], tagMetrics: TagMetrics[], healthScores: HealthScore[]): string[] {
  const signals: string[] = [];

  const lowHealthGroups = groupMetrics.filter((g) => g.average_health < 60);
  lowHealthGroups.forEach((g) => {
    signals.push(`${g.group} has low average health (${g.average_health}/100)`);
  });

  const highRedundancyGroups = groupMetrics.filter((g) => g.average_redundancy_risk > 65);
  highRedundancyGroups.forEach((g) => {
    signals.push(`${g.group} has high redundancy concentration (avg ${g.average_redundancy_risk})`);
  });

  const staleTags = tagMetrics.filter((t) => t.status === "undercovered" && CRITICAL_TAGS.includes(t.tag));
  if (staleTags.length > 0) {
    signals.push(`Critical tags undercovered: ${staleTags.map((t) => t.tag).join(", ")}`);
  }

  const overweightGroups = groupMetrics.filter((g) => g.count_delta > 2);
  if (overweightGroups.length > 0) {
    signals.push(`Portfolio is overweight in: ${overweightGroups.map((g) => g.group).join(", ")}`);
  }

  return signals;
}

function generateProtectedCapacityWarnings(groupMetrics: GroupMetrics[]): string[] {
  const warnings: string[] = [];

  groupMetrics.forEach((g) => {
    if (g.protected_percentage >= 60) {
      warnings.push(
        `${g.group} has ${g.protected_percentage}% protected cases, limiting retirement flexibility`
      );
    }
  });

  return warnings;
}

function analyzePortfolio(healthScores: HealthScore[], liveSuite: Map<string, LiveEval[]>): PortfolioMetrics {
  const groupMetrics = analyzeGroupBalance(healthScores);
  const tagMetrics = analyzeTagBalance(liveSuite, healthScores);

  const strongCount = healthScores.filter((s) => s.health_band === "strong").length;
  const watchCount = healthScores.filter((s) => s.health_band === "watch").length;
  const weakCount = healthScores.filter((s) => s.health_band === "weak").length;
  const protectedCount = healthScores.filter((s) => s.is_protected).length;

  const avgHealth = healthScores.length > 0 ? healthScores.reduce((sum, s) => sum + s.health_score, 0) / healthScores.length : 0;
  const avgRedundancy = healthScores.length > 0 ? healthScores.reduce((sum, s) => sum + s.subscores.redundancy_risk, 0) / healthScores.length : 0;
  const avgFreshness = healthScores.length > 0 ? healthScores.reduce((sum, s) => sum + s.subscores.freshness, 0) / healthScores.length : 0;
  const avgCoverage = healthScores.length > 0 ? healthScores.reduce((sum, s) => sum + s.subscores.coverage_contribution, 0) / healthScores.length : 0;

  const recommendations = generateRecommendations(groupMetrics, tagMetrics, healthScores);
  const imbalanceSignals = generateImbalanceSignals(groupMetrics, tagMetrics, healthScores);
  const protectedWarnings = generateProtectedCapacityWarnings(groupMetrics);

  return {
    timestamp: new Date().toISOString(),
    total_cases: healthScores.length,
    strong_count: strongCount,
    watch_count: watchCount,
    weak_count: weakCount,
    protected_count: protectedCount,
    average_health: Math.round(avgHealth),
    average_redundancy_risk: Math.round(avgRedundancy),
    average_freshness: Math.round(avgFreshness),
    average_coverage_contribution: Math.round(avgCoverage),
    group_metrics: groupMetrics,
    tag_metrics: tagMetrics,
    recommendations,
    imbalance_signals: imbalanceSignals,
    protected_capacity_warnings: protectedWarnings,
  };
}

function buildMarkdownReport(portfolio: PortfolioMetrics): string {
  let md = "# Portfolio Balance Report\n\n";
  md += `Generated: ${portfolio.timestamp}\n\n`;

  md += `## Overall Portfolio Health\n`;
  md += `- **Total Cases:** ${portfolio.total_cases}\n`;
  md += `- **Strong:** ${portfolio.strong_count} (${((portfolio.strong_count / portfolio.total_cases) * 100).toFixed(0)}%)\n`;
  md += `- **Watch:** ${portfolio.watch_count} (${((portfolio.watch_count / portfolio.total_cases) * 100).toFixed(0)}%)\n`;
  md += `- **Weak:** ${portfolio.weak_count} (${((portfolio.weak_count / portfolio.total_cases) * 100).toFixed(0)}%)\n`;
  md += `- **Protected:** ${portfolio.protected_count}\n`;
  md += `- **Average Health Score:** ${portfolio.average_health}/100\n`;
  md += `- **Average Redundancy Risk:** ${portfolio.average_redundancy_risk}/100\n`;
  md += `- **Average Freshness:** ${portfolio.average_freshness}/100\n`;
  md += `- **Average Coverage Contribution:** ${portfolio.average_coverage_contribution}/100\n\n`;

  md += `## Group Balance\n\n`;
  md += `| Group | Target | Actual | Δ | Avg Health | Status |\n`;
  md += `|-------|--------|--------|---|------------|--------|\n`;
  portfolio.group_metrics.forEach((g) => {
    const status = g.rebalance_status.join(", ");
    md += `| ${g.group} | ${g.target_count} | ${g.actual_count} | ${g.count_delta > 0 ? "+" : ""}${g.count_delta} | ${g.average_health} | ${status} |\n`;
  });
  md += "\n";

  md += `## Group Details\n\n`;
  portfolio.group_metrics.forEach((g) => {
    md += `### ${g.group}\n`;
    md += `- **Count:** ${g.actual_count}/${g.target_count} (${g.count_delta > 0 ? "+" : ""}${g.count_delta})\n`;
    md += `- **Health:** ${g.average_health}/100 (Strong: ${g.strong_count}, Watch: ${g.watch_count}, Weak: ${g.weak_count})\n`;
    md += `- **Protected:** ${g.protected_count} (${g.protected_percentage}%)\n`;
    md += `- **Production-Derived:** ${g.production_derived_count}\n`;
    md += `- **Avg Redundancy:** ${g.average_redundancy_risk}\n`;
    if (g.rebalance_status.length > 0) {
      md += `- **Status:** ${g.rebalance_status.join(", ")}\n`;
    }
    md += "\n";
  });

  md += `## Tag Balance\n\n`;
  const undercovered = portfolio.tag_metrics.filter((t) => t.status === "undercovered");
  const oversaturated = portfolio.tag_metrics.filter((t) => t.status === "oversaturated");
  const concentrated = portfolio.tag_metrics.filter((t) => t.status === "concentrated");

  if (undercovered.length > 0) {
    md += `### Undercovered Tags\n`;
    undercovered.slice(0, 10).forEach((t) => {
      md += `- **${t.tag}:** ${t.count} cases (in ${t.groups.join(", ")})\n`;
    });
    md += "\n";
  }

  if (oversaturated.length > 0) {
    md += `### Oversaturated Tags\n`;
    oversaturated.slice(0, 10).forEach((t) => {
      md += `- **${t.tag}:** ${t.count} cases (in ${t.groups.join(", ")})\n`;
    });
    md += "\n";
  }

  if (concentrated.length > 0) {
    md += `### Concentrated Tags (Single Group)\n`;
    concentrated.slice(0, 10).forEach((t) => {
      md += `- **${t.tag}:** ${t.count} cases (only in ${t.concentration_group})\n`;
    });
    md += "\n";
  }

  if (portfolio.recommendations.length > 0) {
    md += `## Rebalance Recommendations\n\n`;
    portfolio.recommendations.forEach((r) => {
      md += `- ${r}\n`;
    });
    md += "\n";
  }

  if (portfolio.imbalance_signals.length > 0) {
    md += `## Imbalance Signals\n\n`;
    portfolio.imbalance_signals.forEach((s) => {
      md += `- ⚠️ ${s}\n`;
    });
    md += "\n";
  }

  if (portfolio.protected_capacity_warnings.length > 0) {
    md += `## Protected Capacity Warnings\n\n`;
    portfolio.protected_capacity_warnings.forEach((w) => {
      md += `- 🛡️ ${w}\n`;
    });
    md += "\n";
  }

  return md;
}

function main() {
  const healthScores = readHealthScores();
  const liveSuite = readLiveSuite();

  if (healthScores.length === 0) {
    console.log("No health scores found. Run eval:score:health first.");
    return;
  }

  const portfolio = analyzePortfolio(healthScores, liveSuite);

  const reportPath = path.join(process.cwd(), "src/evals/atlas-portfolio-balance-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(portfolio, null, 2));

  const mdPath = path.join(process.cwd(), "src/evals/atlas-portfolio-balance-report.md");
  fs.writeFileSync(mdPath, buildMarkdownReport(portfolio));

  console.log(`Portfolio analysis complete: ${portfolio.total_cases} cases analyzed`);
  console.log(`Recommendations: ${portfolio.recommendations.length}`);
  console.log(`Imbalance signals: ${portfolio.imbalance_signals.length}`);
}

if (require.main === module) {
  main();
}
