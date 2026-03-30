'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/Buttons';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';

interface ConversationSession {
  id: string;
  title: string;
  createdAt: string;
  messageCount: number;
}

interface ConversationSidebarProps {
  currentSessionId: string | null;
  onSelectSession: (sessionId: string, messages?: any[]) => void;
  onNewConversation: () => void;
  userId: string;
  token: string;
}

/**
 * Conversation sidebar component
 * Displays list of past conversations and allows loading them
 */
export function ConversationSidebar({
  currentSessionId,
  onSelectSession,
  onNewConversation,
  userId,
  token,
}: ConversationSidebarProps) {
  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Load conversation sessions on mount
  useEffect(() => {
    const loadSessions = async () => {
      if (!userId || userId === 'guest') {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/conversations/list?userId=${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setSessions(data.sessions || []);
        }
      } catch (error) {
        console.error('Error loading sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [userId, token]);

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const response = await fetch(`/api/conversations/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setSessions(sessions.filter(s => s.id !== sessionId));
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-secondary)' }}>
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
        <Button
          onClick={onNewConversation}
          variant="primary"
          size="sm"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <Plus size={16} />
          New Chat
        </Button>
      </div>

      {/* Sessions List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {loading ? (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--ink2)', fontSize: '14px' }}>
            Loading...
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--ink2)', fontSize: '14px' }}>
            No conversations yet
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              style={{
                padding: '12px',
                marginBottom: '4px',
                borderRadius: '8px',
                cursor: 'pointer',
                background: currentSessionId === session.id ? 'var(--bg-tertiary)' : 'transparent',
                border: currentSessionId === session.id ? '1px solid var(--primary)' : '1px solid transparent',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                if (currentSessionId !== session.id) {
                  (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-tertiary)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentSessionId !== session.id) {
                  (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                }
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {session.title}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink2)', marginTop: '4px' }}>
                  {session.messageCount} messages
                </div>
              </div>
              <button
                onClick={(e) => handleDeleteSession(session.id, e)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--ink2)',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Delete conversation"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
