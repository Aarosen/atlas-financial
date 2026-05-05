'use client';

import { useState } from 'react';
import type { FinancialState } from '@/lib/state/types';

interface FieldCorrectionCardProps {
  field: keyof FinancialState;
  currentValue: number | string | null;
  fieldLabel: string;
  onCorrect: (field: keyof FinancialState, newValue: number | string) => void;
  onCancel: () => void;
}

/**
 * TASK 1.4: Single-field edit card
 * Allows users to correct one financial field without restarting conversation
 * Shows inline confirmation of changed value
 */
export function FieldCorrectionCard({
  field,
  currentValue,
  fieldLabel,
  onCorrect,
  onCancel,
}: FieldCorrectionCardProps) {
  const [inputValue, setInputValue] = useState<string>(
    currentValue ? String(currentValue).replace(/,/g, '') : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!inputValue.trim()) return;
    setIsSubmitting(true);
    try {
      const numValue = parseFloat(inputValue);
      if (!Number.isFinite(numValue)) return;
      onCorrect(field, numValue);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 my-3">
      <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
        Edit {fieldLabel}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter new value"
          className="flex-1 px-3 py-2 border border-blue-300 dark:border-blue-700 rounded bg-white dark:bg-blue-900 text-blue-900 dark:text-blue-100 placeholder-blue-500 dark:placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSubmitting}
          autoFocus
        />
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !inputValue.trim()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded font-medium transition-colors"
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded font-medium transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
