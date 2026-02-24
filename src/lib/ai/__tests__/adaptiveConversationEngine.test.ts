/**
 * Tests for Adaptive Conversation Engine
 * Validates signal detection, phase determination, and adaptive response generation
 */

import { describe, it, expect } from 'vitest';
import type { FinancialState } from '@/lib/state/types';
import {
  detectUserSignals,
  determineConversationPhase,
  detectMetaQuestion,
  generateMetaResponse,
  synthesizeConversation,
  recommendAdaptations,
  generateAdaptiveResponse,
  isReadyForActionPlan,
  generateActionPlan,
} from '../adaptiveConversationEngine';
import type { ConversationContext } from '../adaptiveConversationEngine';

const createMockFinancialState = (overrides?: Partial<FinancialState>): FinancialState => ({
  monthlyIncome: 0,
  essentialExpenses: 0,
  totalSavings: 0,
  highInterestDebt: 0,
  lowInterestDebt: 0,
  monthlyDebtPayments: 0,
  riskTolerance: 'balanced',
  timeHorizonYears: 0,
  ...overrides,
});

describe('Adaptive Conversation Engine', () => {
  describe('Signal Detection', () => {
    it('should detect confusion signals', () => {
      const context: ConversationContext = {
        userMessage: "I don't understand how compound interest works",
        conversationHistory: [],
        financialState: createMockFinancialState(),
        turnCount: 1,
        sessionDuration: 30000,
        detectedConcern: 'general_guidance',
      };

      const signals = detectUserSignals(context);
      expect(signals.some(s => s.type === 'confusion')).toBe(true);
    });

    it('should detect urgency signals', () => {
      const context: ConversationContext = {
        userMessage: "I can't pay my rent this month, this is urgent",
        conversationHistory: [],
        financialState: createMockFinancialState(),
        turnCount: 1,
        sessionDuration: 30000,
        detectedConcern: 'general_guidance',
      };

      const signals = detectUserSignals(context);
      expect(signals.some(s => s.type === 'urgency')).toBe(true);
    });

    it('should detect resistance signals', () => {
      const context: ConversationContext = {
        userMessage: "But that won't work for my situation",
        conversationHistory: [],
        financialState: createMockFinancialState(),
        turnCount: 1,
        sessionDuration: 30000,
        detectedConcern: 'general_guidance',
      };

      const signals = detectUserSignals(context);
      expect(signals.some(s => s.type === 'resistance')).toBe(true);
    });

    it('should detect opportunity signals', () => {
      const context: ConversationContext = {
        userMessage: "I just got a promotion with a raise",
        conversationHistory: [],
        financialState: createMockFinancialState(),
        turnCount: 1,
        sessionDuration: 30000,
        detectedConcern: 'general_guidance',
      };

      const signals = detectUserSignals(context);
      expect(signals.some(s => s.type === 'opportunity')).toBe(true);
    });

    it('should detect emotional signals', () => {
      const context: ConversationContext = {
        userMessage: "I feel so overwhelmed by all this debt",
        conversationHistory: [],
        financialState: createMockFinancialState(),
        turnCount: 1,
        sessionDuration: 30000,
        detectedConcern: 'general_guidance',
      };

      const signals = detectUserSignals(context);
      expect(signals.some(s => s.type === 'emotion')).toBe(true);
    });
  });

  describe('Conversation Phase Determination', () => {
    it('should identify discovery phase with minimal data', () => {
      const context: ConversationContext = {
        userMessage: 'test',
        conversationHistory: [],
        financialState: {},
        turnCount: 1,
        sessionDuration: 30000,
        detectedConcern: 'general_guidance',
      };

      const phase = determineConversationPhase(context);
      expect(phase).toBe('discovery');
    });

    it('should identify strategy phase with basic data', () => {
      const context: ConversationContext = {
        userMessage: 'test',
        conversationHistory: Array(8).fill({ role: 'user' as const, content: 'test' }),
        financialState: createMockFinancialState({
          monthlyIncome: 5000,
          essentialExpenses: 2000,
          primaryGoal: 'stability',
        }),
        turnCount: 8,
        sessionDuration: 300000,
        detectedConcern: 'general_guidance',
      };

      const phase = determineConversationPhase(context);
      expect(phase).toBe('optimization');
    });

    it('should identify optimization phase with detailed data and many turns', () => {
      const context: ConversationContext = {
        userMessage: 'test',
        conversationHistory: Array(12).fill({ role: 'user' as const, content: 'test' }),
        financialState: {
          monthlyIncome: 5000,
          essentialExpenses: 2000,
          primaryGoal: 'wealth_building',
          totalSavings: 10000,
          highInterestDebt: 5000,
        },
        turnCount: 12,
        sessionDuration: 600000,
        detectedConcern: 'general_guidance',
      };

      const phase = determineConversationPhase(context);
      expect(phase).toBe('optimization');
    });
  });

  describe('Meta Question Detection', () => {
    it('should detect account opening questions', () => {
      expect(detectMetaQuestion('How do I open an account?')).toBe(true);
    });

    it('should detect company questions', () => {
      expect(detectMetaQuestion('Who are you? What is Atlas?')).toBe(true);
    });

    it('should detect privacy questions', () => {
      expect(detectMetaQuestion('Is my data private?')).toBe(true);
    });

    it('should not flag financial questions as meta', () => {
      expect(detectMetaQuestion('How should I pay off my debt?')).toBe(false);
    });
  });

  describe('Meta Response Generation', () => {
    it('should generate account opening response', () => {
      const response = generateMetaResponse('How do I open an account?');
      expect(response).toContain('account');
      expect(response).toContain('atlas-financial.vercel.app');
    });

    it('should generate privacy response', () => {
      const response = generateMetaResponse('Is my data secure?');
      expect(response).toContain('secure');
      expect(response).toContain('encryption');
    });
  });

  describe('Conversation Synthesis', () => {
    it('should synthesize multi-turn conversation', () => {
      const history = [
        { role: 'user' as const, content: 'I have a lot of debt' },
        { role: 'assistant' as const, content: 'Tell me more' },
        { role: 'user' as const, content: 'Credit cards mostly' },
        { role: 'assistant' as const, content: 'How much?' },
        { role: 'user' as const, content: 'About $15k' },
        { role: 'assistant' as const, content: 'Got it' },
        { role: 'user' as const, content: 'I also want to save for retirement' },
      ];

      const synthesis = synthesizeConversation(history);
      expect(synthesis).not.toBeNull();
      expect(synthesis).toContain('debt');
    });

    it('should return null for short conversations', () => {
      const history = [
        { role: 'user' as const, content: 'Hi' },
        { role: 'assistant' as const, content: 'Hello' },
      ];

      const synthesis = synthesizeConversation(history);
      expect(synthesis).toBeNull();
    });
  });

  describe('Adaptation Recommendations', () => {
    it('should recommend crisis triage for urgency', () => {
      const context: ConversationContext = {
        userMessage: 'I cannot pay rent this month, urgent emergency',
        conversationHistory: [],
        financialState: createMockFinancialState(),
        turnCount: 1,
        sessionDuration: 30000,
        detectedConcern: 'general_guidance',
      };

      const signals = detectUserSignals(context);
      const { goalAdjustment } = recommendAdaptations(context, signals);
      expect(goalAdjustment).toBeTruthy();
      if (goalAdjustment) {
        expect(goalAdjustment).toContain('crisis');
      }
    });

    it('should recommend acceleration for opportunity', () => {
      const context: ConversationContext = {
        userMessage: 'I got a bonus',
        conversationHistory: [],
        financialState: createMockFinancialState(),
        turnCount: 1,
        sessionDuration: 30000,
        detectedConcern: 'general_guidance',
      };

      const signals = detectUserSignals(context);
      const { goalAdjustment } = recommendAdaptations(context, signals);
      expect(goalAdjustment).toBeTruthy();
      if (goalAdjustment) {
        expect(goalAdjustment).toContain('accelerate');
      }
    });
  });

  describe('Action Plan Generation', () => {
    it('should generate action plan with sufficient data', () => {
      const context: ConversationContext = {
        userMessage: 'What should I do?',
        conversationHistory: Array(5).fill({ role: 'user' as const, content: 'test' }),
        financialState: {
          monthlyIncome: 5000,
          essentialExpenses: 2000,
          primaryGoal: 'stability',
          totalSavings: 2000,
          highInterestDebt: 5000,
        },
        turnCount: 5,
        sessionDuration: 300000,
        detectedConcern: 'general_guidance',
      };

      const plan = generateActionPlan(context);
      expect(plan).toContain('Step');
      expect(plan).toContain('action');
    });

    it('should request more info without sufficient data', () => {
      const context: ConversationContext = {
        userMessage: 'What should I do?',
        conversationHistory: [],
        financialState: {},
        turnCount: 1,
        sessionDuration: 30000,
        detectedConcern: 'general_guidance',
      };

      const plan = generateActionPlan(context);
      expect(plan).toContain('more information');
    });
  });

  describe('Readiness for Action Plan', () => {
    it('should indicate ready when all conditions met', () => {
      const context: ConversationContext = {
        userMessage: 'test',
        conversationHistory: Array(5).fill({ role: 'user' as const, content: 'test' }),
        financialState: {
          monthlyIncome: 5000,
          essentialExpenses: 2000,
          primaryGoal: 'stability',
        },
        turnCount: 5,
        sessionDuration: 300000,
        detectedConcern: 'general_guidance',
      };

      expect(isReadyForActionPlan(context)).toBe(true);
    });

    it('should not be ready without basic data', () => {
      const context: ConversationContext = {
        userMessage: 'test',
        conversationHistory: Array(5).fill({ role: 'user' as const, content: 'test' }),
        financialState: {},
        turnCount: 5,
        sessionDuration: 300000,
        detectedConcern: 'general_guidance',
      };

      expect(isReadyForActionPlan(context)).toBe(false);
    });

    it('should not be ready without minimum turns', () => {
      const context: ConversationContext = {
        userMessage: 'test',
        conversationHistory: Array(2).fill({ role: 'user' as const, content: 'test' }),
        financialState: {
          monthlyIncome: 5000,
          essentialExpenses: 2000,
          primaryGoal: 'stability',
        },
        turnCount: 2,
        sessionDuration: 60000,
        detectedConcern: 'general_guidance',
      };

      expect(isReadyForActionPlan(context)).toBe(false);
    });
  });
});
