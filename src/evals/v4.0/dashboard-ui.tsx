/**
 * ATLAS AI v4.0 Metrics Dashboard UI
 * 
 * React component for real-time visualization of evaluation metrics,
 * improvement velocity, and deployment gate status
 */

'use client';

import React, { useEffect, useState } from 'react';
import type { DashboardMetrics } from './metrics-dashboard';
import type { WeeklyReport } from './weekly-monitor';

interface DashboardUIProps {
  refreshInterval?: number; // ms
  onAlertClick?: (alert: any) => void;
}

export function MetricsDashboardUI({ refreshInterval = 5000, onAlertClick }: DashboardUIProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // TODO: Connect to actual API endpoint
        // const response = await fetch('/api/evals/v4.0/metrics');
        // const data = await response.json();
        // setMetrics(data.metrics);
        // setWeeklyReport(data.weekly_report);

        setLoading(false);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white text-xl">Loading metrics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">ATLAS AI v4.0 Metrics Dashboard</h1>
          <p className="text-gray-400">Last updated: {lastUpdate.toLocaleTimeString()}</p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Accuracy"
            value={metrics.current_accuracy.toFixed(1)}
            unit="%"
            trend={metrics.accuracy_trend_7d}
            status={getMetricStatus(metrics.current_accuracy, 95)}
          />
          <MetricCard
            title="User Satisfaction"
            value={metrics.current_user_satisfaction.toFixed(2)}
            unit="/5.0"
            trend={metrics.satisfaction_trend_7d}
            status={getMetricStatus(metrics.current_user_satisfaction, 4.0)}
          />
          <MetricCard
            title="Teaching Value"
            value={metrics.current_teaching_value.toFixed(1)}
            unit="%"
            trend={metrics.teaching_trend_7d}
            status={getMetricStatus(metrics.current_teaching_value, 85)}
          />
          <MetricCard
            title="Warmth Score"
            value={metrics.current_warmth.toFixed(2)}
            unit="/5.0"
            trend={metrics.warmth_trend_7d}
            status={getMetricStatus(metrics.current_warmth, 4.3)}
          />
        </div>

        {/* Deployment Gates */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Deployment Gates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GateStatus
              name="Critical Gates"
              passing={metrics.critical_gates_passing}
              total={metrics.critical_gates_total}
              severity="critical"
            />
            <GateStatus
              name="High Priority Gates"
              passing={metrics.high_gates_passing}
              total={metrics.high_gates_total}
              severity="high"
            />
          </div>
        </div>

        {/* Improvement Velocity */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Improvement Velocity</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 mb-2">Weekly Improvement Rate</p>
              <p className="text-3xl font-bold">
                {metrics.weekly_improvement_rate > 0 ? '+' : ''}
                {metrics.weekly_improvement_rate.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-gray-400 mb-2">Days to 95% Target</p>
              <p className="text-3xl font-bold">
                {metrics.days_to_95_percent === Infinity ? '∞' : metrics.days_to_95_percent}
              </p>
            </div>
          </div>
        </div>

        {/* Dimension Health */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Dimension Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(metrics.dimension_health).map(([dimensionId, health]) => (
              <DimensionCard
                key={dimensionId}
                dimensionId={dimensionId}
                passRate={health.pass_rate}
                trend={health.trend}
                criticalFailures={health.critical_failures}
              />
            ))}
          </div>
        </div>

        {/* User Impact */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">User Impact Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ImpactMetric
              title="User Action Rate"
              value={metrics.user_action_rate.toFixed(1)}
              unit="%"
              target={40}
            />
            <ImpactMetric
              title="Confidence Improvement"
              value={metrics.user_confidence_improvement.toFixed(1)}
              unit="/10"
              target={7.0}
            />
            <ImpactMetric
              title="Net Worth Improvement"
              value={metrics.net_worth_improvement_rate.toFixed(1)}
              unit="%"
              target={55}
            />
          </div>
        </div>

        {/* Weekly Report */}
        {weeklyReport && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Weekly Report (Week {weeklyReport.week_number})</h2>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 mb-2">Trend Direction</p>
                <p className="text-xl font-bold capitalize">{weeklyReport.trend_direction}</p>
              </div>
              {weeklyReport.critical_alerts.length > 0 && (
                <div>
                  <p className="text-red-400 font-bold mb-2">Critical Alerts</p>
                  <ul className="space-y-1">
                    {weeklyReport.critical_alerts.map((alert, i) => (
                      <li key={i} className="text-red-300">
                        • {alert}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {weeklyReport.top_recommendations.length > 0 && (
                <div>
                  <p className="text-blue-400 font-bold mb-2">Top Recommendations</p>
                  <ul className="space-y-2">
                    {weeklyReport.top_recommendations.slice(0, 3).map((rec, i) => (
                      <li key={i} className="text-blue-300">
                        • {rec.action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components

interface MetricCardProps {
  title: string;
  value: string;
  unit: string;
  trend: number;
  status: 'good' | 'warning' | 'critical';
}

function MetricCard({ title, value, unit, trend, status }: MetricCardProps) {
  const statusColor =
    status === 'good' ? 'bg-green-900' : status === 'warning' ? 'bg-yellow-900' : 'bg-red-900';
  const trendIcon = trend > 0 ? '📈' : trend < 0 ? '📉' : '→';

  return (
    <div className={`${statusColor} rounded-lg p-4`}>
      <p className="text-gray-300 text-sm mb-2">{title}</p>
      <p className="text-3xl font-bold mb-2">
        {value}
        <span className="text-lg ml-1">{unit}</span>
      </p>
      <p className="text-sm">
        {trendIcon} {trend > 0 ? '+' : ''}
        {trend.toFixed(2)}%
      </p>
    </div>
  );
}

interface GateStatusProps {
  name: string;
  passing: number;
  total: number;
  severity: 'critical' | 'high';
}

function GateStatus({ name, passing, total, severity }: GateStatusProps) {
  const percentage = (passing / total) * 100;
  const statusColor = passing === total ? 'bg-green-600' : 'bg-red-600';

  return (
    <div>
      <p className="text-gray-300 mb-2">{name}</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-700 rounded-full h-2">
          <div
            className={`${statusColor} h-2 rounded-full transition-all`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-sm font-bold">
          {passing}/{total}
        </p>
      </div>
    </div>
  );
}

interface DimensionCardProps {
  dimensionId: string;
  passRate: number;
  trend: 'improving' | 'stable' | 'declining';
  criticalFailures: number;
}

function DimensionCard({ dimensionId, passRate, trend, criticalFailures }: DimensionCardProps) {
  const trendIcon =
    trend === 'improving' ? '📈' : trend === 'stable' ? '→' : '📉';

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <p className="font-bold mb-2">{dimensionId}</p>
      <p className="text-sm text-gray-300 mb-2">Pass Rate: {passRate.toFixed(1)}%</p>
      <p className="text-sm mb-2">
        {trendIcon} {trend}
      </p>
      {criticalFailures > 0 && (
        <p className="text-sm text-red-400">⚠️ {criticalFailures} critical failures</p>
      )}
    </div>
  );
}

interface ImpactMetricProps {
  title: string;
  value: string;
  unit: string;
  target: number;
}

function ImpactMetric({ title, value, unit, target }: ImpactMetricProps) {
  const numValue = parseFloat(value);
  const onTrack = numValue >= target;

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <p className="text-gray-300 text-sm mb-2">{title}</p>
      <p className="text-2xl font-bold mb-2">
        {value}
        <span className="text-sm ml-1">{unit}</span>
      </p>
      <p className="text-xs text-gray-400">
        Target: {target}
        {unit} {onTrack ? '✅' : '⏳'}
      </p>
    </div>
  );
}

// Helper Functions

function getMetricStatus(value: number, target: number): 'good' | 'warning' | 'critical' {
  const percentage = (value / target) * 100;
  if (percentage >= 95) return 'good';
  if (percentage >= 85) return 'warning';
  return 'critical';
}

export default MetricsDashboardUI;
