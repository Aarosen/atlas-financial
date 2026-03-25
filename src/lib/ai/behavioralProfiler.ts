import {
  UserAction,
  ConversationSession,
  UserBehaviorProfile,
} from '@/lib/db/supabaseRepository';

/**
 * Calculate behavioral profile from user's action history and session patterns
 * Called after action status updates to recalculate follow-through rate and behavioral tags
 */
export async function calculateBehavioralProfile(
  actions: UserAction[],
  sessions: ConversationSession[]
): Promise<Partial<UserBehaviorProfile>> {
  // Count commitments and follow-throughs
  const completedActions = actions.filter((a) => a.status === 'completed' || a.status === 'partial');
  const committedActions = actions.filter((a) => a.status !== 'recommended');

  const totalCommitments = committedActions.length;
  const followThroughs = completedActions.length;
  const followThroughRate = totalCommitments > 0 ? followThroughs / totalCommitments : 0;

  // Calculate average days to complete
  let avgDaysToComplete: number | null = null;
  const completionTimes = completedActions
    .filter((a) => a.committed_at && a.completion_verified_at)
    .map((a) => {
      const committed = new Date(a.committed_at!).getTime();
      const completed = new Date(a.completion_verified_at!).getTime();
      return (completed - committed) / (1000 * 60 * 60 * 24);
    });

  if (completionTimes.length > 0) {
    avgDaysToComplete =
      completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length;
  }

  // Calculate average session gap
  let avgSessionGapDays: number | null = null;
  if (sessions.length > 1) {
    const gaps: number[] = [];
    for (let i = 1; i < sessions.length; i++) {
      const prev = new Date(sessions[i - 1].started_at).getTime();
      const curr = new Date(sessions[i].started_at).getTime();
      gaps.push((curr - prev) / (1000 * 60 * 60 * 24));
    }
    if (gaps.length > 0) {
      avgSessionGapDays = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    }
  }

  // Derive behavioral tags
  const tags: string[] = [];

  if (followThroughRate < 0.35) {
    tags.push('needs_strong_accountability');
  } else if (followThroughRate >= 0.35 && followThroughRate < 0.65) {
    tags.push('inconsistent_follow_through');
  } else if (followThroughRate >= 0.65) {
    tags.push('reliable_executor');
  }

  if (avgSessionGapDays) {
    if (avgSessionGapDays > 30) {
      tags.push('infrequent_user');
    } else if (avgSessionGapDays <= 7) {
      tags.push('highly_engaged');
    }
  }

  if (avgDaysToComplete) {
    if (avgDaysToComplete > 30) {
      tags.push('slow_executor');
    } else if (avgDaysToComplete <= 7) {
      tags.push('fast_executor');
    }
  }

  // Determine if profile is active (need at least 3 commitments)
  const behaviorProfileActive = totalCommitments >= 3;

  return {
    total_commitments: totalCommitments,
    commitments_followed_through: followThroughs,
    follow_through_rate: followThroughRate,
    avg_days_to_complete: avgDaysToComplete,
    avg_session_gap_days: avgSessionGapDays,
    last_active_at: new Date().toISOString(),
    behavioral_tags: tags,
    behavior_profile_active: behaviorProfileActive,
  };
}

/**
 * Build behavioral adaptation context for system prompt
 * Injected when user has sufficient history to profile behavior
 */
export function buildBehavioralAdaptationBlock(
  behaviorProfile: UserBehaviorProfile | null
): string | null {
  if (!behaviorProfile || !behaviorProfile.behavior_profile_active) {
    return null;
  }

  const followThroughRate = (behaviorProfile.follow_through_rate * 100).toFixed(0);
  const tags = behaviorProfile.behavioral_tags || [];

  let block = '━━━ USER BEHAVIORAL PROFILE ━━━\n';
  block += `Follow-through rate: ${followThroughRate}% (${behaviorProfile.commitments_followed_through} of ${behaviorProfile.total_commitments} commitments completed)\n`;

  if (behaviorProfile.avg_session_gap_days) {
    const gapDays = Math.round(behaviorProfile.avg_session_gap_days);
    block += `Session frequency: Returns every ~${gapDays} days on average\n`;
  }

  if (behaviorProfile.avg_days_to_complete) {
    const executionDays = Math.round(behaviorProfile.avg_days_to_complete);
    const executionSpeed =
      executionDays > 30 ? 'Slow' : executionDays > 14 ? 'Moderate' : 'Fast';
    block += `Execution speed: ${executionSpeed} (avg ${executionDays} days from commit to completion)\n`;
  }

  if (tags.length > 0) {
    block += `Behavioral tags: [${tags.join(', ')}]\n`;
  }

  block += '\nADAPTATION RULES:\n';

  if (tags.includes('needs_strong_accountability')) {
    block += '- Recommend ONE action only. Never suggest alternatives or optional steps.\n';
    block += '- Prefer manual, immediate actions over "set up automatic" ones — this user struggles with setup.\n';
    block += '- Use shorter check-in windows (14 days, not 30).\n';
    block += '- When following up on incomplete commitments: name the pattern directly and non-judgmentally.\n';
    block += '  Example: "You\'ve had a hard time with the execution side — you always have the right intention.\n';
    block += '  Let\'s figure out what\'s making it hard to follow through."\n';
    block += '- Do NOT increase the number of recommendations to compensate for low follow-through.\n';
    block += '  Simplify instead.\n';
  } else if (tags.includes('reliable_executor')) {
    block += '- This user executes reliably. You can reference next steps proactively.\n';
    block += '- Longer-range planning is appropriate — they are ready to think 6–12 months ahead.\n';
    block += '- Tone can be more peer-level. Less coaching, more strategic partnership.\n';
    block += '- Check-in windows can be longer (30–45 days). They don\'t need frequent nudges.\n';
  }

  if (tags.includes('slow_executor')) {
    block += '- This user takes time to execute. Expect 30+ days from commitment to completion.\n';
    block += '- Break actions into smaller steps with earlier check-ins.\n';
    block += '- Celebrate partial progress — momentum matters more than speed.\n';
  }

  if (tags.includes('fast_executor')) {
    block += '- This user moves quickly. You can suggest follow-up actions sooner.\n';
    block += '- They may be ready for the next phase before typical timelines suggest.\n';
  }

  if (tags.includes('highly_engaged')) {
    block += '- This user returns frequently (every ~7 days). You can build on momentum.\n';
    block += '- They are invested. You can ask deeper questions and explore more nuance.\n';
  }

  if (tags.includes('infrequent_user')) {
    block += '- This user returns infrequently (every ~30+ days). Make each session count.\n';
    block += '- Focus on the most impactful action, not comprehensive planning.\n';
    block += '- Assume they may have forgotten context — briefly recap prior commitments.\n';
  }

  block += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  return block;
}

/**
 * Determine preferred check-in frequency based on behavior
 */
export function determineCheckInFrequency(
  behaviorProfile: UserBehaviorProfile
): 'weekly' | 'biweekly' | 'monthly' {
  if (behaviorProfile.behavioral_tags.includes('needs_strong_accountability')) {
    return 'weekly';
  } else if (behaviorProfile.behavioral_tags.includes('inconsistent_follow_through')) {
    return 'biweekly';
  } else {
    return 'monthly';
  }
}
