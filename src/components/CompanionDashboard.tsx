'use client';

import { useState, useEffect } from 'react';
import { ActionPipelineCard } from './ActionPipelineCard';
import { FinancialSnapshotCard } from './FinancialSnapshotCard';
import { GoalTrackingCard } from './GoalTrackingCard';
import { PendingActionCheckIn } from './PendingActionCheckIn';
import { LoadingSkeleton, ActionPipelineLoadingSkeleton, ProgressLoadingSkeleton } from './LoadingSkeleton';

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
          onActionClick={(actionId) => {
            console.log('Action clicked:', actionId);
          }}
        />
      )}

      {/* Financial Snapshot */}
      {snapshot && (
        <FinancialSnapshotCard snapshot={snapshot} />
      )}

      {/* Goal Tracking */}
      {goals.length > 0 && (
        <GoalTrackingCard goals={goals} />
      )}

      {/* Empty State */}
      {actions.length === 0 && !snapshot && goals.length === 0 && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-8 text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            No companion data yet
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500">
            Start a conversation to begin tracking your financial goals
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
