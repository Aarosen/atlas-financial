/**
 * COST OPTIMIZATION ROUTER
 * 
 * Routes requests to most cost-effective provider based on criteria
 */

import type {
  IOptimizationRouter,
  SelectionCriteria,
  ProviderSelection,
  CostEstimate,
  EvaluationResult,
  ProviderHealthMetrics,
  OptimizationReport,
  QualityGateConfig,
  QualityGateResult,
  HealthStatus,
} from './types';

export class CostOptimizationRouter implements IOptimizationRouter {
  private healthMetrics: Map<string, ProviderHealthMetrics> = new Map();
  private evaluationHistory: EvaluationResult[] = [];
  private providerPricing: Map<string, { input: number; output: number }> = new Map();

  constructor() {
    // Initialize provider pricing (per 1M tokens)
    this.providerPricing.set('claude', { input: 3, output: 15 });
    this.providerPricing.set('openai', { input: 10, output: 30 });
    this.providerPricing.set('gemini', { input: 0.075, output: 0.3 });
  }

  /**
   * Select best provider based on criteria
   */
  selectProvider(criteria: SelectionCriteria): ProviderSelection {
    const providers = this.getAvailableProviders(criteria);

    if (providers.length === 0) {
      throw new Error('No available providers matching criteria');
    }

    // Sort by strategy
    let selectedProvider: string;
    let reason: string;

    switch (criteria.strategy) {
      case 'cost':
        selectedProvider = this.selectByCost(providers, criteria);
        reason = 'Selected for lowest cost';
        break;
      case 'speed':
        selectedProvider = this.selectBySpeed(providers, criteria);
        reason = 'Selected for fastest response';
        break;
      case 'quality':
        selectedProvider = this.selectByQuality(providers, criteria);
        reason = 'Selected for highest quality';
        break;
      case 'balanced':
        selectedProvider = this.selectBalanced(providers, criteria);
        reason = 'Selected for balanced performance';
        break;
      default:
        selectedProvider = providers[0];
        reason = 'Default selection';
    }

    const costEstimate = this.estimateCost(selectedProvider, 1000, 500);
    const metrics = this.healthMetrics.get(selectedProvider);

    return {
      provider: selectedProvider,
      reason,
      estimatedCost: costEstimate.estimatedTotalCost,
      expectedLatency: metrics?.averageLatency || 2000,
      successProbability: metrics ? metrics.successRate / 100 : 0.95,
    };
  }

  /**
   * Estimate cost for a request
   */
  estimateCost(provider: string, inputTokens: number, outputTokens: number): CostEstimate {
    const pricing = this.providerPricing.get(provider);

    if (!pricing) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    const totalCost = inputCost + outputCost;

    return {
      provider,
      estimatedInputCost: inputCost,
      estimatedOutputCost: outputCost,
      estimatedTotalCost: totalCost,
      inputTokens,
      outputTokens,
    };
  }

  /**
   * Record request evaluation
   */
  recordEvaluation(result: EvaluationResult): void {
    this.evaluationHistory.push(result);

    // Update health metrics
    const metrics = this.getOrCreateMetrics(result.provider);
    metrics.totalRequests++;
    metrics.lastChecked = new Date();

    if (result.success) {
      metrics.successCount++;
    } else {
      metrics.errorCount++;
    }

    metrics.successRate = (metrics.successCount / metrics.totalRequests) * 100;
    metrics.averageLatency = this.calculateAverageLatency(result.provider);
    metrics.status = this.calculateHealthStatus(metrics);

    this.healthMetrics.set(result.provider, metrics);
  }

  /**
   * Get provider health metrics
   */
  getHealthMetrics(provider: string): ProviderHealthMetrics | null {
    return this.healthMetrics.get(provider) || null;
  }

  /**
   * Get optimization report
   */
  getOptimizationReport(period: string): OptimizationReport {
    const relevantEvals = this.filterByPeriod(period);
    const totalCost = relevantEvals.reduce((sum, e) => sum + e.actualCost, 0);
    const avgCost = relevantEvals.length > 0 ? totalCost / relevantEvals.length : 0;

    // Calculate cost savings (assuming all used most expensive provider)
    const maxCost = relevantEvals.reduce((sum, e) => sum + (e.actualCost * 3), 0); // 3x multiplier
    const costSavings = maxCost - totalCost;
    const costSavingsPercent = maxCost > 0 ? (costSavings / maxCost) * 100 : 0;

    // Provider distribution
    const distribution: Record<string, number> = {};
    relevantEvals.forEach(e => {
      distribution[e.provider] = (distribution[e.provider] || 0) + 1;
    });

    // Get recommendations
    const recommendations = this.generateRecommendations(relevantEvals);

    return {
      period,
      totalRequests: relevantEvals.length,
      totalCost,
      averageCost: avgCost,
      costSavings,
      costSavingsPercent,
      providerDistribution: distribution,
      healthMetrics: Array.from(this.healthMetrics.values()),
      recommendations,
    };
  }

  /**
   * Evaluate quality gate
   */
  evaluateQualityGate(config: QualityGateConfig): QualityGateResult {
    const recentEvals = this.evaluationHistory.slice(-100);

    if (recentEvals.length === 0) {
      return {
        passed: false,
        successRate: 0,
        qualityScore: 0,
        errorRate: 100,
        latency: 0,
        failures: ['No evaluation data available'],
        warnings: [],
      };
    }

    const successRate = (recentEvals.filter(e => e.success).length / recentEvals.length) * 100;
    const qualityScore = recentEvals.reduce((sum, e) => sum + e.qualityScore, 0) / recentEvals.length;
    const errorRate = 100 - successRate;
    const latency = recentEvals.reduce((sum, e) => sum + e.latency, 0) / recentEvals.length;

    const failures: string[] = [];
    const warnings: string[] = [];

    if (successRate < config.minSuccessRate) {
      failures.push(`Success rate ${successRate.toFixed(1)}% below minimum ${config.minSuccessRate}%`);
    }

    if (qualityScore < config.minQualityScore) {
      failures.push(`Quality score ${qualityScore.toFixed(1)} below minimum ${config.minQualityScore}`);
    }

    if (errorRate > config.maxErrorRate) {
      failures.push(`Error rate ${errorRate.toFixed(1)}% exceeds maximum ${config.maxErrorRate}%`);
    }

    if (latency > config.maxLatency) {
      warnings.push(`Average latency ${latency.toFixed(0)}ms exceeds target ${config.maxLatency}ms`);
    }

    return {
      passed: failures.length === 0,
      successRate,
      qualityScore,
      errorRate,
      latency,
      failures,
      warnings,
    };
  }

  /**
   * Get available providers matching criteria
   */
  private getAvailableProviders(criteria: SelectionCriteria): string[] {
    let providers = ['claude', 'openai', 'gemini'];

    // Apply exclusions
    if (criteria.excludeProviders) {
      providers = providers.filter(p => !criteria.excludeProviders!.includes(p));
    }

    // Apply preferences
    if (criteria.preferredProviders) {
      const preferred = providers.filter(p => criteria.preferredProviders!.includes(p));
      if (preferred.length > 0) {
        providers = preferred;
      }
    }

    // Filter by success rate
    if (criteria.minSuccessRate) {
      providers = providers.filter(p => {
        const metrics = this.healthMetrics.get(p);
        return !metrics || metrics.successRate >= criteria.minSuccessRate!;
      });
    }

    return providers;
  }

  /**
   * Select provider by lowest cost
   */
  private selectByCost(providers: string[], criteria: SelectionCriteria): string {
    let bestProvider = providers[0];
    let lowestCost = Infinity;

    providers.forEach(provider => {
      const cost = this.estimateCost(provider, 1000, 500).estimatedTotalCost;
      if (cost < lowestCost && (!criteria.maxCost || cost <= criteria.maxCost)) {
        lowestCost = cost;
        bestProvider = provider;
      }
    });

    return bestProvider;
  }

  /**
   * Select provider by fastest speed
   */
  private selectBySpeed(providers: string[], criteria: SelectionCriteria): string {
    let bestProvider = providers[0];
    let fastestLatency = Infinity;

    providers.forEach(provider => {
      const metrics = this.healthMetrics.get(provider);
      const latency = metrics?.averageLatency || 2000;
      if (latency < fastestLatency && (!criteria.maxLatency || latency <= criteria.maxLatency)) {
        fastestLatency = latency;
        bestProvider = provider;
      }
    });

    return bestProvider;
  }

  /**
   * Select provider by highest quality
   */
  private selectByQuality(providers: string[], criteria: SelectionCriteria): string {
    let bestProvider = providers[0];
    let highestQuality = 0;

    providers.forEach(provider => {
      const metrics = this.healthMetrics.get(provider);
      const quality = metrics?.successRate || 95;
      if (quality > highestQuality) {
        highestQuality = quality;
        bestProvider = provider;
      }
    });

    return bestProvider;
  }

  /**
   * Select provider with balanced performance
   */
  private selectBalanced(providers: string[], criteria: SelectionCriteria): string {
    let bestProvider = providers[0];
    let bestScore = -Infinity;

    providers.forEach(provider => {
      const cost = this.estimateCost(provider, 1000, 500).estimatedTotalCost;
      const metrics = this.healthMetrics.get(provider);
      const quality = metrics?.successRate || 95;
      const latency = metrics?.averageLatency || 2000;

      // Balanced score: quality - (cost * 100) - (latency / 100)
      const score = quality - (cost * 100) - (latency / 100);

      if (score > bestScore) {
        bestScore = score;
        bestProvider = provider;
      }
    });

    return bestProvider;
  }

  /**
   * Get or create health metrics
   */
  private getOrCreateMetrics(provider: string): ProviderHealthMetrics {
    if (!this.healthMetrics.has(provider)) {
      this.healthMetrics.set(provider, {
        provider,
        status: 'unknown',
        successRate: 100,
        averageLatency: 2000,
        lastChecked: new Date(),
        errorCount: 0,
        successCount: 0,
        totalRequests: 0,
      });
    }

    return this.healthMetrics.get(provider)!;
  }

  /**
   * Calculate average latency for provider
   */
  private calculateAverageLatency(provider: string): number {
    const providerEvals = this.evaluationHistory.filter(e => e.provider === provider);
    if (providerEvals.length === 0) return 2000;

    const sum = providerEvals.reduce((acc, e) => acc + e.latency, 0);
    return sum / providerEvals.length;
  }

  /**
   * Calculate health status
   */
  private calculateHealthStatus(metrics: ProviderHealthMetrics): HealthStatus {
    if (metrics.totalRequests === 0) return 'unknown';
    if (metrics.successRate >= 95) return 'healthy';
    if (metrics.successRate >= 80) return 'degraded';
    return 'unhealthy';
  }

  /**
   * Filter evaluations by period
   */
  private filterByPeriod(period: string): EvaluationResult[] {
    const now = new Date();
    let cutoffDate = new Date();

    switch (period) {
      case 'hour':
        cutoffDate.setHours(cutoffDate.getHours() - 1);
        break;
      case 'day':
        cutoffDate.setDate(cutoffDate.getDate() - 1);
        break;
      case 'week':
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(cutoffDate.getMonth() - 1);
        break;
      default:
        return this.evaluationHistory;
    }

    return this.evaluationHistory.filter(e => new Date(e.requestId) > cutoffDate);
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(evals: EvaluationResult[]): string[] {
    const recommendations: string[] = [];

    if (evals.length === 0) {
      return ['Insufficient data for recommendations'];
    }

    // Cost recommendations
    const costByProvider: Record<string, number> = {};
    evals.forEach(e => {
      costByProvider[e.provider] = (costByProvider[e.provider] || 0) + e.actualCost;
    });

    const providers = Object.keys(costByProvider);
    if (providers.length > 1) {
      const cheapest = providers.reduce((a, b) => costByProvider[a] < costByProvider[b] ? a : b);
      const mostExpensive = providers.reduce((a, b) => costByProvider[a] > costByProvider[b] ? a : b);
      const savings = costByProvider[mostExpensive] - costByProvider[cheapest];
      recommendations.push(`Using ${cheapest} instead of ${mostExpensive} could save ${savings.toFixed(2)} in costs`);
    }

    // Quality recommendations
    const qualityByProvider: Record<string, number[]> = {};
    evals.forEach(e => {
      if (!qualityByProvider[e.provider]) qualityByProvider[e.provider] = [];
      qualityByProvider[e.provider].push(e.qualityScore);
    });

    const avgQuality: Record<string, number> = {};
    Object.keys(qualityByProvider).forEach(p => {
      const scores = qualityByProvider[p];
      avgQuality[p] = scores.reduce((a, b) => a + b, 0) / scores.length;
    });

    const bestQuality = Object.keys(avgQuality).reduce((a, b) => avgQuality[a] > avgQuality[b] ? a : b);
    if (avgQuality[bestQuality] > 85) {
      recommendations.push(`${bestQuality} consistently delivers high quality (${avgQuality[bestQuality].toFixed(1)}/100)`);
    }

    return recommendations;
  }
}
