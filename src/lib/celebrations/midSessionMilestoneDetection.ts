/**
 * Mid-session milestone detection
 * Checks for milestones when goals are created or updated during conversation
 * Dispatches browser events to trigger immediate celebration display
 */

import { checkMilestones, type Milestone } from './milestoneCelebrations';

/**
 * Check for milestones based on current financial data
 * Called after goal creation or update to trigger immediate celebrations
 */
export async function checkAndDispatchMilestones(
  financialData: {
    goalsSet?: number;
    actionsCompleted?: number;
    daysSinceFirstMessage?: number;
    debtPayoffProgress?: number;
    emergencyFundProgress?: number;
    savingsProgress?: number;
    actionStreak?: number;
    goalsCompleted?: number;
    highInterestDebt?: number;
  }
): Promise<Milestone[]> {
  try {
    // Check which milestones are unlocked with current data
    const unlockedMilestones = checkMilestones(financialData);
    
    if (unlockedMilestones.length > 0) {
      // Dispatch browser event for frontend to handle milestone display
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('atlas:milestones', {
            detail: unlockedMilestones,
          })
        );
      }
    }
    
    return unlockedMilestones;
  } catch (error) {
    console.error('[mid-session-milestones] Error checking milestones:', error);
    return [];
  }
}

/**
 * Check for milestones after goal creation
 * Called immediately when a new goal is detected and saved
 */
export async function checkMilestonesAfterGoalCreation(
  userId: string,
  goalsCount: number,
  financialProfile?: Record<string, any>
): Promise<Milestone[]> {
  try {
    // Fetch real data from Supabase
    let actionsCompleted = 0;
    let daysSinceFirstMessage = 0;

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && supabaseServiceKey) {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Count completed actions
        const { data: actions } = await supabase
          .from('user_actions')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'completed');
        actionsCompleted = actions?.length || 0;

        // Calculate days since first message
        const { data: messages } = await supabase
          .from('conversation_messages')
          .select('created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(1);
        
        if (messages && messages.length > 0) {
          const firstMessageDate = new Date(messages[0].created_at);
          const now = new Date();
          daysSinceFirstMessage = Math.floor((now.getTime() - firstMessageDate.getTime()) / (1000 * 60 * 60 * 24));
        }
      }
    } catch (error) {
      console.warn('[mid-session-milestones] Error fetching real data, using defaults:', error);
    }

    // Build financial data snapshot for milestone checking
    const financialData = {
      goalsSet: goalsCount,
      actionsCompleted,
      daysSinceFirstMessage,
      debtPayoffProgress: financialProfile?.highInterestDebt ? 0 : undefined,
      emergencyFundProgress: financialProfile?.emergencyFund ? 0 : undefined,
      savingsProgress: financialProfile?.totalSavings ? 0 : undefined,
      highInterestDebt: financialProfile?.highInterestDebt || 0,
    };
    
    return await checkAndDispatchMilestones(financialData);
  } catch (error) {
    console.error('[mid-session-milestones] Error checking milestones after goal creation:', error);
    return [];
  }
}

/**
 * Check for milestones after goal status update (e.g., marked as achieved)
 * Called when a goal is marked complete or status changes
 */
export async function checkMilestonesAfterGoalUpdate(
  userId: string,
  goalStatus: 'achieved' | 'paused' | 'abandoned',
  goalsCompleted: number,
  financialProfile?: Record<string, any>
): Promise<Milestone[]> {
  try {
    if (goalStatus !== 'achieved') {
      return [];
    }
    
    // Fetch real data from Supabase
    let actionsCompleted = 0;
    let daysSinceFirstMessage = 0;

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && supabaseServiceKey) {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Count completed actions
        const { data: actions } = await supabase
          .from('user_actions')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'completed');
        actionsCompleted = actions?.length || 0;

        // Calculate days since first message
        const { data: messages } = await supabase
          .from('conversation_messages')
          .select('created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(1);
        
        if (messages && messages.length > 0) {
          const firstMessageDate = new Date(messages[0].created_at);
          const now = new Date();
          daysSinceFirstMessage = Math.floor((now.getTime() - firstMessageDate.getTime()) / (1000 * 60 * 60 * 24));
        }
      }
    } catch (error) {
      console.warn('[mid-session-milestones] Error fetching real data, using defaults:', error);
    }
    
    // Build financial data snapshot for milestone checking
    const financialData = {
      goalsSet: 0,
      actionsCompleted,
      daysSinceFirstMessage,
      goalsCompleted,
      debtPayoffProgress: financialProfile?.highInterestDebt ? 0 : undefined,
      emergencyFundProgress: financialProfile?.emergencyFund ? 0 : undefined,
      savingsProgress: financialProfile?.totalSavings ? 0 : undefined,
      highInterestDebt: financialProfile?.highInterestDebt || 0,
    };
    
    return await checkAndDispatchMilestones(financialData);
  } catch (error) {
    console.error('[mid-session-milestones] Error checking milestones after goal update:', error);
    return [];
  }
}
