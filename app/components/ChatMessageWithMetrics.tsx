'use client';

import { ReactNode, useMemo } from 'react';
import { MetricCards } from './MetricCards';
import type { FinancialMetrics } from '@/lib/types/financial';
import { extractMetricsFromResponse, validateMetrics } from '@/lib/ai/metricCardPrompt';

interface ChatMessageWithMetricsProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

export function ChatMessageWithMetrics({ role, content, isStreaming }: ChatMessageWithMetricsProps) {
  const isAssistant = role === 'assistant';

  const { messageText, metrics } = useMemo(() => {
    if (!isAssistant) {
      return { messageText: content, metrics: null };
    }

    const { text, metrics: extractedMetrics } = extractMetricsFromResponse(content);
    const validMetrics = extractedMetrics && validateMetrics(extractedMetrics) ? extractedMetrics : null;

    return {
      messageText: text,
      metrics: validMetrics,
    };
  }, [content, isAssistant]);

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
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{messageText}</p>

        {isStreaming && isAssistant && (
          <div className="mt-2 flex gap-1">
            <span className="inline-block w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" />
            <span
              className="inline-block w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"
              style={{ animationDelay: '0.1s' }}
            />
            <span
              className="inline-block w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce"
              style={{ animationDelay: '0.2s' }}
            />
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
