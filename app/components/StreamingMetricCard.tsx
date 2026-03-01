'use client';

import { useEffect, useState } from 'react';
import type { FinancialMetrics } from '@/lib/types/financial';

interface StreamingMetricCardProps {
  metrics: FinancialMetrics | null;
  isStreaming?: boolean;
  onMetricsUpdate?: (metrics: FinancialMetrics) => void;
}

export function StreamingMetricCard({ metrics, isStreaming, onMetricsUpdate }: StreamingMetricCardProps) {
  const [displayMetrics, setDisplayMetrics] = useState<FinancialMetrics | null>(metrics);
  const [animatingFields, setAnimatingFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!metrics) return;

    // Animate metric updates
    const newAnimatingFields = new Set<string>();
    
    if (!displayMetrics) {
      // First time showing metrics - animate all fields
      newAnimatingFields.add('bufferMonths');
      newAnimatingFields.add('futureOutlook');
      newAnimatingFields.add('debtUrgency');
      newAnimatingFields.add('monthlyNetCashFlow');
    } else {
      // Check which fields changed
      if (displayMetrics.bufferMonths !== metrics.bufferMonths) newAnimatingFields.add('bufferMonths');
      if (displayMetrics.futureOutlook !== metrics.futureOutlook) newAnimatingFields.add('futureOutlook');
      if (displayMetrics.debtUrgency !== metrics.debtUrgency) newAnimatingFields.add('debtUrgency');
      if (displayMetrics.monthlyNetCashFlow !== metrics.monthlyNetCashFlow) newAnimatingFields.add('monthlyNetCashFlow');
    }

    setDisplayMetrics(metrics);
    setAnimatingFields(newAnimatingFields);
    onMetricsUpdate?.(metrics);

    // Clear animation state after animation completes
    const timer = setTimeout(() => {
      setAnimatingFields(new Set());
    }, 600);

    return () => clearTimeout(timer);
  }, [metrics, displayMetrics, onMetricsUpdate]);

  if (!displayMetrics) return <></>;


  const getDebtUrgencyColor = (urgency: string): string => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 border-red-300 dark:border-red-700';
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900 text-orange-900 dark:text-orange-100 border-orange-300 dark:border-orange-700';
      case 'moderate':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 border-yellow-300 dark:border-yellow-700';
      case 'low':
        return 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 border-green-300 dark:border-green-700';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100';
    }
  };

  const getOutlookColor = (outlook: number): string => {
    if (outlook >= 75) return 'text-green-600 dark:text-green-400';
    if (outlook >= 50) return 'text-blue-600 dark:text-blue-400';
    if (outlook >= 25) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getCashFlowColor = (cashFlow: number): string => {
    if (cashFlow > 0) return 'text-green-600 dark:text-green-400';
    if (cashFlow === 0) return 'text-slate-600 dark:text-slate-400';
    return 'text-red-600 dark:text-red-400';
  };

  const isAnimating = (field: string): boolean => animatingFields.has(field);

  return (
    <div className="w-full mt-4 space-y-3">
      {/* Buffer Months Card */}
      <div
        className={`p-4 rounded-lg border-2 transition-all duration-500 ${
          isAnimating('bufferMonths') ? 'scale-105 shadow-lg' : 'scale-100'
        } bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Financial Buffer</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {displayMetrics.bufferMonths.toFixed(1)} months
            </p>
          </div>
          <div className="text-right text-xs text-slate-500 dark:text-slate-400">
            {displayMetrics.bufferMonths < 1 && '⚠️ Critical'}
            {displayMetrics.bufferMonths >= 1 && displayMetrics.bufferMonths < 3 && '⚠️ Low'}
            {displayMetrics.bufferMonths >= 3 && displayMetrics.bufferMonths < 6 && '✓ Moderate'}
            {displayMetrics.bufferMonths >= 6 && '✓ Strong'}
          </div>
        </div>
      </div>

      {/* Future Outlook Card */}
      <div
        className={`p-4 rounded-lg border-2 transition-all duration-500 ${
          isAnimating('futureOutlook') ? 'scale-105 shadow-lg' : 'scale-100'
        } bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Future Outlook</p>
            <p className={`text-2xl font-bold ${getOutlookColor(displayMetrics.futureOutlook)}`}>
              {displayMetrics.futureOutlook}%
            </p>
          </div>
          <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getOutlookColor(displayMetrics.futureOutlook).replace('text-', 'bg-')}`}
              style={{ width: `${displayMetrics.futureOutlook}%` }}
            />
          </div>
        </div>
      </div>

      {/* Debt Urgency Card */}
      <div
        className={`p-4 rounded-lg border-2 transition-all duration-500 ${
          isAnimating('debtUrgency') ? 'scale-105 shadow-lg' : 'scale-100'
        } ${getDebtUrgencyColor(displayMetrics.debtUrgency)}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium opacity-75">Debt Priority</p>
            <p className="text-2xl font-bold capitalize">{displayMetrics.debtUrgency}</p>
          </div>
          <div className="text-3xl">
            {displayMetrics.debtUrgency === 'critical' && '🔴'}
            {displayMetrics.debtUrgency === 'high' && '🟠'}
            {displayMetrics.debtUrgency === 'moderate' && '🟡'}
            {displayMetrics.debtUrgency === 'low' && '🟢'}
          </div>
        </div>
      </div>

      {/* Monthly Cash Flow Card */}
      <div
        className={`p-4 rounded-lg border-2 transition-all duration-500 ${
          isAnimating('monthlyNetCashFlow') ? 'scale-105 shadow-lg' : 'scale-100'
        } bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Monthly Cash Flow</p>
            <p className={`text-2xl font-bold ${getCashFlowColor(displayMetrics.monthlyNetCashFlow)}`}>
              {displayMetrics.monthlyNetCashFlow > 0 ? '+' : ''}${displayMetrics.monthlyNetCashFlow.toLocaleString()}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500 dark:text-slate-400">
            {displayMetrics.monthlyNetCashFlow > 0 && '✓ Surplus'}
            {displayMetrics.monthlyNetCashFlow === 0 && '= Balanced'}
            {displayMetrics.monthlyNetCashFlow < 0 && '⚠️ Deficit'}
          </div>
        </div>
      </div>

      {/* Confidence Indicator */}
      <div className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400">
        <span className="font-medium">Confidence:</span>{' '}
        {displayMetrics.confidence === 'high' && '✓ High - based on complete data'}
        {displayMetrics.confidence === 'medium' && '~ Medium - based on partial data'}
        {displayMetrics.confidence === 'low' && '⚠️ Low - based on limited data'}
      </div>

      {isStreaming && (
        <div className="px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-900 text-xs text-blue-600 dark:text-blue-300">
          Updating metrics...
        </div>
      )}
    </div>
  );
}
