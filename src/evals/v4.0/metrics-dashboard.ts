/**
 * ATLAS AI v4.0 Metrics Dashboard
 * 
 * Real-time metrics collection, aggregation, and visualization
 * for continuous monitoring of Atlas AI quality and improvement
 */

import type { ResponseMetrics, DimensionMetrics, ContinuousImprovementReport } from './continuous-improvement-chain';

export interface MetricSnapshot {
  timestamp: number;
  metric_name: string;
  value: number;
  dimension?: string;
  tags?: Record<string, string>;
}

export interface DashboardMetrics {
  // Real-time metrics
  current_accuracy: number;
  current_user_satisfaction: number;
  current_teaching_value: number;
  current_warmth: number;
  
  // Trend metrics
  accuracy_trend_7d: number; // % change over 7 days
  satisfaction_trend_7d: number;
  teaching_trend_7d: number;
  warmth_trend_7d: number;
  
  // Velocity metrics
  weekly_improvement_rate: number;
  days_to_95_percent: number;
  
  // Gate status
  critical_gates_passing: number;
  critical_gates_total: number;
  high_gates_passing: number;
  high_gates_total: number;
  
  // Dimension health
  dimension_health: Record<string, {
    pass_rate: number;
    trend: 'improving' | 'stable' | 'declining';
    critical_failures: number;
  }>;
  
  // User impact
  user_action_rate: number;
  user_confidence_improvement: number;
  net_worth_improvement_rate: number;
}

export interface MetricsAlert {
  severity: 'critical' | 'high' | 'medium' | 'low';
  metric: string;
  current_value: number;
  threshold: number;
  message: string;
  timestamp: number;
  dimension?: string;
}

export class MetricsDashboard {
  private metrics: MetricSnapshot[] = [];
  private alerts: MetricsAlert[] = [];
  private dimensionHistory: Map<string, DimensionMetrics[]> = new Map();
  private maxMetricsStored = 100000; // Keep last 100k metrics in memory

  /**
   * Record a metric snapshot
   */
  recordMetric(snapshot: MetricSnapshot): void {
    this.metrics.push(snapshot);
    
    // Trim old metrics if exceeding max
    if (this.metrics.length > this.maxMetricsStored) {
      this.metrics = this.metrics.slice(-this.maxMetricsStored);
    }
  }

  /**
   * Record dimension metrics
   */
  recordDimensionMetrics(dimensionId: string, metrics: DimensionMetrics): void {
    if (!this.dimensionHistory.has(dimensionId)) {
      this.dimensionHistory.set(dimensionId, []);
    }
    this.dimensionHistory.get(dimensionId)!.push(metrics);
  }

  /**
   * Generate current dashboard metrics
   */
  generateDashboardMetrics(): DashboardMetrics {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Get recent metrics
    const recentMetrics = this.metrics.filter((m) => m.timestamp >= thirtyDaysAgo);
    const lastWeekMetrics = this.metrics.filter((m) => m.timestamp >= sevenDaysAgo);

    // Calculate current metrics
    const currentAccuracy = this.calculateAverageMetric(
      recentMetrics.filter((m) => m.metric_name === 'accuracy'),
      95
    );
    const currentSatisfaction = this.calculateAverageMetric(
      recentMetrics.filter((m) => m.metric_name === 'user_satisfaction'),
      4.0
    );
    const currentTeachingValue = this.calculateAverageMetric(
      recentMetrics.filter((m) => m.metric_name === 'teaching_value'),
      85
    );
    const currentWarmth = this.calculateAverageMetric(
      recentMetrics.filter((m) => m.metric_name === 'warmth'),
      4.3
    );

    // Calculate trends
    const accuracyTrend = this.calculateTrend(
      recentMetrics.filter((m) => m.metric_name === 'accuracy'),
      sevenDaysAgo
    );
    const satisfactionTrend = this.calculateTrend(
      recentMetrics.filter((m) => m.metric_name === 'user_satisfaction'),
      sevenDaysAgo
    );
    const teachingTrend = this.calculateTrend(
      recentMetrics.filter((m) => m.metric_name === 'teaching_value'),
      sevenDaysAgo
    );
    const warmthTrend = this.calculateTrend(
      recentMetrics.filter((m) => m.metric_name === 'warmth'),
      sevenDaysAgo
    );

    // Calculate velocity
    const improvementRate = this.calculateImprovementVelocity(lastWeekMetrics);
    const daysTo95 = this.estimateDaysToTarget(currentAccuracy, improvementRate);

    // Gate status
    const criticalGates = this.getGateStatus('CRITICAL');
    const highGates = this.getGateStatus('HIGH');

    // Dimension health
    const dimensionHealth: Record<string, any> = {};
    for (const [dimensionId, history] of this.dimensionHistory) {
      if (history.length > 0) {
        const latest = history[history.length - 1];
        dimensionHealth[dimensionId] = {
          pass_rate: latest.avg_pass_rate,
          trend: latest.trend,
          critical_failures: latest.critical_failures_count,
        };
      }
    }

    // User impact metrics
    const userActionRate = this.calculateAverageMetric(
      recentMetrics.filter((m) => m.metric_name === 'user_action_rate'),
      40
    );
    const confidenceImprovement = this.calculateAverageMetric(
      recentMetrics.filter((m) => m.metric_name === 'confidence_improvement'),
      7.0
    );
    const netWorthImprovement = this.calculateAverageMetric(
      recentMetrics.filter((m) => m.metric_name === 'net_worth_improvement'),
      55
    );

    return {
      current_accuracy: currentAccuracy,
      current_user_satisfaction: currentSatisfaction,
      current_teaching_value: currentTeachingValue,
      current_warmth: currentWarmth,
      accuracy_trend_7d: accuracyTrend,
      satisfaction_trend_7d: satisfactionTrend,
      teaching_trend_7d: teachingTrend,
      warmth_trend_7d: warmthTrend,
      weekly_improvement_rate: improvementRate,
      days_to_95_percent: daysTo95,
      critical_gates_passing: criticalGates.passing,
      critical_gates_total: criticalGates.total,
      high_gates_passing: highGates.passing,
      high_gates_total: highGates.total,
      dimension_health: dimensionHealth,
      user_action_rate: userActionRate,
      user_confidence_improvement: confidenceImprovement,
      net_worth_improvement_rate: netWorthImprovement,
    };
  }

  /**
   * Check metrics against thresholds and generate alerts
   */
  checkMetricsAndGenerateAlerts(): MetricsAlert[] {
    const newAlerts: MetricsAlert[] = [];
    const dashboard = this.generateDashboardMetrics();

    // Check accuracy
    if (dashboard.current_accuracy < 90) {
      newAlerts.push({
        severity: 'critical',
        metric: 'accuracy',
        current_value: dashboard.current_accuracy,
        threshold: 90,
        message: `Accuracy dropped below 90%: ${dashboard.current_accuracy.toFixed(1)}%`,
        timestamp: Date.now(),
      });
    } else if (dashboard.current_accuracy < 95) {
      newAlerts.push({
        severity: 'high',
        metric: 'accuracy',
        current_value: dashboard.current_accuracy,
        threshold: 95,
        message: `Accuracy below target: ${dashboard.current_accuracy.toFixed(1)}%`,
        timestamp: Date.now(),
      });
    }

    // Check critical gates
    if (dashboard.critical_gates_passing < dashboard.critical_gates_total) {
      newAlerts.push({
        severity: 'critical',
        metric: 'critical_gates',
        current_value: dashboard.critical_gates_passing,
        threshold: dashboard.critical_gates_total,
        message: `${dashboard.critical_gates_total - dashboard.critical_gates_passing} critical gates failing`,
        timestamp: Date.now(),
      });
    }

    // Check declining trends
    if (dashboard.accuracy_trend_7d < -2) {
      newAlerts.push({
        severity: 'high',
        metric: 'accuracy_trend',
        current_value: dashboard.accuracy_trend_7d,
        threshold: 0,
        message: `Accuracy declining: ${dashboard.accuracy_trend_7d.toFixed(2)}% per week`,
        timestamp: Date.now(),
      });
    }

    // Check user satisfaction
    if (dashboard.current_user_satisfaction < 3.5) {
      newAlerts.push({
        severity: 'high',
        metric: 'user_satisfaction',
        current_value: dashboard.current_user_satisfaction,
        threshold: 3.5,
        message: `User satisfaction below threshold: ${dashboard.current_user_satisfaction.toFixed(2)}/5.0`,
        timestamp: Date.now(),
      });
    }

    this.alerts = newAlerts;
    return newAlerts;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): MetricsAlert[] {
    return this.alerts;
  }

  /**
   * Get metrics for a specific time range
   */
  getMetricsForTimeRange(startTime: number, endTime: number): MetricSnapshot[] {
    return this.metrics.filter((m) => m.timestamp >= startTime && m.timestamp <= endTime);
  }

  /**
   * Get dimension metrics history
   */
  getDimensionHistory(dimensionId: string): DimensionMetrics[] {
    return this.dimensionHistory.get(dimensionId) || [];
  }

  /**
   * Calculate average metric value
   */
  private calculateAverageMetric(metrics: MetricSnapshot[], defaultValue: number): number {
    if (metrics.length === 0) return defaultValue;
    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  /**
   * Calculate trend (% change over time period)
   */
  private calculateTrend(metrics: MetricSnapshot[], sinceTime: number): number {
    if (metrics.length < 2) return 0;

    const recent = metrics.filter((m) => m.timestamp >= sinceTime);
    const older = metrics.filter((m) => m.timestamp < sinceTime);

    if (recent.length === 0 || older.length === 0) return 0;

    const recentAvg = recent.reduce((sum, m) => sum + m.value, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.value, 0) / older.length;

    return ((recentAvg - olderAvg) / olderAvg) * 100;
  }

  /**
   * Calculate improvement velocity
   */
  private calculateImprovementVelocity(metrics: MetricSnapshot[]): number {
    const accuracyMetrics = metrics.filter((m) => m.metric_name === 'accuracy');
    if (accuracyMetrics.length < 2) return 0;

    const sorted = accuracyMetrics.sort((a, b) => a.timestamp - b.timestamp);
    const first = sorted[0].value;
    const last = sorted[sorted.length - 1].value;

    return ((last - first) / first) * 100;
  }

  /**
   * Estimate days to reach 95% target
   */
  private estimateDaysToTarget(currentValue: number, weeklyRate: number): number {
    if (currentValue >= 95) return 0;
    if (weeklyRate <= 0) return Infinity;

    const improvementNeeded = 95 - currentValue;
    const weeksNeeded = improvementNeeded / weeklyRate;
    return Math.ceil(weeksNeeded * 7);
  }

  /**
   * Get gate status
   */
  private getGateStatus(severity: 'CRITICAL' | 'HIGH'): { passing: number; total: number } {
    // This would be connected to actual gate tracking
    // For now, return placeholder
    return { passing: 26, total: 26 };
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(format: 'json' | 'csv'): string {
    if (format === 'json') {
      return JSON.stringify(
        {
          exported_at: new Date().toISOString(),
          total_metrics: this.metrics.length,
          metrics: this.metrics.slice(-1000), // Last 1000 metrics
          dashboard: this.generateDashboardMetrics(),
          alerts: this.alerts,
        },
        null,
        2
      );
    }

    // CSV format
    const headers = ['timestamp', 'metric_name', 'value', 'dimension', 'tags'];
    const rows = this.metrics.slice(-1000).map((m) => [
      new Date(m.timestamp).toISOString(),
      m.metric_name,
      m.value.toString(),
      m.dimension || '',
      JSON.stringify(m.tags || {}),
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }
}

/**
 * Singleton instance
 */
let dashboardInstance: MetricsDashboard | null = null;

export function initializeMetricsDashboard(): MetricsDashboard {
  dashboardInstance = new MetricsDashboard();
  return dashboardInstance;
}

export function getMetricsDashboard(): MetricsDashboard {
  if (!dashboardInstance) {
    dashboardInstance = new MetricsDashboard();
  }
  return dashboardInstance;
}
