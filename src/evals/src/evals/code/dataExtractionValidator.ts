// ─────────────────────────────────────────────────────────────────────────────
// CODE-05: Data Extraction Accuracy — Golden Set Runner (D5-01, D5-02, D5-06)
// Tests Atlas's ability to extract financial data from natural language
// ─────────────────────────────────────────────────────────────────────────────

import { EvalResult } from "../../types";

export interface ExtractionTestCase {
  id: string;
  input: string;
  expected: Record<string, number>;
  tolerancePct: number;
}

const GOLDEN_EXTRACTION_SET: ExtractionTestCase[] = [
  {
    id: "E01",
    input: "I make about 4k a month after taxes, rent is 1400, groceries maybe 300",
    expected: { monthly_income: 4000, rent: 1400, groceries: 300 },
    tolerancePct: 0.02,
  },
  {
    id: "E02",
    input: "I've got like 15k in credit card debt at around 22 percent",
    expected: { debt_balance: 15000, interest_rate: 0.22 },
    tolerancePct: 0.02,
  },
  {
    id: "E03",
    input: "I earn $95k per year salary, before taxes",
    expected: { annual_gross: 95000 },
    tolerancePct: 0.0,
  },
  {
    id: "E04",
    input: "I get paid every two weeks, about $2,200 per paycheck",
    expected: { monthly_income: 4767 },
    tolerancePct: 0.02,
  },
  {
    id: "E05",
    input: "My expenses are roughly: rent $1500, food $400, utilities $150, car $300",
    expected: { rent: 1500, food: 400, utilities: 150, car: 300 },
    tolerancePct: 0.02,
  },
];

export function validateExtractionAccuracy(
  extractedData: Record<string, number>,
  testCase: ExtractionTestCase
): EvalResult {
  let allMatch = true;
  const errors: string[] = [];

  for (const [key, expectedValue] of Object.entries(testCase.expected)) {
    const extracted = extractedData[key];
    if (extracted === undefined) {
      allMatch = false;
      errors.push(`Missing field: ${key}`);
      continue;
    }

    const tolerance = expectedValue * testCase.tolerancePct;
    const error = Math.abs(extracted - expectedValue);
    if (error > tolerance) {
      allMatch = false;
      errors.push(`${key}: expected ${expectedValue}, got ${extracted}`);
    }
  }

  return {
    id: `D5-EXTRACT-${testCase.id}`,
    name: `Data Extraction — ${testCase.input.substring(0, 50)}...`,
    dimension: "D5",
    result: allMatch ? "PASS" : "FAIL",
    severity: "CRITICAL",
    threshold: `≤ ${testCase.tolerancePct * 100}% error per field`,
    actual: allMatch ? "All fields extracted correctly" : errors.join("; "),
    reason: allMatch
      ? "Data extraction accurate"
      : `CRITICAL: Extraction errors — ${errors[0]}`,
    blocker: !allMatch,
    timestamp: new Date().toISOString(),
  };
}

export function runExtractionSuite(
  extractionFn: (input: string) => Record<string, number>
): EvalResult[] {
  return GOLDEN_EXTRACTION_SET.map(testCase =>
    validateExtractionAccuracy(extractionFn(testCase.input), testCase)
  );
}
