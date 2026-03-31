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
  financialProfile?: Record<string, any>,
  accessToken?: string
): Promise<Milestone[]> {
  try {
    // Fetch real data from server-side API endpoint
    let actionsCompleted = 0;
    let daysSinceFirstMessage = 0;

    if (accessToken && userId !== 'guest') {
      try {
        const response = await fetch(
          `/api/user/stats?userId=${encodeURIComponent(userId)}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          actionsCompleted = data.actionsCompleted || 0;
          daysSinceFirstMessage = data.daysSinceFirstMessage || 0;
        }
      } catch (error) {
        console.warn('[mid-session-milestones] Error fetching user stats, using defaults:', error);
      }
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
  financialProfile?: Record<string, any>,
  accessToken?: string
): Promise<Milestone[]> {
  try {
    if (goalStatus !== 'achieved') {
      return [];
    }
    
    // Fetch real data from server-side API endpoint
    let actionsCompleted = 0;
    let daysSinceFirstMessage = 0;

    if (accessToken && userId !== 'guest') {
      try {
        const response = await fetch(
          `/api/user/stats?userId=${encodeURIComponent(userId)}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          actionsCompleted = data.actionsCompleted || 0;
          daysSinceFirstMessage = data.daysSinceFirstMessage || 0;
        }
      } catch (error) {
        console.warn('[mid-session-milestones] Error fetching user stats, using defaults:', error);
      }
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
