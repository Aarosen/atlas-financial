// ─────────────────────────────────────────────────────────────────────────────
// Atlas Eval Report — Console + JSON output
// ─────────────────────────────────────────────────────────────────────────────

import { EvalReport } from "../types";
import * as fs from "fs";

export function printReport(report: EvalReport): void {
  const { passed, failed, warnings, totalEvals, blockers, gatePass, summary } = report;

  console.log("\n" + "═".repeat(70));
  console.log("  ATLAS AI — EVAL REPORT");
  console.log(`  Run ID:    ${report.runId}`);
  console.log(`  Mode:      ${report.mode.toUpperCase()}`);
  console.log(`  Timestamp: ${report.timestamp}`);
  console.log("═".repeat(70));

  // Overall gate
  console.log(`\n  DEPLOYMENT GATE: ${gatePass ? "✅  PASS — Safe to deploy" : "🚫  FAIL — BLOCKED"}`);
  console.log(`  Total Evals: ${totalEvals}  |  ✅ ${passed}  ❌ ${failed}  ⚠️  ${warnings}`);

  // Dimension breakdown
  console.log("\n  DIMENSION SUMMARY:");
  console.log("  " + "─".repeat(62));
  for (const dim of report.summary) {
    const icon = dim.status === "PASS" ? "✅" : dim.status === "FAIL" ? "❌" : "⚠️ ";
    const pct  = (dim.passRate * 100).toFixed(0).padStart(3);
    const score = dim.avgScore !== undefined ? `  Score: ${dim.avgScore.toFixed(1)}/10` : "";
    const crit  = dim.critical > 0 ? `  🚨 ${dim.critical} CRITICAL` : "";
    console.log(`  ${icon} ${dim.dimension.padEnd(4)} ${dim.name.padEnd(26)} ${pct}% pass${score}${crit}`);
  }

  // Blockers — show first and loudly
  if (blockers.length > 0) {
    console.log("\n  🚨 CRITICAL FAILURES (deployment blockers):");
    console.log("  " + "─".repeat(62));
    for (const b of blockers) {
      console.log(`\n  ❌ [${b.id}] ${b.name}`);
      console.log(`     Reason: ${b.reason.substring(0, 120)}`);
      if (b.quote) console.log(`     Quote:  "${b.quote.substring(0, 80)}"`);
    }
  }

  // All failures
  const failures = report.results.filter(r => r.result === "FAIL" && !r.blocker);
  if (failures.length > 0) {
    console.log("\n  ⚠️  OTHER FAILURES (non-blocking):");
    console.log("  " + "─".repeat(62));
    for (const f of failures) {
      console.log(`  • [${f.id}] ${f.name}: ${f.reason.substring(0, 80)}`);
    }
  }

  console.log("\n" + "═".repeat(70) + "\n");

  // Save JSON report
  const outputPath = `eval-report-${report.runId}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`  📄 Full report saved to: ${outputPath}\n`);
}
