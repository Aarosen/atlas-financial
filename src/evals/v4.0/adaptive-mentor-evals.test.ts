import { describe, it, expect } from 'vitest';
import type { ConversationContext } from '../../lib/ai/adaptiveConversationEngine';
import {
  detectUserSignals,
  generateAdaptiveResponse,
  generateContextualFollowUp,
} from '../../lib/ai/adaptiveConversationEngine';
import type { FinancialState } from '../../lib/state/types';

const baseFinancialState: FinancialState = {
  monthlyIncome: 0,
  essentialExpenses: 0,
  totalSavings: 0,
  highInterestDebt: 0,
  lowInterestDebt: 0,
  monthlyDebtPayments: 0,
  primaryGoal: 'stability',
  riskTolerance: 'balanced',
  timeHorizonYears: 0,
};

const buildContext = (userMessage: string, history: ConversationContext['conversationHistory'] = []): ConversationContext => ({
  userMessage,
  conversationHistory: history,
  financialState: baseFinancialState,
  turnCount: Math.max(1, history.length + 1),
  sessionDuration: 60000,
  detectedConcern: 'general_guidance',
});

describe('Adaptive Mentor Evals', () => {
  describe('Contextual follow-up selection', () => {
    it('asks for interest rate when user mentions debt', () => {
      const context = buildContext('I have credit card debt and it stresses me out');
      const signals = detectUserSignals(context);
      const followUp = generateContextualFollowUp(context, signals);
      expect(followUp.toLowerCase()).toContain('interest');
    });

    it('asks timeline when user mentions investing or retirement', () => {
      const context = buildContext('I want to invest for retirement');
      const signals = detectUserSignals(context);
      const followUp = generateContextualFollowUp(context, signals);
      expect(followUp.toLowerCase()).toContain('timeline');
    });

    it('asks for clarity when user signals confusion', () => {
      const context = buildContext("I don't understand how this works");
      const signals = detectUserSignals(context);
      const followUp = generateContextualFollowUp(context, signals);
      expect(followUp.toLowerCase()).toContain('explain');
    });

    it('asks what feels unrealistic when user resists', () => {
      const context = buildContext("That won't work for my situation");
      const signals = detectUserSignals(context);
      const followUp = generateContextualFollowUp(context, signals);
      expect(followUp.toLowerCase()).toContain('unrealistic');
    });
  });

  describe('Adaptive response flags', () => {
    it('requests a follow-up during discovery phase', () => {
      const context = buildContext('I just want to build wealth');
      const response = generateAdaptiveResponse(context);
      expect(response.shouldAskFollowUp).toBe(true);
      expect(response.followUpQuestion).toBeTruthy();
    });
  });
});
