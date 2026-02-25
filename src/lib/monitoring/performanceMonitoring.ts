// Performance Monitoring & Load Testing - Phase 4D
// Real-time performance metrics and load testing framework

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface PerformanceThresholds {
  pageLoadTime: number; // milliseconds
  apiResponseTime: number; // milliseconds
  databaseQueryTime: number; // milliseconds
  errorRate: number; // percentage
  cpuUsage: number; // percentage
  memoryUsage: number; // percentage
}

export interface LoadTestConfig {
  duration: number; // seconds
  rampUp: number; // seconds
  concurrentUsers: number;
  requestsPerSecond: number;
  endpoints: string[];
}

export interface LoadTestResult {
  endpoint: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // requests per second
  errorRate: number; // percentage
}

export const DEFAULT_PERFORMANCE_THRESHOLDS: PerformanceThresholds = {
  pageLoadTime: 3000, // 3 seconds
  apiResponseTime: 500, // 500ms
  databaseQueryTime: 100, // 100ms
  errorRate: 0.1, // 0.1%
  cpuUsage: 80, // 80%
  memoryUsage: 85, // 85%
};

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private thresholds: PerformanceThresholds;
  private alerts: string[] = [];

  constructor(thresholds: Partial<PerformanceThresholds> = {}) {
    this.thresholds = {
      ...DEFAULT_PERFORMANCE_THRESHOLDS,
      ...thresholds,
    };
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, unit: string = 'ms', tags?: Record<string, string>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags,
    };

    this.metrics.push(metric);

    // Check against thresholds
    this.checkThresholds(metric);

    // Keep only last 10000 metrics
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-10000);
    }
  }

  /**
   * Check metric against thresholds
   */
  private checkThresholds(metric: PerformanceMetric): void {
    if (metric.name === 'pageLoadTime' && metric.value > this.thresholds.pageLoadTime) {
      this.alerts.push(`Page load time exceeded threshold: ${metric.value}ms > ${this.thresholds.pageLoadTime}ms`);
    }

    if (metric.name === 'apiResponseTime' && metric.value > this.thresholds.apiResponseTime) {
      this.alerts.push(`API response time exceeded threshold: ${metric.value}ms > ${this.thresholds.apiResponseTime}ms`);
    }

    if (metric.name === 'databaseQueryTime' && metric.value > this.thresholds.databaseQueryTime) {
      this.alerts.push(`Database query time exceeded threshold: ${metric.value}ms > ${this.thresholds.databaseQueryTime}ms`);
    }

    if (metric.name === 'errorRate' && metric.value > this.thresholds.errorRate) {
      this.alerts.push(`Error rate exceeded threshold: ${metric.value}% > ${this.thresholds.errorRate}%`);
    }

    if (metric.name === 'cpuUsage' && metric.value > this.thresholds.cpuUsage) {
      this.alerts.push(`CPU usage exceeded threshold: ${metric.value}% > ${this.thresholds.cpuUsage}%`);
    }

    if (metric.name === 'memoryUsage' && metric.value > this.thresholds.memoryUsage) {
      this.alerts.push(`Memory usage exceeded threshold: ${metric.value}% > ${this.thresholds.memoryUsage}%`);
    }
  }

  /**
   * Get performance statistics
   */
  getStats(metricName?: string): Record<string, any> {
    let relevantMetrics = this.metrics;

    if (metricName) {
      relevantMetrics = this.metrics.filter((m) => m.name === metricName);
    }

    if (relevantMetrics.length === 0) {
      return { count: 0 };
    }

    const values = relevantMetrics.map((m) => m.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / values.length;
    const min = values[0];
    const max = values[values.length - 1];
    const p50 = values[Math.floor(values.length * 0.5)];
    const p95 = values[Math.floor(values.length * 0.95)];
    const p99 = values[Math.floor(values.length * 0.99)];

    return {
      count: values.length,
      average,
      min,
      max,
      p50,
      p95,
      p99,
      sum,
    };
  }

  /**
   * Get alerts
   */
  getAlerts(): string[] {
    return [...this.alerts];
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Get performance report
   */
  getReport(): string {
    const pageLoadStats = this.getStats('pageLoadTime');
    const apiResponseStats = this.getStats('apiResponseTime');
    const dbQueryStats = this.getStats('databaseQueryTime');

    let report = '# Performance Report\n\n';

    report += '## Page Load Time\n';
    report += `- Average: ${pageLoadStats.average?.toFixed(2)}ms\n`;
    report += `- Min: ${pageLoadStats.min}ms\n`;
    report += `- Max: ${pageLoadStats.max}ms\n`;
    report += `- P95: ${pageLoadStats.p95}ms\n`;
    report += `- P99: ${pageLoadStats.p99}ms\n\n`;

    report += '## API Response Time\n';
    report += `- Average: ${apiResponseStats.average?.toFixed(2)}ms\n`;
    report += `- Min: ${apiResponseStats.min}ms\n`;
    report += `- Max: ${apiResponseStats.max}ms\n`;
    report += `- P95: ${apiResponseStats.p95}ms\n`;
    report += `- P99: ${apiResponseStats.p99}ms\n\n`;

    report += '## Database Query Time\n';
    report += `- Average: ${dbQueryStats.average?.toFixed(2)}ms\n`;
    report += `- Min: ${dbQueryStats.min}ms\n`;
    report += `- Max: ${dbQueryStats.max}ms\n`;
    report += `- P95: ${dbQueryStats.p95}ms\n`;
    report += `- P99: ${dbQueryStats.p99}ms\n\n`;

    if (this.alerts.length > 0) {
      report += '## Alerts\n';
      for (const alert of this.alerts.slice(0, 10)) {
        report += `- ${alert}\n`;
      }
    }

    return report;
  }
}

export class LoadTester {
  private config: LoadTestConfig;
  private results: LoadTestResult[] = [];

  constructor(config: LoadTestConfig) {
    this.config = config;
  }

  /**
   * Run load test
   */
  async runLoadTest(): Promise<LoadTestResult[]> {
    const results: LoadTestResult[] = [];

    for (const endpoint of this.config.endpoints) {
      const result = await this.testEndpoint(endpoint);
      results.push(result);
    }

    this.results = results;
    return results;
  }

  /**
   * Test a single endpoint
   */
  private async testEndpoint(endpoint: string): Promise<LoadTestResult> {
    const responseTimes: number[] = [];
    let successfulRequests = 0;
    let failedRequests = 0;

    const startTime = Date.now();
    const endTime = startTime + this.config.duration * 1000;

    while (Date.now() < endTime) {
      try {
        const requestStart = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(endpoint, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const requestEnd = Date.now();

        if (response.ok) {
          successfulRequests++;
          responseTimes.push(requestEnd - requestStart);
        } else {
          failedRequests++;
        }
      } catch (error) {
        failedRequests++;
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000 / this.config.requestsPerSecond));
    }

    const totalRequests = successfulRequests + failedRequests;
    const duration = (Date.now() - startTime) / 1000;

    responseTimes.sort((a, b) => a - b);

    return {
      endpoint,
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      minResponseTime: responseTimes[0] || 0,
      maxResponseTime: responseTimes[responseTimes.length - 1] || 0,
      p95ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.95)] || 0,
      p99ResponseTime: responseTimes[Math.floor(responseTimes.length * 0.99)] || 0,
      throughput: totalRequests / duration,
      errorRate: (failedRequests / totalRequests) * 100,
    };
  }

  /**
   * Get load test results
   */
  getResults(): LoadTestResult[] {
    return [...this.results];
  }

  /**
   * Generate load test report
   */
  generateReport(): string {
    let report = '# Load Test Report\n\n';

    for (const result of this.results) {
      report += `## ${result.endpoint}\n`;
      report += `- Total Requests: ${result.totalRequests}\n`;
      report += `- Successful: ${result.successfulRequests}\n`;
      report += `- Failed: ${result.failedRequests}\n`;
      report += `- Error Rate: ${result.errorRate.toFixed(2)}%\n`;
      report += `- Average Response Time: ${result.averageResponseTime.toFixed(2)}ms\n`;
      report += `- Min Response Time: ${result.minResponseTime}ms\n`;
      report += `- Max Response Time: ${result.maxResponseTime}ms\n`;
      report += `- P95 Response Time: ${result.p95ResponseTime.toFixed(2)}ms\n`;
      report += `- P99 Response Time: ${result.p99ResponseTime.toFixed(2)}ms\n`;
      report += `- Throughput: ${result.throughput.toFixed(2)} req/s\n\n`;
    }

    return report;
  }
}

// Singleton instance
let performanceMonitorInstance: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitorInstance) {
    performanceMonitorInstance = new PerformanceMonitor();
  }
  return performanceMonitorInstance;
}
