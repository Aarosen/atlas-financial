/**
 * ATLAS AI v4.0 Weekly Improvement Monitor
 * 
 * Tracks improvement velocity weekly and generates actionable reports
 * for continuous enhancement of Atlas AI quality
 */

import type { ContinuousImprovementReport } from './continuous-improvement-chain';
import type { DashboardMetrics } from './metrics-dashboard';

export interface WeeklyReport {
  week_start: number;
  week_end: number;
  week_number: number;
  
  // Metrics
  metrics: DashboardMetrics;
  
  // Improvement velocity
  accuracy_improvement: number; // % change
  satisfaction_improvement: number;
  teaching_improvement: number;
  warmth_improvement: number;
  
  // Trend analysis
  trend_direction: 'accelerating' | 'steady' | 'decelerating' | 'declining';
  trend_confidence: number; // 0-1
  
  // Goals
  on_track_for_95_percent: boolean;
  weeks_until_target: number;
  
  // Recommendations
  top_recommendations: Array<{
    priority: 'critical' | 'high' | 'medium';
    action: string;
    expected_impact: string;
    effort: 'low' | 'medium' | 'high';
  }>;
  
  // Alerts
  critical_alerts: string[];
  high_alerts: string[];
}

export interface MonitoringConfig {
  reportingDay: number; // 0-6 (Sunday-Saturday)
  reportingHour: number; // 0-23
  targetAccuracy: number; // Default 95
  alertThresholds: {
    accuracy_drop: number; // % drop to trigger alert
    satisfaction_drop: number;
    gate_failures: number;
  };
}

export class WeeklyMonitor {
  private config: MonitoringConfig;
  private weeklyReports: WeeklyReport[] = [];
  private lastReportTime: number = 0;

  constructor(config: MonitoringConfig) {
    this.config = config;
  }

  /**
   * Generate weekly report
   */
  generateWeeklyReport(
    currentMetrics: DashboardMetrics,
    previousMetrics?: DashboardMetrics
  ): WeeklyReport {
    const now = Date.now();
    const weekStart = this.getWeekStart(now);
    const weekEnd = weekStart + 7 * 24 * 60 * 60 * 1000;
    const weekNumber = this.getWeekNumber(now);

    // Calculate improvements
    const accuracyImprovement = previousMetrics
      ? ((currentMetrics.current_accuracy - previousMetrics.current_accuracy) /
          previousMetrics.current_accuracy) *
        100
      : 0;

    const satisfactionImprovement = previousMetrics
      ? ((currentMetrics.current_user_satisfaction - previousMetrics.current_user_satisfaction) /
          previousMetrics.current_user_satisfaction) *
        100
      : 0;

    const teachingImprovement = previousMetrics
      ? ((currentMetrics.current_teaching_value - previousMetrics.current_teaching_value) /
          previousMetrics.current_teaching_value) *
        100
      : 0;

    const warmthImprovement = previousMetrics
      ? ((currentMetrics.current_warmth - previousMetrics.current_warmth) /
          previousMetrics.current_warmth) *
        100
      : 0;

    // Determine trend
    const trend = this.determineTrend(
      accuracyImprovement,
      satisfactionImprovement,
      teachingImprovement,
      warmthImprovement
    );

    // Calculate weeks to target
    const weeksToTarget = this.estimateWeeksToTarget(
      currentMetrics.current_accuracy,
      currentMetrics.weekly_improvement_rate
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(currentMetrics);

    // Generate alerts
    const { critical, high } = this.generateAlerts(currentMetrics, previousMetrics);

    const report: WeeklyReport = {
      week_start: weekStart,
      week_end: weekEnd,
      week_number: weekNumber,
      metrics: currentMetrics,
      accuracy_improvement: accuracyImprovement,
      satisfaction_improvement: satisfactionImprovement,
      teaching_improvement: teachingImprovement,
      warmth_improvement: warmthImprovement,
      trend_direction: trend.direction,
      trend_confidence: trend.confidence,
      on_track_for_95_percent: weeksToTarget <= 4,
      weeks_until_target: weeksToTarget,
      top_recommendations: recommendations,
      critical_alerts: critical,
      high_alerts: high,
    };

    this.weeklyReports.push(report);
    this.lastReportTime = now;

    return report;
  }

  /**
   * Check if weekly report should be generated
   */
  shouldGenerateReport(): boolean {
    const now = new Date();
    const lastReport = new Date(this.lastReportTime);

    // Check if it's the reporting day and hour
    if (
      now.getDay() !== this.config.reportingDay ||
      now.getHours() !== this.config.reportingHour
    ) {
      return false;
    }

    // Check if we haven't generated a report this week
    const daysSinceLastReport = (now.getTime() - lastReport.getTime()) / (24 * 60 * 60 * 1000);
    return daysSinceLastReport >= 7;
  }

  /**
   * Determine trend direction
   */
  private determineTrend(
    accuracy: number,
    satisfaction: number,
    teaching: number,
    warmth: number
  ): { direction: 'accelerating' | 'steady' | 'decelerating' | 'declining'; confidence: number } {
    const improvements = [accuracy, satisfaction, teaching, warmth];
    const avgImprovement = improvements.reduce((a, b) => a + b, 0) / improvements.length;
    const variance =
      improvements.reduce((sum, val) => sum + Math.pow(val - avgImprovement, 2), 0) /
      improvements.length;
    const stdDev = Math.sqrt(variance);

    let direction: 'accelerating' | 'steady' | 'decelerating' | 'declining';
    let confidence = 1 - stdDev / 100; // Higher consistency = higher confidence

    if (avgImprovement > 2) {
      direction = 'accelerating';
    } else if (avgImprovement > 0.5) {
      direction = 'steady';
    } else if (avgImprovement > -0.5) {
      direction = 'decelerating';
    } else {
      direction = 'declining';
    }

    return { direction, confidence: Math.max(0, Math.min(1, confidence)) };
  }

  /**
   * Estimate weeks to reach target
   */
  private estimateWeeksToTarget(currentAccuracy: number, weeklyRate: number): number {
    if (currentAccuracy >= this.config.targetAccuracy) return 0;
    if (weeklyRate <= 0) return Infinity;

    const improvementNeeded = this.config.targetAccuracy - currentAccuracy;
    return Math.ceil(improvementNeeded / weeklyRate);
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    metrics: DashboardMetrics
  ): WeeklyReport['top_recommendations'] {
    const recommendations: WeeklyReport['top_recommendations'] = [];

    // Check accuracy
    if (metrics.current_accuracy < 90) {
      recommendations.push({
        priority: 'critical',
        action: 'Investigate accuracy degradation immediately',
        expected_impact: 'Restore accuracy to 95%+',
        effort: 'high',
      });
    } else if (metrics.current_accuracy < 95) {
      recommendations.push({
        priority: 'high',
        action: 'Focus on improving accuracy through targeted fixes',
        expected_impact: `Gain ${(95 - metrics.current_accuracy).toFixed(1)}% accuracy`,
        effort: 'medium',
      });
    }

    // Check critical gates
    if (metrics.critical_gates_passing < metrics.critical_gates_total) {
      recommendations.push({
        priority: 'critical',
        action: `Fix ${metrics.critical_gates_total - metrics.critical_gates_passing} failing critical gates`,
        expected_impact: 'Unblock deployment',
        effort: 'high',
      });
    }

    // Check declining trends
    if (metrics.accuracy_trend_7d < -1) {
      recommendations.push({
        priority: 'high',
        action: 'Investigate root cause of accuracy decline',
        expected_impact: 'Reverse negative trend',
        effort: 'medium',
      });
    }

    // Check user satisfaction
    if (metrics.current_user_satisfaction < 3.5) {
      recommendations.push({
        priority: 'high',
        action: 'Improve user experience and response quality',
        expected_impact: 'Increase satisfaction to 4.0+',
        effort: 'medium',
      });
    }

    // Check dimension health
    for (const [dimensionId, health] of Object.entries(metrics.dimension_health)) {
      if (health.critical_failures > 0) {
        recommendations.push({
          priority: 'critical',
          action: `Fix critical failures in ${dimensionId}`,
          expected_impact: 'Improve dimension quality',
          effort: 'high',
        });
      } else if (health.pass_rate < 85) {
        recommendations.push({
          priority: 'high',
          action: `Improve ${dimensionId} to 95%+ pass rate`,
          expected_impact: `Gain ${(95 - health.pass_rate).toFixed(1)}% quality`,
          effort: 'medium',
        });
      }
    }

    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  /**
   * Generate alerts
   */
  private generateAlerts(
    currentMetrics: DashboardMetrics,
    previousMetrics?: DashboardMetrics
  ): { critical: string[]; high: string[] } {
    const critical: string[] = [];
    const high: string[] = [];

    // Check accuracy
    if (currentMetrics.current_accuracy < 85) {
      critical.push(`CRITICAL: Accuracy at ${currentMetrics.current_accuracy.toFixed(1)}%`);
    } else if (currentMetrics.current_accuracy < 90) {
      high.push(`HIGH: Accuracy at ${currentMetrics.current_accuracy.toFixed(1)}%`);
    }

    // Check critical gates
    if (currentMetrics.critical_gates_passing < currentMetrics.critical_gates_total) {
      critical.push(
        `CRITICAL: ${currentMetrics.critical_gates_total - currentMetrics.critical_gates_passing} critical gates failing`
      );
    }

    // Check accuracy drop
    if (previousMetrics) {
      const accuracyDrop = previousMetrics.current_accuracy - currentMetrics.current_accuracy;
      if (accuracyDrop > this.config.alertThresholds.accuracy_drop) {
        high.push(`HIGH: Accuracy dropped ${accuracyDrop.toFixed(1)}% this week`);
      }
    }

    // Check user satisfaction
    if (currentMetrics.current_user_satisfaction < 3.0) {
      critical.push(
        `CRITICAL: User satisfaction at ${currentMetrics.current_user_satisfaction.toFixed(2)}/5.0`
      );
    } else if (currentMetrics.current_user_satisfaction < 3.5) {
      high.push(
        `HIGH: User satisfaction at ${currentMetrics.current_user_satisfaction.toFixed(2)}/5.0`
      );
    }

    return { critical, high };
  }

  /**
   * Get week start timestamp
   */
  private getWeekStart(timestamp: number): number {
    const date = new Date(timestamp);
    const day = date.getDay();
    const diff = date.getDate() - day;
    const weekStart = new Date(date.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart.getTime();
  }

  /**
   * Get week number
   */
  private getWeekNumber(timestamp: number): number {
    const date = new Date(timestamp);
    const firstDay = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDay.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDay.getDay() + 1) / 7);
  }

  /**
   * Get weekly reports
   */
  getWeeklyReports(): WeeklyReport[] {
    return this.weeklyReports;
  }

  /**
   * Get latest report
   */
  getLatestReport(): WeeklyReport | null {
    return this.weeklyReports.length > 0 ? this.weeklyReports[this.weeklyReports.length - 1] : null;
  }

  /**
   * Format report for display
   */
  formatReportForDisplay(report: WeeklyReport): string {
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════════════════════════════════');
    lines.push(`ATLAS AI v4.0 — WEEKLY IMPROVEMENT REPORT (Week ${report.week_number})`);
    lines.push('═══════════════════════════════════════════════════════════════════');
    lines.push('');

    lines.push('📊 WEEKLY IMPROVEMENTS');
    lines.push('─────────────────────────────────────────────────────────────────');
    lines.push(`Accuracy: ${report.accuracy_improvement > 0 ? '+' : ''}${report.accuracy_improvement.toFixed(2)}%`);
    lines.push(
      `Satisfaction: ${report.satisfaction_improvement > 0 ? '+' : ''}${report.satisfaction_improvement.toFixed(2)}%`
    );
    lines.push(`Teaching: ${report.teaching_improvement > 0 ? '+' : ''}${report.teaching_improvement.toFixed(2)}%`);
    lines.push(`Warmth: ${report.warmth_improvement > 0 ? '+' : ''}${report.warmth_improvement.toFixed(2)}%`);
    lines.push('');

    lines.push('📈 TREND ANALYSIS');
    lines.push('─────────────────────────────────────────────────────────────────');
    const trendIcon =
      report.trend_direction === 'accelerating'
        ? '🚀'
        : report.trend_direction === 'steady'
          ? '→'
          : report.trend_direction === 'decelerating'
            ? '↘'
            : '📉';
    lines.push(
      `${trendIcon} ${report.trend_direction.toUpperCase()} (confidence: ${(report.trend_confidence * 100).toFixed(0)}%)`
    );
    lines.push(
      `On track for 95%: ${report.on_track_for_95_percent ? '✅ YES' : '❌ NO'} (${report.weeks_until_target} weeks)`
    );
    lines.push('');

    if (report.critical_alerts.length > 0) {
      lines.push('🚨 CRITICAL ALERTS');
      lines.push('─────────────────────────────────────────────────────────────────');
      for (const alert of report.critical_alerts) {
        lines.push(`  • ${alert}`);
      }
      lines.push('');
    }

    if (report.high_alerts.length > 0) {
      lines.push('⚠️ HIGH PRIORITY ALERTS');
      lines.push('─────────────────────────────────────────────────────────────────');
      for (const alert of report.high_alerts) {
        lines.push(`  • ${alert}`);
      }
      lines.push('');
    }

    if (report.top_recommendations.length > 0) {
      lines.push('💡 TOP RECOMMENDATIONS');
      lines.push('─────────────────────────────────────────────────────────────────');
      for (const rec of report.top_recommendations) {
        const priorityIcon = rec.priority === 'critical' ? '🔴' : rec.priority === 'high' ? '🟠' : '🟡';
        lines.push(`${priorityIcon} ${rec.action}`);
        lines.push(`   Impact: ${rec.expected_impact}`);
        lines.push(`   Effort: ${rec.effort}`);
      }
      lines.push('');
    }

    lines.push('═══════════════════════════════════════════════════════════════════');

    return lines.join('\n');
  }
}

/**
 * Singleton instance
 */
let monitorInstance: WeeklyMonitor | null = null;

export function initializeWeeklyMonitor(config: MonitoringConfig): WeeklyMonitor {
  monitorInstance = new WeeklyMonitor(config);
  return monitorInstance;
}

export function getWeeklyMonitor(): WeeklyMonitor {
  if (!monitorInstance) {
    monitorInstance = new WeeklyMonitor({
      reportingDay: 1, // Monday
      reportingHour: 9, // 9 AM
      targetAccuracy: 95,
      alertThresholds: {
        accuracy_drop: 2,
        satisfaction_drop: 0.5,
        gate_failures: 1,
      },
    });
  }
  return monitorInstance;
}
