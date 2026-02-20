/**
 * Comprehensive Learning Engine
 * Requirement 5: Comprehensive Learning from Everything
 * 
 * Learns from all 10 dimensions:
 * 1. Explicit - what customer directly tells us
 * 2. Implicit - what we infer from tone, hesitation
 * 3. Behavioral - what customer does
 * 4. Preference - communication style
 * 5. Priority - what matters to them
 * 6. Pattern - recurring themes
 * 7. Disagreement - when they disagree
 * 8. Temporal - how needs change over time
 * 9. Emotional - emotional state
 * 10. Social - family, support, influences
 */

export type LearningCategory = 
  | 'explicit'
  | 'implicit'
  | 'behavioral'
  | 'preference'
  | 'priority'
  | 'pattern'
  | 'disagreement'
  | 'temporal'
  | 'emotional'
  | 'social';

export interface LearningEntry {
  category: LearningCategory;
  topic: string;
  value: any;
  confidence: number; // 0-1
  source: string; // which interaction/action
  timestamp: number;
  notes?: string;
}

export interface CustomerProfile {
  customerId: string;
  learnings: LearningEntry[];
  lastUpdated: number;
  confidenceScore: number; // overall learning confidence 0-1
}

/**
 * Extract explicit learning from customer statement
 * What they directly tell us
 */
export function extractExplicitLearning(message: string, topic: string): LearningEntry {
  return {
    category: 'explicit',
    topic,
    value: message,
    confidence: 0.95, // Explicit statements are high confidence
    source: 'customer_statement',
    timestamp: Date.now(),
  };
}

/**
 * Extract implicit learning from message
 * Infer tone, hesitation, confidence from language
 */
export function extractImplicitLearning(message: string): LearningEntry[] {
  const learnings: LearningEntry[] = [];
  const lowerMsg = message.toLowerCase();

  // Detect anxiety/stress
  const anxietyKeywords = ['worried', 'stressed', 'anxious', 'concerned', 'scared', 'overwhelmed', 'struggling'];
  if (anxietyKeywords.some(kw => lowerMsg.includes(kw))) {
    learnings.push({
      category: 'implicit',
      topic: 'emotional_state',
      value: 'anxious',
      confidence: 0.7,
      source: 'language_analysis',
      timestamp: Date.now(),
      notes: 'Customer used anxiety-related language',
    });
  }

  // Detect confidence
  const uncertaintyKeywords = ['not sure', 'don\'t know', 'confused', 'unclear', 'maybe', 'i think'];
  if (uncertaintyKeywords.some(kw => lowerMsg.includes(kw))) {
    learnings.push({
      category: 'implicit',
      topic: 'confidence_level',
      value: 'low',
      confidence: 0.6,
      source: 'language_analysis',
      timestamp: Date.now(),
      notes: 'Customer expressed uncertainty',
    });
  }

  // Detect enthusiasm
  const enthusiasmKeywords = ['excited', 'interested', 'want to', 'ready', 'let\'s', 'definitely'];
  if (enthusiasmKeywords.some(kw => lowerMsg.includes(kw))) {
    learnings.push({
      category: 'implicit',
      topic: 'enthusiasm_level',
      value: 'high',
      confidence: 0.7,
      source: 'language_analysis',
      timestamp: Date.now(),
      notes: 'Customer expressed enthusiasm',
    });
  }

  // Detect hesitation (multiple concerns, "but also")
  if (lowerMsg.includes('but also') || lowerMsg.includes('but') || lowerMsg.includes('however')) {
    learnings.push({
      category: 'implicit',
      topic: 'hesitation',
      value: 'conflicting_priorities',
      confidence: 0.65,
      source: 'language_analysis',
      timestamp: Date.now(),
      notes: 'Customer expressed conflicting priorities',
    });
  }

  return learnings;
}

/**
 * Extract behavioral learning
 * What customer actually does (actions taken, questions asked, time spent)
 */
export function extractBehavioralLearning(
  action: 'accepted_suggestion' | 'rejected_suggestion' | 'asked_question' | 'took_action',
  details: string
): LearningEntry {
  return {
    category: 'behavioral',
    topic: action,
    value: details,
    confidence: 0.9, // Actions are high confidence
    source: 'customer_action',
    timestamp: Date.now(),
  };
}

/**
 * Extract preference learning
 * How customer likes to communicate
 */
export function extractPreferenceLearning(
  preferenceType: 'communication_style' | 'response_length' | 'data_preference' | 'formality',
  value: string
): LearningEntry {
  return {
    category: 'preference',
    topic: preferenceType,
    value,
    confidence: 0.7,
    source: 'interaction_pattern',
    timestamp: Date.now(),
  };
}

/**
 * Extract priority learning
 * What matters to the customer
 */
export function extractPriorityLearning(
  priority: string,
  importance: 'primary' | 'secondary' | 'tertiary'
): LearningEntry {
  return {
    category: 'priority',
    topic: priority,
    value: importance,
    confidence: 0.8,
    source: 'customer_focus',
    timestamp: Date.now(),
  };
}

/**
 * Extract pattern learning
 * Recurring themes in customer's situation
 */
export function extractPatternLearning(pattern: string, frequency: number): LearningEntry {
  return {
    category: 'pattern',
    topic: 'recurring_theme',
    value: pattern,
    confidence: Math.min(frequency / 5, 1), // Confidence increases with frequency
    source: 'pattern_analysis',
    timestamp: Date.now(),
    notes: `Observed ${frequency} times`,
  };
}

/**
 * Extract disagreement learning
 * When customer disagrees with our prediction
 */
export function extractDisagreementLearning(
  prediction: string,
  actualPreference: string
): LearningEntry {
  return {
    category: 'disagreement',
    topic: 'prediction_mismatch',
    value: {
      predicted: prediction,
      actual: actualPreference,
    },
    confidence: 0.95, // Disagreements are high confidence
    source: 'customer_correction',
    timestamp: Date.now(),
    notes: 'Customer corrected our prediction',
  };
}

/**
 * Extract temporal learning
 * How customer's needs/situation change over time
 */
export function extractTemporalLearning(
  metric: string,
  previousValue: any,
  currentValue: any
): LearningEntry {
  return {
    category: 'temporal',
    topic: metric,
    value: {
      previous: previousValue,
      current: currentValue,
      change: currentValue - previousValue,
    },
    confidence: 0.85,
    source: 'metric_tracking',
    timestamp: Date.now(),
  };
}

/**
 * Extract emotional learning
 * Customer's emotional state
 */
export function extractEmotionalLearning(
  emotionalState: 'anxious' | 'confident' | 'overwhelmed' | 'excited' | 'frustrated' | 'hopeful',
  context: string
): LearningEntry {
  return {
    category: 'emotional',
    topic: 'emotional_state',
    value: emotionalState,
    confidence: 0.75,
    source: 'message_analysis',
    timestamp: Date.now(),
    notes: context,
  };
}

/**
 * Extract social learning
 * Family, support system, influences
 */
export function extractSocialLearning(
  socialFactor: 'family_situation' | 'support_system' | 'influences' | 'responsibilities',
  value: string
): LearningEntry {
  return {
    category: 'social',
    topic: socialFactor,
    value,
    confidence: 0.8,
    source: 'customer_context',
    timestamp: Date.now(),
  };
}

/**
 * Build customer profile from learnings
 */
export function buildCustomerProfile(customerId: string, learnings: LearningEntry[]): CustomerProfile {
  const confidenceScores = learnings.map(l => l.confidence);
  const avgConfidence = confidenceScores.length > 0
    ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length
    : 0;

  return {
    customerId,
    learnings,
    lastUpdated: Date.now(),
    confidenceScore: avgConfidence,
  };
}

/**
 * Get learning summary for a customer
 */
export function getLearningsSummary(profile: CustomerProfile): Record<LearningCategory, any[]> {
  const summary: Record<LearningCategory, any[]> = {
    explicit: [],
    implicit: [],
    behavioral: [],
    preference: [],
    priority: [],
    pattern: [],
    disagreement: [],
    temporal: [],
    emotional: [],
    social: [],
  };

  for (const learning of profile.learnings) {
    summary[learning.category].push({
      topic: learning.topic,
      value: learning.value,
      confidence: learning.confidence,
      timestamp: learning.timestamp,
    });
  }

  return summary;
}

/**
 * Explain what we've learned about a customer
 */
export function explainLearnings(profile: CustomerProfile): string {
  const summary = getLearningsSummary(profile);
  const parts: string[] = [];

  // Explicit learnings
  if (summary.explicit.length > 0) {
    parts.push(`You've told me: ${summary.explicit.map(e => e.value).join(', ')}`);
  }

  // Priorities
  if (summary.priority.length > 0) {
    const priorities = summary.priority.map(p => p.topic).join(', ');
    parts.push(`What matters to you: ${priorities}`);
  }

  // Emotional state
  if (summary.emotional.length > 0) {
    const emotions = summary.emotional.map(e => e.value).join(', ');
    parts.push(`How you're feeling: ${emotions}`);
  }

  // Preferences
  if (summary.preference.length > 0) {
    const prefs = summary.preference.map(p => `${p.topic}: ${p.value}`).join(', ');
    parts.push(`Your preferences: ${prefs}`);
  }

  return parts.join('. ');
}

/**
 * Check if we should ask for confirmation on a learning
 */
export function shouldConfirmLearning(learning: LearningEntry): boolean {
  // Ask for confirmation if confidence is below 0.7
  return learning.confidence < 0.7;
}

/**
 * Update learning based on customer feedback
 */
export function updateLearningConfidence(
  learning: LearningEntry,
  feedback: 'correct' | 'incorrect' | 'partial'
): LearningEntry {
  const adjustments: Record<string, number> = {
    correct: 0.1,
    incorrect: -0.3,
    partial: 0.05,
  };

  return {
    ...learning,
    confidence: Math.max(0, Math.min(1, learning.confidence + adjustments[feedback])),
  };
}
