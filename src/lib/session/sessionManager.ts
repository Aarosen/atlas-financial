// Session Manager - Conversation Session Management
import { ConversationDb } from '@/lib/db/conversationDb';

export interface SessionState {
  sessionId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  isActive: boolean;
}

export class SessionManager {
  private conversationDb: ConversationDb;

  constructor() {
    this.conversationDb = new ConversationDb();
  }

  async createSession(userId: string): Promise<SessionState> {
    const session = await this.conversationDb.createSession(userId);
    
    return {
      sessionId: session.id,
      userId: session.userId,
      createdAt: session.startedAt,
      updatedAt: session.lastMessageAt,
      messageCount: 0,
      isActive: true,
    };
  }

  async getSession(sessionId: string): Promise<SessionState | null> {
    const session = await this.conversationDb.getSession(sessionId);
    if (!session) return null;

    const messages = await this.conversationDb.getMessages(sessionId);
    
    return {
      sessionId: session.id,
      userId: session.userId,
      createdAt: session.startedAt,
      updatedAt: session.lastMessageAt,
      messageCount: messages.length,
      isActive: true,
    };
  }

  async getUserSessions(userId: string): Promise<SessionState[]> {
    const sessions = await this.conversationDb.getSessions(userId);
    
    return sessions.map(session => ({
      sessionId: session.id,
      userId: session.userId,
      createdAt: session.startedAt,
      updatedAt: session.lastMessageAt,
      messageCount: session.messageCount,
      isActive: true,
    }));
  }

  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    structuredData?: any
  ): Promise<void> {
    await this.conversationDb.addMessage(sessionId, role, content, structuredData);
  }

  async getSessionMessages(sessionId: string) {
    return this.conversationDb.getMessages(sessionId);
  }

  async restoreSession(sessionId: string) {
    const session = await this.getSession(sessionId);
    const messages = await this.getSessionMessages(sessionId);
    
    return {
      session,
      messages,
    };
  }
}

// Singleton instance
let sessionManager: SessionManager | null = null;

export function getSessionManager(): SessionManager {
  if (!sessionManager) {
    sessionManager = new SessionManager();
  }
  return sessionManager;
}
