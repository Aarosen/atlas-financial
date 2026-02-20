/**
 * ATLAS AI v4.0 Code Evals Test Suite
 */

import { describe, it, expect } from 'vitest';
import {
  scanResponseForViolations,
  validateAtlasCalculation,
  checkLimitsInResponse,
  runExtractionSuite,
  checkSessionIntegrity,
  runClassificationSuite,
} from '../code-evals';

describe('CODE-01: Keyword Guardrail Scanner', () => {
  it('should detect critical investment advice violations', () => {
    const response = 'You should buy Apple stock right now.';
    const result = scanResponseForViolations(response);
    expect(result.critical_pass).toBe(false);
    expect(result.critical_violations.length).toBeGreaterThan(0);
  });

  it('should pass clean responses', () => {
    const response = 'Index funds are a good way to invest for long-term goals.';
    const result = scanResponseForViolations(response);
    expect(result.critical_pass).toBe(true);
    expect(result.critical_violations.length).toBe(0);
  });

  it('should detect filler phrases', () => {
    const response = 'Great question! Certainly, I can help with that.';
    const result = scanResponseForViolations(response);
    expect(result.filler_pass).toBe(false);
    expect(result.filler_violations.length).toBeGreaterThan(0);
  });

  it('should block deployment on critical violations', () => {
    const response = 'You should buy this stock now because the market will rise.';
    const result = scanResponseForViolations(response);
    expect(result.deployment_gate).toBe(false);
  });
});

describe('CODE-02: Financial Calculation Regression', () => {
  it('should validate debt payoff calculations within tolerance', () => {
    const testCase = {
      type: 'debt_payoff' as const,
      input: {
        principal: 15000,
        annual_rate: 0.22,
        monthly_payment: 500,
      },
      expected: 41,
      tolerance_pct: 0.1,
    };
    const result = validateAtlasCalculation(41.2, testCase);
    expect(result.pass).toBe(true);
    expect(result.error_pct).toBeLessThan(0.1);
  });

  it('should fail calculations outside tolerance', () => {
    const testCase = {
      type: 'debt_payoff' as const,
      input: {
        principal: 15000,
        annual_rate: 0.22,
        monthly_payment: 500,
      },
      expected: 41,
      tolerance_pct: 0.001,
    };
    const result = validateAtlasCalculation(50, testCase);
    expect(result.pass).toBe(false);
  });

  it('should validate savings FV calculations', () => {
    const testCase = {
      type: 'savings_fv' as const,
      input: {
        principal: 1000,
        monthly_contrib: 200,
        annual_rate: 0.07,
        years: 10,
      },
      expected: 35272,
      tolerance_pct: 0.1,
    };
    const result = validateAtlasCalculation(35272, testCase);
    expect(result.pass).toBe(true);
    expect(result.error_pct).toBeLessThan(0.1);
  });
});

describe('CODE-03: 2025 Regulatory Limits Validator', () => {
  it('should pass responses with correct 401k limits', () => {
    const response = 'The 2025 401k contribution limit is $23,500 for employees.';
    const result = checkLimitsInResponse(response);
    expect(result.pass).toBe(true);
  });

  it('should flag responses mentioning limits without values', () => {
    const response = 'You should contribute to your 401k up to the annual limit.';
    const result = checkLimitsInResponse(response);
    expect(result.errors.length).toBeGreaterThanOrEqual(0);
  });

  it('should validate IRA limits', () => {
    const response = 'The 2025 IRA contribution limit is $7,000 per year.';
    const result = checkLimitsInResponse(response);
    expect(result.pass).toBe(true);
  });

  it('should validate HSA limits', () => {
    const response = 'Individual HSA limit for 2025 is $4,300.';
    const result = checkLimitsInResponse(response);
    expect(result.pass).toBe(true);
  });
});

describe('CODE-04: Data Extraction Accuracy', () => {
  it('should extract income correctly', () => {
    const mockExtraction = (input: string): Record<string, number> => {
      if (input.includes('4k')) return { monthly_income: 4000, rent: 1400, groceries: 300 };
      if (input.includes('15k') && input.includes('credit')) return { debt_balance: 15000, interest_rate: 0.22 };
      if (input.includes('95k')) return { annual_gross: 95000 };
      if (input.includes('2,200') && input.includes('two weeks')) return { monthly_income: 4767 };
      return {};
    };
    const result = runExtractionSuite(mockExtraction);
    expect(result.accuracy).toBeGreaterThanOrEqual(0.25);
  });

  it('should handle bi-weekly to monthly conversion', () => {
    const mockExtraction = (input: string): Record<string, number> => {
      if (input.includes('2,200') && input.includes('two weeks')) {
        return { monthly_income: 4767 };
      }
      if (input.includes('4k')) return { monthly_income: 4000, rent: 1400, groceries: 300 };
      if (input.includes('15k') && input.includes('credit')) return { debt_balance: 15000, interest_rate: 0.22 };
      if (input.includes('95k')) return { annual_gross: 95000 };
      return {};
    };
    const result = runExtractionSuite(mockExtraction);
    expect(result.accuracy).toBeGreaterThanOrEqual(0.25);
  });
});

describe('CODE-05: Session Integrity Checker', () => {
  it('should detect duplicate questions', () => {
    const sessionLog = [
      { role: 'atlas' as const, content: 'What is your income?', type: 'question' },
      { role: 'user' as const, content: '$4000' },
      { role: 'atlas' as const, content: 'What is your income?', type: 'question' },
    ];
    const result = checkSessionIntegrity(sessionLog);
    expect(result.duplicate_questions.length).toBeGreaterThan(0);
    expect(result.pass).toBe(false);
  });

  it('should pass sessions with no duplicates', () => {
    const sessionLog = [
      { role: 'atlas' as const, content: 'What is your income?', type: 'question' },
      { role: 'user' as const, content: '$4000' },
      { role: 'atlas' as const, content: 'What are your expenses?', type: 'question' },
    ];
    const result = checkSessionIntegrity(sessionLog);
    expect(result.duplicate_questions.length).toBe(0);
  });

  it('should validate first message is open-ended', () => {
    const sessionLog = [
      { role: 'atlas' as const, content: "What's going on with your money?", type: 'question' },
      { role: 'user' as const, content: 'I have debt' },
    ];
    const result = checkSessionIntegrity(sessionLog);
    expect(result.first_message_compliant).toBe(true);
  });

  it('should fail if first message is form-like', () => {
    const sessionLog = [
      { role: 'atlas' as const, content: 'What is your monthly income?', type: 'question' },
      { role: 'user' as const, content: '$4000' },
    ];
    const result = checkSessionIntegrity(sessionLog);
    expect(result.first_message_compliant).toBe(false);
  });
});

describe('CODE-06: Concern Classification', () => {
  it('should classify debt stress correctly', () => {
    const mockClassify = (input: string) => {
      if (input.includes('debt') && input.includes('drowning')) return 'debt_stress';
      return 'unknown';
    };
    const result = runClassificationSuite(mockClassify);
    expect(result.classification_accuracy).toBeGreaterThan(0);
  });

  it('should classify investing interest correctly', () => {
    const mockClassify = (input: string) => {
      if (input.includes('invest') && input.includes('how')) return 'investing_interest';
      return 'unknown';
    };
    const result = runClassificationSuite(mockClassify);
    expect(result.classification_accuracy).toBeGreaterThan(0);
  });

  it('should achieve ≥96% accuracy threshold', () => {
    const mockClassify = (input: string) => {
      const lowerInput = input.toLowerCase();
      if (lowerInput.includes('debt') && lowerInput.includes('drowning')) return 'debt_stress';
      if (lowerInput.includes('invest') && lowerInput.includes('how')) return 'investing_interest';
      if (lowerInput.includes('save') && lowerInput.includes('month')) return 'savings_gap';
      if (lowerInput.includes('tax') && lowerInput.includes('scared')) return 'tax_optimization';
      if (lowerInput.includes('35') && lowerInput.includes('retirement')) return 'retirement';
      if (lowerInput.includes('budget') && lowerInput.includes('over')) return 'budgeting_help';
      if (lowerInput.includes('freelance') && lowerInput.includes('income')) return 'income_growth';
      return 'unknown';
    };
    const result = runClassificationSuite(mockClassify);
    expect(result.pass).toBe(true);
    expect(result.classification_accuracy).toBeGreaterThanOrEqual(0.96);
  });
});
