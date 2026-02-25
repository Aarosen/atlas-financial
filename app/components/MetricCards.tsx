'use client';

import React from 'react';
import { TrendingUp, AlertCircle, Target } from 'lucide-react';

interface MetricCardsProps {
  bufferMonths: number;
  futureOutlook: number;
  debtUrgency: 'low' | 'moderate' | 'high' | 'critical';
  monthlyNetCashFlow: number;
  confidence: 'low' | 'medium' | 'high';
}

export function BufferCard({ months, confidence }: { months: number; confidence: string }) {
  const getColor = (m: number) => {
    if (m >= 6) return 'text-green-600 dark:text-green-400';
    if (m >= 3) return 'text-blue-600 dark:text-blue-400';
    if (m >= 1) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getLabel = (m: number) => {
    if (m >= 6) return 'Strong';
    if (m >= 3) return 'Healthy';
    if (m >= 1) return 'Thin';
    return 'Critical';
  };

  return (
    <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Buffer</p>
          <p className={`text-2xl font-bold mt-1 ${getColor(months)}`}>{months.toFixed(1)}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">months of expenses</p>
        </div>
        <div className={`px-2 py-1 rounded text-xs font-semibold ${getColor(months)} bg-opacity-10`}>
          {getLabel(months)}
        </div>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-500">Confidence: {confidence}</p>
    </div>
  );
}

export function FutureOutlookCard({ outlook, confidence }: { outlook: number; confidence: string }) {
  const getColor = (o: number) => {
    if (o >= 8) return 'text-green-600 dark:text-green-400';
    if (o >= 5) return 'text-blue-600 dark:text-blue-400';
    if (o >= 2) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Future</p>
          <div className="flex items-baseline gap-1 mt-1">
            <p className={`text-2xl font-bold ${getColor(outlook)}`}>{outlook.toFixed(1)}</p>
            <p className={`text-sm font-semibold ${getColor(outlook)}`}>%</p>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">annual growth potential</p>
        </div>
        <TrendingUp className={`w-6 h-6 ${getColor(outlook)}`} />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-500">Confidence: {confidence}</p>
    </div>
  );
}

export function DebtCard({ urgency, confidence }: { urgency: string; confidence: string }) {
  const getColor = (u: string) => {
    switch (u) {
      case 'low':
        return 'text-green-600 dark:text-green-400';
      case 'moderate':
        return 'text-blue-600 dark:text-blue-400';
      case 'high':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-slate-600 dark:text-slate-400';
    }
  };

  const getIcon = (u: string) => {
    if (u === 'critical' || u === 'high') {
      return <AlertCircle className={`w-6 h-6 ${getColor(u)}`} />;
    }
    return <Target className={`w-6 h-6 ${getColor(u)}`} />;
  };

  return (
    <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Debt</p>
          <p className={`text-2xl font-bold mt-1 capitalize ${getColor(urgency)}`}>{urgency}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">priority level</p>
        </div>
        {getIcon(urgency)}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-500">Confidence: {confidence}</p>
    </div>
  );
}

export function MetricCardsContainer({ metrics }: { metrics: MetricCardsProps }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <BufferCard months={metrics.bufferMonths} confidence={metrics.confidence} />
      <FutureOutlookCard outlook={metrics.futureOutlook} confidence={metrics.confidence} />
      <DebtCard urgency={metrics.debtUrgency} confidence={metrics.confidence} />
    </div>
  );
}

export function MetricCards({ metrics }: { metrics: MetricCardsProps }) {
  return <MetricCardsContainer metrics={metrics} />;
}
