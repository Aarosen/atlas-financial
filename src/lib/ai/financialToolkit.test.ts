import { describe, expect, it } from "vitest";
import { buildToolkitSummary, calculateDebtPayoffMonths } from "./financialToolkit";

describe("financialToolkit", () => {
  it("calculates debt payoff months", () => {
    const months = calculateDebtPayoffMonths(12000, 0.24, 500);
    expect(months).toBeGreaterThan(0);
  });

  it("builds toolkit summary", () => {
    const summary = buildToolkitSummary({
      monthlyIncome: 5000,
      essentialExpenses: 2500,
      discretionaryExpenses: 800,
      monthlyDebtPayments: 200,
      totalSavings: 4000,
    });
    expect(summary.monthlySavings).toBeDefined();
    expect(summary.savingsRate).toBeDefined();
  });
});
