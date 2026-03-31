'use client';

import { useState, useEffect } from 'react';
import { ActionPipelineCard } from './ActionPipelineCard';
import { FinancialSnapshotCard } from './FinancialSnapshotCard';
import { GoalTrackingCard } from './GoalTrackingCard';
import { PendingActionCheckIn } from './PendingActionCheckIn';
import { LoadingSkeleton, ActionPipelineLoadingSkeleton, ProgressLoadingSkeleton } from './LoadingSkeleton';
import { FinancialProgressChart } from './FinancialProgressChart';
import { checkMilestonesAfterGoalUpdate } from '@/lib/celebrations/midSessionMilestoneDetection';

interface CompanionDashboardProps {
  userId: string;
  token?: string;
  isLoading?: boolean;
}

export function CompanionDashboard({
  userId,
  token,
  isLoading = false,
}: CompanionDashboardProps) {
  const [actions, setActions] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || userId === 'guest') {
      setDashboardLoading(false);
      return;
    }

    loadDashboardData();
  }, [userId, token]);

  const loadDashboardData = async () => {
    setDashboardLoading(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Load pending actions
      const actionsRes = await fetch(
        `/api/actions/pending?userId=${encodeURIComponent(userId)}`,
        { headers }
      );
      if (actionsRes.ok) {
        const data = await actionsRes.json();
        setActions(data.actions || []);
        if (data.actions && data.actions.length > 0) {
          setPendingAction(data.actions[0]);
        }
      }

      // Load goals
      const goalsRes = await fetch(
        `/api/goals/list?userId=${encodeURIComponent(userId)}`,
        { headers }
      );
      if (goalsRes.ok) {
        const data = await goalsRes.json();
        setGoals(data.goals || []);
      }

      // Load financial snapshot
      const snapshotRes = await fetch(
        `/api/profile/snapshot?userId=${encodeURIComponent(userId)}`,
        { headers }
      );
      if (snapshotRes.ok) {
        const data = await snapshotRes.json();
        setSnapshot(data.snapshot);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleActionComplete = async (actionId: string, completed: boolean) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/actions/complete', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
          actionId,
          completed,
        }),
      });

      if (response.ok) {
        // Reload dashboard data
        await loadDashboardData();
      }
    } catch (error) {
      console.error('Error completing action:', error);
    }
  };

  const handleGoalUpdate = async (goalId: string, status: string) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/goals/update', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          goalId,
          status,
        }),
      });

      if (response.ok) {
        // Reload dashboard data to reflect updated goal
        setError(null);
        await loadDashboardData();
        
        // Gap 2b: Check for milestones after goal update (e.g., marked as achieved)
        if (status === 'achieved') {
          try {
            const completedCount = goals.filter(g => g.status === 'achieved').length + 1;
            const financialProfile = snapshot ? {
              highInterestDebt: snapshot.high_interest_debt,
              lowInterestDebt: snapshot.low_interest_debt,
              totalSavings: snapshot.total_savings,
              monthlyIncome: snapshot.monthly_income,
              essentialExpenses: snapshot.essential_expenses,
            } : undefined;
            await checkMilestonesAfterGoalUpdate(userId, 'achieved', completedCount, financialProfile, token);
          } catch (milestoneError) {
            console.warn('[dashboard] Milestone check failed (non-fatal):', milestoneError);
          }
        }
      } else {
        const data = await response.json();
        const errorMsg = data.error || `Failed to update goal: ${response.statusText}`;
        setError(errorMsg);
        console.error('Error updating goal:', errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to update goal';
      setError(errorMsg);
      console.error('Error updating goal:', error);
    }
  };

  const handleActionUpdate = async (actionId: string, status: string) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/actions/update', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          actionId,
          status,
        }),
      });

      if (response.ok) {
        // Reload dashboard data to reflect updated action
        setError(null);
        await loadDashboardData();
      } else {
        const data = await response.json();
        const errorMsg = data.error || `Failed to update action: ${response.statusText}`;
        setError(errorMsg);
        console.error('Error updating action:', errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to update action';
      setError(errorMsg);
      console.error('Error updating action:', error);
    }
  };

  const handleGoalDelete = async (goalId: string) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/goals/delete', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({
          goalId,
          userId,
        }),
      });

      if (response.ok) {
        // Reload dashboard data to reflect deleted goal
        setError(null);
        await loadDashboardData();
      } else {
        const data = await response.json();
        const errorMsg = data.error || `Failed to delete goal: ${response.statusText}`;
        setError(errorMsg);
        console.error('Error deleting goal:', errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete goal';
      setError(errorMsg);
      console.error('Error deleting goal:', error);
    }
  };

  if (isLoading || dashboardLoading) {
    return (
      <div className="space-y-4 p-4">
        <ActionPipelineLoadingSkeleton />
        <ProgressLoadingSkeleton />
        <LoadingSkeleton lines={3} />
      </div>
    );
  }

  if (userId === 'guest') {
    return (
      <div className="p-4 text-center">
        <p className="text-slate-600 dark:text-slate-400">
          Sign in to view your companion dashboard
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Error Display */}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 dark:text-red-200">
                {error}
              </p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Pending Action Check-in */}
      {pendingAction && (
        <PendingActionCheckIn
          action={pendingAction}
          onComplete={handleActionComplete}
        />
      )}

      {/* Action Pipeline */}
      {actions.length > 0 && (
        <ActionPipelineCard
          actions={actions.slice(0, 3)}
          onCompleteAction={handleActionComplete}
          onUpdateAction={handleActionUpdate}
        />
      )}

      {/* Financial Snapshot */}
      {snapshot && (
        <FinancialSnapshotCard snapshot={snapshot} />
      )}

      {/* Financial Progress Chart */}
      <FinancialProgressChart userId={userId} accessToken={token} />

      {/* Goal Tracking */}
      {goals.length > 0 && (
        <GoalTrackingCard goals={goals} onGoalUpdate={handleGoalUpdate} onGoalDelete={handleGoalDelete} />
      )}

      {/* Fix 6: Empty State */}
      {actions.length === 0 && !snapshot && goals.length === 0 && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center bg-slate-50 dark:bg-slate-800/50">
          <p className="text-slate-700 dark:text-slate-300 mb-2 font-medium">
            Your companion dashboard will fill up as you have conversations with Atlas.
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Start a conversation to get your first goal and action plan.
          </p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
            Pending Actions
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {actions.length}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">
            Active Goals
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {goals.length}
          </p>
        </div>
      </div>
    </div>
  );
}
