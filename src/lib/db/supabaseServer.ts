/**
 * Server-only Supabase client using service role key
 * This file should ONLY be imported in server-side code (API routes, server components)
 * Never import this in client-side code
 */

import { createClient } from '@supabase/supabase-js';

if (typeof window !== 'undefined') {
  throw new Error(
    'supabaseServer.ts should only be used on the server. ' +
    'Use the anon key client on the client side instead.'
  );
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
  );
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Helper function to get user by ID (server-only)
 */
export async function getUserById(userId: string) {
  const { data, error } = await supabaseServer
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('[supabaseServer] Error fetching user:', error);
    return null;
  }

  return data;
}

/**
 * Helper function to update user profile (server-only)
 */
export async function updateUserProfile(userId: string, updates: Record<string, any>) {
  const { data, error } = await supabaseServer
    .from('user_profiles')
    .upsert(
      {
        user_id: userId,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('[supabaseServer] Error updating user profile:', error);
    return null;
  }

  return data;
}

/**
 * Helper function to get user conversations (server-only)
 */
export async function getUserConversations(userId: string) {
  const { data, error } = await supabaseServer
    .from('conversation_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[supabaseServer] Error fetching conversations:', error);
    return [];
  }

  return data || [];
}

/**
 * Helper function to get user actions (server-only)
 */
export async function getUserActions(userId: string) {
  const { data, error } = await supabaseServer
    .from('user_actions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[supabaseServer] Error fetching actions:', error);
    return [];
  }

  return data || [];
}

/**
 * Helper function to get financial snapshots (server-only)
 */
export async function getFinancialSnapshots(userId: string, limit = 10) {
  const { data, error } = await supabaseServer
    .from('financial_snapshots')
    .select('*')
    .eq('user_id', userId)
    .order('snapshot_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[supabaseServer] Error fetching snapshots:', error);
    return [];
  }

  return data || [];
}

/**
 * Helper function to delete user data (server-only)
 * Used for account deletion
 */
export async function deleteUserData(userId: string) {
  try {
    // Delete conversations
    await supabaseServer
      .from('conversation_sessions')
      .delete()
      .eq('user_id', userId);

    // Delete messages
    await supabaseServer
      .from('conversation_messages')
      .delete()
      .eq('user_id', userId);

    // Delete actions
    await supabaseServer
      .from('user_actions')
      .delete()
      .eq('user_id', userId);

    // Delete snapshots
    await supabaseServer
      .from('financial_snapshots')
      .delete()
      .eq('user_id', userId);

    // Delete profile
    await supabaseServer
      .from('user_profiles')
      .delete()
      .eq('user_id', userId);

    return true;
  } catch (error) {
    console.error('[supabaseServer] Error deleting user data:', error);
    return false;
  }
}
