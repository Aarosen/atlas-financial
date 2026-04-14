import { getSupabaseAdmin } from './supabase/server';
import type { FinancialProfile, ConversationSummary, Conversation } from './types/profile';

/**
 * Profile Management Layer
 * 
 * These functions interact with Supabase to manage user financial profiles.
 * They are called after Supabase environment variables are configured.
 * 
 * Required environment variables:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

export async function getProfile(userId: string): Promise<FinancialProfile | null> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await (supabaseAdmin
      .from('financial_profiles')
      .select('*')
      .eq('user_id', userId)
      .single() as any);
    
    if (error || !data) return null;
    return data as FinancialProfile;
  } catch {
    return null;
  }
}

export async function updateProfile(
  userId: string,
  updates: Partial<FinancialProfile>
): Promise<void> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const updateData = { 
      user_id: userId, 
      ...updates, 
      updated_at: new Date().toISOString() 
    };
    const result = await (supabaseAdmin
      .from('financial_profiles')
      .upsert(updateData as any, { onConflict: 'user_id' }) as any);
    
    if (result?.error) throw new Error(`Profile update failed: ${result.error.message}`);
    await recalculateCompleteness(userId);
  } catch (e) {
    console.error('Profile update error:', e);
  }
}

export async function getRecentContext(userId: string): Promise<Conversation[]> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data } = await (supabaseAdmin
      .from('conversations')
      .select('started_at, primary_topic, key_decisions, follow_up_needed, follow_up_notes')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(3) as any);
    
    return (data || []) as Conversation[];
  } catch {
    return [];
  }
}

export async function saveConversationSummary(
  userId: string,
  summary: ConversationSummary
): Promise<void> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const conversationData = {
      user_id: userId,
      primary_topic: summary.topic,
      key_decisions: summary.decisions,
      follow_up_needed: summary.followUpNeeded,
      follow_up_notes: summary.followUpNotes,
      ended_at: new Date().toISOString(),
    };
    await (supabaseAdmin.from('conversations').insert(conversationData as any) as any);
  } catch (e) {
    console.error('Conversation save error:', e);
  }
}

async function recalculateCompleteness(userId: string): Promise<void> {
  try {
    const profile = await getProfile(userId);
    if (!profile) return;
    
    const fields = [
      'monthly_income',
      'monthly_fixed_expenses',
      'total_savings',
      'primary_goal',
    ];
    
    const filled = fields.filter(
      f => (profile as any)[f] !== null && (profile as any)[f] !== undefined
    ).length;
    
    const pct = Math.round((filled / fields.length) * 100);
    
    const supabaseAdmin = getSupabaseAdmin();
    await (supabaseAdmin as any)
      .from('financial_profiles')
      .update({ profile_completeness: pct })
      .eq('user_id', userId);
  } catch (e) {
    console.error('Completeness calculation error:', e);
  }
}

/**
 * AUDIT 27 FIX REM-27-F: Cross-session debt progress tracking
 * Compares current debt balance to previous session and generates progress context
 * Returns: { debtPaidDown: number, percentageReduction: number, previousBalance: number }
 */
export async function getDebtProgressContext(
  userId: string,
  currentHighInterestDebt: number
): Promise<{ debtPaidDown: number; percentageReduction: number; previousBalance: number } | null> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    // Get the user's profile to find previous debt balance
    const { data: profile, error } = await (supabaseAdmin
      .from('financial_profiles')
      .select('high_interest_debt')
      .eq('user_id', userId)
      .single() as any);
    
    if (error || !profile) return null;
    
    const previousBalance = profile.high_interest_debt || 0;
    if (previousBalance <= 0) return null; // No prior debt to compare
    
    const debtPaidDown = Math.max(0, previousBalance - currentHighInterestDebt);
    const percentageReduction = previousBalance > 0 ? Math.round((debtPaidDown / previousBalance) * 100) : 0;
    
    return {
      debtPaidDown,
      percentageReduction,
      previousBalance,
    };
  } catch (e) {
    console.error('Debt progress calculation error:', e);
    return null;
  }
}

/**
 * AUDIT 27 FIX REM-27-G: Multi-turn context retention
 * Stores financial data snapshots within a session for multi-turn reference
 * Allows model to reference "earlier you said..." within same conversation
 */
export async function storeSessionFinancialSnapshot(
  userId: string,
  sessionId: string,
  financialData: {
    monthlyIncome?: number;
    essentialExpenses?: number;
    totalSavings?: number;
    highInterestDebt?: number;
    lowInterestDebt?: number;
    timestamp: string;
  }
): Promise<void> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    // Store snapshot in financial_events table for multi-turn reference
    await (supabaseAdmin as any)
      .from('financial_events')
      .insert({
        user_id: userId,
        session_id: sessionId,
        event_type: 'snapshot',
        event_data: financialData,
        occurred_at: new Date().toISOString(),
      });
  } catch (e) {
    console.error('Session snapshot storage error:', e);
  }
}

/**
 * AUDIT 27 FIX REM-27-G: Retrieve session financial snapshots for multi-turn context
 * Returns all financial snapshots from current session for model reference
 */
export async function getSessionFinancialSnapshots(
  userId: string,
  sessionId: string
): Promise<any[]> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    const { data, error } = await (supabaseAdmin
      .from('financial_events')
      .select('event_data, occurred_at')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .eq('event_type', 'snapshot')
      .order('occurred_at', { ascending: true }) as any);
    
    if (error || !data) return [];
    return data.map((row: any) => row.event_data);
  } catch (e) {
    console.error('Session snapshot retrieval error:', e);
    return [];
  }
}
