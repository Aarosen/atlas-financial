import React from 'react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

interface ActionCompletionCardProps {
  actionId: string;
  actionText: string;
  dueDate?: string;
  onConfirm: (actionId: string, completed: boolean) => void;
  onDismiss: () => void;
}

/**
 * ActionCompletionCard
 * Displays a previous commitment and asks user if they completed it
 * Enables cross-session action tracking and progress acknowledgment
 */
export function ActionCompletionCard({
  actionId,
  actionText,
  dueDate,
  onConfirm,
  onDismiss,
}: ActionCompletionCardProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleConfirm = async (completed: boolean) => {
    setIsSubmitting(true);
    try {
      onConfirm(actionId, completed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString() : null;

  return (
    <div className="w-full max-w-2xl mx-auto mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm">
      <div className="flex items-start gap-3">
        <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 mb-2">
            Last time you said you'd do this:
          </p>
          <p className="text-base text-gray-800 mb-3 italic">
            "{actionText}"
          </p>
          {dueDateStr && (
            <p className="text-xs text-gray-600 mb-3">
              Due: {dueDateStr}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => handleConfirm(true)}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm font-medium rounded transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              I did it
            </button>
            <button
              onClick={() => handleConfirm(false)}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white text-sm font-medium rounded transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Not yet
            </button>
            <button
              onClick={onDismiss}
              disabled={isSubmitting}
              className="px-3 py-2 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-400 text-gray-800 text-sm font-medium rounded transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
