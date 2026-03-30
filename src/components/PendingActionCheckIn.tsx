'use client';

import { useState } from 'react';

interface PendingAction {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: 'recommended' | 'committed';
}

interface PendingActionCheckInProps {
  action: PendingAction | null;
  onComplete: (actionId: string, completed: boolean) => Promise<void>;
  isLoading?: boolean;
}

export function PendingActionCheckIn({
  action,
  onComplete,
  isLoading = false,
}: PendingActionCheckInProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!action) {
    return null;
  }

  const handleComplete = async (completed: boolean) => {
    setIsSubmitting(true);
    try {
      await onComplete(action.id, completed);
    } catch (error) {
      console.error('Error updating action:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOverdue = action.dueDate && new Date(action.dueDate) < new Date();

  return (
    <div
      className={`rounded-lg p-4 mb-4 border-2 ${
        isOverdue
          ? 'bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700'
          : 'bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3
            className={`font-semibold mb-1 ${
              isOverdue
                ? 'text-red-900 dark:text-red-100'
                : 'text-amber-900 dark:text-amber-100'
            }`}
          >
            {isOverdue ? '⏰ Overdue Check-in' : '📋 Pending Check-in'}
          </h3>
          <p
            className={`text-sm font-medium mb-2 ${
              isOverdue
                ? 'text-red-800 dark:text-red-200'
                : 'text-amber-800 dark:text-amber-200'
            }`}
          >
            {action.title}
          </p>
          {action.description && (
            <p
              className={`text-xs mb-3 ${
                isOverdue
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-amber-700 dark:text-amber-300'
              }`}
            >
              {action.description}
            </p>
          )}
          {action.dueDate && (
            <p
              className={`text-xs ${
                isOverdue
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-amber-700 dark:text-amber-300'
              }`}
            >
              Due: {new Date(action.dueDate).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => handleComplete(true)}
          disabled={isSubmitting || isLoading}
          className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : '✓ Done'}
        </button>
        <button
          onClick={() => handleComplete(false)}
          disabled={isSubmitting || isLoading}
          className="flex-1 px-3 py-2 bg-slate-400 hover:bg-slate-500 dark:bg-slate-600 dark:hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Not Yet'}
        </button>
      </div>
    </div>
  );
}
