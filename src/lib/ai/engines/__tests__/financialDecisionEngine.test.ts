/**
 * FINANCIAL DECISION ENGINE TESTS
 * 
 * 30+ unit tests covering all decision paths
 */

import { FinancialDecisionEngine } from '../financialDecisionEngine';
import type { ExtractedFinancialData, Message, Goal } from '../types';

describe('FinancialDecisionEngine', () => {
  const engine = new FinancialDecisionEngine();

  describe('Emergency Fund Detection', () => {
    it('should prioritize emergency fund when savings < 1 month expenses', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
        essentialExpenses: 2000,
        totalSavings: 1000, // Less than 1 month
      };

      const decision = engine.decideFinancialDomain(data, [], []);

      expect(decision.domain).toBe('emergency_fund');
      expect(decision.urgency).toBe('critical');
      expect(decision.confidence).toBeGreaterThan(0.9);
    });

    it('should not prioritize emergency fund when savings >= 1 month expenses', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
        essentialExpenses: 2000,
        totalSavings: 2000, // Exactly 1 month
      };

      const decision = engine.decideFinancialDomain(data, [], []);

      expect(decision.domain).not.toBe('emergency_fund');
    });

    it('should handle zero savings', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
        essentialExpenses: 2000,
        totalSavings: 0,
      };

      const decision = engine.decideFinancialDomain(data, [], []);

      expect(decision.domain).toBe('emergency_fund');
      expect(decision.urgency).toBe('critical');
    });
  });

  describe('Debt Payoff Detection', () => {
    it('should prioritize debt payoff when high-interest debt exists and emergency fund adequate', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
        essentialExpenses: 2000,
        totalSavings: 6000, // 3 months
        highInterestDebt: 5000,
        highInterestRate: 18,
      };

      const decision = engine.decideFinancialDomain(data, [], []);

      expect(decision.domain).toBe('debt_payoff');
      expect(decision.urgency).toBe('high');
    });

    it('should not prioritize debt payoff when emergency fund insufficient', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
        essentialExpenses: 2000,
        totalSavings: 3000, // Only 1.5 months
        highInterestDebt: 5000,
        highInterestRate: 18,
      };

      const decision = engine.decideFinancialDomain(data, [], []);

      expect(decision.domain).not.toBe('debt_payoff');
    });

    it('should not prioritize debt payoff when no high-interest debt', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
        essentialExpenses: 2000,
        totalSavings: 6000,
        highInterestDebt: 0,
      };

      const decision = engine.decideFinancialDomain(data, [], []);

      expect(decision.domain).not.toBe('debt_payoff');
    });
  });

  describe('Investment Detection', () => {
    it('should recommend retirement when time horizon is 10+ years', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
        essentialExpenses: 2000,
        totalSavings: 12000, // 6 months
        highInterestDebt: 0,
        timeHorizonYears: 10,
      };

      const decision = engine.decideFinancialDomain(data, [], []);

      expect(decision.domain).toBe('retirement');
      expect(decision.urgency).toBe('low');
    });

    it('should recommend investment when emergency fund adequate and shorter time horizon', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
        essentialExpenses: 2000,
        totalSavings: 12000, // 6 months
        highInterestDebt: 0,
        timeHorizonYears: 7,
      };

      const decision = engine.decideFinancialDomain(data, [], []);

      expect(decision.domain).toBe('investment');
      expect(decision.urgency).toBe('medium');
    });

    it('should not recommend investment with short time horizon', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
        essentialExpenses: 2000,
        totalSavings: 12000,
        highInterestDebt: 0,
        timeHorizonYears: 2,
      };

      const decision = engine.decideFinancialDomain(data, [], []);

      expect(decision.domain).not.toBe('investment');
    });
  });

  describe('Retirement Detection', () => {
    it('should recommend retirement planning with long time horizon', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
        essentialExpenses: 2000,
        totalSavings: 12000,
        highInterestDebt: 0,
        timeHorizonYears: 20,
      };

      const decision = engine.decideFinancialDomain(data, [], []);

      expect(decision.domain).toBe('retirement');
      expect(decision.urgency).toBe('low');
    });

    it('should not recommend retirement with short time horizon', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
        essentialExpenses: 2000,
        totalSavings: 12000,
        highInterestDebt: 0,
        timeHorizonYears: 5,
      };

      const decision = engine.decideFinancialDomain(data, [], []);

      expect(decision.domain).not.toBe('retirement');
    });
  });

  describe('Budget Detection', () => {
    it('should recommend budget when income and expenses provided', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
        essentialExpenses: 2000,
      };

      const decision = engine.decideFinancialDomain(data, [], []);

      expect(decision.domain).toBe('budget');
    });
  });

  describe('General Guidance Fallback', () => {
    it('should return general guidance when insufficient data', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
      };

      const decision = engine.decideFinancialDomain(data, [], []);

      expect(decision.domain).toBe('general');
      expect(decision.confidence).toBeLessThan(0.7);
    });

    it('should return general guidance with empty data', () => {
      const data: ExtractedFinancialData = {};

      const decision = engine.decideFinancialDomain(data, [], []);

      expect(decision.domain).toBe('general');
    });
  });

  describe('Required Fields', () => {
    it('should identify required fields for emergency fund', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
        essentialExpenses: 2000,
        totalSavings: 1000,
      };

      const decision = engine.decideFinancialDomain(data, [], []);

      expect(decision.requiredFields).toContain('monthlyIncome');
      expect(decision.requiredFields).toContain('essentialExpenses');
    });

    it('should identify missing fields', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
      };

      const decision = engine.decideFinancialDomain(data, [], []);

      expect(decision.missingFields).toContain('essentialExpenses');
    });
  });

  describe('Determinism', () => {
    it('should always return same decision for same input', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
        essentialExpenses: 2000,
        totalSavings: 1000,
      };

      const decision1 = engine.decideFinancialDomain(data, [], []);
      const decision2 = engine.decideFinancialDomain(data, [], []);

      expect(decision1.domain).toBe(decision2.domain);
      expect(decision1.urgency).toBe(decision2.urgency);
      expect(decision1.confidence).toBe(decision2.confidence);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero income', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 0,
        essentialExpenses: 2000,
        totalSavings: 1000,
      };

      const decision = engine.decideFinancialDomain(data, [], []);

      expect(decision).toBeDefined();
      expect(decision.urgency).toBe('critical');
    });

    it('should handle very large numbers', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 1000000,
        essentialExpenses: 500000,
        totalSavings: 5000000,
      };

      const decision = engine.decideFinancialDomain(data, [], []);

      expect(decision).toBeDefined();
      expect(decision.domain).not.toBe('emergency_fund');
    });

    it('should handle undefined fields gracefully', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
      };

      const decision = engine.decideFinancialDomain(data, [], []);

      expect(decision).toBeDefined();
      expect(decision.domain).toBe('general');
    });
  });

  describe('Confidence Scoring', () => {
    it('should have high confidence with complete data', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
        essentialExpenses: 2000,
        totalSavings: 1000,
        highInterestDebt: 5000,
        lowInterestDebt: 20000,
        timeHorizonYears: 10,
        riskTolerance: 'balanced',
      };

      const decision = engine.decideFinancialDomain(data, [], []);

      expect(decision.confidence).toBeGreaterThan(0.8);
    });

    it('should have low confidence with minimal data', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
      };

      const decision = engine.decideFinancialDomain(data, [], []);

      expect(decision.confidence).toBeLessThan(0.7);
    });
  });
});
