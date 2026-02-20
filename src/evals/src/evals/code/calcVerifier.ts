// ─────────────────────────────────────────────────────────────────────────────
// CODE-02: Financial Calculation Verifier (D7-01, D7-02, D7-03, D7-08)
// Verifies Atlas's math is correct to within 0.1% tolerance.
// ─────────────────────────────────────────────────────────────────────────────

import { EvalResult } from "../../types";

const TOLERANCE = 0.001; // 0.1% max error

// ── Core financial formulas ──────────────────────────────────────────────────

export function calcDebtPayoffMonths(
  principal: number,
  annualRate: number,
  monthlyPayment: number
): number {
  const r = annualRate / 12;
  if (r === 0) return Math.ceil(principal / monthlyPayment);
  if (monthlyPayment <= principal * r) return Infinity; // never pays off
  return Math.log(monthlyPayment / (monthlyPayment - principal * r)) / Math.log(1 + r);
}

export function calcFutureValue(
  principal: number,
  monthlyContrib: number,
  annualRate: number,
  years: number
): number {
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return principal + monthlyContrib * n;
  return principal * Math.pow(1 + r, n) +
    monthlyContrib * (Math.pow(1 + r, n) - 1) / r;
}

export function calcAvalancheOrder(
  debts: Array<{ name: string; balance: number; rate: number; minPayment: number }>
) {
  return [...debts].sort((a, b) => b.rate - a.rate);
}

export function calcEmergencyFundTarget(
  monthlyExpenses: number,
  incomeStability: "stable" | "variable" | "gig"
): { min: number; max: number; recommended: number } {
  const months = { stable: { min: 3, max: 6, rec: 4 },
                   variable: { min: 6, max: 9, rec: 6 },
                   gig: { min: 6, max: 12, rec: 9 } };
  const m = months[incomeStability];
  return {
    min: monthlyExpenses * m.min,
    max: monthlyExpenses * m.max,
    recommended: monthlyExpenses * m.rec,
  };
}

// ── Validator: checks Atlas's stated output against formula ─────────────────

export interface CalcTestCase {
  id:           string;
  type:         "debt_payoff" | "future_value" | "emergency_fund" | "avalanche";
  description:  string;
  inputs:       Record<string, number | string>;
  atlasOutput:  number;           // what Atlas actually said
  expectedFn:   () => number;     // reference formula result
}

export function verifyCalc(testCase: CalcTestCase): EvalResult {
  const expected = testCase.expectedFn();
  const error = expected === 0 ? 0 : Math.abs(testCase.atlasOutput - expected) / Math.abs(expected);
  const pass = error <= TOLERANCE;

  return {
    id:        `D7-CALC-${testCase.id}`,
    name:      `Calculation Accuracy — ${testCase.description}`,
    dimension: "D7",
    result:    pass ? "PASS" : "FAIL",
    severity:  "CRITICAL",
    threshold: `≤ ${TOLERANCE * 100}% error`,
    actual:    `Atlas: ${testCase.atlasOutput.toFixed(2)} | Expected: ${expected.toFixed(2)} | Error: ${(error * 100).toFixed(3)}%`,
    reason:    pass
      ? "Calculation is within tolerance"
      : `CRITICAL: Math error of ${(error * 100).toFixed(2)}% — Atlas gave wrong number to user`,
    blocker:   !pass,
    timestamp: new Date().toISOString(),
  };
}

// ── Pre-built regression test suite ────────────────────────────────────────
// Call this with real Atlas outputs extracted from your test runs.

export function runCalcRegressionSuite(
  atlasOutputs: { debtPayoffMonths?: number; futureValue5yr?: number; futureValue30yr?: number }
): EvalResult[] {
  const results: EvalResult[] = [];

  if (atlasOutputs.debtPayoffMonths !== undefined) {
    // $15k CC debt at 22% APR, $500/month payment
    results.push(verifyCalc({
      id:          "01",
      type:        "debt_payoff",
      description: "$15k debt @ 22% APR, $500/mo payment",
      inputs:      { principal: 15000, annualRate: 0.22, monthlyPayment: 500 },
      atlasOutput:  atlasOutputs.debtPayoffMonths,
      expectedFn:  () => calcDebtPayoffMonths(15000, 0.22, 500),
    }));
  }

  if (atlasOutputs.futureValue5yr !== undefined) {
    // $0 start, $200/month, 7% return, 5 years
    results.push(verifyCalc({
      id:          "02",
      type:        "future_value",
      description: "$200/mo @ 7% for 5 years",
      inputs:      { principal: 0, monthlyContrib: 200, annualRate: 0.07, years: 5 },
      atlasOutput:  atlasOutputs.futureValue5yr,
      expectedFn:  () => calcFutureValue(0, 200, 0.07, 5),
    }));
  }

  if (atlasOutputs.futureValue30yr !== undefined) {
    // $1k start, $500/month, 7%, 30 years (common Atlas teaching example)
    results.push(verifyCalc({
      id:          "03",
      type:        "future_value",
      description: "$1k + $500/mo @ 7% for 30 years",
      inputs:      { principal: 1000, monthlyContrib: 500, annualRate: 0.07, years: 30 },
      atlasOutput:  atlasOutputs.futureValue30yr,
      expectedFn:  () => calcFutureValue(1000, 500, 0.07, 30),
    }));
  }

  return results;
}
