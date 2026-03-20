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
