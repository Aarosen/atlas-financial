/**
 * ATLAS AI v4.0 Production Integration
 * 
 * Connects all evaluation components to the production response stream
 * Enables real-time metrics collection, LLM judge evaluation, and continuous improvement
 */

import type { ProductionResponse, FullEvaluationResult } from './evaluation-pipeline';
import type { ResponseMetrics } from './continuous-improvement-chain';
import type { MetricSnapshot } from './metrics-dashboard';
import { getEvaluationPipeline } from './evaluation-pipeline';
import { getMetricsDashboard } from './metrics-dashboard';
import { getWeeklyMonitor } from './weekly-monitor';
import { getLLMJudgeClient } from './llm-judge-client';
import { ContinuousImprovementChain } from './continuous-improvement-chain';

export interface ProductionConfig {
  enableEvaluation: boolean;
  enableMetrics: boolean;
  enableWeeklyMonitoring: boolean;
  enableAlerts: boolean;
  evaluationSampleRate: number; // 0-1, percentage of responses to evaluate
  metricsCollectionInterval: number; // ms between metric aggregations
  weeklyMonitoringEnabled: boolean;
}

export class ProductionIntegration {
  private config: ProductionConfig;
  private improvementChain: ContinuousImprovementChain;
  private evaluationQueue: ProductionResponse[] = [];
  private metricsCollectionTimer: NodeJS.Timeout | null = null;
  private weeklyMonitoringTimer: NodeJS.Timeout | null = null;
  private evaluationStats = {
    total_evaluated: 0,
    total_passed: 0,
    total_failed: 0,
    critical_failures: 0,
  };

  constructor(config: ProductionConfig) {
    this.config = config;
    this.improvementChain = new ContinuousImprovementChain();
  }

  /**
   * Initialize production integration
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing ATLAS AI v4.0 Production Integration...');

    // Start metrics collection
    if (this.config.enableMetrics) {
      this.startMetricsCollection();
      console.log('✅ Metrics collection enabled');
    }

    // Start weekly monitoring
    if (this.config.enableWeeklyMonitoring) {
      this.startWeeklyMonitoring();
      console.log('✅ Weekly monitoring enabled');
    }

    console.log('✅ Production integration initialized');
  }

  /**
   * Process a production response through the evaluation pipeline
   */
  async evaluateResponse(response: ProductionResponse): Promise<FullEvaluationResult | null> {
    // Check sample rate
    if (Math.random() > this.config.evaluationSampleRate) {
      return null;
    }

    if (!this.config.enableEvaluation) {
      return null;
    }

    try {
      const pipeline = getEvaluationPipeline();
      const result = await pipeline.evaluateResponse(response);

      // Update stats
      this.evaluationStats.total_evaluated++;
      if (result.overall_pass) {
        this.evaluationStats.total_passed++;
      } else {
        this.evaluationStats.total_failed++;
      }
      if (result.severity === 'CRITICAL') {
        this.evaluationStats.critical_failures++;
      }

      // Record metrics
      if (this.config.enableMetrics) {
        this.recordMetrics(result);
      }

      // Check for alerts
      if (this.config.enableAlerts) {
        this.checkAndGenerateAlerts(result);
      }

      // Record in improvement chain
      this.improvementChain.recordResponseMetrics(result.metrics);

      return result;
    } catch (error) {
      console.error('Error evaluating response:', error);
      return null;
    }
  }

  /**
   * Record metrics from evaluation result
   */
  private recordMetrics(result: FullEvaluationResult): void {
    const dashboard = getMetricsDashboard();

    // Record individual metric snapshots
    for (const snapshot of result.metric_snapshots) {
      dashboard.recordMetric(snapshot);
    }

    // Record response metrics
    dashboard.recordMetric({
      timestamp: result.timestamp,
      metric_name: 'evaluation_time',
      value: result.total_evaluation_time_ms,
    });

    dashboard.recordMetric({
      timestamp: result.timestamp,
      metric_name: 'deployment_recommendation',
      value: result.deployment_recommendation === 'PASS' ? 1 : 0,
    });
  }

  /**
   * Check for alerts and generate if needed
   */
  private checkAndGenerateAlerts(result: FullEvaluationResult): void {
    const dashboard = getMetricsDashboard();
    const alerts = dashboard.checkMetricsAndGenerateAlerts();

    if (alerts.length > 0) {
      console.warn(`⚠️ ${alerts.length} alerts generated`);
      for (const alert of alerts) {
        this.sendAlert(alert);
      }
    }
  }

  /**
   * Send alert (integration point for notification system)
   */
  private sendAlert(alert: any): void {
    const severity = alert.severity.toUpperCase();
    const message = `[${severity}] ${alert.metric}: ${alert.message}`;

    if (alert.severity === 'critical') {
      console.error(`🚨 ${message}`);
      // TODO: Send to alert service (Slack, PagerDuty, etc.)
    } else if (alert.severity === 'high') {
      console.warn(`⚠️ ${message}`);
      // TODO: Send to alert service
    } else {
      console.log(`ℹ️ ${message}`);
    }
  }

  /**
   * Start metrics collection timer
   */
  private startMetricsCollection(): void {
    this.metricsCollectionTimer = setInterval(() => {
      const dashboard = getMetricsDashboard();
      const metrics = dashboard.generateDashboardMetrics();

      // Log current metrics
      console.log(`📊 Metrics Update: Accuracy=${metrics.current_accuracy.toFixed(1)}%, Satisfaction=${metrics.current_user_satisfaction.toFixed(2)}/5.0`);

      // Check for alerts
      const alerts = dashboard.checkMetricsAndGenerateAlerts();
      if (alerts.length > 0) {
        console.warn(`⚠️ ${alerts.length} active alerts`);
      }
    }, this.config.metricsCollectionInterval);
  }

  /**
   * Start weekly monitoring timer
   */
  private startWeeklyMonitoring(): void {
    this.weeklyMonitoringTimer = setInterval(() => {
      const monitor = getWeeklyMonitor();

      if (monitor.shouldGenerateReport()) {
        const dashboard = getMetricsDashboard();
        const currentMetrics = dashboard.generateDashboardMetrics();
        const report = monitor.generateWeeklyReport(currentMetrics);

        console.log('\n' + monitor.formatReportForDisplay(report) + '\n');

        // Send report to stakeholders
        this.sendWeeklyReport(report);
      }
    }, 60 * 60 * 1000); // Check every hour
  }

  /**
   * Send weekly report (integration point for reporting system)
   */
  private sendWeeklyReport(report: any): void {
    // TODO: Send to reporting service (email, Slack, dashboard, etc.)
    console.log(`📧 Weekly report generated for week ${report.week_number}`);
  }

  /**
   * Get evaluation statistics
   */
  getEvaluationStats(): typeof this.evaluationStats {
    return { ...this.evaluationStats };
  }

  /**
   * Get improvement report
   */
  getImprovementReport() {
    return this.improvementChain.generateImprovementReport();
  }

  /**
   * Get dashboard metrics
   */
  getDashboardMetrics() {
    return getMetricsDashboard().generateDashboardMetrics();
  }

  /**
   * Get latest weekly report
   */
  getLatestWeeklyReport() {
    return getWeeklyMonitor().getLatestReport();
  }

  /**
   * Shutdown production integration
   */
  shutdown(): void {
    if (this.metricsCollectionTimer) {
      clearInterval(this.metricsCollectionTimer);
    }
    if (this.weeklyMonitoringTimer) {
      clearInterval(this.weeklyMonitoringTimer);
    }
    console.log('✅ Production integration shutdown');
  }
}

/**
 * Singleton instance
 */
let integrationInstance: ProductionIntegration | null = null;

export function initializeProduction(config: ProductionConfig): ProductionIntegration {
  integrationInstance = new ProductionIntegration(config);
  return integrationInstance;
}

export function getProduction(): ProductionIntegration {
  if (!integrationInstance) {
    throw new Error('Production integration not initialized. Call initializeProduction first.');
  }
  return integrationInstance;
}
