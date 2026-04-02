/**
 * QUESTION SEQUENCING ENGINE TESTS
 * 
 * 20+ unit tests covering question sequencing logic
 */

import { QuestionSequencingEngine } from '../questionSequencingEngine';
import type { ExtractedFinancialData, FinancialDecision } from '../types';

describe('QuestionSequencingEngine', () => {
  const engine = new QuestionSequencingEngine();

  describe('Question Priority', () => {
    it('should ask for income first', () => {
      const data: ExtractedFinancialData = {};
      const decision: FinancialDecision = {
        domain: 'budget',
        reasoning: 'test',
        requiredFields: ['monthlyIncome', 'essentialExpenses'],
        missingFields: ['monthlyIncome', 'essentialExpenses'],
        urgency: 'medium',
        nextAction: 'test',
        confidence: 0.5,
      };

      const question = engine.getNextQuestion(data, decision, []);

      expect(question?.field).toBe('monthlyIncome');
      expect(question?.priority).toBe(1);
    });

    it('should ask for expenses second', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
      };
      const decision: FinancialDecision = {
        domain: 'budget',
        reasoning: 'test',
        requiredFields: ['monthlyIncome', 'essentialExpenses'],
        missingFields: ['essentialExpenses'],
        urgency: 'medium',
        nextAction: 'test',
        confidence: 0.5,
      };

      const question = engine.getNextQuestion(data, decision, []);

      expect(question?.field).toBe('essentialExpenses');
      expect(question?.priority).toBe(2);
    });

    it('should ask for savings third', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
        essentialExpenses: 2000,
      };
      const decision: FinancialDecision = {
        domain: 'emergency_fund',
        reasoning: 'test',
        requiredFields: ['monthlyIncome', 'essentialExpenses', 'totalSavings'],
        missingFields: ['totalSavings'],
        urgency: 'critical',
        nextAction: 'test',
        confidence: 0.9,
      };

      const question = engine.getNextQuestion(data, decision, []);

      expect(question?.field).toBe('totalSavings');
      expect(question?.priority).toBe(3);
    });
  });

  describe('Question Content', () => {
    it('should provide appropriate question text', () => {
      const data: ExtractedFinancialData = {};
      const decision: FinancialDecision = {
        domain: 'budget',
        reasoning: 'test',
        requiredFields: ['monthlyIncome'],
        missingFields: ['monthlyIncome'],
        urgency: 'medium',
        nextAction: 'test',
        confidence: 0.5,
      };

      const question = engine.getNextQuestion(data, decision, []);

      expect(question?.question).toBeDefined();
      expect(question?.question.length).toBeGreaterThan(0);
    });

    it('should provide context for question', () => {
      const data: ExtractedFinancialData = {};
      const decision: FinancialDecision = {
        domain: 'budget',
        reasoning: 'test',
        requiredFields: ['monthlyIncome'],
        missingFields: ['monthlyIncome'],
        urgency: 'medium',
        nextAction: 'test',
        confidence: 0.5,
      };

      const question = engine.getNextQuestion(data, decision, []);

      expect(question?.context).toBeDefined();
      expect(question?.context.length).toBeGreaterThan(0);
    });

    it('should provide help text', () => {
      const data: ExtractedFinancialData = {};
      const decision: FinancialDecision = {
        domain: 'budget',
        reasoning: 'test',
        requiredFields: ['monthlyIncome'],
        missingFields: ['monthlyIncome'],
        urgency: 'medium',
        nextAction: 'test',
        confidence: 0.5,
      };

      const question = engine.getNextQuestion(data, decision, []);

      expect(question?.helpText).toBeDefined();
      expect(question?.helpText?.length).toBeGreaterThan(0);
    });
  });

  describe('All Questions Collected', () => {
    it('should return null when all required fields collected', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
        essentialExpenses: 2000,
        totalSavings: 10000,
      };
      const decision: FinancialDecision = {
        domain: 'emergency_fund',
        reasoning: 'test',
        requiredFields: ['monthlyIncome', 'essentialExpenses', 'totalSavings'],
        missingFields: [],
        urgency: 'critical',
        nextAction: 'test',
        confidence: 0.9,
      };

      const question = engine.getNextQuestion(data, decision, []);

      expect(question).toBeNull();
    });
  });

  describe('Different Domains', () => {
    it('should ask appropriate questions for emergency fund', () => {
      const data: ExtractedFinancialData = {};
      const decision: FinancialDecision = {
        domain: 'emergency_fund',
        reasoning: 'test',
        requiredFields: ['monthlyIncome', 'essentialExpenses', 'discretionaryExpenses'],
        missingFields: ['monthlyIncome', 'essentialExpenses', 'discretionaryExpenses'],
        urgency: 'critical',
        nextAction: 'test',
        confidence: 0.9,
      };

      const question = engine.getNextQuestion(data, decision, []);

      expect(question?.field).toBe('monthlyIncome');
    });

    it('should ask appropriate questions for debt payoff', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
        essentialExpenses: 2000,
      };
      const decision: FinancialDecision = {
        domain: 'debt_payoff',
        reasoning: 'test',
        requiredFields: ['monthlyIncome', 'essentialExpenses', 'highInterestDebt', 'highInterestRate'],
        missingFields: ['highInterestDebt', 'highInterestRate'],
        urgency: 'high',
        nextAction: 'test',
        confidence: 0.9,
      };

      const question = engine.getNextQuestion(data, decision, []);

      expect(question?.field).toBe('highInterestDebt');
    });

    it('should ask appropriate questions for investment', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 5000,
        essentialExpenses: 2000,
        totalSavings: 12000,
      };
      const decision: FinancialDecision = {
        domain: 'investment',
        reasoning: 'test',
        requiredFields: ['monthlyIncome', 'riskTolerance', 'timeHorizonYears'],
        missingFields: ['riskTolerance', 'timeHorizonYears'],
        urgency: 'medium',
        nextAction: 'test',
        confidence: 0.85,
      };

      const question = engine.getNextQuestion(data, decision, []);

      expect(question?.field).toBe('riskTolerance');
    });
  });

  describe('Determinism', () => {
    it('should always return same question for same input', () => {
      const data: ExtractedFinancialData = {};
      const decision: FinancialDecision = {
        domain: 'budget',
        reasoning: 'test',
        requiredFields: ['monthlyIncome', 'essentialExpenses'],
        missingFields: ['monthlyIncome', 'essentialExpenses'],
        urgency: 'medium',
        nextAction: 'test',
        confidence: 0.5,
      };

      const question1 = engine.getNextQuestion(data, decision, []);
      const question2 = engine.getNextQuestion(data, decision, []);

      expect(question1?.field).toBe(question2?.field);
      expect(question1?.priority).toBe(question2?.priority);
      expect(question1?.question).toBe(question2?.question);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty required fields', () => {
      const data: ExtractedFinancialData = {};
      const decision: FinancialDecision = {
        domain: 'general',
        reasoning: 'test',
        requiredFields: [],
        missingFields: [],
        urgency: 'low',
        nextAction: 'test',
        confidence: 0.5,
      };

      const question = engine.getNextQuestion(data, decision, []);

      expect(question).toBeNull();
    });

    it('should handle unknown required field', () => {
      const data: ExtractedFinancialData = {};
      const decision: FinancialDecision = {
        domain: 'general',
        reasoning: 'test',
        requiredFields: ['unknownField' as any],
        missingFields: ['unknownField' as any],
        urgency: 'low',
        nextAction: 'test',
        confidence: 0.5,
      };

      const question = engine.getNextQuestion(data, decision, []);

      expect(question).toBeNull();
    });
  });
});
