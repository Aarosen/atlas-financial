/**
 * Tests for Adaptive Question Engine
 * Requirement 2: Adaptive Question Generation
 */

import { describe, it, expect } from 'vitest';
import {
  generateQuestionsForConcern,
  getNextQuestion,
  hasEnoughData,
} from '../adaptiveQuestionEngine';

describe('Adaptive Question Engine', () => {
  describe('generateQuestionsForConcern', () => {
    it('should generate questions for debt concern', () => {
      const questions = generateQuestionsForConcern('debt_stress');
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.every(q => q.id && q.text && q.category)).toBe(true);
    });

    it('should generate questions for savings concern', () => {
      const questions = generateQuestionsForConcern('savings_gap');
      expect(questions.length).toBeGreaterThan(0);
      expect(questions[0].priority).toBeGreaterThanOrEqual(8);
    });

    it('should generate questions for budgeting concern', () => {
      const questions = generateQuestionsForConcern('budgeting_help');
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.some(q => q.text.toLowerCase().includes('spending'))).toBe(true);
    });

    it('should generate questions for investing concern', () => {
      const questions = generateQuestionsForConcern('investing_interest');
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.some(q => q.text.toLowerCase().includes('risk'))).toBe(true);
    });

    it('should include follow-up questions where appropriate', () => {
      const questions = generateQuestionsForConcern('debt_stress');
      const withFollowUp = questions.filter(q => q.followUp);
      expect(withFollowUp.length).toBeGreaterThan(0);
    });

    it('should specify expected format for each question', () => {
      const questions = generateQuestionsForConcern('savings_gap');
      expect(questions.every(q => q.expectedFormat)).toBe(true);
    });

    it('should prioritize questions by relevance', () => {
      const questions = generateQuestionsForConcern('debt_stress');
      const priorities = questions.map(q => q.priority);
      // First question should have high priority
      expect(priorities[0]).toBeGreaterThanOrEqual(8);
    });

    it('should have unique question IDs', () => {
      const questions = generateQuestionsForConcern('general_guidance');
      const ids = questions.map(q => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should be conversational, not form-like', () => {
      const questions = generateQuestionsForConcern('savings_gap');
      expect(questions.every(q => q.text.includes('?'))).toBe(true);
      expect(questions.some(q => q.text.includes('you') || q.text.includes('your'))).toBe(true);
    });
  });

  describe('getNextQuestion', () => {
    it('should return first unanswered question', () => {
      const answered = new Set<string>();
      const question = getNextQuestion('debt_stress', answered);
      expect(question).not.toBeNull();
      expect(question?.id).toBe('debt_type');
    });

    it('should skip answered questions', () => {
      const answered = new Set(['debt_type', 'debt_total']);
      const question = getNextQuestion('debt_stress', answered);
      expect(question?.id).not.toBe('debt_type');
      expect(question?.id).not.toBe('debt_total');
    });

    it('should return null when all questions answered', () => {
      const questions = generateQuestionsForConcern('debt_stress');
      const answered = new Set(questions.map(q => q.id));
      const question = getNextQuestion('debt_stress', answered);
      expect(question).toBeNull();
    });

    it('should return questions in priority order', () => {
      const answered = new Set<string>();
      const q1 = getNextQuestion('savings_gap', answered);
      expect(q1?.priority).toBeGreaterThanOrEqual(8);
    });

    it('should work for all concern types', () => {
      const concerns = [
        'debt_stress',
        'savings_gap',
        'budgeting_help',
        'investing_interest',
        'income_growth',
      ] as const;

      for (const concern of concerns) {
        const question = getNextQuestion(concern, new Set());
        expect(question).not.toBeNull();
        expect(question?.text).toBeTruthy();
      }
    });
  });

  describe('hasEnoughData', () => {
    it('should return false when no questions answered', () => {
      const answered = new Set<string>();
      const result = hasEnoughData('debt_stress', answered);
      expect(result).toBe(false);
    });

    it('should return true when required questions answered for debt', () => {
      const answered = new Set([
        'debt_type',
        'debt_total',
        'monthly_income',
        'essential_expenses',
      ]);
      const result = hasEnoughData('debt_stress', answered);
      expect(result).toBe(true);
    });

    it('should return true when required questions answered for savings', () => {
      const answered = new Set([
        'current_savings',
        'monthly_income',
        'essential_expenses',
      ]);
      const result = hasEnoughData('savings_gap', answered);
      expect(result).toBe(true);
    });

    it('should return false when only some required questions answered', () => {
      const answered = new Set(['debt_type', 'debt_total']);
      const result = hasEnoughData('debt_stress', answered);
      expect(result).toBe(false);
    });

    it('should work for all concern types', () => {
      const concerns = [
        'debt_stress',
        'savings_gap',
        'budgeting_help',
        'investing_interest',
        'income_growth',
      ] as const;

      for (const concern of concerns) {
        const result = hasEnoughData(concern, new Set());
        expect(typeof result).toBe('boolean');
      }
    });

    it('should require different data for different concerns', () => {
      const debtAnswered = new Set(['debt_type', 'debt_total', 'monthly_income', 'essential_expenses']);
      const savingsAnswered = new Set(['current_savings', 'monthly_income', 'essential_expenses']);

      expect(hasEnoughData('debt_stress', debtAnswered)).toBe(true);
      expect(hasEnoughData('savings_gap', debtAnswered)).toBe(false);
      expect(hasEnoughData('savings_gap', savingsAnswered)).toBe(true);
    });
  });
});
