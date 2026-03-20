import { NextRequest, NextResponse } from 'next/server';
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
