/**
 * Dashboard Preview Component
 * Shows a preview of the personalized dashboard users will see
 * Addresses design recommendation: "Showcase examples - provide dashboard preview"
 */

import React, { useState } from 'react';
import { TrendingUp, AlertCircle, Target, Zap } from 'lucide-react';

interface DashboardMetric {
  label: string;
  value: string;
  change?: string;
  status: 'good' | 'warning' | 'neutral';
}

export function DashboardPreview() {
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);

  const metrics: DashboardMetric[] = [
    {
      label: 'Monthly Buffer',
      value: '$2,180',
      change: '+$340 this month',
      status: 'good',
    },
    {
      label: 'High-Interest Debt',
      value: '$4,200',
      change: '-$150 this month',
      status: 'warning',
    },
    {
      label: 'Emergency Fund',
      value: '$6,500',
      change: 'Target: $13,500',
      status: 'neutral',
    },
    {
      label: 'Financial Health Score',
      value: '68/100',
      change: '+5 points',
      status: 'good',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Your Personalized Dashboard</h2>
        <p className="text-slate-600">
          Once you share your financial information, Atlas creates a dashboard tailored to your situation. Here's an
          example:
        </p>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            onClick={() => setSelectedWidget(metric.label)}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedWidget === metric.label
                ? 'border-blue-600 bg-blue-50'
                : 'border-slate-200 bg-slate-50 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-600 font-medium">{metric.label}</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{metric.value}</p>
                <p
                  className={`text-sm mt-2 ${
                    metric.status === 'good'
                      ? 'text-green-600'
                      : metric.status === 'warning'
                        ? 'text-orange-600'
                        : 'text-slate-600'
                  }`}
                >
                  {metric.change}
                </p>
              </div>
              <div
                className={`p-2 rounded-lg ${
                  metric.status === 'good'
                    ? 'bg-green-100 text-green-600'
                    : metric.status === 'warning'
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-slate-200 text-slate-600'
                }`}
              >
                {metric.status === 'good' ? (
                  <TrendingUp className="w-5 h-5" />
                ) : metric.status === 'warning' ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <Target className="w-5 h-5" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recommended Actions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-3">
          <Zap className="w-5 h-5" />
          Recommended Next Steps
        </h3>
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
              1
            </div>
            <div>
              <p className="font-medium text-blue-900">Build Emergency Fund to $13,500</p>
              <p className="text-sm text-blue-800">Save $500/month → 14 months to goal</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
              2
            </div>
            <div>
              <p className="font-medium text-blue-900">Pay Down High-Interest Debt</p>
              <p className="text-sm text-blue-800">At current pace: debt-free in 28 months</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
              3
            </div>
            <div>
              <p className="font-medium text-blue-900">Start Investing for Long-Term Growth</p>
              <p className="text-sm text-blue-800">Once emergency fund is complete</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customization Note */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h3 className="font-semibold text-slate-900 mb-2">Fully Customizable</h3>
        <p className="text-sm text-slate-700">
          You control which widgets appear on your dashboard. Want to focus on debt payoff? Hide the investment metrics.
          Interested in retirement planning? Add those projections. Your dashboard, your way.
        </p>
      </div>
    </div>
  );
}
