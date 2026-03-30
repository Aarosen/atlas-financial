'use client';

import { useState } from 'react';

interface Goal {
  id: string;
  title: string;
  description?: string;
  targetAmount?: number;
  currentAmount?: number;
  deadline?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  status?: 'active' | 'achieved' | 'paused' | 'abandoned';
}

interface GoalTrackingCardProps {
  goals: Goal[];
  isLoading?: boolean;
  onGoalUpdate?: (goalId: string, status: string) => Promise<void>;
}

export function GoalTrackingCard({
  goals,
  isLoading = false,
  onGoalUpdate,
}: GoalTrackingCardProps) {
  const [updatingGoalId, setUpdatingGoalId] = useState<string | null>(null);
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 mb-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
          Your Goals
        </h3>
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-40 animate-pulse" />
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!goals || goals.length === 0) {
    return null;
  }

  const calculateProgress = (goal: Goal): number => {
    if (!goal.targetAmount || !goal.currentAmount) return 0;
    return Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200';
    }
  };

  const getProgressBarColor = (progress: number) => {
    if (progress < 25) return 'bg-red-500';
    if (progress < 50) return 'bg-orange-500';
    if (progress < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 mb-4">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
        Your Goals
      </h3>

      <div className="space-y-4">
        {goals.slice(0, 3).map((goal) => {
          const progress = calculateProgress(goal);

          return (
            <div key={goal.id} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {goal.title}
                  </p>
                  {goal.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      {goal.description}
                    </p>
                  )}
                </div>
                {goal.priority && (
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ${getPriorityColor(
                      goal.priority
                    )}`}
                  >
                    {goal.priority}
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${getProgressBarColor(progress)}`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Progress Text */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  {progress}% complete
                </span>
                {goal.deadline && (
                  <span className="text-xs text-slate-500 dark:text-slate-500">
                    Due: {new Date(goal.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Amount Progress */}
              {goal.targetAmount && goal.currentAmount !== undefined && (
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  ${goal.currentAmount.toLocaleString()} / ${goal.targetAmount.toLocaleString()}
                </div>
              )}

              {/* Goal Actions */}
              {goal.status !== 'achieved' && goal.status !== 'abandoned' && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={async () => {
                      if (!onGoalUpdate) return;
                      setUpdatingGoalId(goal.id);
                      try {
                        await onGoalUpdate(goal.id, 'achieved');
                      } finally {
                        setUpdatingGoalId(null);
                      }
                    }}
                    disabled={updatingGoalId === goal.id}
                    className="flex-1 text-xs px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 rounded hover:bg-green-200 dark:hover:bg-green-800 disabled:opacity-50 font-medium transition-colors"
                  >
                    {updatingGoalId === goal.id ? 'Marking...' : '✓ Mark Complete'}
                  </button>
                  <button
                    onClick={async () => {
                      if (!onGoalUpdate) return;
                      setUpdatingGoalId(goal.id);
                      try {
                        await onGoalUpdate(goal.id, 'paused');
                      } finally {
                        setUpdatingGoalId(null);
                      }
                    }}
                    disabled={updatingGoalId === goal.id}
                    className="flex-1 text-xs px-2 py-1 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 font-medium transition-colors"
                  >
                    {updatingGoalId === goal.id ? 'Pausing...' : 'Pause'}
                  </button>
                </div>
              )}

              {/* Completed Badge */}
              {goal.status === 'achieved' && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400">✓ Achieved</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {goals.length > 3 && (
        <p className="text-xs text-slate-500 dark:text-slate-500 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          +{goals.length - 3} more goal{goals.length - 3 !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
