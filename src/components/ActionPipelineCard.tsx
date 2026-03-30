'use client';

import { useState } from 'react';

interface Action {
  id: string;
  title: string;
  description?: string;
  status: 'recommended' | 'committed' | 'completed' | 'skipped';
  dueDate?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
}

interface ActionPipelineCardProps {
  actions: Action[];
  onCompleteAction: (actionId: string, completed: boolean) => Promise<void>;
  onUpdateAction?: (actionId: string, status: string) => Promise<void>;
  isLoading?: boolean;
}

export function ActionPipelineCard({
  actions,
  onCompleteAction,
  onUpdateAction,
  isLoading = false,
}: ActionPipelineCardProps) {
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  if (!actions || actions.length === 0) {
    return null;
  }

  // Show only the most recent 1-3 recommended or committed actions
  const activeActions = actions
    .filter((a) => a.status === 'recommended' || a.status === 'committed')
    .slice(0, 3);

  if (activeActions.length === 0) {
    return null;
  }

  const handleComplete = async (actionId: string) => {
    setCompletingId(actionId);
    try {
      await onCompleteAction(actionId, true);
    } catch (error) {
      console.error('Error completing action:', error);
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950 dark:to-cyan-950 rounded-lg p-4 mb-4 border border-teal-200 dark:border-teal-800">
      <h3 className="text-sm font-semibold text-teal-900 dark:text-teal-100 mb-3">
        Your Next Steps
      </h3>
      <div className="space-y-2">
        {activeActions.map((action) => (
          <div
            key={action.id}
            className="flex items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg"
          >
            <input
              type="checkbox"
              checked={false}
              onChange={() => handleComplete(action.id)}
              disabled={completingId === action.id || isLoading}
              className="mt-1 w-4 h-4 rounded border-teal-300 text-teal-600 focus:ring-teal-500 cursor-pointer disabled:opacity-50"
              aria-label={`Complete: ${action.title}`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {action.title}
              </p>
              {action.description && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {action.description}
                </p>
              )}
              {action.dueDate && (
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                  Due: {new Date(action.dueDate).toLocaleDateString()}
                </p>
              )}
              {/* Action Status Buttons */}
              {action.status !== 'completed' && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={async () => {
                      if (!onUpdateAction) return;
                      setUpdatingId(action.id);
                      try {
                        await onUpdateAction(action.id, 'completed');
                      } finally {
                        setUpdatingId(null);
                      }
                    }}
                    disabled={updatingId === action.id || isLoading}
                    className="text-xs px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 rounded hover:bg-green-200 dark:hover:bg-green-800 disabled:opacity-50 font-medium transition-colors"
                  >
                    {updatingId === action.id ? 'Marking...' : '✓ Done'}
                  </button>
                  <button
                    onClick={async () => {
                      if (!onUpdateAction) return;
                      setUpdatingId(action.id);
                      try {
                        await onUpdateAction(action.id, 'dismissed');
                      } finally {
                        setUpdatingId(null);
                      }
                    }}
                    disabled={updatingId === action.id || isLoading}
                    className="text-xs px-2 py-1 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 font-medium transition-colors"
                  >
                    {updatingId === action.id ? 'Dismissing...' : 'Dismiss'}
                  </button>
                </div>
              )}
            </div>
            {action.priority && (
              <span
                className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ${
                  action.priority === 'critical'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
                    : action.priority === 'high'
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200'
                    : action.priority === 'medium'
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200'
                    : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200'
                }`}
              >
                {action.priority}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
