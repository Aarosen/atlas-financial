import React from 'react';
import { TrendingDown, TrendingUp, Target } from 'lucide-react';

interface ProgressSnapshot {
  metric: string;
  previousValue: number;
  currentValue: number;
  unit: string;
  isPositive: boolean; // true if improvement is positive (debt down, savings up)
}

interface ProgressDisplayProps {
  userName?: string;
  snapshots: ProgressSnapshot[];
  daysSinceLast: number;
  onDismiss: () => void;
}

/**
 * ProgressDisplay
 * Shows returning user their progress since last session
 * Closes the marathon gap by showing concrete progress over time
 */
export function ProgressDisplay({
  userName,
  snapshots = [],
  daysSinceLast = 0,
  onDismiss,
}: ProgressDisplayProps) {
  const safeSnapshots: ProgressSnapshot[] = Array.isArray(snapshots) ? snapshots : [];
  if (safeSnapshots.length === 0) {
    return null;
  }

  const formatNumber = (n: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(n);
  };

  const calculateDelta = (prev: number, curr: number, isPositive: boolean): { delta: number; improved: boolean } => {
    const delta = Math.abs(curr - prev);
    const improved = isPositive ? curr < prev : curr > prev;
    return { delta, improved };
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg shadow-sm">
      <div className="flex items-start gap-3">
        <Target className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 mb-3">
            {userName ? `Welcome back, ${userName}!` : 'Welcome back!'} Here's your progress:
          </p>
          
          <div className="space-y-2 mb-3">
            {safeSnapshots.map((snapshot, idx) => {
              const { delta, improved } = calculateDelta(
                snapshot.previousValue,
                snapshot.currentValue,
                snapshot.isPositive
              );
              const Icon = improved ? TrendingDown : TrendingUp;
              const color = improved ? 'text-green-600' : 'text-orange-600';

              return (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{snapshot.metric}:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">
                      {formatNumber(snapshot.previousValue)} → {formatNumber(snapshot.currentValue)}
                    </span>
                    <div className={`flex items-center gap-1 ${color}`}>
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">
                        {snapshot.isPositive && improved ? '-' : '+'}
                        {formatNumber(delta)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {daysSinceLast > 0 && (
            <p className="text-xs text-gray-600 mb-3">
              Over the past {daysSinceLast} day{daysSinceLast !== 1 ? 's' : ''}, you've made real progress. That consistency is what compounds into lasting change.
            </p>
          )}

          <button
            onClick={onDismiss}
            className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors"
          >
            Let's continue
          </button>
        </div>
      </div>
    </div>
  );
}
