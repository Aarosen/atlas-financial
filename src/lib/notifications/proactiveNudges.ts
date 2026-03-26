/**
 * Proactive nudges system
 * Generates intelligent nudges based on user progress and milestones
 */

import type { FinancialGoal } from '@/lib/goals/multiGoalTypes';

export type NudgeType = 'milestone' | 'goal_progress' | 'phase_complete' | 'action_reminder' | 'behavioral';

export interface ProactiveNudge {
  type: NudgeType;
  title: string;
  message: string;
  actionUrl: string;
  priority: 'low' | 'medium' | 'high';
  shouldSendEmail: boolean;
}

/**
 * Generate nudge for goal milestone reached
 */
export function generateMilestoneNudge(goal: FinancialGoal, percentComplete: number): ProactiveNudge | null {
  const milestones = [25, 50, 75, 100];
  const reachedMilestone = milestones.find((m) => percentComplete >= m && percentComplete < m + 10);

  if (!reachedMilestone) {
    return null;
  }

  const messages = {
    25: `You're 25% of the way to ${goal.title}! Keep up the momentum.`,
    50: `Halfway there! You're 50% complete on ${goal.title}. You're doing great.`,
    75: `You're 75% complete on ${goal.title}. The finish line is in sight!`,
    100: `🎉 You've completed ${goal.title}! Congratulations on this achievement.`,
  };

  return {
    type: 'milestone',
    title: `${reachedMilestone}% Complete: ${goal.title}`,
    message: messages[reachedMilestone as keyof typeof messages] || `Great progress on ${goal.title}!`,
    actionUrl: 'https://atlas.financial/conversation',
    priority: reachedMilestone === 100 ? 'high' : 'medium',
    shouldSendEmail: reachedMilestone >= 50,
  };
}

/**
 * Generate nudge for consistent goal progress
 */
export function generateProgressNudge(goal: FinancialGoal, monthsActive: number): ProactiveNudge | null {
  if (monthsActive < 1 || !goal.monthlyContribution) {
    return null;
  }

  const expectedProgress = goal.monthlyContribution * monthsActive;
  const actualProgress = goal.currentAmount || 0;
  const isOnTrack = actualProgress >= expectedProgress * 0.9; // 90% of expected

  if (!isOnTrack) {
    return {
      type: 'goal_progress',
      title: `${goal.title} - Let's Get Back on Track`,
      message: `You've been working on ${goal.title} for ${monthsActive} month${monthsActive > 1 ? 's' : ''}. You're at $${actualProgress.toLocaleString()}, and we expected $${expectedProgress.toLocaleString()} by now. Small adjustments can get you back on track.`,
      actionUrl: 'https://atlas.financial/conversation',
      priority: 'medium',
      shouldSendEmail: true,
    };
  }

  return {
    type: 'goal_progress',
    title: `${goal.title} - You're On Track!`,
    message: `Great news! You're making consistent progress on ${goal.title}. You're at $${actualProgress.toLocaleString()} after ${monthsActive} month${monthsActive > 1 ? 's' : ''}. Keep it up!`,
    actionUrl: 'https://atlas.financial/conversation',
    priority: 'low',
    shouldSendEmail: false,
  };
}

/**
 * Generate nudge for phase completion
 */
export function generatePhaseCompleteNudge(phaseName: string, nextPhaseName: string): ProactiveNudge {
  return {
    type: 'phase_complete',
    title: `${phaseName} Phase Complete!`,
    message: `Congratulations! You've completed the ${phaseName} phase. You're now ready to focus on the ${nextPhaseName} phase. This is a major milestone in your financial journey.`,
    actionUrl: 'https://atlas.financial/conversation',
    priority: 'high',
    shouldSendEmail: true,
  };
}

/**
 * Generate nudge for action reminder
 */
export function generateActionReminderNudge(actionTitle: string, daysUntilDue: number): ProactiveNudge | null {
  if (daysUntilDue < 0) {
    return null; // Action is overdue, use different notification
  }

  if (daysUntilDue === 0) {
    return {
      type: 'action_reminder',
      title: `Action Due Today: ${actionTitle}`,
      message: `Your financial action "${actionTitle}" is due today. Complete it now to stay on track with your goals.`,
      actionUrl: 'https://atlas.financial/conversation',
      priority: 'high',
      shouldSendEmail: true,
    };
  }

  if (daysUntilDue === 1) {
    return {
      type: 'action_reminder',
      title: `Action Due Tomorrow: ${actionTitle}`,
      message: `Your financial action "${actionTitle}" is due tomorrow. Get it done to keep your momentum going.`,
      actionUrl: 'https://atlas.financial/conversation',
      priority: 'high',
      shouldSendEmail: true,
    };
  }

  if (daysUntilDue <= 3) {
    return {
      type: 'action_reminder',
      title: `Action Due Soon: ${actionTitle}`,
      message: `Your financial action "${actionTitle}" is due in ${daysUntilDue} days. Start planning to complete it on time.`,
      actionUrl: 'https://atlas.financial/conversation',
      priority: 'medium',
      shouldSendEmail: false,
    };
  }

  return null;
}

/**
 * Generate behavioral nudge based on user patterns
 */
export function generateBehavioralNudge(pattern: 'consistent' | 'inconsistent' | 'improving' | 'declining'): ProactiveNudge | null {
  const nudges = {
    consistent: {
      type: 'behavioral' as const,
      title: 'You\'re Consistently Great!',
      message: 'Your consistent progress over the past month shows real commitment to your financial goals. This is exactly the kind of behavior that builds wealth.',
      actionUrl: 'https://atlas.financial/conversation',
      priority: 'low' as const,
      shouldSendEmail: false,
    },
    improving: {
      type: 'behavioral' as const,
      title: 'Your Progress is Improving!',
      message: 'We\'ve noticed your financial discipline is improving week over week. Keep building on this momentum!',
      actionUrl: 'https://atlas.financial/conversation',
      priority: 'medium' as const,
      shouldSendEmail: true,
    },
    inconsistent: {
      type: 'behavioral' as const,
      title: 'Let\'s Build Consistency',
      message: 'Your progress has been inconsistent lately. Small, consistent actions are more powerful than sporadic big efforts. Let\'s get back to a regular rhythm.',
      actionUrl: 'https://atlas.financial/conversation',
      priority: 'medium' as const,
      shouldSendEmail: true,
    },
    declining: {
      type: 'behavioral' as const,
      title: 'We Miss You!',
      message: 'Your financial progress has slowed down recently. Let\'s reconnect and get you back on track. What\'s changed?',
      actionUrl: 'https://atlas.financial/conversation',
      priority: 'high' as const,
      shouldSendEmail: true,
    },
  };

  return nudges[pattern] || null;
}

/**
 * Evaluate if user should receive a nudge
 * Prevents nudge fatigue by spacing them out
 */
export function shouldSendNudge(lastNudgeSentAt: Date | null, nudgeType: NudgeType): boolean {
  if (!lastNudgeSentAt) {
    return true;
  }

  const now = new Date();
  const hoursSinceLastNudge = (now.getTime() - lastNudgeSentAt.getTime()) / (1000 * 60 * 60);

  // Spacing rules by nudge type
  const minHoursBetween = {
    milestone: 24, // At least 1 day between milestone nudges
    goal_progress: 168, // At least 1 week between progress nudges
    phase_complete: 720, // At least 30 days between phase nudges
    action_reminder: 24, // At least 1 day between action reminders
    behavioral: 168, // At least 1 week between behavioral nudges
  };

  return hoursSinceLastNudge >= minHoursBetween[nudgeType];
}

/**
 * Format nudge for display in conversation
 */
export function formatNudgeForDisplay(nudge: ProactiveNudge): string {
  const icons = {
    milestone: '🎉',
    goal_progress: '📈',
    phase_complete: '✅',
    action_reminder: '⏰',
    behavioral: '💪',
  };

  const icon = icons[nudge.type];

  return `${icon} ${nudge.title}\n\n${nudge.message}`;
}
