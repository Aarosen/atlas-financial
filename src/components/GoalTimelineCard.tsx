'use client';

import { useMemo } from 'react';
import { CheckCircle2, Clock, Target, TrendingUp } from 'lucide-react';

interface GoalPhase {
  name: string;
  months: number;
  milestone: string;
  status: 'completed' | 'in_progress' | 'upcoming';
}

interface GoalTimelineCardProps {
  goalName: string;
  goalType: 'debt_payoff' | 'emergency_fund' | 'savings' | 'investment' | 'retirement' | 'home_purchase';
  currentAmount: number;
  targetAmount: number;
  monthlyContribution: number;
  phases: GoalPhase[];
  completionPercent: number;
}

/**
 * TASK 2.5: Goal Timeline Visualization Component
 * Displays goal progress with timeline phases and milestones
 */
export function GoalTimelineCard({
  goalName,
  goalType,
  currentAmount,
  targetAmount,
  monthlyContribution,
  phases,
  completionPercent,
}: GoalTimelineCardProps) {
  const gap = targetAmount - currentAmount;
  const monthsToComplete = monthlyContribution > 0 ? Math.ceil(gap / monthlyContribution) : 999;
  const yearsToComplete = Math.floor(monthsToComplete / 12);
  const remainingMonths = monthsToComplete % 12;

  const timelineText = useMemo(() => {
    if (monthsToComplete >= 999) return 'Indefinite (increase contributions)';
    if (yearsToComplete > 0) {
      return `${yearsToComplete} year${yearsToComplete !== 1 ? 's' : ''} ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
    }
    return `${monthsToComplete} month${monthsToComplete !== 1 ? 's' : ''}`;
  }, [monthsToComplete, yearsToComplete, remainingMonths]);

  const getGoalIcon = () => {
    switch (goalType) {
      case 'debt_payoff':
        return <TrendingUp className="w-5 h-5 text-red-600" />;
      case 'emergency_fund':
        return <Target className="w-5 h-5 text-orange-600" />;
      case 'retirement':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'home_purchase':
        return <Target className="w-5 h-5 text-green-600" />;
      default:
        return <TrendingUp className="w-5 h-5 text-purple-600" />;
    }
  };

  const getProgressColor = () => {
    if (completionPercent >= 100) return 'bg-green-500';
    if (completionPercent >= 75) return 'bg-blue-500';
    if (completionPercent >= 50) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 my-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {getGoalIcon()}
          <h3 className="font-semibold text-slate-900 dark:text-white">{goalName}</h3>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {completionPercent}%
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Complete</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-500`}
            style={{ width: `${Math.min(completionPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* Amount Progress */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <div className="text-slate-500 dark:text-slate-400">Current</div>
          <div className="font-semibold text-slate-900 dark:text-white">
            ${currentAmount.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-slate-500 dark:text-slate-400">Target</div>
          <div className="font-semibold text-slate-900 dark:text-white">
            ${targetAmount.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Timeline Info */}
      <div className="bg-slate-50 dark:bg-slate-800 rounded p-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <div>
            <div className="text-slate-500 dark:text-slate-400">Monthly Contribution</div>
            <div className="font-semibold text-slate-900 dark:text-white">
              ${monthlyContribution.toLocaleString()}
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-500 dark:text-slate-400">Time to Complete</div>
            <div className="font-semibold text-slate-900 dark:text-white">{timelineText}</div>
          </div>
        </div>
      </div>

      {/* Phases Timeline */}
      {phases.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
            Milestones
          </div>
          <div className="space-y-2">
            {phases.map((phase, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="mt-1">
                  {phase.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : phase.status === 'in_progress' ? (
                    <div className="w-4 h-4 rounded-full bg-blue-600" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    {phase.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {phase.months} months • {phase.milestone}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
