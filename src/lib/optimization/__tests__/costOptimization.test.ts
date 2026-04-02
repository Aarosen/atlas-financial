/**
 * COST OPTIMIZATION ROUTER TESTS
 * 
 * Comprehensive tests for cost optimization and provider selection
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CostOptimizationRouter } from '../costOptimizationRouter';
import type { SelectionCriteria, EvaluationResult, QualityGateConfig } from '../types';

describe('Cost Optimization Router', () => {
  let router: CostOptimizationRouter;

  beforeEach(() => {
    router = new CostOptimizationRouter();
  });

  describe('Provider Selection', () => {
    it('should select provider by cost', () => {
      const criteria: SelectionCriteria = {
        strategy: 'cost',
      };

      const selection = router.selectProvider(criteria);

      expect(selection.provider).toBeDefined();
      expect(selection.reason).toContain('cost');
      expect(selection.estimatedCost).toBeGreaterThan(0);
    });

    it('should select Gemini as cheapest provider', () => {
      const criteria: SelectionCriteria = {
        strategy: 'cost',
      };

      const selection = router.selectProvider(criteria);

      // Gemini is cheapest: $0.075 input + $0.3 output per 1M tokens
      expect(selection.provider).toBe('gemini');
    });

    it('should select provider by speed', () => {
      // Record some evaluations to establish latency
      router.recordEvaluation({
        requestId: new Date().toISOString(),
        provider: 'claude',
        success: true,
        latency: 1000,
        actualCost: 0.05,
        qualityScore: 95,
      });

      router.recordEvaluation({
        requestId: new Date().toISOString(),
        provider: 'gemini',
        success: true,
        latency: 500,
        actualCost: 0.01,
        qualityScore: 90,
      });

      const criteria: SelectionCriteria = {
        strategy: 'speed',
      };

      const selection = router.selectProvider(criteria);

      expect(selection.provider).toBe('gemini');
      expect(selection.reason).toContain('fastest');
    });

    it('should select provider by quality', () => {
      // Record evaluations with different quality scores
      for (let i = 0; i < 5; i++) {
        router.recordEvaluation({
          requestId: `claude-${i}`,
          provider: 'claude',
          success: true,
          latency: 2000,
          actualCost: 0.05,
          qualityScore: 98,
        });

        router.recordEvaluation({
          requestId: `gemini-${i}`,
          provider: 'gemini',
          success: i < 3, // 60% success rate
          latency: 1000,
          actualCost: 0.01,
          qualityScore: 85,
        });
      }

      const criteria: SelectionCriteria = {
        strategy: 'quality',
      };

      const selection = router.selectProvider(criteria);

      expect(selection.provider).toBe('claude');
      expect(selection.reason).toContain('quality');
    });

    it('should select provider with balanced strategy', () => {
      const criteria: SelectionCriteria = {
        strategy: 'balanced',
      };

      const selection = router.selectProvider(criteria);

      expect(selection.provider).toBeDefined();
      expect(selection.reason).toContain('balanced');
    });

    it('should respect max cost constraint', () => {
      const criteria: SelectionCriteria = {
        strategy: 'cost',
        maxCost: 0.001, // Very low max cost
      };

      const selection = router.selectProvider(criteria);

      // Should select Gemini as it's cheapest
      expect(selection.provider).toBe('gemini');
      expect(selection.estimatedCost).toBeLessThanOrEqual(0.001);
    });

    it('should respect min success rate constraint', () => {
      // Record poor performance for gemini
      for (let i = 0; i < 10; i++) {
        router.recordEvaluation({
          requestId: `gemini-${i}`,
          provider: 'gemini',
          success: i < 2, // 20% success rate
          latency: 1000,
          actualCost: 0.01,
          qualityScore: 50,
        });
      }

      const criteria: SelectionCriteria = {
        strategy: 'cost',
        minSuccessRate: 90,
      };

      const selection = router.selectProvider(criteria);

      // Should not select gemini due to low success rate
      expect(selection.provider).not.toBe('gemini');
    });

    it('should respect preferred providers', () => {
      const criteria: SelectionCriteria = {
        strategy: 'cost',
        preferredProviders: ['openai'],
      };

      const selection = router.selectProvider(criteria);

      expect(selection.provider).toBe('openai');
    });

    it('should respect excluded providers', () => {
      const criteria: SelectionCriteria = {
        strategy: 'cost',
        excludeProviders: ['gemini', 'openai'],
      };

      const selection = router.selectProvider(criteria);

      expect(selection.provider).toBe('claude');
    });

    it('should throw error when no providers available', () => {
      const criteria: SelectionCriteria = {
        strategy: 'cost',
        excludeProviders: ['claude', 'openai', 'gemini'],
      };

      expect(() => router.selectProvider(criteria)).toThrow();
    });
  });

  describe('Cost Estimation', () => {
    it('should estimate cost for Claude', () => {
      const estimate = router.estimateCost('claude', 1000, 500);

      expect(estimate.provider).toBe('claude');
      expect(estimate.inputTokens).toBe(1000);
      expect(estimate.outputTokens).toBe(500);
      expect(estimate.estimatedInputCost).toBeGreaterThan(0);
      expect(estimate.estimatedOutputCost).toBeGreaterThan(0);
      expect(estimate.estimatedTotalCost).toBe(
        estimate.estimatedInputCost + estimate.estimatedOutputCost
      );
    });

    it('should estimate cost for OpenAI', () => {
      const estimate = router.estimateCost('openai', 1000, 500);

      expect(estimate.provider).toBe('openai');
      expect(estimate.estimatedTotalCost).toBeGreaterThan(0);
    });

    it('should estimate cost for Gemini', () => {
      const estimate = router.estimateCost('gemini', 1000, 500);

      expect(estimate.provider).toBe('gemini');
      // Gemini should be cheapest
      const claude = router.estimateCost('claude', 1000, 500);
      expect(estimate.estimatedTotalCost).toBeLessThan(claude.estimatedTotalCost);
    });

    it('should calculate correct pricing per 1M tokens', () => {
      // Claude: $3 input, $15 output per 1M tokens
      const estimate = router.estimateCost('claude', 1_000_000, 1_000_000);

      expect(estimate.estimatedInputCost).toBe(3);
      expect(estimate.estimatedOutputCost).toBe(15);
      expect(estimate.estimatedTotalCost).toBe(18);
    });

    it('should throw error for unknown provider', () => {
      expect(() => router.estimateCost('unknown', 1000, 500)).toThrow();
    });
  });

  describe('Evaluation Recording', () => {
    it('should record evaluation', () => {
      const result: EvaluationResult = {
        requestId: '1',
        provider: 'claude',
        success: true,
        latency: 2000,
        actualCost: 0.05,
        qualityScore: 95,
      };

      router.recordEvaluation(result);

      const metrics = router.getHealthMetrics('claude');
      expect(metrics).toBeDefined();
      expect(metrics!.totalRequests).toBe(1);
      expect(metrics!.successCount).toBe(1);
      expect(metrics!.successRate).toBe(100);
    });

    it('should update success rate', () => {
      // Record 10 evaluations: 8 success, 2 failures
      for (let i = 0; i < 10; i++) {
        router.recordEvaluation({
          requestId: `${i}`,
          provider: 'claude',
          success: i < 8,
          latency: 2000,
          actualCost: 0.05,
          qualityScore: 90,
        });
      }

      const metrics = router.getHealthMetrics('claude');
      expect(metrics!.successRate).toBe(80);
      expect(metrics!.totalRequests).toBe(10);
      expect(metrics!.successCount).toBe(8);
      expect(metrics!.errorCount).toBe(2);
    });

    it('should calculate average latency', () => {
      router.recordEvaluation({
        requestId: '1',
        provider: 'claude',
        success: true,
        latency: 1000,
        actualCost: 0.05,
        qualityScore: 95,
      });

      router.recordEvaluation({
        requestId: '2',
        provider: 'claude',
        success: true,
        latency: 3000,
        actualCost: 0.05,
        qualityScore: 95,
      });

      const metrics = router.getHealthMetrics('claude');
      expect(metrics!.averageLatency).toBe(2000);
    });

    it('should determine health status', () => {
      // Record successful evaluations
      for (let i = 0; i < 20; i++) {
        router.recordEvaluation({
          requestId: `${i}`,
          provider: 'claude',
          success: true,
          latency: 2000,
          actualCost: 0.05,
          qualityScore: 95,
        });
      }

      const metrics = router.getHealthMetrics('claude');
      expect(metrics!.status).toBe('healthy');
    });

    it('should mark degraded status', () => {
      // Record mixed results: 85% success
      for (let i = 0; i < 20; i++) {
        router.recordEvaluation({
          requestId: `${i}`,
          provider: 'claude',
          success: i < 17, // 85% success
          latency: 2000,
          actualCost: 0.05,
          qualityScore: 85,
        });
      }

      const metrics = router.getHealthMetrics('claude');
      expect(metrics!.status).toBe('degraded');
    });

    it('should mark unhealthy status', () => {
      // Record poor results: 50% success
      for (let i = 0; i < 20; i++) {
        router.recordEvaluation({
          requestId: `${i}`,
          provider: 'claude',
          success: i < 10, // 50% success
          latency: 2000,
          actualCost: 0.05,
          qualityScore: 50,
        });
      }

      const metrics = router.getHealthMetrics('claude');
      expect(metrics!.status).toBe('unhealthy');
    });
  });

  describe('Health Metrics', () => {
    it('should return null for unknown provider', () => {
      const metrics = router.getHealthMetrics('unknown');
      expect(metrics).toBeNull();
    });

    it('should track multiple providers', () => {
      router.recordEvaluation({
        requestId: '1',
        provider: 'claude',
        success: true,
        latency: 2000,
        actualCost: 0.05,
        qualityScore: 95,
      });

      router.recordEvaluation({
        requestId: '2',
        provider: 'gemini',
        success: true,
        latency: 1000,
        actualCost: 0.01,
        qualityScore: 90,
      });

      const claudeMetrics = router.getHealthMetrics('claude');
      const geminiMetrics = router.getHealthMetrics('gemini');

      expect(claudeMetrics).toBeDefined();
      expect(geminiMetrics).toBeDefined();
      expect(claudeMetrics!.provider).toBe('claude');
      expect(geminiMetrics!.provider).toBe('gemini');
    });
  });

  describe('Optimization Reports', () => {
    it('should generate optimization report', () => {
      // Record some evaluations
      for (let i = 0; i < 10; i++) {
        router.recordEvaluation({
          requestId: new Date().toISOString(),
          provider: 'gemini',
          success: true,
          latency: 1000,
          actualCost: 0.01,
          qualityScore: 90,
        });
      }

      const report = router.getOptimizationReport('day');

      expect(report.period).toBe('day');
      expect(report.totalRequests).toBe(10);
      expect(report.totalCost).toBeGreaterThan(0);
      expect(report.averageCost).toBeGreaterThan(0);
      expect(report.costSavings).toBeGreaterThanOrEqual(0);
      expect(report.providerDistribution['gemini']).toBe(10);
    });

    it('should calculate cost savings', () => {
      // Record evaluations with different providers
      for (let i = 0; i < 5; i++) {
        router.recordEvaluation({
          requestId: new Date().toISOString(),
          provider: 'gemini',
          success: true,
          latency: 1000,
          actualCost: 0.01,
          qualityScore: 90,
        });

        router.recordEvaluation({
          requestId: new Date().toISOString(),
          provider: 'claude',
          success: true,
          latency: 2000,
          actualCost: 0.05,
          qualityScore: 95,
        });
      }

      const report = router.getOptimizationReport('day');

      // Report should show cost data
      expect(report.totalRequests).toBe(10);
      expect(report.totalCost).toBeGreaterThan(0);
      expect(report.averageCost).toBeGreaterThan(0);
    });

    it('should provide recommendations', () => {
      for (let i = 0; i < 10; i++) {
        router.recordEvaluation({
          requestId: `${i}`,
          provider: 'gemini',
          success: true,
          latency: 1000,
          actualCost: 0.01,
          qualityScore: 90,
        });
      }

      const report = router.getOptimizationReport('day');

      expect(report.recommendations).toBeDefined();
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Quality Gates', () => {
    it('should pass quality gate with good metrics', () => {
      // Record successful evaluations
      for (let i = 0; i < 20; i++) {
        router.recordEvaluation({
          requestId: `${i}`,
          provider: 'claude',
          success: true,
          latency: 2000,
          actualCost: 0.05,
          qualityScore: 95,
        });
      }

      const config: QualityGateConfig = {
        minSuccessRate: 90,
        minQualityScore: 90,
        maxErrorRate: 10,
        maxLatency: 3000,
        requiresApproval: false,
      };

      const result = router.evaluateQualityGate(config);

      expect(result.passed).toBe(true);
      expect(result.failures).toHaveLength(0);
    });

    it('should fail quality gate with poor metrics', () => {
      // Record poor evaluations
      for (let i = 0; i < 20; i++) {
        router.recordEvaluation({
          requestId: `${i}`,
          provider: 'claude',
          success: i < 10, // 50% success
          latency: 5000,
          actualCost: 0.05,
          qualityScore: 50,
        });
      }

      const config: QualityGateConfig = {
        minSuccessRate: 90,
        minQualityScore: 90,
        maxErrorRate: 10,
        maxLatency: 3000,
        requiresApproval: false,
      };

      const result = router.evaluateQualityGate(config);

      expect(result.passed).toBe(false);
      expect(result.failures.length).toBeGreaterThan(0);
    });

    it('should detect success rate failures', () => {
      for (let i = 0; i < 20; i++) {
        router.recordEvaluation({
          requestId: `${i}`,
          provider: 'claude',
          success: i < 10, // 50% success
          latency: 2000,
          actualCost: 0.05,
          qualityScore: 95,
        });
      }

      const config: QualityGateConfig = {
        minSuccessRate: 90,
        minQualityScore: 50,
        maxErrorRate: 10,
        maxLatency: 3000,
        requiresApproval: false,
      };

      const result = router.evaluateQualityGate(config);

      expect(result.passed).toBe(false);
      expect(result.failures.some(f => f.includes('Success rate'))).toBe(true);
    });

    it('should detect quality score failures', () => {
      for (let i = 0; i < 20; i++) {
        router.recordEvaluation({
          requestId: `${i}`,
          provider: 'claude',
          success: true,
          latency: 2000,
          actualCost: 0.05,
          qualityScore: 50,
        });
      }

      const config: QualityGateConfig = {
        minSuccessRate: 90,
        minQualityScore: 90,
        maxErrorRate: 10,
        maxLatency: 3000,
        requiresApproval: false,
      };

      const result = router.evaluateQualityGate(config);

      expect(result.passed).toBe(false);
      expect(result.failures.some(f => f.includes('Quality score'))).toBe(true);
    });

    it('should detect latency warnings', () => {
      for (let i = 0; i < 20; i++) {
        router.recordEvaluation({
          requestId: `${i}`,
          provider: 'claude',
          success: true,
          latency: 5000,
          actualCost: 0.05,
          qualityScore: 95,
        });
      }

      const config: QualityGateConfig = {
        minSuccessRate: 90,
        minQualityScore: 90,
        maxErrorRate: 10,
        maxLatency: 3000,
        requiresApproval: false,
      };

      const result = router.evaluateQualityGate(config);

      expect(result.warnings.some(w => w.includes('latency'))).toBe(true);
    });

    it('should handle no evaluation data', () => {
      const config: QualityGateConfig = {
        minSuccessRate: 90,
        minQualityScore: 90,
        maxErrorRate: 10,
        maxLatency: 3000,
        requiresApproval: false,
      };

      const result = router.evaluateQualityGate(config);

      expect(result.passed).toBe(false);
      expect(result.failures.some(f => f.includes('No evaluation data'))).toBe(true);
    });
  });

  describe('Provider Comparison', () => {
    it('should show cost differences between providers', () => {
      const claude = router.estimateCost('claude', 1000, 500);
      const openai = router.estimateCost('openai', 1000, 500);
      const gemini = router.estimateCost('gemini', 1000, 500);

      expect(gemini.estimatedTotalCost).toBeLessThan(claude.estimatedTotalCost);
      expect(claude.estimatedTotalCost).toBeLessThan(openai.estimatedTotalCost);
    });

    it('should show Gemini as most cost-effective', () => {
      const gemini = router.estimateCost('gemini', 1_000_000, 1_000_000);
      const claude = router.estimateCost('claude', 1_000_000, 1_000_000);
      const openai = router.estimateCost('openai', 1_000_000, 1_000_000);

      // Gemini: $0.375, Claude: $18, OpenAI: $40
      expect(gemini.estimatedTotalCost).toBe(0.375);
      expect(claude.estimatedTotalCost).toBe(18);
      expect(openai.estimatedTotalCost).toBe(40);
    });
  });
});
