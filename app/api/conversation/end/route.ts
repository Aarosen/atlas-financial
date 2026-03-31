import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { updateProfile, saveConversationSummary } from '@/lib/profile';
import { EXTRACTION_PROMPT } from '@/lib/ai/extractionPrompt';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { userId, messages } = await req.json();

    if (!userId || !messages?.length) {
      return NextResponse.json({ ok: true });
    }

    // Verify JWT token for non-guest users
    if (userId !== 'guest') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        );
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const token = authHeader.slice(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user || user.id !== userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 512,
      system: EXTRACTION_PROMPT,
      messages: [{ role: 'user', content: JSON.stringify(messages) }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    const extracted = JSON.parse(raw.replace(/```json|```/g, ''));

    // Update profile with extracted non-null fields
    const profileUpdates = Object.fromEntries(
      Object.entries(extracted).filter(
        ([k, v]) =>
          !['key_decisions', 'follow_up_needed', 'follow_up_notes'].includes(k) && v !== null
      )
    );

    if (Object.keys(profileUpdates).length > 0) {
      await updateProfile(userId, profileUpdates);
    }

    await saveConversationSummary(userId, {
      topic: extracted.primary_goal ?? 'general',
      decisions: extracted.key_decisions ?? [],
      followUpNeeded: extracted.follow_up_needed ?? false,
      followUpNotes: extracted.follow_up_notes ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Extraction failed:', e);
    return NextResponse.json({ ok: true });
  }
}
