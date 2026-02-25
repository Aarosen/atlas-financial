'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/lib/auth/userContext';
import type { ConversationSession } from '@/lib/types/financial';

interface ConversationSidebarProps {
  currentSessionId?: string;
  onSelectSession: (sessionId: string) => void;
  onNewConversation: () => void;
}

export function ConversationSidebar({
  currentSessionId,
  onSelectSession,
  onNewConversation,
}: ConversationSidebarProps) {
  const { user } = useUser();
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchSessions = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/conversation?userId=${user.id}`);
        if (!response.ok) throw new Error('Failed to fetch sessions');

        const data = await response.json();
        setSessions(data.sessions || []);
      } catch (error) {
        console.error('Error fetching sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [user?.id]);

  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString();
  };

  return (
    <div
      className={`flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 transition-all duration-300 ${
        isExpanded ? 'w-64' : 'w-20'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        {isExpanded && <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Conversations</h2>}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isExpanded ? '←' : '→'}
        </button>
      </div>

      {/* New Conversation Button */}
      <button
        onClick={onNewConversation}
        className="m-4 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors"
        aria-label="Start new conversation"
      >
        {isExpanded ? '+ New Chat' : '+'}
      </button>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-slate-500 dark:text-slate-400">
            {isExpanded ? 'Loading...' : '...'}
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-sm">
            {isExpanded ? 'No conversations yet' : 'Empty'}
          </div>
        ) : (
          <div className="space-y-2 p-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  currentSessionId === session.id
                    ? 'bg-teal-100 dark:bg-teal-900 text-teal-900 dark:text-teal-100'
                    : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
                title={session.title}
              >
                {isExpanded ? (
                  <div className="flex flex-col gap-1">
                    <p className="font-medium truncate text-sm">{session.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(session.lastMessageAt)}
                    </p>
                  </div>
                ) : (
                  <div className="text-center text-xs">
                    {session.messageCount}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {isExpanded && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
          {sessions.length} conversation{sessions.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
