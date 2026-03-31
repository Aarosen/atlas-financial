import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ConversationDb } from '@/lib/db/conversationDb';
import { RateLimitDb } from '@/lib/db/rateLimitDb';

const conversationDb = new ConversationDb();
const rateLimitDb = new RateLimitDb();

// Verify JWT token and extract userId
async function verifyToken(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase not configured');
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const token = authHeader.replace('Bearer ', '');
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return null;
    }
    return user.id;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

// POST /api/conversation - Create new conversation session
export async function POST(request: NextRequest) {
  try {
    const userId = await verifyToken(request);
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
    const userId = await verifyToken(request);
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
