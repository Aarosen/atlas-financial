import { NextRequest, NextResponse } from 'next/server';
import { ConversationDb } from '@/lib/db/conversationDb';
import { RateLimitDb } from '@/lib/db/rateLimitDb';

const conversationDb = new ConversationDb();
const rateLimitDb = new RateLimitDb();

// POST /api/conversation - Create new conversation session
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check rate limit
    const canStart = await rateLimitDb.canStartConversation(userId);
    if (!canStart.allowed) {
      return NextResponse.json(
        { error: 'Conversation limit reached. Upgrade to Plus for unlimited conversations.' },
        { status: 429 }
      );
    }

    const data = await request.json();
    const session = await conversationDb.createSession(userId, data.title || 'New Conversation');

    // Increment conversation count
    await rateLimitDb.incrementConversationCount(userId);

    return NextResponse.json(session);
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/conversation - Get user's conversation sessions
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessions = await conversationDb.getSessions(userId);
    return NextResponse.json(sessions);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
