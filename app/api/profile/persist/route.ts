import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint for persisting financial profile at session end
 * Called by useSessionFinalization to save financial data for next session
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, sessionId, financialData, conversationText } = await request.json();

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
