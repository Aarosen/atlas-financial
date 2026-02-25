// Conversation History Database Layer - P0-3 requirement
import type { ConversationMessage, ConversationSession } from '../types/financial';

export class ConversationDb {
  // In-memory storage for MVP (will be replaced with Supabase)
  private messages: Map<string, ConversationMessage[]> = new Map();
  private sessions: Map<string, ConversationSession> = new Map();

  async createSession(userId: string, title: string = 'New Conversation'): Promise<ConversationSession> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: ConversationSession = {
      id: sessionId,
      userId,
      title,
      startedAt: new Date(),
      lastMessageAt: new Date(),
      messageCount: 0,
    };

    this.sessions.set(sessionId, session);
    this.messages.set(sessionId, []);
    return session;
  }

  async getSessions(userId: string): Promise<ConversationSession[]> {
    return Array.from(this.sessions.values()).filter((s) => s.userId === userId).sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
  }

  async getSession(sessionId: string): Promise<ConversationSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    structuredData?: any
  ): Promise<ConversationMessage> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const message: ConversationMessage = {
      id: messageId,
      userId: session.userId,
      conversationId: sessionId,
      role,
      content,
      structuredData,
      timestamp: new Date(),
    };

    const sessionMessages = this.messages.get(sessionId) || [];
    sessionMessages.push(message);
    this.messages.set(sessionId, sessionMessages);

    // Update session metadata
    session.lastMessageAt = new Date();
    session.messageCount = sessionMessages.length;
    this.sessions.set(sessionId, session);

    return message;
  }

  async getMessages(sessionId: string): Promise<ConversationMessage[]> {
    return this.messages.get(sessionId) || [];
  }

  async getRecentMessages(sessionId: string, limit: number = 10): Promise<ConversationMessage[]> {
    const messages = this.messages.get(sessionId) || [];
    return messages.slice(-limit);
  }

  async updateSessionTitle(sessionId: string, title: string): Promise<ConversationSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.title = title;
    this.sessions.set(sessionId, session);
    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
    this.messages.delete(sessionId);
  }

  // Build conversation context for Claude system prompt
  buildConversationContext(sessionId: string): string {
    const messages = this.messages.get(sessionId) || [];
    if (messages.length === 0) return '';

    const recentMessages = messages.slice(-5); // Last 5 messages for context
    return recentMessages
      .map((m) => `${m.role === 'user' ? 'User' : 'Atlas'}: ${m.content}`)
      .join('\n');
  }

  // Extract financial facts from conversation
  extractFinancialFacts(sessionId: string): Record<string, any> {
    const messages = this.messages.get(sessionId) || [];
    const facts: Record<string, any> = {};

    messages.forEach((msg) => {
      if (msg.structuredData?.metrics) {
        facts.lastMetrics = msg.structuredData.metrics;
      }
    });

    return facts;
  }
}
