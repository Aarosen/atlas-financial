/**
 * User Memory System
 * Stores and retrieves anonymized user milestones across sessions
 * Tracks income changes, debt payoff, savings goals, and financial progress
 */

export interface UserMilestone {
  sessionId: string;
  timestamp: number;
  type: 'income_change' | 'debt_payoff' | 'savings_milestone' | 'goal_achieved' | 'credit_score_change';
  description: string;
  previousValue?: number;
  newValue?: number;
  metadata?: Record<string, any>;
}

export interface UserMemoryProfile {
  userId: string;
  createdAt: number;
  lastUpdated: number;
  milestones: UserMilestone[];
  financialSnapshot: {
    monthlyIncome?: number;
    totalSavings?: number;
    highInterestDebt?: number;
    lowInterestDebt?: number;
    estimatedCreditScore?: number;
  };
  progressNotes: string[];
}

export interface MemorySummary {
  progressSinceLastSession: string;
  keyMilestones: string[];
  financialTrend: 'improving' | 'stable' | 'declining';
  suggestedTopics: string[];
}

export class UserMemorySystem {
  private memories: Map<string, UserMemoryProfile> = new Map();

  /**
   * Initialize or retrieve user memory profile
   */
  initializeProfile(userId: string): UserMemoryProfile {
    if (this.memories.has(userId)) {
      return this.memories.get(userId)!;
    }

    const profile: UserMemoryProfile = {
      userId,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      milestones: [],
      financialSnapshot: {},
      progressNotes: [],
    };

    this.memories.set(userId, profile);
    return profile;
  }

  /**
   * Record a milestone in user's financial journey
   */
  recordMilestone(userId: string, milestone: Omit<UserMilestone, 'sessionId'>): void {
    const profile = this.initializeProfile(userId);
    profile.milestones.push({
      ...milestone,
      sessionId: `session_${Date.now()}`,
    });
    profile.lastUpdated = Date.now();
  }

  /**
   * Update financial snapshot
   */
  updateFinancialSnapshot(
    userId: string,
    snapshot: Partial<UserMemoryProfile['financialSnapshot']>
  ): void {
    const profile = this.initializeProfile(userId);
    profile.financialSnapshot = {
      ...profile.financialSnapshot,
      ...snapshot,
    };
    profile.lastUpdated = Date.now();
  }

  /**
   * Add progress note
   */
  addProgressNote(userId: string, note: string): void {
    const profile = this.initializeProfile(userId);
    profile.progressNotes.push(note);
    profile.lastUpdated = Date.now();
  }

  /**
   * Generate memory summary for session start
   */
  generateMemorySummary(userId: string): MemorySummary {
    const profile = this.initializeProfile(userId);

    if (profile.milestones.length === 0) {
      return {
        progressSinceLastSession: 'This is your first session with Atlas.',
        keyMilestones: [],
        financialTrend: 'stable',
        suggestedTopics: ['building_emergency_fund', 'debt_payoff_strategy', 'investing_basics'],
      };
    }

    // Get recent milestones (last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentMilestones = profile.milestones.filter((m) => m.timestamp > thirtyDaysAgo);

    // Determine financial trend
    const savingsMilestones = profile.milestones.filter((m) => m.type === 'savings_milestone');
    const debtMilestones = profile.milestones.filter((m) => m.type === 'debt_payoff');
    const financialTrend: MemorySummary['financialTrend'] =
      savingsMilestones.length > debtMilestones.length ? 'improving' : debtMilestones.length > 0 ? 'improving' : 'stable';

    // Generate suggested topics based on history
    const suggestedTopics: string[] = [];
    if (profile.financialSnapshot.highInterestDebt && profile.financialSnapshot.highInterestDebt > 0) {
      suggestedTopics.push('high_interest_debt_strategy');
    }
    if (!profile.financialSnapshot.totalSavings || profile.financialSnapshot.totalSavings < 3000) {
      suggestedTopics.push('emergency_fund_building');
    }
    if (profile.financialSnapshot.monthlyIncome && profile.financialSnapshot.monthlyIncome > 5000) {
      suggestedTopics.push('investment_planning');
    }

    return {
      progressSinceLastSession:
        recentMilestones.length > 0
          ? `You've made ${recentMilestones.length} financial progress update(s) in the last 30 days.`
          : 'No major changes since your last session.',
      keyMilestones: recentMilestones.map((m) => m.description),
      financialTrend,
      suggestedTopics: suggestedTopics.slice(0, 3),
    };
  }

  /**
   * Get formatted memory context for LLM
   */
  getMemoryContext(userId: string): string {
    const profile = this.initializeProfile(userId);

    if (profile.milestones.length === 0) {
      return 'No previous session history.';
    }

    const recentMilestones = profile.milestones.slice(-5);
    const snapshot = profile.financialSnapshot;

    let context = 'USER MEMORY:\n';
    context += `Last updated: ${new Date(profile.lastUpdated).toLocaleDateString()}\n`;
    context += `Financial snapshot: Income $${snapshot.monthlyIncome || '?'}/mo, Savings $${snapshot.totalSavings || '?'}, High-interest debt $${snapshot.highInterestDebt || '?'}\n`;
    context += `Recent milestones:\n`;
    recentMilestones.forEach((m) => {
      context += `- ${m.description}\n`;
    });

    return context;
  }

  /**
   * Clear old data (for privacy)
   */
  clearOldData(userId: string, daysToKeep: number = 180): void {
    const profile = this.memories.get(userId);
    if (!profile) return;

    const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
    profile.milestones = profile.milestones.filter((m) => m.timestamp > cutoffTime);
    profile.lastUpdated = Date.now();
  }
}

export const userMemorySystem = new UserMemorySystem();
