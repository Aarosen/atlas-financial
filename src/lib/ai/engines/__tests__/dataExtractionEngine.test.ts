/**
 * DATA EXTRACTION ENGINE TESTS
 * 
 * 30+ unit tests covering all extraction patterns
 */

import { DataExtractionEngine } from '../dataExtractionEngine';

describe('DataExtractionEngine', () => {
  const engine = new DataExtractionEngine();

  describe('Income Extraction', () => {
    it('should extract monthly income', () => {
      const result = engine.extractFinancialData('I make $5000 per month', []);
      expect(result.data.monthlyIncome).toBe(5000);
    });

    it('should extract income with comma', () => {
      const result = engine.extractFinancialData('I earn $5,000 monthly', []);
      expect(result.data.monthlyIncome).toBe(5000);
    });

    it('should extract income with k notation', () => {
      const result = engine.extractFinancialData('I make 5k per month', []);
      expect(result.data.monthlyIncome).toBe(5000);
    });

    it('should extract income with K notation', () => {
      const result = engine.extractFinancialData('I earn 5K a month', []);
      expect(result.data.monthlyIncome).toBe(5000);
    });

    it('should extract income from salary keyword', () => {
      const result = engine.extractFinancialData('My salary is $3000/month', []);
      expect(result.data.monthlyIncome).toBe(3000);
    });
  });

  describe('Expense Extraction', () => {
    it('should extract essential expenses', () => {
      const result = engine.extractFinancialData('My rent is $1500 per month', []);
      expect(result.data.essentialExpenses).toBe(1500);
    });

    it('should extract expenses with comma', () => {
      const result = engine.extractFinancialData('Essential expenses are $2,000 monthly', []);
      expect(result.data.essentialExpenses).toBe(2000);
    });

    it('should extract discretionary expenses', () => {
      const result = engine.extractFinancialData('I spend $500 on entertainment per month', []);
      expect(result.data.discretionaryExpenses).toBe(500);
    });
  });

  describe('Savings Extraction', () => {
    it('should extract savings amount', () => {
      const result = engine.extractFinancialData('I have $10000 in savings', []);
      expect(result.data.totalSavings).toBe(10000);
    });

    it('should extract savings with comma', () => {
      const result = engine.extractFinancialData('My savings are $10,000', []);
      expect(result.data.totalSavings).toBe(10000);
    });

    it('should extract savings with k notation', () => {
      const result = engine.extractFinancialData('I have saved 10k', []);
      expect(result.data.totalSavings).toBe(10000);
    });

    it('should extract emergency fund', () => {
      const result = engine.extractFinancialData('My emergency fund is $5000', []);
      expect(result.data.totalSavings).toBe(5000);
    });
  });

  describe('Debt Extraction', () => {
    it('should extract high-interest debt', () => {
      const result = engine.extractFinancialData('I have $5000 in credit card debt', []);
      expect(result.data.highInterestDebt).toBe(5000);
    });

    it('should extract low-interest debt', () => {
      const result = engine.extractFinancialData('I have a $20000 student loan', []);
      expect(result.data.lowInterestDebt).toBe(20000);
    });

    it('should extract interest rate', () => {
      const result = engine.extractFinancialData('My credit card has 18% APR', []);
      expect(result.data.highInterestRate).toBe(18);
    });
  });

  describe('Time Horizon Extraction', () => {
    it('should extract time horizon in years', () => {
      const result = engine.extractFinancialData('My time horizon is 10 years', []);
      expect(result.data.timeHorizonYears).toBe(10);
    });

    it('should extract time horizon with years keyword', () => {
      const result = engine.extractFinancialData('I have 5 years until retirement', []);
      expect(result.data.timeHorizonYears).toBe(5);
    });
  });

  describe('Risk Tolerance Extraction', () => {
    it('should extract cautious risk tolerance', () => {
      const result = engine.extractFinancialData('I am very risk-averse', []);
      expect(result.data.riskTolerance).toBe('cautious');
    });

    it('should extract balanced risk tolerance', () => {
      const result = engine.extractFinancialData('I prefer a balanced approach', []);
      expect(result.data.riskTolerance).toBe('balanced');
    });

    it('should extract growth risk tolerance', () => {
      const result = engine.extractFinancialData('I am willing to take risks for growth', []);
      expect(result.data.riskTolerance).toBe('growth');
    });
  });

  describe('Goal Extraction', () => {
    it('should extract stability goal', () => {
      const result = engine.extractFinancialData('I want to preserve my capital', []);
      expect(result.data.primaryGoal).toBe('stability');
    });

    it('should extract growth goal', () => {
      const result = engine.extractFinancialData('I want to build wealth', []);
      expect(result.data.primaryGoal).toBe('growth');
    });

    it('should extract flexibility goal', () => {
      const result = engine.extractFinancialData('I need access to my money', []);
      expect(result.data.primaryGoal).toBe('flexibility');
    });

    it('should extract wealth building goal', () => {
      const result = engine.extractFinancialData('I am planning for retirement', []);
      expect(result.data.primaryGoal).toBe('wealth_building');
    });
  });

  describe('Confidence Scoring', () => {
    it('should have reasonable confidence with complete data', () => {
      const result = engine.extractFinancialData(
        'I make $5000 per month, spend $2000 on essentials, have $10000 saved, and $5000 in credit card debt at 18% APR',
        []
      );
      expect(result.confidence).toBeGreaterThan(0.2);
    });

    it('should have low confidence with minimal data', () => {
      const result = engine.extractFinancialData('I have some money', []);
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe('Conversation History', () => {
    it('should extract data from conversation history', () => {
      const history = [
        { role: 'user' as const, content: 'I make $5000 per month' },
        { role: 'assistant' as const, content: 'Got it' },
        { role: 'user' as const, content: 'And I spend $2000 per month on essentials' },
      ];
      const result = engine.extractFinancialData('What should I do?', history);
      expect(result.data.monthlyIncome).toBe(5000);
      expect(result.data.essentialExpenses).toBe(2000);
    });
  });

  describe('Determinism', () => {
    it('should always extract same data for same input', () => {
      const message = 'I make $5000/month and have $10000 saved';
      const result1 = engine.extractFinancialData(message, []);
      const result2 = engine.extractFinancialData(message, []);

      expect(result1.data.monthlyIncome).toBe(result2.data.monthlyIncome);
      expect(result1.data.totalSavings).toBe(result2.data.totalSavings);
      expect(result1.confidence).toBe(result2.confidence);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', () => {
      const result = engine.extractFinancialData('', []);
      expect(result.data).toBeDefined();
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should handle message with no financial data', () => {
      const result = engine.extractFinancialData('How are you today?', []);
      expect(result.data).toBeDefined();
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should handle very large numbers', () => {
      const result = engine.extractFinancialData('I have $1000000 in savings', []);
      expect(result.data.totalSavings).toBe(1000000);
    });

    it('should handle decimal amounts', () => {
      const result = engine.extractFinancialData('I make $5000.50 per month', []);
      expect(result.data.monthlyIncome).toBe(5000.5);
    });
  });

  describe('Case Insensitivity', () => {
    it('should extract regardless of case', () => {
      const result1 = engine.extractFinancialData('I MAKE $5000 PER MONTH', []);
      const result2 = engine.extractFinancialData('i make $5000 per month', []);
      const result3 = engine.extractFinancialData('I Make $5000 Per Month', []);

      expect(result1.data.monthlyIncome).toBe(5000);
      expect(result2.data.monthlyIncome).toBe(5000);
      expect(result3.data.monthlyIncome).toBe(5000);
    });
  });
});
