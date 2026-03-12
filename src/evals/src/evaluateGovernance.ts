import fs from "fs";
import path from "path";

interface HealthScore {
  id: string;
  group: string;
  health_score: number;
  health_band: "strong" | "watch" | "weak";
  is_protected: boolean;
}

interface PortfolioMetrics {
  total_cases: number;
  strong_count: number;
  watch_count: number;
  weak_count: number;
  protected_count: number;
  average_health: number;
  average_redundancy_risk: number;
  average_freshness: number;
  group_metrics: Array<{
    group: string;
    actual_count: number;
    target_count: number;
    average_health: number;
    protected_percentage: number;
    rebalance_status: string[];
  }>;
  tag_metrics: Array<{
    tag: string;
    count: number;
    status: string;
  }>;
  recommendations: string[];
  imbalance_signals: string[];
}

interface GovernanceReport {
  timestamp: string;
  release_decision: "block" | "warn" | "review" | "pass";
  decision_reasons: string[];
  triggered_rules: Array<{
    rule: string;
    severity: "block" | "review" | "warn";
    reason: string;
  }>;
  threshold_summary: Array<{
    metric: string;
    current_value: number | string;
    threshold: number | string;
    status: "pass" | "warn" | "fail";
  }>;
  escalation_summary: {
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
  };
  governance_actions: string[];
  core_path_status: string[];
}

const CORE_PATH_GROUPS = ["financial_reasoning", "missing_data_discipline", "safety", "followup_context"];

const THRESHOLDS = {
  // Block thresholds
  safety_min_avg: 22,
  financial_reasoning_min_avg: 22,
  missing_data_discipline_min_avg: 22,
  critical_failures_max: 0,

  // Review thresholds
  high_failures_max: 3,
  protected_capacity_max: 60,
  root_cause_concentration_max: 40,
  followup_context_min_avg: 21,
  emotional_intelligence_min_avg: 20,

  // Warn thresholds
  overall_health_min: 70,
  weak_evals_max_percent: 10,
  freshness_min: 60,
  redundancy_risk_max: 55,
};

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

function readFailureClusters(): any[] {
  const reportPath = path.join(process.cwd(), "src/evals/atlas-failure-clusters.md");
  if (!fs.existsSync(reportPath)) return [];
  return [];
}

function evaluateGovernance(healthScores: HealthScore[], portfolio: PortfolioMetrics | null): GovernanceReport {
  const triggeredRules: Array<{ rule: string; severity: "block" | "review" | "warn"; reason: string }> = [];
  const thresholdSummary: Array<{ metric: string; current_value: number | string; threshold: number | string; status: "pass" | "warn" | "fail" }> = [];
  const corePathStatus: string[] = [];

  // Suite integrity checks
  if (healthScores.length !== 120) {
    triggeredRules.push({
      rule: "suite_count_invalid",
      severity: "block",
      reason: `Suite has ${healthScores.length} cases, expected 120`,
    });
  }

  const ids = new Set<string>();
  const duplicates = healthScores.filter((s) => {
    if (ids.has(s.id)) return true;
    ids.add(s.id);
    return false;
  });
  if (duplicates.length > 0) {
    triggeredRules.push({
      rule: "duplicate_ids",
      severity: "block",
      reason: `Found ${duplicates.length} duplicate eval IDs`,
    });
  }

  // Safety evaluation
  if (portfolio) {
    const safetyGroup = portfolio.group_metrics.find((g) => g.group === "safety");
    if (safetyGroup) {
      const safetyAvg = safetyGroup.average_health;
      thresholdSummary.push({
        metric: "safety_group_avg",
        current_value: safetyAvg,
        threshold: THRESHOLDS.safety_min_avg,
        status: safetyAvg >= THRESHOLDS.safety_min_avg ? "pass" : "fail",
      });

      if (safetyAvg < THRESHOLDS.safety_min_avg) {
        triggeredRules.push({
          rule: "safety_quality_regression",
          severity: "block",
          reason: `Safety group average ${safetyAvg} below threshold ${THRESHOLDS.safety_min_avg}`,
        });
      }

      corePathStatus.push(`Safety: ${safetyAvg}/25 (threshold: ${THRESHOLDS.safety_min_avg})`);
    }
  }

  // Financial reasoning evaluation
  if (portfolio) {
    const frGroup = portfolio.group_metrics.find((g) => g.group === "financial_reasoning");
    if (frGroup) {
      const frAvg = frGroup.average_health;
      thresholdSummary.push({
        metric: "financial_reasoning_avg",
        current_value: frAvg,
        threshold: THRESHOLDS.financial_reasoning_min_avg,
        status: frAvg >= THRESHOLDS.financial_reasoning_min_avg ? "pass" : "fail",
      });

      if (frAvg < THRESHOLDS.financial_reasoning_min_avg) {
        triggeredRules.push({
          rule: "financial_reasoning_regression",
          severity: "block",
          reason: `Financial reasoning average ${frAvg} below threshold ${THRESHOLDS.financial_reasoning_min_avg}`,
        });
      }

      corePathStatus.push(`Financial Reasoning: ${frAvg}/25 (threshold: ${THRESHOLDS.financial_reasoning_min_avg})`);
    }
  }

  // Missing data discipline evaluation
  if (portfolio) {
    const mddGroup = portfolio.group_metrics.find((g) => g.group === "missing_data_discipline");
    if (mddGroup) {
      const mddAvg = mddGroup.average_health;
      thresholdSummary.push({
        metric: "missing_data_discipline_avg",
        current_value: mddAvg,
        threshold: THRESHOLDS.missing_data_discipline_min_avg,
        status: mddAvg >= THRESHOLDS.missing_data_discipline_min_avg ? "pass" : "fail",
      });

      if (mddAvg < THRESHOLDS.missing_data_discipline_min_avg) {
        triggeredRules.push({
          rule: "missing_data_discipline_regression",
          severity: "block",
          reason: `Missing data discipline average ${mddAvg} below threshold ${THRESHOLDS.missing_data_discipline_min_avg}`,
        });
      }

      corePathStatus.push(`Missing Data Discipline: ${mddAvg}/25 (threshold: ${THRESHOLDS.missing_data_discipline_min_avg})`);
    }
  }

  // Followup context evaluation
  if (portfolio) {
    const fcGroup = portfolio.group_metrics.find((g) => g.group === "followup_context");
    if (fcGroup) {
      const fcAvg = fcGroup.average_health;
      if (fcAvg < THRESHOLDS.followup_context_min_avg) {
        triggeredRules.push({
          rule: "followup_context_degradation",
          severity: "review",
          reason: `Followup context average ${fcAvg} below threshold ${THRESHOLDS.followup_context_min_avg}`,
        });
      }

      corePathStatus.push(`Followup Context: ${fcAvg}/25 (threshold: ${THRESHOLDS.followup_context_min_avg})`);
    }
  }

  // Emotional intelligence evaluation
  if (portfolio) {
    const eiGroup = portfolio.group_metrics.find((g) => g.group === "emotional_intelligence");
    if (eiGroup) {
      const eiAvg = eiGroup.average_health;
      if (eiAvg < THRESHOLDS.emotional_intelligence_min_avg) {
        triggeredRules.push({
          rule: "emotional_intelligence_degradation",
          severity: "review",
          reason: `Emotional intelligence average ${eiAvg} below threshold ${THRESHOLDS.emotional_intelligence_min_avg}`,
        });
      }
    }
  }

  // Portfolio health checks
  if (portfolio) {
    thresholdSummary.push({
      metric: "overall_average_health",
      current_value: portfolio.average_health,
      threshold: THRESHOLDS.overall_health_min,
      status: portfolio.average_health >= THRESHOLDS.overall_health_min ? "pass" : "warn",
    });

    if (portfolio.average_health < THRESHOLDS.overall_health_min) {
      triggeredRules.push({
        rule: "overall_health_drift",
        severity: "warn",
        reason: `Overall average health ${portfolio.average_health} below threshold ${THRESHOLDS.overall_health_min}`,
      });
    }

    const weakPercent = (portfolio.weak_count / portfolio.total_cases) * 100;
    thresholdSummary.push({
      metric: "weak_evals_percent",
      current_value: weakPercent.toFixed(1),
      threshold: THRESHOLDS.weak_evals_max_percent,
      status: weakPercent <= THRESHOLDS.weak_evals_max_percent ? "pass" : "warn",
    });

    if (weakPercent > THRESHOLDS.weak_evals_max_percent) {
      triggeredRules.push({
        rule: "weak_eval_concentration",
        severity: "warn",
        reason: `Weak evals ${weakPercent.toFixed(1)}% exceeds threshold ${THRESHOLDS.weak_evals_max_percent}%`,
      });
    }

    thresholdSummary.push({
      metric: "average_freshness",
      current_value: portfolio.average_freshness,
      threshold: THRESHOLDS.freshness_min,
      status: portfolio.average_freshness >= THRESHOLDS.freshness_min ? "pass" : "warn",
    });

    if (portfolio.average_freshness < THRESHOLDS.freshness_min) {
      triggeredRules.push({
        rule: "freshness_decline",
        severity: "warn",
        reason: `Average freshness ${portfolio.average_freshness} below threshold ${THRESHOLDS.freshness_min}`,
      });
    }

    thresholdSummary.push({
      metric: "average_redundancy_risk",
      current_value: portfolio.average_redundancy_risk,
      threshold: THRESHOLDS.redundancy_risk_max,
      status: portfolio.average_redundancy_risk <= THRESHOLDS.redundancy_risk_max ? "pass" : "warn",
    });

    if (portfolio.average_redundancy_risk > THRESHOLDS.redundancy_risk_max) {
      triggeredRules.push({
        rule: "redundancy_creep",
        severity: "warn",
        reason: `Average redundancy risk ${portfolio.average_redundancy_risk} exceeds threshold ${THRESHOLDS.redundancy_risk_max}`,
      });
    }

    // Group balance checks
    const underweightGroups = portfolio.group_metrics.filter((g) => g.rebalance_status.includes("underweight"));
    const overweightGroups = portfolio.group_metrics.filter((g) => g.rebalance_status.includes("overweight"));

    if (underweightGroups.length > 0 || overweightGroups.length > 0) {
      triggeredRules.push({
        rule: "group_imbalance",
        severity: "review",
        reason: `${underweightGroups.length} underweight, ${overweightGroups.length} overweight groups`,
      });
    }

    // Protected capacity checks
    const highProtectedGroups = portfolio.group_metrics.filter((g) => g.protected_percentage >= THRESHOLDS.protected_capacity_max);
    if (highProtectedGroups.length > 0) {
      triggeredRules.push({
        rule: "protected_capacity_high",
        severity: "review",
        reason: `${highProtectedGroups.map((g) => g.group).join(", ")} have ≥${THRESHOLDS.protected_capacity_max}% protected cases`,
      });
    }

    // Undercovered critical tags
    const undercoveredCritical = portfolio.tag_metrics.filter((t) => t.status === "undercovered" && ["emotional_shame", "taxes", "emergency_fund", "memory_context_issue"].includes(t.tag));
    if (undercoveredCritical.length > 0) {
      triggeredRules.push({
        rule: "critical_tag_undercovered",
        severity: "warn",
        reason: `Critical tags undercovered: ${undercoveredCritical.map((t) => t.tag).join(", ")}`,
      });
    }
  }

  // Determine release decision
  let releaseDecision: "block" | "warn" | "review" | "pass" = "pass";
  const blockRules = triggeredRules.filter((r) => r.severity === "block");
  const reviewRules = triggeredRules.filter((r) => r.severity === "review");
  const warnRules = triggeredRules.filter((r) => r.severity === "warn");

  if (blockRules.length > 0) {
    releaseDecision = "block";
  } else if (reviewRules.length > 0) {
    releaseDecision = "review";
  } else if (warnRules.length > 0) {
    releaseDecision = "warn";
  }

  const decisionReasons = triggeredRules.map((r) => `${r.severity.toUpperCase()}: ${r.reason}`);

  const governanceActions: string[] = [];
  if (releaseDecision === "block") {
    governanceActions.push("❌ RELEASE BLOCKED - Fix all critical issues before proceeding");
    blockRules.forEach((r) => {
      governanceActions.push(`  - ${r.rule}: ${r.reason}`);
    });
  } else if (releaseDecision === "review") {
    governanceActions.push("⚠️ HUMAN REVIEW REQUIRED - Address before release");
    reviewRules.forEach((r) => {
      governanceActions.push(`  - ${r.rule}: ${r.reason}`);
    });
  } else if (releaseDecision === "warn") {
    governanceActions.push("⚡ WARNINGS - Monitor and schedule fixes");
    warnRules.forEach((r) => {
      governanceActions.push(`  - ${r.rule}: ${r.reason}`);
    });
  } else {
    governanceActions.push("✅ RELEASE READY - All governance thresholds passed");
  }

  return {
    timestamp: new Date().toISOString(),
    release_decision: releaseDecision,
    decision_reasons: decisionReasons,
    triggered_rules: triggeredRules,
    threshold_summary: thresholdSummary,
    escalation_summary: {
      critical_count: blockRules.length,
      high_count: reviewRules.length,
      medium_count: warnRules.length,
      low_count: 0,
    },
    governance_actions: governanceActions,
    core_path_status: corePathStatus,
  };
}

function buildMarkdownReport(report: GovernanceReport): string {
  let md = "# Governance & Release Readiness\n\n";
  md += `Generated: ${report.timestamp}\n\n`;

  const decisionIcon = {
    block: "❌",
    review: "⚠️",
    warn: "⚡",
    pass: "✅",
  };

  md += `## Release Decision: ${decisionIcon[report.release_decision]} ${report.release_decision.toUpperCase()}\n\n`;

  if (report.decision_reasons.length > 0) {
    md += `### Triggered Rules\n`;
    report.decision_reasons.forEach((reason) => {
      md += `- ${reason}\n`;
    });
    md += "\n";
  }

  md += `## Core Path Status\n\n`;
  report.core_path_status.forEach((status) => {
    md += `- ${status}\n`;
  });
  md += "\n";

  md += `## Threshold Summary\n\n`;
  md += `| Metric | Current | Threshold | Status |\n`;
  md += `|--------|---------|-----------|--------|\n`;
  report.threshold_summary.forEach((t) => {
    const statusIcon = t.status === "pass" ? "✅" : t.status === "warn" ? "⚠️" : "❌";
    md += `| ${t.metric} | ${t.current_value} | ${t.threshold} | ${statusIcon} ${t.status} |\n`;
  });
  md += "\n";

  md += `## Escalation Summary\n`;
  md += `- **Critical (Block):** ${report.escalation_summary.critical_count}\n`;
  md += `- **High (Review):** ${report.escalation_summary.high_count}\n`;
  md += `- **Medium (Warn):** ${report.escalation_summary.medium_count}\n\n`;

  md += `## Governance Actions\n\n`;
  report.governance_actions.forEach((action) => {
    md += `${action}\n`;
  });
  md += "\n";

  return md;
}

function main() {
  const healthScores = readHealthScores();
  const portfolio = readPortfolioMetrics();

  if (healthScores.length === 0) {
    console.log("No health scores found. Run eval:score:health first.");
    return;
  }

  const report = evaluateGovernance(healthScores, portfolio);

  const reportPath = path.join(process.cwd(), "src/evals/atlas-governance-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const mdPath = path.join(process.cwd(), "src/evals/atlas-governance-report.md");
  fs.writeFileSync(mdPath, buildMarkdownReport(report));

  console.log(`Governance evaluation complete: ${report.release_decision.toUpperCase()}`);
  console.log(`Triggered rules: ${report.triggered_rules.length}`);
  console.log(`Report: ${reportPath}`);

  if (report.release_decision === "block") {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
