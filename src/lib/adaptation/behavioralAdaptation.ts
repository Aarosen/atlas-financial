/**
 * Behavioral adaptation system for Atlas Financial
 * Learns from user behavior and adapts communication style and recommendations
 */

export interface UserBehavior {
  responsePreference: 'short' | 'explain' | null;
  literacyLevel: 'novice' | 'intermediate' | 'advanced' | null;
  engagementLevel: 'low' | 'medium' | 'high';
  actionFrequency: number; // actions per week
  preferredTimeOfDay: 'morning' | 'afternoon' | 'evening' | null;
  communicationStyle: 'direct' | 'supportive' | 'educational' | null;
  riskTolerance: 'cautious' | 'balanced' | 'growth' | null;
}

export interface AdaptationStrategy {
  responseLength: 'concise' | 'detailed';
  explanationDepth: 'surface' | 'intermediate' | 'deep';
  frequencyOfNudges: 'low' | 'medium' | 'high';
  recommendationStyle: 'aggressive' | 'balanced' | 'conservative';
  checkInFrequency: 'daily' | 'weekly' | 'biweekly';
}

export function analyzeUserBehavior(data: {
  messages: any[];
  actions: any[];
  sessions: any[];
  preferences: any;
}): UserBehavior {
  const messageCount = data.messages?.length || 0;
  const actionCount = data.actions?.length || 0;
  const sessionCount = data.sessions?.length || 0;

  // Calculate engagement level
  let engagementLevel: 'low' | 'medium' | 'high' = 'medium';
  if (actionCount > 10 || messageCount > 50) {
    engagementLevel = 'high';
  } else if (actionCount < 2 || messageCount < 10) {
    engagementLevel = 'low';
  }

  // Calculate action frequency (actions per week)
  const actionFrequency = sessionCount > 0 ? (actionCount / Math.max(1, sessionCount / 7)) : 0;

  // Determine preferred time of day (would be based on session timestamps)
  let preferredTimeOfDay: 'morning' | 'afternoon' | 'evening' | null = null;
  if (data.sessions && data.sessions.length > 0) {
    const hours = data.sessions.map((s: any) => new Date(s.created_at).getHours());
    const avgHour = Math.round(hours.reduce((a: number, b: number) => a + b, 0) / hours.length);
    if (avgHour < 12) preferredTimeOfDay = 'morning';
    else if (avgHour < 17) preferredTimeOfDay = 'afternoon';
    else preferredTimeOfDay = 'evening';
  }

  return {
    responsePreference: data.preferences?.responsePref || null,
    literacyLevel: data.preferences?.literacyLevel || null,
    engagementLevel,
    actionFrequency,
    preferredTimeOfDay,
    communicationStyle: data.preferences?.communicationStyle || null,
    riskTolerance: data.preferences?.riskTolerance || null,
  };
}

export function generateAdaptationStrategy(behavior: UserBehavior): AdaptationStrategy {
  // Response length based on preference and literacy
  const responseLength =
    behavior.responsePreference === 'short' ? 'concise' : 'detailed';

  // Explanation depth based on literacy level
  let explanationDepth: 'surface' | 'intermediate' | 'deep' = 'intermediate';
  if (behavior.literacyLevel === 'novice') explanationDepth = 'surface';
  else if (behavior.literacyLevel === 'advanced') explanationDepth = 'deep';

  // Nudge frequency based on engagement
  let frequencyOfNudges: 'low' | 'medium' | 'high' = 'medium';
  if (behavior.engagementLevel === 'low') frequencyOfNudges = 'low';
  else if (behavior.engagementLevel === 'high') frequencyOfNudges = 'high';

  // Recommendation style based on risk tolerance
  let recommendationStyle: 'aggressive' | 'balanced' | 'conservative' = 'balanced';
  if (behavior.riskTolerance === 'cautious') recommendationStyle = 'conservative';
  else if (behavior.riskTolerance === 'growth') recommendationStyle = 'aggressive';

  // Check-in frequency based on action frequency
  let checkInFrequency: 'daily' | 'weekly' | 'biweekly' = 'weekly';
  if (behavior.actionFrequency > 5) checkInFrequency = 'daily';
  else if (behavior.actionFrequency < 1) checkInFrequency = 'biweekly';

  return {
    responseLength,
    explanationDepth,
    frequencyOfNudges,
    recommendationStyle,
    checkInFrequency,
  };
}

export function adaptResponseForUser(
  response: string,
  strategy: AdaptationStrategy
): string {
  let adapted = response;

  // Adjust response length
  if (strategy.responseLength === 'concise') {
    // Truncate to first 2-3 sentences
    const sentences = response.split(/[.!?]+/).slice(0, 2);
    adapted = sentences.join('. ').trim() + '.';
  }

  return adapted;
}

export function shouldSendNudge(
  behavior: UserBehavior,
  lastNudgeTime: number | null
): boolean {
  if (!lastNudgeTime) return true;

  const timeSinceLastNudge = Date.now() - lastNudgeTime;
  const minIntervalMs =
    behavior.engagementLevel === 'high'
      ? 24 * 60 * 60 * 1000 // 1 day
      : behavior.engagementLevel === 'medium'
      ? 3 * 24 * 60 * 60 * 1000 // 3 days
      : 7 * 24 * 60 * 60 * 1000; // 1 week

  return timeSinceLastNudge >= minIntervalMs;
}
