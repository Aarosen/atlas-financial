'use client';

import { TrendingUp, TrendingDown, Flame, Target } from 'lucide-react';
import type { ProgressReport } from '@/lib/progress/progressTracker';

interface ProgressCardProps {
  report: ProgressReport;
  onDismiss?: () => void;
}

/**
 * TASK 4.5: Progress Card Component
 * Displays returning user's financial progress with visual indicators
 */
export function ProgressCard({ report, onDismiss }: ProgressCardProps) {
  const hasProgress = report.improvements.length > 0 || report.challenges.length > 0;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6 my-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">👋</div>
          <div>
            <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">
              Welcome back!
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {report.daysSinceLast} day{report.daysSinceLast !== 1 ? 's' : ''} since your last visit
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
            aria-label="Dismiss"
          >
            ✕
          </button>
        )}
      </div>

      {/* Summary */}
      <p className="text-blue-900 dark:text-blue-100 mb-4 font-medium">
        {report.summary}
      </p>

      {/* Progress Metrics */}
      {hasProgress && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {/* Improvements */}
          {report.improvements.length > 0 && (
            <div className="bg-white dark:bg-blue-900 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h4 className="font-semibold text-green-900 dark:text-green-100">
                  Your Wins
                </h4>
              </div>
              <div className="space-y-1">
                {report.improvements.map((metric, idx) => (
                  <div key={idx} className="text-sm text-green-800 dark:text-green-200">
                    <span className="font-medium">{metric.name}:</span>{' '}
                    <span className="text-green-600 dark:text-green-400">
                      +{metric.percentChange.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Challenges */}
          {report.challenges.length > 0 && (
            <div className="bg-white dark:bg-blue-900 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <h4 className="font-semibold text-orange-900 dark:text-orange-100">
                  Areas to Focus
                </h4>
              </div>
              <div className="space-y-1">
                {report.challenges.map((metric, idx) => (
                  <div key={idx} className="text-sm text-orange-800 dark:text-orange-200">
                    <span className="font-medium">{metric.name}:</span>{' '}
                    <span className="text-orange-600 dark:text-orange-400">
                      {metric.percentChange.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Streak */}
      {report.streak > 1 && (
        <div className="bg-white dark:bg-blue-900 rounded-lg p-3 flex items-center gap-3">
          <Flame className="w-5 h-5 text-red-600 dark:text-red-400" />
          <div>
            <p className="font-semibold text-red-900 dark:text-red-100">
              {report.streak}-day streak!
            </p>
            <p className="text-sm text-red-700 dark:text-red-300">
              Keep up the momentum
            </p>
          </div>
        </div>
      )}

      {/* Call to Action */}
      <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
          <Target className="w-4 h-4" />
          Let's continue building your financial plan
        </p>
      </div>
    </div>
  );
}
