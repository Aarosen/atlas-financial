/**
 * ATLAS AI v4.0 Continuous Improvement Cycle
 * 
 * Orchestrates the complete feedback loop:
 * Production → Evaluation → Metrics → Analysis → Recommendations → Implementation → Repeat
 */

import type { ProductionResponse, FullEvaluationResult } from './evaluation-pipeline';
import type { DashboardMetrics } from './metrics-dashboard';
import type { WeeklyReport } from './weekly-monitor';
import type { ContinuousImprovementReport } from './continuous-improvement-chain';
import { getProduction } from './production-integration';
import { getMetricsDashboard } from './metrics-dashboard';
import { getWeeklyMonitor } from './weekly-monitor';
import { getAlertSystem } from './alert-system';

export interface ImprovementCycleConfig {
  cycleInterval: number; // ms between improvement cycles
  evaluationBatchSize: number;
  autoImplementRecommendations: boolean;
  notifyOnCompletion: boolean;
}

export interface CycleResult {
  cycle_id: string;
  timestamp: number;
  duration_ms: number;
  
  // Evaluation results
  responses_evaluated: number;
  evaluation_pass_rate: number;
  
  // Metrics
  metrics_snapshot: DashboardMetrics;
  
  // Analysis
  improvement_report: ContinuousImprovementReport;
  
  // Recommendations
  critical_recommendations: number;
  high_recommendations: number;
  
  // Status
  deployment_ready: boolean;
  alerts_generated: number;
}

export class ImprovementCycle {
  private config: ImprovementCycleConfig;
  private cycleHistory: CycleResult[] = [];
  private isRunning = false;
  private cycleTimer: NodeJS.Timeout | null = null;

  constructor(config: ImprovementCycleConfig) {
    this.config = config;
  }

  /**
   * Start continuous improvement cycle
   */
  start(): void {
    if (this.isRunning) {
      console.warn('⚠️ Improvement cycle already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting continuous improvement cycle');

    // Run immediately
    this.runCycle();

    // Schedule recurring cycles
    this.cycleTimer = setInterval(() => {
      this.runCycle();
    }, this.config.cycleInterval);
  }

  /**
   * Stop continuous improvement cycle
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.cycleTimer) {
      clearInterval(this.cycleTimer);
    }
    console.log('✅ Improvement cycle stopped');
  }

  /**
   * Run a single improvement cycle
   */
  private async runCycle(): Promise<void> {
    const cycleId = `cycle-${Date.now()}`;
    const startTime = Date.now();

    try {
      console.log(`\n📊 Starting improvement cycle ${cycleId}`);

      // Step 1: Evaluate recent responses
      const evaluationResults = await this.evaluateResponses();

      // Step 2: Collect and analyze metrics
      const metrics = this.analyzeMetrics();

      // Step 3: Generate improvement report
      const improvementReport = this.generateImprovementReport();

      // Step 4: Generate alerts
      const alertsGenerated = await this.generateAlerts(metrics, improvementReport);

      // Step 5: Create recommendations
      const { critical, high } = this.countRecommendations(improvementReport);

      // Step 6: Check deployment readiness
      const deploymentReady = this.checkDeploymentReadiness(metrics, improvementReport);

      // Step 7: Optionally implement recommendations
      if (this.config.autoImplementRecommendations && deploymentReady) {
        await this.implementRecommendations(improvementReport);
      }

      // Create cycle result
      const result: CycleResult = {
        cycle_id: cycleId,
        timestamp: Date.now(),
        duration_ms: Date.now() - startTime,
        responses_evaluated: evaluationResults.total,
        evaluation_pass_rate: evaluationResults.passRate,
        metrics_snapshot: metrics,
        improvement_report: improvementReport,
        critical_recommendations: critical,
        high_recommendations: high,
        deployment_ready: deploymentReady,
        alerts_generated: alertsGenerated,
      };

      this.cycleHistory.push(result);

      // Log cycle completion
      this.logCycleCompletion(result);

      // Notify if configured
      if (this.config.notifyOnCompletion) {
        await this.notifyCycleCompletion(result);
      }
    } catch (error) {
      console.error(`❌ Error in improvement cycle ${cycleId}:`, error);
    }
  }

  /**
   * Evaluate recent responses
   */
  private async evaluateResponses(): Promise<{ total: number; passed: number; passRate: number }> {
    const production = getProduction();
    const stats = production.getEvaluationStats();

    return {
      total: stats.total_evaluated,
      passed: stats.total_passed,
      passRate: stats.total_evaluated > 0 ? (stats.total_passed / stats.total_evaluated) * 100 : 0,
    };
  }

  /**
   * Analyze current metrics
   */
  private analyzeMetrics(): DashboardMetrics {
    const dashboard = getMetricsDashboard();
    return dashboard.generateDashboardMetrics();
  }

  /**
   * Generate improvement report
   */
  private generateImprovementReport(): ContinuousImprovementReport {
    const production = getProduction();
    return production.getImprovementReport();
  }

  /**
   * Generate alerts based on metrics and report
   */
  private async generateAlerts(
    metrics: DashboardMetrics,
    report: ContinuousImprovementReport
  ): Promise<number> {
    const alertSystem = getAlertSystem();
    let alertCount = 0;

    // Check for critical issues
    if (metrics.critical_gates_passing < metrics.critical_gates_total) {
      await alertSystem.sendAlert({
        severity: 'critical',
        title: 'Critical Gates Failing',
        message: `${metrics.critical_gates_total - metrics.critical_gates_passing} critical deployment gates are failing`,
        metric: 'critical_gates',
        current_value: metrics.critical_gates_passing,
        threshold: metrics.critical_gates_total,
        recommended_action: 'Fix critical gate failures immediately',
      });
      alertCount++;
    }

    // Check for accuracy issues
    if (metrics.current_accuracy < 90) {
      await alertSystem.sendAlert({
        severity: 'critical',
        title: 'Accuracy Critical',
        message: `Accuracy has dropped to ${metrics.current_accuracy.toFixed(1)}%`,
        metric: 'accuracy',
        current_value: metrics.current_accuracy,
        threshold: 90,
        recommended_action: 'Investigate and fix accuracy degradation',
      });
      alertCount++;
    } else if (metrics.current_accuracy < 95) {
      await alertSystem.sendAlert({
        severity: 'high',
        title: 'Accuracy Below Target',
        message: `Accuracy is ${metrics.current_accuracy.toFixed(1)}%, target is 95%`,
        metric: 'accuracy',
        current_value: metrics.current_accuracy,
        threshold: 95,
        recommended_action: 'Improve accuracy through targeted fixes',
      });
      alertCount++;
    }

    // Check for declining trends
    if (metrics.accuracy_trend_7d < -2) {
      await alertSystem.sendAlert({
        severity: 'high',
        title: 'Accuracy Declining',
        message: `Accuracy declined ${Math.abs(metrics.accuracy_trend_7d).toFixed(2)}% this week`,
        metric: 'accuracy_trend',
        current_value: metrics.accuracy_trend_7d,
        threshold: 0,
        recommended_action: 'Investigate root cause of decline',
      });
      alertCount++;
    }

    return alertCount;
  }

  /**
   * Count recommendations by priority
   */
  private countRecommendations(
    report: ContinuousImprovementReport
  ): { critical: number; high: number } {
    let critical = 0;
    let high = 0;

    for (const rec of report.recommendations) {
      if (rec.priority === 'critical') {
        critical++;
      } else if (rec.priority === 'high') {
        high++;
      }
    }

    return { critical, high };
  }

  /**
   * Check if deployment is ready
   */
  private checkDeploymentReadiness(
    metrics: DashboardMetrics,
    report: ContinuousImprovementReport
  ): boolean {
    return (
      metrics.critical_gates_passing === metrics.critical_gates_total &&
      metrics.current_accuracy >= 95 &&
      report.deployment_blockers.length === 0
    );
  }

  /**
   * Implement recommendations (if auto-implementation enabled)
   */
  private async implementRecommendations(report: ContinuousImprovementReport): Promise<void> {
    console.log('🔧 Implementing recommendations...');

    // This would integrate with actual implementation systems
    // For now, just log the recommendations
    for (const rec of report.recommendations.slice(0, 3)) {
      console.log(`  • ${rec.recommended_action}`);
    }
  }

  /**
   * Log cycle completion
   */
  private logCycleCompletion(result: CycleResult): void {
    const status = result.deployment_ready ? '✅' : '⏳';
    console.log(`\n${status} Improvement Cycle Complete`);
    console.log(`  Duration: ${result.duration_ms}ms`);
    console.log(`  Responses Evaluated: ${result.responses_evaluated}`);
    console.log(`  Pass Rate: ${result.evaluation_pass_rate.toFixed(1)}%`);
    console.log(`  Accuracy: ${result.metrics_snapshot.current_accuracy.toFixed(1)}%`);
    console.log(`  Alerts: ${result.alerts_generated}`);
    console.log(`  Recommendations: ${result.critical_recommendations} critical, ${result.high_recommendations} high`);
    console.log(`  Deployment Ready: ${result.deployment_ready ? 'YES' : 'NO'}`);
  }

  /**
   * Notify of cycle completion
   */
  private async notifyCycleCompletion(result: CycleResult): Promise<void> {
    // TODO: Send notifications to stakeholders
    console.log(`📧 Sending cycle completion notification...`);
  }

  /**
   * Get cycle history
   */
  getCycleHistory(limit: number = 100): CycleResult[] {
    return this.cycleHistory.slice(-limit);
  }

  /**
   * Get latest cycle result
   */
  getLatestCycle(): CycleResult | null {
    return this.cycleHistory.length > 0 ? this.cycleHistory[this.cycleHistory.length - 1] : null;
  }

  /**
   * Get cycle statistics
   */
  getCycleStats(): {
    total_cycles: number;
    avg_duration_ms: number;
    avg_pass_rate: number;
    deployment_ready_cycles: number;
  } {
    if (this.cycleHistory.length === 0) {
      return {
        total_cycles: 0,
        avg_duration_ms: 0,
        avg_pass_rate: 0,
        deployment_ready_cycles: 0,
      };
    }

    const avgDuration =
      this.cycleHistory.reduce((sum, c) => sum + c.duration_ms, 0) / this.cycleHistory.length;
    const avgPassRate =
      this.cycleHistory.reduce((sum, c) => sum + c.evaluation_pass_rate, 0) /
      this.cycleHistory.length;
    const deploymentReady = this.cycleHistory.filter((c) => c.deployment_ready).length;

    return {
      total_cycles: this.cycleHistory.length,
      avg_duration_ms: avgDuration,
      avg_pass_rate: avgPassRate,
      deployment_ready_cycles: deploymentReady,
    };
  }

  /**
   * Check if cycle is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

/**
 * Singleton instance
 */
let cycleInstance: ImprovementCycle | null = null;

export function initializeImprovementCycle(config: ImprovementCycleConfig): ImprovementCycle {
  cycleInstance = new ImprovementCycle(config);
  return cycleInstance;
}

export function getImprovementCycle(): ImprovementCycle {
  if (!cycleInstance) {
    cycleInstance = new ImprovementCycle({
      cycleInterval: 60 * 60 * 1000, // 1 hour
      evaluationBatchSize: 100,
      autoImplementRecommendations: false,
      notifyOnCompletion: true,
    });
  }
  return cycleInstance;
}
