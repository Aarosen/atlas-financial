'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ChatMessage } from '@/lib/state/types';

interface ConversationMemory {
  sessionId: string;
  userId: string;
  messages: ChatMessage[];
  lastUpdated: number;
  context: {
    primaryGoal?: string;
    financialSnapshot?: Record<string, any>;
    previousActions?: string[];
  };
}

export function useConversationMemory(userId: string, sessionId: string, accessToken?: string) {
  const [memory, setMemory] = useState<ConversationMemory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load conversation memory from Supabase
  const loadMemory = useCallback(async () => {
    if (!userId || !sessionId || userId === 'guest') {
      setIsLoaded(true);
      return;
    }

    setIsLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(
        `/api/memory/load?userId=${encodeURIComponent(userId)}&sessionId=${encodeURIComponent(sessionId)}`,
        {
          method: 'GET',
          headers,
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMemory(data);
      }
    } catch (error) {
      console.error('Error loading conversation memory:', error);
    } finally {
      setIsLoading(false);
      setIsLoaded(true);
    }
  }, [userId, sessionId, accessToken]);

  // Save conversation memory to Supabase
  const saveMemory = useCallback(
    async (messages: ChatMessage[], context?: ConversationMemory['context']) => {
      if (!userId || !sessionId || userId === 'guest') {
        return;
      }

      try {
        await fetch('/api/memory/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            sessionId,
            messages,
            context: context || {},
          }),
        });
      } catch (error) {
        console.error('Error saving conversation memory:', error);
      }
    },
    [userId, sessionId]
  );

  // Clear conversation memory
  const clearMemory = useCallback(async () => {
    if (!userId || !sessionId || userId === 'guest') {
      return;
    }

    try {
      await fetch('/api/memory/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, sessionId }),
      });
      setMemory(null);
    } catch (error) {
      console.error('Error clearing conversation memory:', error);
    }
  }, [userId, sessionId]);

  // Load memory on mount
  useEffect(() => {
    loadMemory();
  }, [loadMemory]);

  return {
    memory,
    isLoading,
    isLoaded,
    loadMemory,
    saveMemory,
    clearMemory,
  };
}
