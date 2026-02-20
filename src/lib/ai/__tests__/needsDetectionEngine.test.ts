/**
 * Tests for Needs Detection Engine
 * Requirement 1: Initial Needs Assessment
 */

import { describe, it, expect } from 'vitest';
import { detectConcern, getInitialMessage, getRelevantQuestions } from '../needsDetectionEngine';

describe('Needs Detection Engine', () => {
  describe('detectConcern', () => {
    it('should detect debt stress concern', () => {
      const message = 'I have a lot of credit card debt and I\'m stressed about it';
      const result = detectConcern(message);
      expect(result.concern).toBe('debt_stress');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should detect savings gap concern', () => {
      const message = 'I don\'t have an emergency fund and I\'m worried about that';
      const result = detectConcern(message);
      expect(result.concern).toBe('savings_gap');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should detect budgeting help concern', () => {
      const message = 'I spend too much money and I can\'t control my expenses';
      const result = detectConcern(message);
      expect(result.concern).toBe('budgeting_help');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should detect investing interest concern', () => {
      const message = 'I want to start investing in stocks and build wealth';
      const result = detectConcern(message);
      expect(result.concern).toBe('investing_interest');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should detect income growth concern', () => {
      const message = 'I want to earn more money and grow my income';
      const result = detectConcern(message);
      expect(result.concern).toBe('income_growth');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should detect emergency fund concern', () => {
      const message = 'What if I lose my job? I need an emergency fund';
      const result = detectConcern(message);
      expect(result.concern).toBe('emergency_fund');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect retirement concern', () => {
      const message = 'I want to retire early and I\'m planning for FIRE';
      const result = detectConcern(message);
      expect(result.concern).toBe('retirement');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should detect tax optimization concern', () => {
      const message = 'I\'m self-employed and want to optimize my taxes';
      const result = detectConcern(message);
      expect(result.concern).toBe('tax_optimization');
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should detect expense reduction concern', () => {
      const message = 'I need to slash my spending and reduce my bills significantly';
      const result = detectConcern(message);
      expect(result.concern).toBe('expense_reduction');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should handle unknown concern gracefully', () => {
      const message = 'xyz abc 123 random text';
      const result = detectConcern(message);
      expect(result.concern).toBe('unknown');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should return keywords found in message', () => {
      const message = 'I have credit card debt and high interest rates';
      const result = detectConcern(message);
      expect(result.keywords.length).toBeGreaterThan(0);
      expect(result.keywords).toContain('debt');
    });

    it('should provide reasoning for detection', () => {
      const message = 'I\'m worried about my emergency fund';
      const result = detectConcern(message);
      expect(result.reasoning).toContain('emergency_fund');
      expect(result.reasoning).toContain('confidence');
    });
  });

  describe('getInitialMessage', () => {
    it('should return debt-specific message for debt concern', () => {
      const message = getInitialMessage('debt_stress');
      expect(message).toContain('debt');
      expect(message.length).toBeGreaterThan(20);
    });

    it('should return savings-specific message for savings concern', () => {
      const message = getInitialMessage('savings_gap');
      expect(message).toContain('sav');
      expect(message.length).toBeGreaterThan(20);
    });

    it('should return investing-specific message for investing concern', () => {
      const message = getInitialMessage('investing_interest');
      expect(message.toLowerCase()).toContain('invest');
      expect(message.length).toBeGreaterThan(20);
    });

    it('should return generic message for unknown concern', () => {
      const message = getInitialMessage('unknown');
      expect(message).toContain('money');
      expect(message.length).toBeGreaterThan(20);
    });

    it('should be conversational and open-ended', () => {
      const message = getInitialMessage('general_guidance');
      expect(message.length).toBeGreaterThan(20);
      expect(message.toLowerCase()).toContain('money');
    });
  });

  describe('getRelevantQuestions', () => {
    it('should return debt-specific questions for debt concern', () => {
      const questions = getRelevantQuestions('debt_stress');
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.some(q => q.toLowerCase().includes('debt'))).toBe(true);
    });

    it('should return savings-specific questions for savings concern', () => {
      const questions = getRelevantQuestions('savings_gap');
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.some(q => q.toLowerCase().includes('sav'))).toBe(true);
    });

    it('should return investing-specific questions for investing concern', () => {
      const questions = getRelevantQuestions('investing_interest');
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.some(q => q.toLowerCase().includes('invest'))).toBe(true);
    });

    it('should return conversational questions', () => {
      const questions = getRelevantQuestions('general_guidance');
      expect(questions.every(q => q.includes('?'))).toBe(true);
    });

    it('should prioritize income and expenses questions', () => {
      const questions = getRelevantQuestions('savings_gap');
      const questionText = questions.join(' ').toLowerCase();
      expect(questionText).toContain('income');
      expect(questionText).toMatch(/essential|expense/);
    });

    it('should return questions in logical order', () => {
      const questions = getRelevantQuestions('savings_gap');
      expect(questions.length).toBeGreaterThan(0);
      // First questions should be about current state
      expect(questions[0].toLowerCase()).toMatch(/current|have|savings/);
    });
  });
});
