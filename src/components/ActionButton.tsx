'use client';

import { useState, useCallback } from 'react';
import { ChevronRight, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export type ActionButtonState = 'idle' | 'loading' | 'success' | 'error';

interface ActionButtonProps {
  label: string;
  action: string; // Action identifier
  onClick: (action: string) => Promise<void>;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  className?: string;
  showIcon?: boolean;
}

/**
 * TASK 4.4: Action Button Component
 * Ensures action buttons are always responsive with proper loading/error states
 * Never leaves user hanging with unresponsive buttons
 */
export function ActionButton({
  label,
  action,
  onClick,
  variant = 'primary',
  disabled = false,
  className = '',
  showIcon = true,
}: ActionButtonProps) {
  const [state, setState] = useState<ActionButtonState>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    if (state !== 'idle' || disabled) return;

    setState('loading');
    setError(null);

    try {
      await onClick(action);
      setState('success');
      // Reset to idle after 2 seconds
      setTimeout(() => setState('idle'), 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Action failed';
      setError(errorMessage);
      setState('error');
      // Reset to idle after 4 seconds to allow retry
      setTimeout(() => setState('idle'), 4000);
    }
  }, [action, onClick, state, disabled]);

  const isProcessing = state === 'loading';
  const isSuccess = state === 'success';
  const isError = state === 'error';

  // Determine button styling based on variant and state
  const baseStyles = 'px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap';
  
  const variantStyles = {
    primary: isError
      ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 border border-red-300 dark:border-red-700'
      : isSuccess
      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 border border-green-300 dark:border-green-700'
      : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white border border-blue-700',
    secondary: isError
      ? 'bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200 border border-red-300 dark:border-red-700'
      : isSuccess
      ? 'bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-200 border border-green-300 dark:border-green-700'
      : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 border border-gray-400 dark:border-gray-600',
    danger: isError
      ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 border border-red-300 dark:border-red-700'
      : isSuccess
      ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 border border-green-300 dark:border-green-700'
      : 'bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white border border-red-700',
  };

  const disabledState = disabled || isProcessing;

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleClick}
        disabled={disabledState}
        className={`${baseStyles} ${variantStyles[variant]} ${disabledState ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
        aria-busy={isProcessing}
        aria-label={`${label}${isProcessing ? ' (processing)' : ''}${isError ? ' (error)' : ''}${isSuccess ? ' (success)' : ''}`}
      >
        {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
        {isSuccess && <CheckCircle2 className="w-4 h-4" />}
        {isError && <AlertCircle className="w-4 h-4" />}
        {!isProcessing && !isSuccess && !isError && showIcon && <ChevronRight className="w-4 h-4" />}
        
        <span>
          {isProcessing ? 'Processing...' : isSuccess ? 'Done!' : isError ? 'Try again' : label}
        </span>
      </button>
      
      {isError && error && (
        <div className="text-xs text-red-600 dark:text-red-400 px-2">
          {error}
        </div>
      )}
    </div>
  );
}
