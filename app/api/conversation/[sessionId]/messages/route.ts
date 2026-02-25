import { NextRequest, NextResponse } from 'next/server';
import { ConversationDb } from '@/lib/db/conversationDb';
import { RateLimitDb } from '@/lib/db/rateLimitDb';

const conversationDb = new ConversationDb();
const rateLimitDb = new RateLimitDb();

// GET /api/conversation/[sessionId]/messages - Get conversation messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await conversationDb.getSession(sessionId);
    if (!session || session.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const messages = await conversationDb.getMessages(sessionId);
    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/conversation/[sessionId]/messages - Add message to conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check rate limit
    const canSend = await rateLimitDb.canSendMessage(userId);
    if (!canSend.allowed) {
      return NextResponse.json(
        { error: 'Message limit reached. Upgrade to Plus for unlimited messages.' },
        { status: 429 }
      );
    }

    const session = await conversationDb.getSession(sessionId);
    if (!session || session.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const data = await request.json();
    const message = await conversationDb.addMessage(sessionId, data.role, data.content, data.structuredData);

    // Increment message count
    await rateLimitDb.incrementMessageCount(userId);

    return NextResponse.json(message);
  } catch (error) {
    console.error('Error adding message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
