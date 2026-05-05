/**
 * REM-36-005: Ambiguity Confirmation Card
 * Shows confirmation prompts for ambiguous financial inputs (ranges, approximations, vague amounts)
 */

import React, { useState } from 'react';
import { Button } from './Buttons';
import { Card } from './Card';

export interface AmbiguityConfirmation {
  fieldKey: string;
  fieldName: string;
  type: 'range' | 'approximation' | 'vague';
  extractedValue?: number;
  confirmationPrompt: string;
}

interface AmbiguityConfirmationCardProps {
  ambiguities: Record<string, AmbiguityConfirmation>;
  onConfirm: (fieldKey: string, confirmed: boolean, newValue?: number) => void;
  onDismiss: () => void;
}

export function AmbiguityConfirmationCard({
  ambiguities,
  onConfirm,
  onDismiss,
}: AmbiguityConfirmationCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const ambiguityKeys = Object.keys(ambiguities);
  
  if (ambiguityKeys.length === 0) {
    return null;
  }

  const currentKey = ambiguityKeys[currentIndex];
  const current = ambiguities[currentKey];

  const handleConfirm = () => {
    onConfirm(currentKey, true, current.extractedValue);
    if (currentIndex < ambiguityKeys.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onDismiss();
    }
  };

  const handleReject = () => {
    onConfirm(currentKey, false);
    if (currentIndex < ambiguityKeys.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onDismiss();
    }
  };

  return (
    <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 mb-4">
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="text-2xl">❓</div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {current.confirmationPrompt}
            </p>
            {current.extractedValue !== undefined && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Type: {current.type}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleConfirm}
            variant="primary"
            size="sm"
            className="flex-1"
          >
            {current.type === 'vague' ? 'Provide amount' : 'Yes, use this'}
          </Button>
          <Button
            onClick={handleReject}
            variant="secondary"
            size="sm"
            className="flex-1"
          >
            {current.type === 'vague' ? 'Cancel' : 'No, change it'}
          </Button>
        </div>

        {ambiguityKeys.length > 1 && (
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {currentIndex + 1} of {ambiguityKeys.length}
          </div>
        )}
      </div>
    </Card>
  );
}
