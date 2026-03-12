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
  recommended_action: "keep" | "review" | "retire_candidate";
  is_protected: boolean;
  reasons: string[];
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
  "safety",
];

const RARE_TAGS = [
  "emotional_shame",
  "taxes",
  "memory_context_issue",
  "cultural_finance",
  "objection_handling",
];

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

function scoreUsefulness(e: LiveEval): number {
  let score = 50;

  if (e.lifecycle?.status === "promoted_from_draft") {
    score += 25;
  }

  const hasCriticalTags = (e.tags || []).some((t) => CRITICAL_TAGS.includes(t));
  if (hasCriticalTags) {
    score += 15;
  }

  if ((e.expected_traits || []).length >= 3) {
    score += 10;
  }

  if ((e.failure_conditions || []).length >= 3) {
    score += 10;
  }

  if (e.input.length >= 50) {
    score += 10;
  }

  const vaguePhrases = ["something", "anything", "some", "various"];
  const hasVague = vaguePhrases.some((p) => e.input.toLowerCase().includes(p));
  if (hasVague) {
    score -= 15;
  }

  return Math.min(100, Math.max(0, score));
}

function scoreRedundancyRisk(e: LiveEval, group: string, liveSuite: Map<string, LiveEval[]>): number {
  let riskScore = 0;

  const groupEvals = liveSuite.get(group) || [];
  let maxSimilarity = 0;

  groupEvals.forEach((other) => {
    if (other.id === e.id) return;

    const inputDist = levenshteinDistance(e.input.toLowerCase(), other.input.toLowerCase());
    const maxLen = Math.max(e.input.length, other.input.length);
    const inputSimilarity = maxLen > 0 ? 1 - inputDist / maxLen : 0;

    if (inputSimilarity > 0.75) {
      maxSimilarity = Math.max(maxSimilarity, inputSimilarity);
    }

    const sameTags = (e.tags || []).filter((t) => (other.tags || []).includes(t)).length;
    const totalTags = new Set([...(e.tags || []), ...(other.tags || [])]).size;
    const tagOverlap = totalTags > 0 ? sameTags / totalTags : 0;

    if (tagOverlap > 0.7 && inputSimilarity > 0.6) {
      maxSimilarity = Math.max(maxSimilarity, 0.85);
    }
  });

  riskScore = Math.round(maxSimilarity * 100);

  return riskScore;
}

function scoreFreshness(e: LiveEval): number {
  let score = 50;

  if (e.lifecycle?.promoted_at) {
    const promotedDate = new Date(e.lifecycle.promoted_at);
    const monthsOld = (new Date().getTime() - promotedDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

    if (monthsOld < 1) {
      score += 30;
    } else if (monthsOld < 3) {
      score += 20;
    } else if (monthsOld < 6) {
      score += 10;
    } else if (monthsOld > 12) {
      score -= 20;
    }
  } else {
    score -= 15;
  }

  if (e.lifecycle?.status === "promoted_from_draft") {
    score += 15;
  }

  return Math.min(100, Math.max(0, score));
}

function scoreCoverageContribution(e: LiveEval, coverage: Map<string, TagCoverageInfo>): number {
  let score = 50;

  const tags = e.tags || [];
  if (tags.length === 0) {
    return 20;
  }

  let rareTagCount = 0;
  let criticalTagCount = 0;

  tags.forEach((tag) => {
    const info = coverage.get(tag);
    if (!info) return;

    if (RARE_TAGS.includes(tag)) {
      rareTagCount += 1;
      if (info.count <= 3) {
        score += 15;
      } else if (info.count <= 5) {
        score += 10;
      }
    }

    if (CRITICAL_TAGS.includes(tag)) {
      criticalTagCount += 1;
      if (info.count <= 5) {
        score += 10;
      } else if (info.count <= 10) {
        score += 5;
      }
    }

    if (info.count > 15) {
      score -= 5;
    }
  });

  if (rareTagCount > 0) {
    score += 10;
  }

  if (criticalTagCount > 1) {
    score += 10;
  }

  return Math.min(100, Math.max(0, score));
}

function isProtected(e: LiveEval, coverage: Map<string, TagCoverageInfo>): boolean {
  const tags = e.tags || [];

  if (e.lifecycle?.status === "promoted_from_draft") {
    return true;
  }

  const hasRareTag = tags.some((t) => {
    const info = coverage.get(t);
    return RARE_TAGS.includes(t) && info && info.count <= 3;
  });
  if (hasRareTag) {
    return true;
  }

  const hasCriticalSafetyTag = tags.includes("safety") || tags.includes("financial_harm");
  if (hasCriticalSafetyTag) {
    return true;
  }

  const hasMemoryTag = tags.includes("memory_context_issue");
  if (hasMemoryTag) {
    const info = coverage.get("memory_context_issue");
    if (info && info.count <= 5) {
      return true;
    }
  }

  return false;
}

function calculateHealthScore(e: LiveEval, group: string, liveSuite: Map<string, LiveEval[]>, coverage: Map<string, TagCoverageInfo>): HealthScore {
  const usefulness = scoreUsefulness(e);
  const redundancy = scoreRedundancyRisk(e, group, liveSuite);
  const freshness = scoreFreshness(e);
  const coverageContribution = scoreCoverageContribution(e, coverage);

  const health = Math.round(usefulness * 0.35 + coverageContribution * 0.3 + freshness * 0.2 - redundancy * 0.15);
  const normalizedHealth = Math.min(100, Math.max(0, health));

  let band: "strong" | "watch" | "weak";
  if (normalizedHealth >= 75) {
    band = "strong";
  } else if (normalizedHealth >= 50) {
    band = "watch";
  } else {
    band = "weak";
  }

  let recommendedAction: "keep" | "review" | "retire_candidate";
  if (band === "strong") {
    recommendedAction = "keep";
  } else if (band === "watch") {
    recommendedAction = "review";
  } else {
    recommendedAction = "retire_candidate";
  }

  const protected_ = isProtected(e, coverage);
  if (protected_) {
    recommendedAction = "keep";
  }

  const reasons: string[] = [];

  if (usefulness >= 80) {
    reasons.push("high signal usefulness score");
  }
  if (e.lifecycle?.status === "promoted_from_draft") {
    reasons.push("production-derived from real failure");
  }
  if (coverageContribution >= 75) {
    reasons.push("strong unique coverage contribution");
  }
  if (freshness >= 80) {
    reasons.push("recently promoted or reviewed");
  }
  if (redundancy >= 70) {
    reasons.push("high redundancy risk with similar cases");
  }
  if (freshness < 40) {
    reasons.push("stale case, not recently reviewed");
  }
  if (protected_) {
    reasons.push("protected due to rare/critical tag coverage");
  }

  return {
    id: e.id,
    group,
    health_score: normalizedHealth,
    subscores: {
      usefulness,
      redundancy_risk: redundancy,
      freshness,
      coverage_contribution: coverageContribution,
    },
    health_band: band,
    recommended_action: recommendedAction,
    is_protected: protected_,
    reasons,
  };
}

function buildMarkdownReport(scores: HealthScore[]): string {
  let md = "# Eval Health Report\n\n";
  md += `Generated: ${new Date().toISOString()}\n\n`;

  const byBand = { strong: 0, watch: 0, weak: 0 };
  const byAction = { keep: 0, review: 0, retire_candidate: 0 };
  const protected_ = scores.filter((s) => s.is_protected).length;

  scores.forEach((s) => {
    byBand[s.health_band] += 1;
    byAction[s.recommended_action] += 1;
  });

  md += `## Suite Health Summary\n`;
  md += `- **Total Cases:** ${scores.length}\n`;
  md += `- **Strong:** ${byBand.strong} (${((byBand.strong / scores.length) * 100).toFixed(0)}%)\n`;
  md += `- **Watch:** ${byBand.watch} (${((byBand.watch / scores.length) * 100).toFixed(0)}%)\n`;
  md += `- **Weak:** ${byBand.weak} (${((byBand.weak / scores.length) * 100).toFixed(0)}%)\n`;
  md += `- **Protected Cases:** ${protected_}\n\n`;

  md += `## Recommended Actions\n`;
  md += `- **Keep:** ${byAction.keep}\n`;
  md += `- **Review:** ${byAction.review}\n`;
  md += `- **Retire Candidate:** ${byAction.retire_candidate}\n\n`;

  const weakest = scores.filter((s) => s.health_band === "weak").sort((a, b) => a.health_score - b.health_score).slice(0, 10);
  if (weakest.length > 0) {
    md += `## Weakest Cases (Candidates for Retirement)\n\n`;
    weakest.forEach((s) => {
      md += `### ${s.id} (${s.group})\n`;
      md += `- **Health Score:** ${s.health_score}/100\n`;
      md += `- **Subscores:** Usefulness ${s.subscores.usefulness}, Redundancy Risk ${s.subscores.redundancy_risk}, Freshness ${s.subscores.freshness}, Coverage ${s.subscores.coverage_contribution}\n`;
      md += `- **Reasons:** ${s.reasons.join("; ")}\n\n`;
    });
  }

  const highRedundancy = scores.filter((s) => s.subscores.redundancy_risk >= 70).sort((a, b) => b.subscores.redundancy_risk - a.subscores.redundancy_risk).slice(0, 10);
  if (highRedundancy.length > 0) {
    md += `## Highest Redundancy Risk\n\n`;
    highRedundancy.forEach((s) => {
      md += `- **${s.id}** (${s.group}): Redundancy Risk ${s.subscores.redundancy_risk}\n`;
    });
    md += "\n";
  }

  const stale = scores.filter((s) => s.subscores.freshness < 40).sort((a, b) => a.subscores.freshness - b.subscores.freshness).slice(0, 10);
  if (stale.length > 0) {
    md += `## Stalest Cases\n\n`;
    stale.forEach((s) => {
      md += `- **${s.id}** (${s.group}): Freshness ${s.subscores.freshness}\n`;
    });
    md += "\n";
  }

  const strongest = scores.filter((s) => s.health_band === "strong").sort((a, b) => b.health_score - a.health_score).slice(0, 10);
  if (strongest.length > 0) {
    md += `## Strongest Cases (Keep/Protect)\n\n`;
    strongest.forEach((s) => {
      md += `### ${s.id} (${s.group})\n`;
      md += `- **Health Score:** ${s.health_score}/100\n`;
      if (s.is_protected) {
        md += `- **🛡️ PROTECTED:** ${s.reasons.join("; ")}\n\n`;
      } else {
        md += `- **Reasons:** ${s.reasons.join("; ")}\n\n`;
      }
    });
  }

  return md;
}

function main() {
  const liveSuite = readLiveSuite();
  const coverage = buildTagCoverage(liveSuite);
  const scores: HealthScore[] = [];

  liveSuite.forEach((evals, group) => {
    evals.forEach((e) => {
      const score = calculateHealthScore(e, group, liveSuite, coverage);
      scores.push(score);
    });
  });

  const reportPath = path.join(process.cwd(), "src/evals/atlas-eval-health-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(scores, null, 2));

  const mdPath = path.join(process.cwd(), "src/evals/atlas-eval-health-report.md");
  fs.writeFileSync(mdPath, buildMarkdownReport(scores));

  console.log(`Health scores generated for ${scores.length} evals`);
  console.log(`Report: ${reportPath}`);
}

if (require.main === module) {
  main();
}
