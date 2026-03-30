/**
 * Milestone persistence system
 * Stores and retrieves seen milestones in localStorage
 */

const MILESTONE_STORAGE_KEY = 'atlas_seen_milestones';

export interface SeenMilestone {
  id: string;
  seenAt: string;
}

/**
 * Get all seen milestones from localStorage
 */
export function getSeenMilestones(): SeenMilestone[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(MILESTONE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[milestone-persistence] Error reading seen milestones:', error);
    return [];
  }
}

/**
 * Mark a milestone as seen
 */
export function markMilestoneAsSeen(milestoneId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const seen = getSeenMilestones();
    
    // Check if already seen
    if (seen.find(m => m.id === milestoneId)) {
      return;
    }
    
    // Add new seen milestone
    seen.push({
      id: milestoneId,
      seenAt: new Date().toISOString(),
    });
    
    localStorage.setItem(MILESTONE_STORAGE_KEY, JSON.stringify(seen));
  } catch (error) {
    console.error('[milestone-persistence] Error marking milestone as seen:', error);
  }
}

/**
 * Get unseen milestones from a list
 */
export function getUnseenMilestones(milestones: Array<{ id: string }>): Array<{ id: string }> {
  const seen = getSeenMilestones();
  const seenIds = new Set(seen.map(m => m.id));
  
  return milestones.filter(m => !seenIds.has(m.id));
}

/**
 * Clear all seen milestones (for testing/reset)
 */
export function clearSeenMilestones(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(MILESTONE_STORAGE_KEY);
  } catch (error) {
    console.error('[milestone-persistence] Error clearing seen milestones:', error);
  }
}
