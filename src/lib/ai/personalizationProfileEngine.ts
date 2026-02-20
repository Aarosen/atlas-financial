/**
 * Personalization Profile Engine
 * Requirements 15-18: Continuous learning, personalization profile, feedback loop, adaptation
 * 
 * Builds and maintains customer profiles, tracks feedback, and enables continuous adaptation.
 */

export interface PersonalizationProfile {
  customerId: string;
  communicationStyle: 'formal' | 'casual' | 'technical' | 'simple';
  learningStyle: 'visual' | 'auditory' | 'reading' | 'kinesthetic' | 'mixed';
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  goalAlignment: string[];
  preferences: Record<string, any>;
  interactionHistory: InteractionRecord[];
  feedbackHistory: FeedbackRecord[];
  adaptationScore: number;
  lastUpdated: number;
}

export interface InteractionRecord {
  timestamp: number;
  type: 'question' | 'recommendation' | 'explanation' | 'clarification';
  content: string;
  customerResponse: string;
  satisfaction?: number;
}

export interface FeedbackRecord {
  timestamp: number;
  aspect: 'accuracy' | 'relevance' | 'clarity' | 'helpfulness' | 'tone';
  rating: number; // 1-5
  comment?: string;
}

export interface AdaptationMetrics {
  communicationStyleAccuracy: number;
  learningStyleMatch: number;
  recommendationAccuracy: number;
  customerSatisfaction: number;
  overallAdaptation: number;
}

export function initializeProfile(customerId: string): PersonalizationProfile {
  return {
    customerId,
    communicationStyle: 'casual',
    learningStyle: 'mixed',
    riskTolerance: 'moderate',
    goalAlignment: [],
    preferences: {},
    interactionHistory: [],
    feedbackHistory: [],
    adaptationScore: 0.5,
    lastUpdated: Date.now(),
  };
}

export function recordInteraction(
  profile: PersonalizationProfile,
  interaction: Omit<InteractionRecord, 'timestamp'>
): PersonalizationProfile {
  profile.interactionHistory.push({
    ...interaction,
    timestamp: Date.now(),
  });
  profile.lastUpdated = Date.now();
  return profile;
}

export function recordFeedback(
  profile: PersonalizationProfile,
  feedback: Omit<FeedbackRecord, 'timestamp'>
): PersonalizationProfile {
  profile.feedbackHistory.push({
    ...feedback,
    timestamp: Date.now(),
  });
  profile.lastUpdated = Date.now();
  return profile;
}

export function detectCommunicationStyle(interactions: InteractionRecord[]): 'formal' | 'casual' | 'technical' | 'simple' {
  if (interactions.length === 0) return 'casual';

  let technicalCount = 0;
  let formalCount = 0;

  for (const interaction of interactions) {
    const text = (interaction.customerResponse || '').toLowerCase();
    if (text.includes('however') || text.includes('furthermore') || text.includes('therefore')) {
      formalCount++;
    }
    if (text.includes('api') || text.includes('algorithm') || text.includes('optimization')) {
      technicalCount++;
    }
  }

  if (technicalCount > interactions.length * 0.3) return 'technical';
  if (formalCount > interactions.length * 0.3) return 'formal';
  if (interactions.length > 5 && interactions.every(i => (i.customerResponse || '').length < 50)) return 'simple';

  return 'casual';
}

export function detectLearningStyle(interactions: InteractionRecord[]): 'visual' | 'auditory' | 'reading' | 'kinesthetic' | 'mixed' {
  if (interactions.length === 0) return 'mixed';

  let visualCount = 0;
  let readingCount = 0;
  let kinestheticCount = 0;

  for (const interaction of interactions) {
    const text = (interaction.customerResponse || '').toLowerCase();
    if (text.includes('see') || text.includes('show') || text.includes('chart') || text.includes('graph')) {
      visualCount++;
    }
    if (text.includes('read') || text.includes('explain') || text.includes('detail')) {
      readingCount++;
    }
    if (text.includes('try') || text.includes('example') || text.includes('practice')) {
      kinestheticCount++;
    }
  }

  const max = Math.max(visualCount, readingCount, kinestheticCount);
  if (max === 0) return 'mixed';
  if (max === visualCount) return 'visual';
  if (max === readingCount) return 'reading';
  return 'kinesthetic';
}

export function calculateAdaptationMetrics(profile: PersonalizationProfile): AdaptationMetrics {
  const feedbackRatings = profile.feedbackHistory.map(f => f.rating);
  const avgFeedback = feedbackRatings.length > 0 ? feedbackRatings.reduce((a, b) => a + b, 0) / feedbackRatings.length : 3;

  const satisfactionRatings = profile.interactionHistory
    .filter(i => i.satisfaction !== undefined)
    .map(i => i.satisfaction!);
  const avgSatisfaction = satisfactionRatings.length > 0 ? satisfactionRatings.reduce((a, b) => a + b, 0) / satisfactionRatings.length : 3;

  return {
    communicationStyleAccuracy: Math.min(1, profile.interactionHistory.length / 10),
    learningStyleMatch: Math.min(1, profile.interactionHistory.length / 15),
    recommendationAccuracy: avgFeedback / 5,
    customerSatisfaction: avgSatisfaction / 5,
    overallAdaptation: (avgFeedback + avgSatisfaction) / 10,
  };
}

export function updateProfile(profile: PersonalizationProfile): PersonalizationProfile {
  // Update communication style
  profile.communicationStyle = detectCommunicationStyle(profile.interactionHistory);

  // Update learning style
  profile.learningStyle = detectLearningStyle(profile.interactionHistory);

  // Update adaptation score
  const metrics = calculateAdaptationMetrics(profile);
  profile.adaptationScore = metrics.overallAdaptation;

  profile.lastUpdated = Date.now();
  return profile;
}

export function shouldAdapt(profile: PersonalizationProfile): boolean {
  return profile.adaptationScore < 0.8 && profile.interactionHistory.length >= 5;
}

export function getAdaptationRecommendations(profile: PersonalizationProfile): string[] {
  const recommendations: string[] = [];
  const metrics = calculateAdaptationMetrics(profile);

  if (metrics.communicationStyleAccuracy < 0.6) {
    recommendations.push(`Adjust communication style to be more ${profile.communicationStyle}`);
  }

  if (metrics.learningStyleMatch < 0.6) {
    recommendations.push(`Provide more ${profile.learningStyle}-based content`);
  }

  if (metrics.recommendationAccuracy < 0.6) {
    recommendations.push('Improve recommendation relevance based on customer feedback');
  }

  if (metrics.customerSatisfaction < 0.6) {
    recommendations.push('Increase focus on customer satisfaction');
  }

  return recommendations;
}

export function getProfileSummary(profile: PersonalizationProfile): string {
  return `Customer Profile: ${profile.communicationStyle} communication, ${profile.learningStyle} learning style, ${profile.riskTolerance} risk tolerance. Adaptation score: ${(profile.adaptationScore * 100).toFixed(0)}%`;
}
