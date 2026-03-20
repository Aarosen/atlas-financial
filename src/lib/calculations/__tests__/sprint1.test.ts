import { describe, it, expect } from 'vitest';
import { runCalculations, formatCalculationBlock } from '../sprint1';

interface FinancialSnapshot {
  monthlyIncome: number | null;
  monthlyFixedExpenses: number | null;
  monthlyVariableExpenses: number | null;
  currentSavings: number | null;
  totalDebt: number | null;
  debts: Array<{ name: string; balance: number; rate: number; minPayment: number }>;
}

describe('Sprint 1 Calculations', () => {
  it('calculates emergency fund correctly with income and expenses', () => {
    const data: Partial<FinancialSnapshot> = {
      monthlyIncome: 3000,
      monthlyFixedExpenses: 1500,
      monthlyVariableExpenses: 0,
      currentSavings: 200,
      debts: [],
    };

    const result = runCalculations(data);
    expect(result).not.toBeNull();
    expect(result!.monthlySurplus).toBe(1500);
    expect(result!.emergencyFund).not.toBeNull();
    expect(result!.emergencyFund!.target3Month).toBe(4500);
    expect(result!.emergencyFund!.currentGap).toBe(4300);
    expect(result!.emergencyFund!.recommendedMonthly).toBe(1050); // 70% of 1500
  });

  it('handles zero income without infinite loop', () => {
    const data: Partial<FinancialSnapshot> = {
      monthlyIncome: 0,
      monthlyFixedExpenses: 1500,
      monthlyVariableExpenses: 0,
      currentSavings: 200,
      debts: [],
    };

    const result = runCalculations(data);
    expect(result).not.toBeNull();
    expect(result!.monthlySurplus).toBe(-1500);
    expect(result!.oneAction).toContain('expense');
  });

  it('calculates monthly surplus correctly', () => {
    const data: Partial<FinancialSnapshot> = {
      monthlyIncome: 6500,
      monthlyFixedExpenses: 3200,
      monthlyVariableExpenses: 800,
      currentSavings: 5000,
      debts: [],
    };

    const result = runCalculations(data);
    expect(result!.monthlySurplus).toBe(2500);
  });

  it('formats calculation block correctly', () => {
    const data: Partial<FinancialSnapshot> = {
      monthlyIncome: 3000,
      monthlyFixedExpenses: 1500,
      monthlyVariableExpenses: 0,
      currentSavings: 200,
      debts: [],
    };

    const result = runCalculations(data);
    const block = formatCalculationBlock(result!);
    
    expect(block).toContain('[CALCULATION_RESULTS');
    expect(block).toContain('Monthly surplus: $1500');
    expect(block).toContain('Emergency fund:');
    expect(block).toContain('[END_CALCULATIONS]');
  });

  it('returns null when insufficient data', () => {
    const data: Partial<FinancialSnapshot> = {
      debts: [],
    };

    const result = runCalculations(data);
    expect(result).toBeNull();
  });

  it('recommends action for negative surplus', () => {
    const data: Partial<FinancialSnapshot> = {
      monthlyIncome: 2000,
      monthlyFixedExpenses: 2500,
      monthlyVariableExpenses: 0,
      currentSavings: 100,
      debts: [],
    };

    const result = runCalculations(data);
    expect(result!.oneAction).toContain('expense');
  });
});
