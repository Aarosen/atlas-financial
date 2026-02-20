/**
 * ATLAS AI v4.0 Continuous Improvement Chain
 * 
 * Establishes automated feedback loop where Atlas AI improves with every response.
 * Metrics flow from production → eval pipeline → improvement recommendations → deployment
 */

import type { V4EvalReport } from './v4-eval-suite';

// ============================================================================
// IMPROVEMENT METRICS TYPES
// ============================================================================

export interface ResponseMetrics {
  response_id: string;
  timestamp: number;
  user_id: string;
  session_id: string;
  
  // Quality signals
  user_satisfaction: number; // 1-5
  user_action_taken: boolean;
  concept_understood: boolean;
  would_return: boolean;
  
  // Eval signals
  safety_pass: boolean;
  accuracy_score: number; // 0-100
  teaching_value: number; // 0-100
  tone_warmth: number; // 1-5
  
  // Performance
  response_time_ms: number;
  token_count: number;
}

export interface DimensionMetrics {
  dimension_id: string;
  dimension_name: string;
  
  // Aggregated metrics
  avg_pass_rate: number;
  trend: 'improving' | 'stable' | 'declining';
  critical_failures_count: number;
  high_priority_failures_count: number;
  
  // Recent performance
  last_7_days_pass_rate: number;
  last_30_days_pass_rate: number;
  
  // Improvement velocity
  improvement_rate: number; // % improvement per week
}

export interface ImprovementRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  dimension: string;
  current_state: string;
  target_state: string;
  recommended_action: string;
  estimated_impact: string;
  effort_estimate: 'low' | 'medium' | 'high';
  owner: string;
}

export interface ContinuousImprovementReport {
  report_id: string;
  timestamp: number;
  
  // Metrics summary
  total_responses_evaluated: number;
  avg_user_satisfaction: number;
  avg_accuracy: number;
  avg_teaching_value: number;
  
  // Dimension health
  dimension_metrics: DimensionMetrics[];
  
  // Improvement recommendations
  recommendations: ImprovementRecommendation[];
  
  // Deployment readiness
  deployment_ready: boolean;
  deployment_blockers: string[];
  
  // Improvement velocity
  weekly_improvement_rate: number;
  estimated_days_to_target: number;
}

// ============================================================================
// IMPROVEMENT CHAIN ORCHESTRATOR
// ============================================================================

export class ContinuousImprovementChain {
  private responseMetrics: ResponseMetrics[] = [];
  private dimensionHistory: Map<string, DimensionMetrics[]> = new Map();

  /**
   * Record a response evaluation
   */
  recordResponseMetrics(metrics: ResponseMetrics): void {
    this.responseMetrics.push(metrics);
    
    // Keep only last 10,000 responses in memory
    if (this.responseMetrics.length > 10000) {
      this.responseMetrics = this.responseMetrics.slice(-10000);
    }
  }

  /**
   * Record dimension eval results
   */
  recordDimensionMetrics(dimension_id: string, metrics: DimensionMetrics): void {
    if (!this.dimensionHistory.has(dimension_id)) {
      this.dimensionHistory.set(dimension_id, []);
    }
    this.dimensionHistory.get(dimension_id)!.push(metrics);
  }

  /**
   * Generate improvement recommendations based on current metrics
   */
  generateRecommendations(): ImprovementRecommendation[] {
    const recommendations: ImprovementRecommendation[] = [];

    // Analyze each dimension
    for (const [dimensionId, history] of this.dimensionHistory) {
      if (history.length === 0) continue;

      const latest = history[history.length - 1];
      const previous = history.length > 1 ? history[history.length - 2] : null;

      // Critical failures need immediate action
      if (latest.critical_failures_count > 0) {
        recommendations.push({
          priority: 'critical',
          dimension: latest.dimension_name,
          current_state: `${latest.critical_failures_count} critical failures`,
          target_state: '0 critical failures',
          recommended_action: `Investigate and fix all critical failures in ${latest.dimension_name}`,
          estimated_impact: 'Unblocks deployment',
          effort_estimate: 'high',
          owner: 'Engineering Lead',
        });
      }

      // Declining performance needs attention
      if (latest.trend === 'declining') {
        recommendations.push({
          priority: 'high',
          dimension: latest.dimension_name,
          current_state: `${latest.last_7_days_pass_rate.toFixed(1)}% (declining)`,
          target_state: `${latest.last_30_days_pass_rate.toFixed(1)}% (stable/improving)`,
          recommended_action: `Investigate root cause of decline in ${latest.dimension_name}`,
          estimated_impact: `Restore ${(latest.last_30_days_pass_rate - latest.last_7_days_pass_rate).toFixed(1)}% quality`,
          effort_estimate: 'medium',
          owner: 'AI Engineer',
        });
      }

      // Below-target performance
      if (latest.avg_pass_rate < 95) {
        recommendations.push({
          priority: latest.avg_pass_rate < 85 ? 'high' : 'medium',
          dimension: latest.dimension_name,
          current_state: `${latest.avg_pass_rate.toFixed(1)}% pass rate`,
          target_state: '≥95% pass rate',
          recommended_action: `Improve ${latest.dimension_name} quality through targeted fixes`,
          estimated_impact: `+${(95 - latest.avg_pass_rate).toFixed(1)}% quality improvement`,
          effort_estimate: 'medium',
          owner: 'AI Engineer',
        });
      }
    }

    // Sort by priority
    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Generate comprehensive improvement report
   */
  generateImprovementReport(): ContinuousImprovementReport {
    const recommendations = this.generateRecommendations();
    const dimensionMetrics = Array.from(this.dimensionHistory.values()).map(
      (history) => history[history.length - 1]
    );

    // Calculate aggregates
    const avgUserSatisfaction =
      this.responseMetrics.length > 0
        ? this.responseMetrics.reduce((sum, m) => sum + m.user_satisfaction, 0) /
          this.responseMetrics.length
        : 0;

    const avgAccuracy =
      this.responseMetrics.length > 0
        ? this.responseMetrics.reduce((sum, m) => sum + m.accuracy_score, 0) /
          this.responseMetrics.length
        : 0;

    const avgTeachingValue =
      this.responseMetrics.length > 0
        ? this.responseMetrics.reduce((sum, m) => sum + m.teaching_value, 0) /
          this.responseMetrics.length
        : 0;

    // Calculate improvement velocity
    const weeklyImprovementRate = this.calculateImprovementVelocity();
    const estimatedDaysToTarget = this.estimateDaysToTarget(weeklyImprovementRate);

    // Determine deployment readiness
    const criticalFailures = recommendations.filter((r) => r.priority === 'critical');
    const deploymentReady = criticalFailures.length === 0 && avgAccuracy >= 95;

    return {
      report_id: `improvement-${Date.now()}`,
      timestamp: Date.now(),
      total_responses_evaluated: this.responseMetrics.length,
      avg_user_satisfaction: avgUserSatisfaction,
      avg_accuracy: avgAccuracy,
      avg_teaching_value: avgTeachingValue,
      dimension_metrics: dimensionMetrics,
      recommendations,
      deployment_ready: deploymentReady,
      deployment_blockers: criticalFailures.map((r) => r.recommended_action),
      weekly_improvement_rate: weeklyImprovementRate,
      estimated_days_to_target: estimatedDaysToTarget,
    };
  }

  /**
   * Calculate improvement velocity (% improvement per week)
   */
  private calculateImprovementVelocity(): number {
    if (this.responseMetrics.length < 2) return 0;

    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;

    const lastWeek = this.responseMetrics.filter((m) => m.timestamp >= oneWeekAgo);
    const previousWeek = this.responseMetrics.filter(
      (m) => m.timestamp >= twoWeeksAgo && m.timestamp < oneWeekAgo
    );

    if (lastWeek.length === 0 || previousWeek.length === 0) return 0;

    const lastWeekAccuracy =
      lastWeek.reduce((sum, m) => sum + m.accuracy_score, 0) / lastWeek.length;
    const previousWeekAccuracy =
      previousWeek.reduce((sum, m) => sum + m.accuracy_score, 0) / previousWeek.length;

    return ((lastWeekAccuracy - previousWeekAccuracy) / previousWeekAccuracy) * 100;
  }

  /**
   * Estimate days to reach 95%+ quality target
   */
  private estimateDaysToTarget(weeklyRate: number): number {
    if (this.responseMetrics.length === 0) return Infinity;

    const currentAccuracy =
      this.responseMetrics.reduce((sum, m) => sum + m.accuracy_score, 0) /
      this.responseMetrics.length;

    if (currentAccuracy >= 95) return 0;
    if (weeklyRate <= 0) return Infinity;

    const improvementNeeded = 95 - currentAccuracy;
    const weeksNeeded = improvementNeeded / weeklyRate;
    return Math.ceil(weeksNeeded * 7);
  }

  /**
   * Get metrics for a specific dimension
   */
  getDimensionMetrics(dimensionId: string): DimensionMetrics | null {
    const history = this.dimensionHistory.get(dimensionId);
    return history && history.length > 0 ? history[history.length - 1] : null;
  }

  /**
   * Get recent response metrics (last N responses)
   */
  getRecentMetrics(count: number = 100): ResponseMetrics[] {
    return this.responseMetrics.slice(-count);
  }
}

// ============================================================================
// IMPROVEMENT REPORT FORMATTER
// ============================================================================

export function formatImprovementReport(report: ContinuousImprovementReport): string {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('ATLAS AI v4.0 — CONTINUOUS IMPROVEMENT REPORT');
  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('');

  lines.push(`📊 QUALITY METRICS`);
  lines.push(`─────────────────────────────────────────────────────────────────`);
  lines.push(`Responses Evaluated: ${report.total_responses_evaluated}`);
  lines.push(`Avg User Satisfaction: ${report.avg_user_satisfaction.toFixed(2)}/5.0`);
  lines.push(`Avg Accuracy: ${report.avg_accuracy.toFixed(1)}%`);
  lines.push(`Avg Teaching Value: ${report.avg_teaching_value.toFixed(1)}%`);
  lines.push('');

  lines.push(`📈 IMPROVEMENT VELOCITY`);
  lines.push(`─────────────────────────────────────────────────────────────────`);
  lines.push(`Weekly Improvement Rate: ${report.weekly_improvement_rate.toFixed(2)}%`);
  lines.push(`Days to 95% Target: ${report.estimated_days_to_target === Infinity ? '∞' : report.estimated_days_to_target}`);
  lines.push('');

  lines.push(`🎯 DEPLOYMENT STATUS`);
  lines.push(`─────────────────────────────────────────────────────────────────`);
  lines.push(`Status: ${report.deployment_ready ? '✅ READY' : '❌ BLOCKED'}`);
  if (report.deployment_blockers.length > 0) {
    lines.push(`Blockers:`);
    for (const blocker of report.deployment_blockers) {
      lines.push(`  • ${blocker}`);
    }
  }
  lines.push('');

  if (report.recommendations.length > 0) {
    lines.push(`💡 TOP RECOMMENDATIONS`);
    lines.push(`─────────────────────────────────────────────────────────────────`);
    for (const rec of report.recommendations.slice(0, 5)) {
      const priorityIcon =
        rec.priority === 'critical' ? '🔴' : rec.priority === 'high' ? '🟠' : '🟡';
      lines.push(`${priorityIcon} ${rec.dimension}`);
      lines.push(`   Action: ${rec.recommended_action}`);
      lines.push(`   Impact: ${rec.estimated_impact}`);
    }
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════════════════════');

  return lines.join('\n');
}
