/**
 * VALIDATION ENGINE TESTS
 * 
 * 30+ unit tests covering all validation rules
 */

import { ValidationEngine } from '../validationEngine';
import type { ExtractedFinancialData } from '../types';

describe('ValidationEngine', () => {
  const engine = new ValidationEngine();

  describe('Income Validation', () => {
    it('should reject negative income', () => {
      const data: ExtractedFinancialData = { monthlyIncome: -1000 };
      const result = engine.validateFinancialData(data);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.field === 'monthlyIncome')).toBe(true);
    });

    it('should accept zero income', () => {
      const data: ExtractedFinancialData = { monthlyIncome: 0 };
      const result = engine.validateFinancialData(data);
      expect(result.issues.filter(i => i.field === 'monthlyIncome' && i.severity === 'error')).toHaveLength(0);
    });

    it('should accept positive income', () => {
      const data: ExtractedFinancialData = { monthlyIncome: 5000 };
      const result = engine.validateFinancialData(data);
      expect(result.issues.filter(i => i.field === 'monthlyIncome' && i.severity === 'error')).toHaveLength(0);
    });

    it('should warn on unusually high income', () => {
      const data: ExtractedFinancialData = { monthlyIncome: 2000000 };
      const result = engine.validateFinancialData(data);
      expect(result.issues.some(i => i.field === 'monthlyIncome' && i.severity === 'warning')).toBe(true);
    });
  });

  describe('Expense Validation', () => {
    it('should reject negative expenses', () => {
      const data: ExtractedFinancialData = { essentialExpenses: -1000 };
      const result = engine.validateFinancialData(data);
      expect(result.isValid).toBe(false);
    });

    it('should accept zero expenses', () => {
      const data: ExtractedFinancialData = { essentialExpenses: 0 };
      const result = engine.validateFinancialData(data);
      expect(result.issues.filter(i => i.field === 'essentialExpenses' && i.severity === 'error')).toHaveLength(0);
    });

    it('should accept positive expenses', () => {
      const data: ExtractedFinancialData = { essentialExpenses: 2000 };
      const result = engine.validateFinancialData(data);
      expect(result.issues.filter(i => i.field === 'essentialExpenses' && i.severity === 'error')).toHaveLength(0);
    });
  });

  describe('Savings Validation', () => {
    it('should reject negative savings', () => {
      const data: ExtractedFinancialData = { totalSavings: -1000 };
      const result = engine.validateFinancialData(data);
      expect(result.isValid).toBe(false);
    });

    it('should accept zero savings', () => {
      const data: ExtractedFinancialData = { totalSavings: 0 };
      const result = engine.validateFinancialData(data);
      expect(result.issues.filter(i => i.field === 'totalSavings' && i.severity === 'error')).toHaveLength(0);
    });

    it('should accept positive savings', () => {
      const data: ExtractedFinancialData = { totalSavings: 10000 };
      const result = engine.validateFinancialData(data);
      expect(result.issues.filter(i => i.field === 'totalSavings' && i.severity === 'error')).toHaveLength(0);
    });
  });

  describe('Debt Validation', () => {
    it('should reject negative debt', () => {
      const data: ExtractedFinancialData = { highInterestDebt: -1000 };
      const result = engine.validateFinancialData(data);
      expect(result.isValid).toBe(false);
    });

    it('should accept zero debt', () => {
      const data: ExtractedFinancialData = { highInterestDebt: 0 };
      const result = engine.validateFinancialData(data);
      expect(result.issues.filter(i => i.field === 'highInterestDebt' && i.severity === 'error')).toHaveLength(0);
    });

    it('should accept positive debt', () => {
      const data: ExtractedFinancialData = { highInterestDebt: 5000 };
      const result = engine.validateFinancialData(data);
      expect(result.issues.filter(i => i.field === 'highInterestDebt' && i.severity === 'error')).toHaveLength(0);
    });
  });

  describe('Interest Rate Validation', () => {
    it('should warn on negative interest rate', () => {
      const data: ExtractedFinancialData = { highInterestRate: -5 };
      const result = engine.validateFinancialData(data);
      expect(result.issues.some(i => i.field === 'highInterestRate' && i.severity === 'warning')).toBe(true);
    });

    it('should warn on interest rate > 100%', () => {
      const data: ExtractedFinancialData = { highInterestRate: 150 };
      const result = engine.validateFinancialData(data);
      expect(result.issues.some(i => i.field === 'highInterestRate' && i.severity === 'warning')).toBe(true);
    });

    it('should accept normal interest rates', () => {
      const data: ExtractedFinancialData = { highInterestRate: 18 };
      const result = engine.validateFinancialData(data);
      expect(result.issues.filter(i => i.field === 'highInterestRate' && i.severity === 'error')).toHaveLength(0);
    });
  });

  describe('Time Horizon Validation', () => {
    it('should reject negative time horizon', () => {
      const data: ExtractedFinancialData = { timeHorizonYears: -5 };
      const result = engine.validateFinancialData(data);
      expect(result.isValid).toBe(false);
    });

    it('should accept zero time horizon', () => {
      const data: ExtractedFinancialData = { timeHorizonYears: 0 };
      const result = engine.validateFinancialData(data);
      expect(result.issues.filter(i => i.field === 'timeHorizonYears' && i.severity === 'error')).toHaveLength(0);
    });

    it('should warn on unusually long time horizon', () => {
      const data: ExtractedFinancialData = { timeHorizonYears: 150 };
      const result = engine.validateFinancialData(data);
      expect(result.issues.some(i => i.field === 'timeHorizonYears' && i.severity === 'warning')).toBe(true);
    });
  });

  describe('Cross-Field Validation', () => {
    it('should error when income < expenses', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 2000,
        essentialExpenses: 3000,
      };
      const result = engine.validateFinancialData(data);
      expect(result.isValid).toBe(false);
      expect(result.issues.some(i => i.field === 'monthlyIncome')).toBe(true);
    });

    it('should pass when income >= expenses', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
        essentialExpenses: 2000,
      };
      const result = engine.validateFinancialData(data);
      expect(result.issues.filter(i => i.severity === 'error')).toHaveLength(0);
    });

    it('should warn when savings unusually high', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
        essentialExpenses: 2000,
        totalSavings: 1000000,
      };
      const result = engine.validateFinancialData(data);
      expect(result.issues.some(i => i.severity === 'warning')).toBe(true);
    });
  });

  describe('Validation Result Properties', () => {
    it('should set isValid to true when no errors', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
        essentialExpenses: 2000,
      };
      const result = engine.validateFinancialData(data);
      expect(result.isValid).toBe(true);
    });

    it('should set isValid to false when errors present', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: -1000,
      };
      const result = engine.validateFinancialData(data);
      expect(result.isValid).toBe(false);
    });

    it('should set requiresUserConfirmation when warnings present', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 2000000,
      };
      const result = engine.validateFinancialData(data);
      expect(result.requiresUserConfirmation).toBe(true);
    });

    it('should not require confirmation when only errors', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: -1000,
      };
      const result = engine.validateFinancialData(data);
      expect(result.requiresUserConfirmation).toBe(false);
    });
  });

  describe('Determinism', () => {
    it('should always return same result for same input', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
        essentialExpenses: 2000,
        totalSavings: 10000,
      };
      const result1 = engine.validateFinancialData(data);
      const result2 = engine.validateFinancialData(data);

      expect(result1.isValid).toBe(result2.isValid);
      expect(result1.issues.length).toBe(result2.issues.length);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data', () => {
      const data: ExtractedFinancialData = {};
      const result = engine.validateFinancialData(data);
      expect(result).toBeDefined();
      expect(result.issues.length).toBe(0);
    });

    it('should handle all fields', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
        essentialExpenses: 2000,
        discretionaryExpenses: 500,
        totalSavings: 10000,
        highInterestDebt: 5000,
        lowInterestDebt: 20000,
        monthlyDebtPayments: 500,
        highInterestRate: 18,
        lowInterestRate: 5,
        primaryGoal: 'stability',
        timeHorizonYears: 10,
        riskTolerance: 'balanced',
      };
      const result = engine.validateFinancialData(data);
      expect(result).toBeDefined();
    });

    it('should handle very large numbers', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 1000000000,
        essentialExpenses: 500000000,
      };
      const result = engine.validateFinancialData(data);
      expect(result).toBeDefined();
    });
  });
});
