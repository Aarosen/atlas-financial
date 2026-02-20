// ─────────────────────────────────────────────────────────────────────────────
// CODE-03: 2025 Regulatory Limits Validator (D8-B, D8-D)
// Scans Atlas responses for financial limits and verifies they are current.
// UPDATE THIS FILE EVERY JANUARY with new IRS/IRS figures.
// ─────────────────────────────────────────────────────────────────────────────

import { EvalContext, EvalResult } from "../../types";

// ── Source of truth — 2025 tax year ─────────────────────────────────────────
export const LIMITS_2025 = {
  // Retirement accounts
  k401_employee:        23_500,
  k401_catchup_50plus:   7_500,
  k401_catchup_60to63:  11_250,   // SECURE 2.0 — new for 2025
  ira_limit:             7_000,
  ira_catchup_50plus:    1_000,
  hsa_individual:        4_300,
  hsa_family:            8_550,
  // Tax
  standard_deduction_single:  15_000,
  standard_deduction_mfj:     30_000,
  standard_deduction_hoh:     22_500,
  salt_cap:                   10_000,
  // Retirement rules
  rmd_start_age:             73,     // SECURE 2.0
  early_withdrawal_penalty_age: 59.5,
  // Social Security
  full_retirement_age_1960plus: 67,
  // FICA
  social_security_wage_base:  176_100,
  self_employment_tax_rate:   0.153,
};

// ── Known wrong values that competitors get wrong ────────────────────────────
// Atlas must never repeat these errors
const KNOWN_WRONG_VALUES: Record<string, { wrong: RegExp; correct: number; label: string }[]> = {
  "401k": [
    { wrong: /\$22[,.]?500\b/g, correct: LIMITS_2025.k401_employee, label: "2023 401k limit (outdated)" },
    { wrong: /\$23[,.]?000\b/g, correct: LIMITS_2025.k401_employee, label: "2024 401k limit (outdated)" },
  ],
  "IRA": [
    { wrong: /\$6[,.]?500\b.*IRA|IRA.*\$6[,.]?500\b/gi, correct: LIMITS_2025.ira_limit, label: "2023 IRA limit (outdated)" },
    { wrong: /\$6[,.]?000\b.*IRA|IRA.*\$6[,.]?000\b/gi, correct: LIMITS_2025.ira_limit, label: "Old IRA limit (outdated)" },
  ],
  "RMD": [
    { wrong: /RMD.*age\s*72|age\s*72.*RMD/gi, correct: LIMITS_2025.rmd_start_age, label: "Pre-SECURE 2.0 RMD age (wrong)" },
    { wrong: /RMD.*age\s*70|age\s*70.*RMD/gi, correct: LIMITS_2025.rmd_start_age, label: "Old RMD age (wrong)" },
  ],
};

// ── Correct values that must be present when topic is mentioned ─────────────
const LIMIT_CHECKS: Array<{
  topic: RegExp;
  expectedValue: number;
  valuePattern: RegExp;
  label: string;
  severity: "CRITICAL" | "HIGH";
}> = [
  {
    topic:         /\b401k|401\(k\)/i,
    expectedValue: LIMITS_2025.k401_employee,
    valuePattern:  /\$23[,.]?500\b/,
    label:         "401k contribution limit",
    severity:      "CRITICAL",
  },
  {
    topic:         /\bIRA\b/i,
    expectedValue: LIMITS_2025.ira_limit,
    valuePattern:  /\$7[,.]?000\b/,
    label:         "IRA contribution limit",
    severity:      "CRITICAL",
  },
  {
    topic:         /\bHSA\b/i,
    expectedValue: LIMITS_2025.hsa_individual,
    valuePattern:  /\$4[,.]?300\b/,
    label:         "HSA individual limit",
    severity:      "HIGH",
  },
  {
    topic:         /\bRMD\b|required minimum distribution/i,
    expectedValue: LIMITS_2025.rmd_start_age,
    valuePattern:  /\bage\s*73\b|73\s*years/i,
    label:         "RMD start age",
    severity:      "CRITICAL",
  },
];

export function runLimitsValidator(ctx: EvalContext): EvalResult[] {
  const text = ctx.atlasResponse;
  const results: EvalResult[] = [];

  // Check for known wrong values
  for (const [topic, checks] of Object.entries(KNOWN_WRONG_VALUES)) {
    for (const check of checks) {
      if (check.wrong.test(text)) {
        results.push({
          id:        `D8-LIMIT-WRONG-${topic}`,
          name:      `Outdated Limit: ${check.label}`,
          dimension: "D8",
          result:    "FAIL",
          severity:  "CRITICAL",
          threshold: `Correct 2025 value: ${check.correct.toLocaleString()}`,
          actual:    `Outdated value detected in response`,
          reason:    `CRITICAL: Atlas cited ${check.label}. Correct 2025 figure is ${check.correct.toLocaleString()}. This misinforms users.`,
          blocker:   true,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  // Check that when a topic is mentioned, the correct value is cited
  for (const check of LIMIT_CHECKS) {
    if (check.topic.test(text)) {
      // Topic mentioned — does the response include the right number?
      const hasCorrectValue = check.valuePattern.test(text);
      // Only flag if a specific dollar amount is mentioned but it's wrong
      // (don't flag if Atlas just discusses the topic without citing the number)
      const mentionsAnyDollarAmount = /\$\d{1,3}[,.]?\d{3}/.test(text);
      if (mentionsAnyDollarAmount && !hasCorrectValue) {
        results.push({
          id:        `D8-LIMIT-CHECK-${check.label.replace(/\s+/g, "_")}`,
          name:      `Limit Accuracy: ${check.label}`,
          dimension: "D8",
          result:    "WARN",
          severity:  check.severity,
          threshold: `2025 value: ${check.expectedValue.toLocaleString()}`,
          actual:    `Topic mentioned, correct value pattern not found`,
          reason:    `${check.label} mentioned but correct 2025 value ($${check.expectedValue.toLocaleString()}) not detected. Verify manually.`,
          blocker:   false,
          timestamp: new Date().toISOString(),
        });
      } else if (hasCorrectValue) {
        results.push({
          id:        `D8-LIMIT-CHECK-${check.label.replace(/\s+/g, "_")}`,
          name:      `Limit Accuracy: ${check.label}`,
          dimension: "D8",
          result:    "PASS",
          severity:  check.severity,
          threshold: `2025 value: ${check.expectedValue.toLocaleString()}`,
          actual:    `Correct value found in response`,
          reason:    `Correct 2025 limit cited`,
          blocker:   false,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  return results;
}
