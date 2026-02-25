'use client';

import { ReactNode } from 'react';
import { MetricCards } from './MetricCards';
import type { FinancialMetrics } from '@/lib/types/financial';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  metrics?: FinancialMetrics;
  isStreaming?: boolean;
}

export function ChatMessage({ role, content, metrics, isStreaming }: ChatMessageProps) {
  const isAssistant = role === 'assistant';

  return (
    <div
      className={`flex gap-3 mb-4 ${isAssistant ? 'justify-start' : 'justify-end'}`}
      role="article"
      aria-label={`${role === 'user' ? 'Your' : 'Atlas'} message`}
    >
      <div
        className={`max-w-md lg:max-w-2xl rounded-2xl px-4 py-3 ${
          isAssistant
            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
            : 'bg-teal-600 dark:bg-teal-700 text-white'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>

        {isStreaming && isAssistant && (
          <div className="mt-2 flex gap-1">
            <span className="inline-block w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" />
            <span className="inline-block w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <span className="inline-block w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
        )}
      </div>

      {metrics && isAssistant && (
        <div className="w-full">
          <MetricCards metrics={metrics} />
        </div>
      )}
    </div>
  );
}
