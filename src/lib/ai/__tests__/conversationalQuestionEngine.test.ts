/**
 * Tests for Conversational Question Engine
 * Ensures questions feel natural, adaptive, and conversational
 */

import { describe, it, expect } from 'vitest';
import {
  generateConversationalQuestions,
  getQuestionVariation,
  getFollowUpVariation,
  getNextConversationalQuestion,
  hasEnoughConversationalData,
} from '../conversationalQuestionEngine';

describe('Conversational Question Engine', () => {
  describe('generateConversationalQuestions', () => {
    it('should generate conversational questions for debt concern', () => {
      const questions = generateConversationalQuestions('debt_stress');
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.every(q => q.id && q.variations && q.category)).toBe(true);
    });

    it('should have multiple variations for each question', () => {
      const questions = generateConversationalQuestions('savings_gap');
      expect(questions.every(q => q.variations.length >= 3)).toBe(true);
    });

    it('should have natural language variations', () => {
      const questions = generateConversationalQuestions('budgeting_help');
      const firstQuestion = questions[0];
      expect(firstQuestion.variations.every(v => v.includes('?'))).toBe(true);
    });

    it('should include follow-up variations where appropriate', () => {
      const questions = generateConversationalQuestions('debt_stress');
      const withFollowUp = questions.filter(q => q.followUpVariations);
      expect(withFollowUp.length).toBeGreaterThan(0);
    });

    it('should specify expected format for each question', () => {
      const questions = generateConversationalQuestions('investing_interest');
      expect(questions.every(q => q.expectedFormat)).toBe(true);
    });

    it('should prioritize questions by relevance', () => {
      const questions = generateConversationalQuestions('debt_stress');
      const priorities = questions.map(q => q.priority);
      expect(priorities[0]).toBeGreaterThanOrEqual(8);
    });

    it('should have unique question IDs', () => {
      const questions = generateConversationalQuestions('general_guidance');
      const ids = questions.map(q => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should work for all concern types', () => {
      const concerns = [
        'debt_stress',
        'savings_gap',
        'budgeting_help',
        'investing_interest',
        'income_growth',
        'emergency_fund',
        'retirement',
        'tax_optimization',
        'expense_reduction',
        'general_guidance',
        'unknown',
      ] as const;

      for (const concern of concerns) {
        const questions = generateConversationalQuestions(concern);
        expect(questions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getQuestionVariation', () => {
    it('should return one of the available variations', () => {
      const questions = generateConversationalQuestions('debt_stress');
      const question = questions[0];
      const variation = getQuestionVariation(question);
      expect(question.variations).toContain(variation);
    });

    it('should return different variations on multiple calls', () => {
      const questions = generateConversationalQuestions('savings_gap');
      const question = questions[0];
      const variations = new Set<string>();

      for (let i = 0; i < 20; i++) {
        variations.add(getQuestionVariation(question));
      }

      expect(variations.size).toBeGreaterThan(1);
    });

    it('should feel natural and conversational', () => {
      const questions = generateConversationalQuestions('budgeting_help');
      const variation = getQuestionVariation(questions[0]);
      expect(variation.includes('?')).toBe(true);
      expect(variation.length).toBeGreaterThan(5);
    });
  });

  describe('getFollowUpVariation', () => {
    it('should return follow-up if available', () => {
      const questions = generateConversationalQuestions('debt_stress');
      const questionWithFollowUp = questions.find(q => q.followUpVariations);
      if (questionWithFollowUp) {
        const followUp = getFollowUpVariation(questionWithFollowUp);
        expect(followUp).toBeTruthy();
        expect(questionWithFollowUp.followUpVariations).toContain(followUp);
      }
    });

    it('should return undefined if no follow-up available', () => {
      const questions = generateConversationalQuestions('general_guidance');
      const questionWithoutFollowUp = questions.find(q => !q.followUpVariations);
      if (questionWithoutFollowUp) {
        const followUp = getFollowUpVariation(questionWithoutFollowUp);
        expect(followUp).toBeUndefined();
      }
    });
  });

  describe('getNextConversationalQuestion', () => {
    it('should return first unanswered question', () => {
      const answered = new Set<string>();
      const question = getNextConversationalQuestion('debt_stress', answered);
      expect(question).not.toBeNull();
      expect(question?.id).toBe('debt_type');
    });

    it('should skip answered questions', () => {
      const answered = new Set(['debt_type', 'debt_total']);
      const question = getNextConversationalQuestion('debt_stress', answered);
      expect(question?.id).not.toBe('debt_type');
      expect(question?.id).not.toBe('debt_total');
    });

    it('should return null when all questions answered', () => {
      const questions = generateConversationalQuestions('debt_stress');
      const answered = new Set(questions.map(q => q.id));
      const question = getNextConversationalQuestion('debt_stress', answered);
      expect(question).toBeNull();
    });

    it('should return questions in priority order', () => {
      const answered = new Set<string>();
      const q1 = getNextConversationalQuestion('savings_gap', answered);
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
        const question = getNextConversationalQuestion(concern, new Set());
        expect(question).not.toBeNull();
        expect(question?.variations).toBeTruthy();
      }
    });
  });

  describe('hasEnoughConversationalData', () => {
    it('should return false when no questions answered', () => {
      const answered = new Set<string>();
      const result = hasEnoughConversationalData('debt_stress', answered);
      expect(result).toBe(false);
    });

    it('should return true when required questions answered for debt', () => {
      const answered = new Set([
        'debt_type',
        'debt_total',
        'monthly_income',
        'essential_expenses',
      ]);
      const result = hasEnoughConversationalData('debt_stress', answered);
      expect(result).toBe(true);
    });

    it('should return true when required questions answered for savings', () => {
      const answered = new Set([
        'current_savings',
        'monthly_income',
        'essential_expenses',
      ]);
      const result = hasEnoughConversationalData('savings_gap', answered);
      expect(result).toBe(true);
    });

    it('should return false when only some required questions answered', () => {
      const answered = new Set(['debt_type', 'debt_total']);
      const result = hasEnoughConversationalData('debt_stress', answered);
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
        const result = hasEnoughConversationalData(concern, new Set());
        expect(typeof result).toBe('boolean');
      }
    });

    it('should require different data for different concerns', () => {
      const debtAnswered = new Set(['debt_type', 'debt_total', 'monthly_income', 'essential_expenses']);
      const savingsAnswered = new Set(['current_savings', 'monthly_income', 'essential_expenses']);

      expect(hasEnoughConversationalData('debt_stress', debtAnswered)).toBe(true);
      expect(hasEnoughConversationalData('savings_gap', debtAnswered)).toBe(false);
      expect(hasEnoughConversationalData('savings_gap', savingsAnswered)).toBe(true);
    });
  });

  describe('Natural conversation flow', () => {
    it('should never explain why a question is being asked', () => {
      const concerns = [
        'debt_stress',
        'savings_gap',
        'budgeting_help',
        'investing_interest',
        'income_growth',
      ] as const;

      for (const concern of concerns) {
        const questions = generateConversationalQuestions(concern);
        for (const question of questions) {
          for (const variation of question.variations) {
            expect(variation).not.toMatch(/this sets|this helps|this matters|this is important/i);
            expect(variation).not.toMatch(/so that|in order to|because/i);
          }
        }
      }
    });

    it('should feel like a friend asking, not a form', () => {
      const questions = generateConversationalQuestions('general_guidance');
      const variations = questions.flatMap(q => q.variations);
      
      expect(variations.some(v => v.includes('you'))).toBe(true);
      expect(variations.some(v => v.includes('your'))).toBe(true);
      expect(variations.some(v => v.includes("?"))).toBe(true);
    });

    it('should have conversational follow-ups', () => {
      const questions = generateConversationalQuestions('debt_stress');
      const withFollowUp = questions.filter(q => q.followUpVariations);
      
      for (const question of withFollowUp) {
        for (const followUp of question.followUpVariations || []) {
          expect(followUp.length).toBeGreaterThan(3);
          expect(followUp.includes('?')).toBe(true);
        }
      }
    });
  });
});
