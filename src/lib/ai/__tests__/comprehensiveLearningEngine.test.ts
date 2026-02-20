/**
 * Tests for Comprehensive Learning Engine
 * Requirement 5: Comprehensive Learning from Everything
 */

import { describe, it, expect } from 'vitest';
import {
  extractExplicitLearning,
  extractImplicitLearning,
  extractBehavioralLearning,
  extractPreferenceLearning,
  extractPriorityLearning,
  extractPatternLearning,
  extractDisagreementLearning,
  extractTemporalLearning,
  extractEmotionalLearning,
  extractSocialLearning,
  buildCustomerProfile,
  getLearningsSummary,
  explainLearnings,
  shouldConfirmLearning,
  updateLearningConfidence,
} from '../comprehensiveLearningEngine';

describe('Comprehensive Learning Engine', () => {
  describe('extractExplicitLearning', () => {
    it('should extract explicit learning from customer statement', () => {
      const learning = extractExplicitLearning('I have $20k in credit card debt', 'debt_amount');
      expect(learning.category).toBe('explicit');
      expect(learning.topic).toBe('debt_amount');
      expect(learning.confidence).toBeGreaterThan(0.9);
    });

    it('should mark explicit learning as high confidence', () => {
      const learning = extractExplicitLearning('My income is $4000/month', 'monthly_income');
      expect(learning.confidence).toBeGreaterThan(0.9);
    });

    it('should store original message as value', () => {
      const message = 'I want to invest in stocks';
      const learning = extractExplicitLearning(message, 'investment_interest');
      expect(learning.value).toBe(message);
    });
  });

  describe('extractImplicitLearning', () => {
    it('should detect anxiety from language', () => {
      const learnings = extractImplicitLearning('I\'m really worried and stressed about my debt');
      const anxietyLearning = learnings.find(l => l.topic === 'emotional_state');
      expect(anxietyLearning).toBeDefined();
      expect(anxietyLearning?.value).toBe('anxious');
    });

    it('should detect low confidence from language', () => {
      const learnings = extractImplicitLearning('I\'m not sure what to do, I\'m confused');
      const confidenceLearning = learnings.find(l => l.topic === 'confidence_level');
      expect(confidenceLearning).toBeDefined();
      expect(confidenceLearning?.value).toBe('low');
    });

    it('should detect enthusiasm from language', () => {
      const learnings = extractImplicitLearning('I\'m excited and ready to start investing!');
      const enthusiasmLearning = learnings.find(l => l.topic === 'enthusiasm_level');
      expect(enthusiasmLearning).toBeDefined();
      expect(enthusiasmLearning?.value).toBe('high');
    });

    it('should detect conflicting priorities', () => {
      const learnings = extractImplicitLearning('I want to pay off debt but also build savings');
      const hesitationLearning = learnings.find(l => l.topic === 'hesitation');
      expect(hesitationLearning).toBeDefined();
      expect(hesitationLearning?.value).toBe('conflicting_priorities');
    });

    it('should return multiple learnings from single message', () => {
      const learnings = extractImplicitLearning('I\'m worried but excited about investing');
      expect(learnings.length).toBeGreaterThan(1);
    });

    it('should mark implicit learning with lower confidence', () => {
      const learnings = extractImplicitLearning('I think I might be ready');
      expect(learnings.every(l => l.confidence < 0.9)).toBe(true);
    });
  });

  describe('extractBehavioralLearning', () => {
    it('should track accepted suggestions', () => {
      const learning = extractBehavioralLearning('accepted_suggestion', 'Accepted debt payoff plan');
      expect(learning.category).toBe('behavioral');
      expect(learning.topic).toBe('accepted_suggestion');
      expect(learning.confidence).toBeGreaterThan(0.85);
    });

    it('should track rejected suggestions', () => {
      const learning = extractBehavioralLearning('rejected_suggestion', 'Rejected aggressive savings plan');
      expect(learning.topic).toBe('rejected_suggestion');
    });

    it('should track actions taken', () => {
      const learning = extractBehavioralLearning('took_action', 'Set up auto-transfer to savings');
      expect(learning.topic).toBe('took_action');
    });

    it('should mark behavioral learning as high confidence', () => {
      const learning = extractBehavioralLearning('took_action', 'Paid off $1000 in debt');
      expect(learning.confidence).toBeGreaterThan(0.85);
    });
  });

  describe('extractPreferenceLearning', () => {
    it('should extract communication style preference', () => {
      const learning = extractPreferenceLearning('communication_style', 'short_and_direct');
      expect(learning.category).toBe('preference');
      expect(learning.topic).toBe('communication_style');
      expect(learning.value).toBe('short_and_direct');
    });

    it('should extract response length preference', () => {
      const learning = extractPreferenceLearning('response_length', 'detailed');
      expect(learning.topic).toBe('response_length');
    });

    it('should extract data preference', () => {
      const learning = extractPreferenceLearning('data_preference', 'visual_charts');
      expect(learning.topic).toBe('data_preference');
    });

    it('should mark preferences with medium confidence', () => {
      const learning = extractPreferenceLearning('communication_style', 'formal');
      expect(learning.confidence).toBeCloseTo(0.7, 0.1);
    });
  });

  describe('extractPriorityLearning', () => {
    it('should extract primary priority', () => {
      const learning = extractPriorityLearning('debt_elimination', 'primary');
      expect(learning.category).toBe('priority');
      expect(learning.value).toBe('primary');
    });

    it('should extract secondary priority', () => {
      const learning = extractPriorityLearning('emergency_fund', 'secondary');
      expect(learning.value).toBe('secondary');
    });

    it('should extract tertiary priority', () => {
      const learning = extractPriorityLearning('investing', 'tertiary');
      expect(learning.value).toBe('tertiary');
    });

    it('should mark priorities with high confidence', () => {
      const learning = extractPriorityLearning('savings', 'primary');
      expect(learning.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('extractPatternLearning', () => {
    it('should extract recurring pattern', () => {
      const learning = extractPatternLearning('overspending_on_dining', 3);
      expect(learning.category).toBe('pattern');
      expect(learning.topic).toBe('recurring_theme');
    });

    it('should increase confidence with frequency', () => {
      const learning1 = extractPatternLearning('pattern', 1);
      const learning2 = extractPatternLearning('pattern', 5);
      expect(learning2.confidence).toBeGreaterThan(learning1.confidence);
    });

    it('should cap confidence at 1.0', () => {
      const learning = extractPatternLearning('pattern', 100);
      expect(learning.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('extractDisagreementLearning', () => {
    it('should track prediction mismatches', () => {
      const learning = extractDisagreementLearning('debt_focus', 'investing_focus');
      expect(learning.category).toBe('disagreement');
      expect(learning.value.predicted).toBe('debt_focus');
      expect(learning.value.actual).toBe('investing_focus');
    });

    it('should mark disagreements as high confidence', () => {
      const learning = extractDisagreementLearning('prediction', 'reality');
      expect(learning.confidence).toBeGreaterThan(0.9);
    });

    it('should note that customer corrected us', () => {
      const learning = extractDisagreementLearning('prediction', 'reality');
      expect(learning.notes).toContain('corrected');
    });
  });

  describe('extractTemporalLearning', () => {
    it('should track metric changes over time', () => {
      const learning = extractTemporalLearning('savings_amount', 1000, 1500);
      expect(learning.category).toBe('temporal');
      expect(learning.value.previous).toBe(1000);
      expect(learning.value.current).toBe(1500);
      expect(learning.value.change).toBe(500);
    });

    it('should work for negative changes', () => {
      const learning = extractTemporalLearning('debt_amount', 5000, 4000);
      expect(learning.value.change).toBe(-1000);
    });
  });

  describe('extractEmotionalLearning', () => {
    it('should capture emotional state', () => {
      const learning = extractEmotionalLearning('anxious', 'Customer worried about debt');
      expect(learning.category).toBe('emotional');
      expect(learning.value).toBe('anxious');
    });

    it('should include context', () => {
      const context = 'Expressed stress about job loss';
      const learning = extractEmotionalLearning('overwhelmed', context);
      expect(learning.notes).toBe(context);
    });

    it('should support multiple emotional states', () => {
      const states = ['anxious', 'confident', 'overwhelmed', 'excited', 'frustrated', 'hopeful'];
      for (const state of states) {
        const learning = extractEmotionalLearning(state as any, 'test');
        expect(learning.value).toBe(state);
      }
    });
  });

  describe('extractSocialLearning', () => {
    it('should extract family situation', () => {
      const learning = extractSocialLearning('family_situation', 'Supporting 2 kids');
      expect(learning.category).toBe('social');
      expect(learning.topic).toBe('family_situation');
    });

    it('should extract support system', () => {
      const learning = extractSocialLearning('support_system', 'Has financial advisor');
      expect(learning.topic).toBe('support_system');
    });

    it('should extract influences', () => {
      const learning = extractSocialLearning('influences', 'Influenced by parents\' financial habits');
      expect(learning.topic).toBe('influences');
    });

    it('should extract responsibilities', () => {
      const learning = extractSocialLearning('responsibilities', 'Responsible for aging parents');
      expect(learning.topic).toBe('responsibilities');
    });
  });

  describe('buildCustomerProfile', () => {
    it('should create profile with learnings', () => {
      const learnings = [
        extractExplicitLearning('I have debt', 'concern'),
        extractEmotionalLearning('anxious', 'stressed'),
      ];
      const profile = buildCustomerProfile('customer123', learnings);
      expect(profile.customerId).toBe('customer123');
      expect(profile.learnings.length).toBe(2);
    });

    it('should calculate average confidence score', () => {
      const learnings = [
        { ...extractExplicitLearning('msg', 'topic'), confidence: 0.9 },
        { ...extractImplicitLearning('msg'), confidence: 0.7 },
      ];
      const profile = buildCustomerProfile('customer123', learnings);
      expect(profile.confidenceScore).toBeCloseTo(0.8, 0.1);
    });

    it('should set lastUpdated timestamp', () => {
      const learnings = [extractExplicitLearning('msg', 'topic')];
      const profile = buildCustomerProfile('customer123', learnings);
      expect(profile.lastUpdated).toBeGreaterThan(0);
    });
  });

  describe('getLearningsSummary', () => {
    it('should organize learnings by category', () => {
      const learnings = [
        extractExplicitLearning('I have debt', 'debt'),
        extractEmotionalLearning('anxious', 'stressed'),
      ];
      const profile = buildCustomerProfile('customer123', learnings);
      const summary = getLearningsSummary(profile);
      expect(summary.explicit.length).toBe(1);
      expect(summary.emotional.length).toBe(1);
    });

    it('should include all learning categories', () => {
      const profile = buildCustomerProfile('customer123', []);
      const summary = getLearningsSummary(profile);
      expect(Object.keys(summary).length).toBe(10);
    });
  });

  describe('explainLearnings', () => {
    it('should generate human-readable explanation', () => {
      const learnings = [
        extractExplicitLearning('I want to invest', 'goal'),
        extractPriorityLearning('investing', 'primary'),
        extractEmotionalLearning('excited', 'about investing'),
      ];
      const profile = buildCustomerProfile('customer123', learnings);
      const explanation = explainLearnings(profile);
      expect(explanation.length).toBeGreaterThan(0);
      expect(explanation).toContain('told me');
    });

    it('should include priorities if available', () => {
      const learnings = [extractPriorityLearning('debt', 'primary')];
      const profile = buildCustomerProfile('customer123', learnings);
      const explanation = explainLearnings(profile);
      expect(explanation).toContain('matter');
    });
  });

  describe('shouldConfirmLearning', () => {
    it('should request confirmation for low confidence learning', () => {
      const learnings = extractImplicitLearning('maybe I\'m ready');
      const shouldConfirm = learnings.some(l => shouldConfirmLearning(l));
      expect(shouldConfirm).toBe(true);
    });

    it('should not request confirmation for high confidence learning', () => {
      const learning = extractExplicitLearning('I have $5000 saved', 'savings');
      expect(shouldConfirmLearning(learning)).toBe(false);
    });
  });

  describe('updateLearningConfidence', () => {
    it('should increase confidence when correct', () => {
      const learnings = extractImplicitLearning('maybe anxious');
      const updated = updateLearningConfidence(learnings[0], 'correct');
      expect(updated.confidence).toBeGreaterThan(learnings[0].confidence);
    });

    it('should decrease confidence when incorrect', () => {
      const learnings = extractImplicitLearning('maybe anxious');
      const updated = updateLearningConfidence(learnings[0], 'incorrect');
      expect(updated.confidence).toBeLessThan(learnings[0].confidence);
    });

    it('should slightly increase confidence when partial', () => {
      const learnings = extractImplicitLearning('maybe anxious');
      const updated = updateLearningConfidence(learnings[0], 'partial');
      expect(updated.confidence).toBeGreaterThanOrEqual(learnings[0].confidence);
    });

    it('should keep confidence between 0 and 1', () => {
      const learning = extractExplicitLearning('msg', 'topic');
      const updated = updateLearningConfidence(learning, 'incorrect');
      expect(updated.confidence).toBeGreaterThanOrEqual(0);
      expect(updated.confidence).toBeLessThanOrEqual(1);
    });
  });
});
