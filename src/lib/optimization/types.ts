/**
 * MULTI-PROVIDER OPTIMIZATION - Type Definitions
 * 
 * Defines interfaces for cost optimization and provider health monitoring
 */

/**
 * Provider health status
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/**
 * Optimization strategy
 */
export type OptimizationStrategy = 'cost' | 'speed' | 'quality' | 'balanced';

/**
 * Provider health metrics
 */
export interface ProviderHealthMetrics {
  provider: string;
  status: HealthStatus;
  successRate: number; // 0-100
  averageLatency: number; // milliseconds
  lastChecked: Date;
  errorCount: number;
  successCount: number;
  totalRequests: number;
}

/**
 * Cost estimate for a request
 */
export interface CostEstimate {
  provider: string;
  estimatedInputCost: number;
  estimatedOutputCost: number;
  estimatedTotalCost: number;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Provider selection criteria
 */
export interface SelectionCriteria {
  strategy: OptimizationStrategy;
  maxCost?: number;
  minSuccessRate?: number;
  maxLatency?: number;
  preferredProviders?: string[];
  excludeProviders?: string[];
}

/**
 * Provider selection result
 */
export interface ProviderSelection {
  provider: string;
  reason: string;
  estimatedCost: number;
  expectedLatency: number;
  successProbability: number;
}

/**
 * Request evaluation result
 */
export interface EvaluationResult {
  requestId: string;
  provider: string;
  success: boolean;
  latency: number;
  actualCost: number;
  qualityScore: number; // 0-100
  feedback?: string;
}

/**
 * Optimization report
 */
export interface OptimizationReport {
  period: string;
  totalRequests: number;
  totalCost: number;
  averageCost: number;
  costSavings: number;
  costSavingsPercent: number;
  providerDistribution: Record<string, number>;
  healthMetrics: ProviderHealthMetrics[];
  recommendations: string[];
}

/**
 * Quality gate configuration
 */
export interface QualityGateConfig {
  minSuccessRate: number; // 0-100
  minQualityScore: number; // 0-100
  maxErrorRate: number; // 0-100
  maxLatency: number; // milliseconds
  requiresApproval: boolean;
}

/**
 * Quality gate result
 */
export interface QualityGateResult {
  passed: boolean;
  successRate: number;
  qualityScore: number;
  errorRate: number;
  latency: number;
  failures: string[];
  warnings: string[];
}

/**
 * Optimization router interface
 */
export interface IOptimizationRouter {
  /**
   * Select best provider based on criteria
   */
  selectProvider(criteria: SelectionCriteria): ProviderSelection;

  /**
   * Estimate cost for a request
   */
  estimateCost(provider: string, inputTokens: number, outputTokens: number): CostEstimate;

  /**
   * Record request evaluation
   */
  recordEvaluation(result: EvaluationResult): void;

  /**
   * Get provider health metrics
   */
  getHealthMetrics(provider: string): ProviderHealthMetrics | null;

  /**
   * Get optimization report
   */
  getOptimizationReport(period: string): OptimizationReport;

  /**
   * Evaluate quality gate
   */
  evaluateQualityGate(config: QualityGateConfig): QualityGateResult;
}
