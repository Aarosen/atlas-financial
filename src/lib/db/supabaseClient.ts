// Supabase Client - Production Database Layer
// Phase 2D: Supabase integration for persistent storage

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database schema types
export interface SupabaseUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
  created_at: string;
  updated_at: string;
}

export interface SupabaseProfile {
  id: string;
  user_id: string;
  name: string;
  life_stage: string;
  monthly_income: number;
  monthly_expenses: number;
  savings_balance: number;
  monthly_savings: number;
  knowledge_level: string;
  created_at: string;
  updated_at: string;
}

export interface SupabaseConversation {
  id: string;
  user_id: string;
  title: string;
  started_at: string;
  last_message_at: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface SupabaseMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  structured_data?: Record<string, any>;
  created_at: string;
}

export interface SupabaseUserQuota {
  id: string;
  user_id: string;
  tier: 'free' | 'plus' | 'pro';
  conversations_used: number;
  conversations_limit: number;
  messages_used: number;
  messages_limit: number;
  reset_date: string;
  created_at: string;
  updated_at: string;
}

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return !!supabaseUrl && !!supabaseKey;
}

// Initialize Supabase tables (run once during setup)
export async function initializeSupabaseTables(): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured. Skipping table initialization.');
    return;
  }

  try {
    // Create users table
    try {
      await supabase.rpc('create_users_table');
    } catch {
      // Table may already exist
    }

    // Create profiles table
    try {
      await supabase.rpc('create_profiles_table');
    } catch {
      // Table may already exist
    }

    // Create conversations table
    try {
      await supabase.rpc('create_conversations_table');
    } catch {
      // Table may already exist
    }

    // Create messages table
    try {
      await supabase.rpc('create_messages_table');
    } catch {
      // Table may already exist
    }

    // Create quotas table
    try {
      await supabase.rpc('create_quotas_table');
    } catch {
      // Table may already exist
    }

    console.log('Supabase tables initialized successfully');
  } catch (error) {
    console.error('Error initializing Supabase tables:', error);
  }
}

// User operations
export async function createSupabaseUser(user: Omit<SupabaseUser, 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('users')
    .insert([user])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSupabaseUser(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

// Profile operations
export async function createSupabaseProfile(profile: Omit<SupabaseProfile, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('profiles')
    .insert([profile])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSupabaseProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data;
}

export async function updateSupabaseProfile(userId: string, updates: Partial<SupabaseProfile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Conversation operations
export async function createSupabaseConversation(conversation: Omit<SupabaseConversation, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('conversations')
    .insert([conversation])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSupabaseConversations(userId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getSupabaseConversation(conversationId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error) throw error;
  return data;
}

// Message operations
export async function createSupabaseMessage(message: Omit<SupabaseMessage, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('messages')
    .insert([message])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSupabaseMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

// Quota operations
export async function createSupabaseQuota(quota: Omit<SupabaseUserQuota, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('quotas')
    .insert([quota])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSupabaseQuota(userId: string) {
  const { data, error } = await supabase
    .from('quotas')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateSupabaseQuota(userId: string, updates: Partial<SupabaseUserQuota>) {
  const { data, error } = await supabase
    .from('quotas')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
