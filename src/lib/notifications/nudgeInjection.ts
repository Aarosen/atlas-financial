/**
 * Nudge injection system
 * Integrates proactive nudges into chat responses
 */

import type { FinancialGoal } from '@/lib/goals/multiGoalTypes';
import type { ProactiveNudge } from './proactiveNudges';
import {
  generateMilestoneNudge,
  generateProgressNudge,
  generatePhaseCompleteNudge,
  generateActionReminderNudge,
  generateBehavioralNudge,
  shouldSendNudge,
  formatNudgeForDisplay,
} from './proactiveNudges';

export interface NudgeInjectionContext {
  userId: string;
  goals: FinancialGoal[];
  lastNudgeSentAt?: Date | null;
  userBehaviorPattern?: 'consistent' | 'inconsistent' | 'improving' | 'declining';
  upcomingActions?: Array<{
    title: string;
    dueDate: string;
  }>;
}

/**
 * Evaluate goals and generate applicable nudges
 */
export function evaluateGoalsForNudges(context: NudgeInjectionContext): ProactiveNudge[] {
  const nudges: ProactiveNudge[] = [];

  for (const goal of context.goals) {
    if (goal.status !== 'active') {
      continue;
    }

    // Check for milestone nudge
    if (goal.targetAmount && goal.currentAmount) {
      const percentComplete = (goal.currentAmount / goal.targetAmount) * 100;
      const milestoneNudge = generateMilestoneNudge(goal, percentComplete);

      if (milestoneNudge && shouldSendNudge(context.lastNudgeSentAt || null, milestoneNudge.type)) {
        nudges.push(milestoneNudge);
      }
    }

    // Check for progress nudge
    if (goal.createdAt) {
      const createdDate = new Date(goal.createdAt);
      const now = new Date();
      const monthsActive = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

      if (monthsActive > 0) {
        const progressNudge = generateProgressNudge(goal, monthsActive);

        if (progressNudge && shouldSendNudge(context.lastNudgeSentAt || null, progressNudge.type)) {
          nudges.push(progressNudge);
        }
      }
    }
  }

  // Check for behavioral nudge
  if (context.userBehaviorPattern) {
    const behavioralNudge = generateBehavioralNudge(context.userBehaviorPattern);

    if (behavioralNudge && shouldSendNudge(context.lastNudgeSentAt || null, behavioralNudge.type)) {
      nudges.push(behavioralNudge);
    }
  }

  // Check for action reminder nudges
  if (context.upcomingActions) {
    for (const action of context.upcomingActions) {
      const dueDate = new Date(action.dueDate);
      const now = new Date();
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      const reminderNudge = generateActionReminderNudge(action.title, daysUntilDue);

      if (reminderNudge && shouldSendNudge(context.lastNudgeSentAt || null, reminderNudge.type)) {
        nudges.push(reminderNudge);
      }
    }
  }

  return nudges;
}

/**
 * Select the most relevant nudge to inject
 * Prioritizes by: high priority > email-worthy > low priority
 */
export function selectBestNudge(nudges: ProactiveNudge[]): ProactiveNudge | null {
  if (nudges.length === 0) {
    return null;
  }

  // Sort by priority and email-worthiness
  const sorted = nudges.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    // Within same priority, prefer email-worthy nudges
    if (a.shouldSendEmail && !b.shouldSendEmail) {
      return -1;
    }
    if (!a.shouldSendEmail && b.shouldSendEmail) {
      return 1;
    }

    return 0;
  });

  return sorted[0];
}

/**
 * Format nudge for injection into chat response
 */
export function formatNudgeForInjection(nudge: ProactiveNudge): string {
  const formatted = formatNudgeForDisplay(nudge);
  return `\n\n---\n\n${formatted}\n\n---`;
}

/**
 * Determine if nudge should be injected into this response
 * Avoids injecting nudges on every message
 */
export function shouldInjectNudge(messageCount: number, nudge: ProactiveNudge): boolean {
  // Only inject nudges on certain message counts to avoid fatigue
  // Inject on: 3rd message, 10th message, 20th message, etc.
  const injectionPoints = [3, 10, 20, 50, 100];

  if (injectionPoints.includes(messageCount)) {
    return true;
  }

  // Always inject high-priority nudges
  if (nudge.priority === 'high') {
    return true;
  }

  return false;
}

/**
 * Inject nudge into chat response if appropriate
 */
export function injectNudgeIfAppropriate(
  response: string,
  context: NudgeInjectionContext,
  messageCount: number
): { response: string; nudgeInjected: boolean } {
  const nudges = evaluateGoalsForNudges(context);
  const bestNudge = selectBestNudge(nudges);

  if (!bestNudge || !shouldInjectNudge(messageCount, bestNudge)) {
    return { response, nudgeInjected: false };
  }

  const nudgeText = formatNudgeForInjection(bestNudge);
  const injectedResponse = response + nudgeText;

  return { response: injectedResponse, nudgeInjected: true };
}
