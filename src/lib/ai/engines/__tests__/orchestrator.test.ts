/**
 * ATLAS ENGINE ORCHESTRATOR TESTS
 * 
 * Integration tests for the complete orchestration flow
 */

import { atlasEngineOrchestrator } from '../index';
import type { ExtractedFinancialData } from '../types';

describe('AtlasEngineOrchestrator', () => {
  describe('Complete Orchestration Flow', () => {
    it('should orchestrate financial scenario with proper extraction', () => {
      const result = atlasEngineOrchestrator.orchestrate(
        'I make $3000 per month, spend $1500 on essentials, and have $1000 saved',
        [],
        [],
        'free'
      );

      expect(result.decision).toBeDefined();
      expect(result.crisis.detected).toBe(false);
      expect(result.compliance.detected).toBe(false);
      expect(result.template).toBeDefined();
      expect(result.routing).toBeDefined();
      expect(result.metrics).toBeDefined();
    });

    it('should orchestrate debt payoff scenario', () => {
      const result = atlasEngineOrchestrator.orchestrate(
        'I make $5000 per month, spend $2000 on essentials, have $6000 saved, and $5000 in credit card debt at 18% APR',
        [],
        [],
        'free'
      );

      expect(result.decision).toBeDefined();
      expect(result.crisis.detected).toBe(false);
      expect(result.compliance.detected).toBe(false);
    });

    it('should detect crisis and return early', () => {
      const result = atlasEngineOrchestrator.orchestrate(
        'I am homeless and have no money',
        [],
        [],
        'free'
      );

      expect(result.crisis.detected).toBe(true);
      expect(result.crisis.severity).toBe('critical');
      expect(result.routing.selectedProvider).toBe('claude');
    });

    it('should detect compliance risk and return early', () => {
      const result = atlasEngineOrchestrator.orchestrate(
        'Should I buy Bitcoin?',
        [],
        [],
        'free'
      );

      expect(result.compliance.detected).toBe(true);
      expect(result.compliance.severity).toBe('critical');
    });
  });

  describe('Provider Selection', () => {
    it('should select appropriate provider for free tier', () => {
      const result = atlasEngineOrchestrator.orchestrate(
        'I have $3000 income and $1500 expenses',
        [],
        [],
        'free'
      );

      expect(result.routing.selectedProvider).toBeDefined();
      expect(['claude', 'openai', 'gemini', 'together']).toContain(result.routing.selectedProvider);
    });

    it('should select appropriate provider for pro tier', () => {
      const result = atlasEngineOrchestrator.orchestrate(
        'I have $3000 income and $1500 expenses',
        [],
        [],
        'pro'
      );

      expect(result.routing.selectedProvider).toBeDefined();
    });

    it('should select appropriate provider for enterprise tier', () => {
      const result = atlasEngineOrchestrator.orchestrate(
        'I have $3000 income and $1500 expenses',
        [],
        [],
        'enterprise'
      );

      expect(result.routing.selectedProvider).toBeDefined();
    });

    it('should provide fallback chain', () => {
      const result = atlasEngineOrchestrator.orchestrate(
        'I have $3000 income and $1500 expenses',
        [],
        [],
        'free'
      );

      expect(result.routing.fallbackChain).toBeDefined();
      expect(result.routing.fallbackChain.length).toBeGreaterThan(0);
    });
  });

  describe('Context Blocks', () => {
    it('should build context blocks', () => {
      const result = atlasEngineOrchestrator.orchestrate(
        'I have $3000 income, $1500 expenses, and $1000 saved',
        [],
        [],
        'free'
      );

      expect(result.contextBlocks).toBeDefined();
      expect(result.contextBlocks.length).toBeGreaterThan(0);
    });

    it('should include session state block', () => {
      const result = atlasEngineOrchestrator.orchestrate(
        'I have $3000 income, $1500 expenses, and $1000 saved',
        [],
        [],
        'free'
      );

      const sessionBlock = result.contextBlocks.find(b => b.name === 'SESSION_STATE');
      expect(sessionBlock).toBeDefined();
    });

    it('should include financial knowledge block', () => {
      const result = atlasEngineOrchestrator.orchestrate(
        'I have $3000 income, $1500 expenses, and $1000 saved',
        [],
        [],
        'free'
      );

      const knowledgeBlock = result.contextBlocks.find(b => b.name === 'FINANCIAL_KNOWLEDGE');
      expect(knowledgeBlock).toBeDefined();
    });
  });

  describe('Response Template', () => {
    it('should build response template', () => {
      const result = atlasEngineOrchestrator.orchestrate(
        'I have $3000 income, $1500 expenses, and $1000 saved',
        [],
        [],
        'free'
      );

      expect(result.template).toBeDefined();
      expect(result.template.structure).toBeDefined();
      expect(result.template.constraints).toBeDefined();
      expect(result.template.instructions).toBeDefined();
    });

    it('should build question template when data missing', () => {
      const result = atlasEngineOrchestrator.orchestrate(
        'I have $3000 income',
        [],
        [],
        'free'
      );

      expect(result.template.structure).toBe('question');
    });

    it('should build calculation template when data complete', () => {
      const result = atlasEngineOrchestrator.orchestrate(
        'I have $3000 income, $1500 expenses, and $1000 saved',
        [],
        [],
        'free'
      );

      expect(['calculation_result', 'question', 'explanation']).toContain(result.template.structure);
    });
  });

  describe('Communication Style', () => {
    it('should determine communication style', () => {
      const result = atlasEngineOrchestrator.orchestrate(
        'I have $3000 income and $1500 expenses',
        [],
        [],
        'free'
      );

      expect(result.style).toBeDefined();
      expect(result.style.tone).toBeDefined();
      expect(result.style.complexity).toBeDefined();
      expect(result.style.language).toBeDefined();
    });

    it('should detect warm tone for normal message', () => {
      const result = atlasEngineOrchestrator.orchestrate(
        'I want to build an emergency fund',
        [],
        [],
        'free'
      );

      expect(['warm', 'professional', 'urgent', 'supportive']).toContain(result.style.tone);
    });
  });

  describe('Metrics', () => {
    it('should track metrics', () => {
      const result = atlasEngineOrchestrator.orchestrate(
        'I have $3000 income and $1500 expenses',
        [],
        [],
        'free'
      );

      expect(result.metrics).toBeDefined();
      expect(result.metrics.providersUsed).toBeDefined();
      expect(result.metrics.totalCost).toBeGreaterThanOrEqual(0);
      expect(result.metrics.totalLatency).toBeGreaterThanOrEqual(0);
      expect(result.metrics.timestamp).toBeGreaterThan(0);
    });

    it('should track crisis detection in metrics', () => {
      const result = atlasEngineOrchestrator.orchestrate(
        'I am homeless',
        [],
        [],
        'free'
      );

      expect(result.metrics.crisisDetected).toBe(true);
    });
  });

  describe('Determinism', () => {
    it('should always return same orchestration for same input', () => {
      const message = 'I have $3000 income, $1500 expenses, and $1000 saved';
      const result1 = atlasEngineOrchestrator.orchestrate(message, [], [], 'free');
      const result2 = atlasEngineOrchestrator.orchestrate(message, [], [], 'free');

      expect(result1.decision.domain).toBe(result2.decision.domain);
      expect(result1.decision.urgency).toBe(result2.decision.urgency);
      expect(result1.routing.selectedProvider).toBe(result2.routing.selectedProvider);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', () => {
      const result = atlasEngineOrchestrator.orchestrate('', [], [], 'free');
      expect(result).toBeDefined();
      expect(result.decision).toBeDefined();
    });

    it('should handle conversation history', () => {
      const history = [
        { role: 'user' as const, content: 'I make $5000 per month' },
        { role: 'assistant' as const, content: 'Got it' },
      ];
      const result = atlasEngineOrchestrator.orchestrate('What about expenses?', history, [], 'free');
      expect(result).toBeDefined();
      expect(result.extraction.data.monthlyIncome).toBe(5000);
    });

    it('should handle prior goals', () => {
      const goals = [
        { id: '1', type: 'emergency_fund', status: 'active' as const, priority: 'critical' as const },
      ];
      const result = atlasEngineOrchestrator.orchestrate(
        'I have $3000 income',
        [],
        goals,
        'free'
      );
      expect(result).toBeDefined();
    });
  });
});
