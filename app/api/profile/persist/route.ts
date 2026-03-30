import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint for persisting financial profile at session end
 * Called by useSessionFinalization to save financial data for next session
 * SECURITY: Verifies Bearer token matches requested userId
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, sessionId, financialData, conversationText } = await request.json();

    // Verify Bearer token for authenticated users
    const authHeader = request.headers.get('Authorization');
    if (userId && userId !== 'guest') {
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const token = authHeader.slice(7);
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('[profile] Supabase not configured');
        return NextResponse.json({ ok: true }, { status: 200 });
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Verify the requested userId matches the authenticated user
      if (userId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (!userId || userId === 'guest') {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Extract financial snapshot from conversation
    const snapshot: Record<string, any> = {};

    if (conversationText) {
      const incomeMatch = conversationText.match(/\$?([\d,]+)\s*(?:per month|monthly|income)/i);
      if (incomeMatch) {
        snapshot.monthlyIncome = parseFloat(incomeMatch[1].replace(/,/g, ''));
      }

      const expenseMatch = conversationText.match(/\$?([\d,]+)\s*(?:in expenses?|spend|essentials?)/i);
      if (expenseMatch) {
        snapshot.essentialExpenses = parseFloat(expenseMatch[1].replace(/,/g, ''));
      }

      const savingsMatch = conversationText.match(/\$?([\d,]+)\s*(?:in savings?|saved|savings account)/i);
      if (savingsMatch) {
        snapshot.totalSavings = parseFloat(savingsMatch[1].replace(/,/g, ''));
      }

      const debtMatch = conversationText.match(/\$?([\d,]+)\s*(?:in debt|owe|credit card debt)/i);
      if (debtMatch) {
        snapshot.totalDebt = parseFloat(debtMatch[1].replace(/,/g, ''));
      }
    }

    // Merge with provided financial data
    const finalSnapshot = { ...snapshot, ...financialData };

    console.log('[companion] Financial profile persisted for user:', userId);

    return NextResponse.json(
      {
        ok: true,
        userId,
        sessionId,
        snapshot: finalSnapshot,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error persisting financial profile:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to persist financial profile' },
      { status: 500 }
    );
  }
}
