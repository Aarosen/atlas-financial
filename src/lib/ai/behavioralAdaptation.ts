/**
 * Behavioral adaptation system
 * Analyzes user patterns and adapts AI responses based on behavior
 */

export interface BehavioralPattern {
  userId: string;
  totalConversations: number;
  averageResponseLength: number;
  preferredTopics: string[];
  commitmentRate: number; // % of recommended actions user commits to
  followThroughRate: number; // % of committed actions user completes
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  learningPace: 'slow' | 'moderate' | 'fast';
  communicationStyle: 'brief' | 'detailed' | 'visual';
  decisionMakingStyle: 'analytical' | 'intuitive' | 'collaborative';
}

/**
 * Analyze behavioral patterns from conversation history
 */
export async function analyzeBehavioralPatterns(
  userId: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<BehavioralPattern> {
  try {
    // Use the passed-in conversation history to determine engagement
    // Note: This is 1 if there's a current conversation, 0 if starting fresh
    // A proper multi-session count requires the conversations/list endpoint to be built
    // For now, any active conversation with messages counts as engaged (totalConversations >= 1)
    const totalConversations = conversationHistory.length > 0 ? 1 : 0;

    // Analyze patterns
    // const totalConversations = sessions.length;
    const messageCount = conversationHistory.length;
    const averageResponseLength = messageCount > 0
      ? conversationHistory.reduce((sum, msg) => sum + (msg.content?.length || 0), 0) / messageCount
      : 0;

    // Detect preferred topics from conversation history
    const preferredTopics = detectPreferredTopics(conversationHistory);

    // Fetch real commitment and follow-through rates from user stats
    let commitmentRate = 0.65; // default fallback
    let followThroughRate = 0.55; // default fallback

    try {
      const statsResponse = await fetch(
        `/api/user/stats?userId=${encodeURIComponent(userId)}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        const total = stats.actionsTotal || 0;
        const completed = stats.actionsCompleted || 0;
        if (total > 0) {
          followThroughRate = completed / total;
          commitmentRate = followThroughRate; // use same source for now
        }
      }
    } catch (err) {
      console.warn('[behavioral-adaptation] Error fetching user stats:', err);
    }

    // Determine risk tolerance based on financial decisions
    const riskTolerance = detectRiskTolerance(conversationHistory);

    // Determine learning pace based on question complexity
    const learningPace = detectLearningPace(conversationHistory);

    // Determine communication style based on response patterns
    const communicationStyle = detectCommunicationStyle(conversationHistory);

    // Determine decision-making style
    const decisionMakingStyle = detectDecisionMakingStyle(conversationHistory);

    return {
      userId,
      totalConversations,
      averageResponseLength,
      preferredTopics,
      commitmentRate,
      followThroughRate,
      riskTolerance,
      learningPace,
      communicationStyle,
      decisionMakingStyle,
    };
  } catch (error) {
    console.error('Error analyzing behavioral patterns:', error);
    return getDefaultBehavioralPattern(userId);
  }
}

/**
 * Detect preferred topics from conversation history
 */
function detectPreferredTopics(conversationHistory: Array<{ role: string; content: string }>): string[] {
  const topics: Record<string, number> = {};
  const topicKeywords = {
    debt: ['debt', 'credit card', 'loan', 'interest'],
    savings: ['savings', 'emergency fund', 'save', 'accumulate'],
    investing: ['invest', 'stock', 'portfolio', 'return'],
    budgeting: ['budget', 'spending', 'expenses', 'cut'],
    retirement: ['retirement', 'retire', '401k', 'ira'],
    income: ['income', 'salary', 'earn', 'side hustle'],
  };

  for (const msg of conversationHistory) {
    const content = (msg.content || '').toLowerCase();
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(kw => content.includes(kw))) {
        topics[topic] = (topics[topic] || 0) + 1;
      }
    }
  }

  return Object.entries(topics)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([topic]) => topic);
}

/**
 * Detect risk tolerance from financial decisions
 */
function detectRiskTolerance(conversationHistory: Array<{ role: string; content: string }>): 'conservative' | 'moderate' | 'aggressive' {
  const content = conversationHistory.map(m => m.content || '').join(' ').toLowerCase();

  const conservativeIndicators = ['safe', 'stable', 'secure', 'guaranteed', 'low risk'];
  const aggressiveIndicators = ['growth', 'maximize', 'aggressive', 'high return', 'risk'];

  const conservativeScore = conservativeIndicators.filter(ind => content.includes(ind)).length;
  const aggressiveScore = aggressiveIndicators.filter(ind => content.includes(ind)).length;

  if (aggressiveScore > conservativeScore) {
    return 'aggressive';
  } else if (conservativeScore > aggressiveScore) {
    return 'conservative';
  }
  return 'moderate';
}

/**
 * Detect learning pace from question complexity
 */
function detectLearningPace(conversationHistory: Array<{ role: string; content: string }>): 'slow' | 'moderate' | 'fast' {
  const userMessages = conversationHistory.filter(m => m.role === 'user');
  const averageLength = userMessages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0) / Math.max(userMessages.length, 1);

  // Longer, more detailed questions suggest faster learning pace
  if (averageLength > 200) {
    return 'fast';
  } else if (averageLength > 100) {
    return 'moderate';
  }
  return 'slow';
}

/**
 * Detect communication style from response patterns
 */
function detectCommunicationStyle(conversationHistory: Array<{ role: string; content: string }>): 'brief' | 'detailed' | 'visual' {
  const userMessages = conversationHistory.filter(m => m.role === 'user');
  const averageLength = userMessages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0) / Math.max(userMessages.length, 1);

  if (averageLength < 50) {
    return 'brief';
  } else if (averageLength > 150) {
    return 'detailed';
  }
  return 'visual';
}

/**
 * Detect decision-making style
 */
function detectDecisionMakingStyle(conversationHistory: Array<{ role: string; content: string }>): 'analytical' | 'intuitive' | 'collaborative' {
  const content = conversationHistory.map(m => m.content || '').join(' ').toLowerCase();

  const analyticalIndicators = ['why', 'how', 'calculate', 'data', 'numbers'];
  const intuitiveIndicators = ['feel', 'gut', 'sense', 'instinct'];
  const collaborativeIndicators = ['what do you think', 'recommend', 'suggest', 'help me'];

  const analyticalScore = analyticalIndicators.filter(ind => content.includes(ind)).length;
  const intuitiveScore = intuitiveIndicators.filter(ind => content.includes(ind)).length;
  const collaborativeScore = collaborativeIndicators.filter(ind => content.includes(ind)).length;

  const scores = [
    ['analytical', analyticalScore],
    ['intuitive', intuitiveScore],
    ['collaborative', collaborativeScore],
  ] as const;

  const [style] = scores.reduce((max, curr) => (curr[1] > max[1] ? curr : max));
  return style;
}

/**
 * Get default behavioral pattern
 */
function getDefaultBehavioralPattern(userId: string): BehavioralPattern {
  return {
    userId,
    totalConversations: 0,
    averageResponseLength: 0,
    preferredTopics: [],
    commitmentRate: 0.65,
    followThroughRate: 0.55,
    riskTolerance: 'moderate',
    learningPace: 'moderate',
    communicationStyle: 'detailed',
    decisionMakingStyle: 'collaborative',
  };
}

/**
 * Build behavioral adaptation context for system prompt
 */
export function buildBehavioralAdaptationContext(pattern: BehavioralPattern): string {
  if (!pattern) {
    return '';
  }

  const lines = [
    `[BEHAVIORAL_ADAPTATION]`,
    `User has had ${pattern.totalConversations} conversations with Atlas.`,
    `Preferred topics: ${pattern.preferredTopics.join(', ') || 'general financial planning'}`,
    `Risk tolerance: ${pattern.riskTolerance}`,
    `Learning pace: ${pattern.learningPace}`,
    `Communication style: ${pattern.communicationStyle}`,
    `Decision-making style: ${pattern.decisionMakingStyle}`,
    `Historical commitment rate: ${(pattern.commitmentRate * 100).toFixed(0)}%`,
    `Follow-through rate: ${(pattern.followThroughRate * 100).toFixed(0)}%`,
    `[END_BEHAVIORAL_ADAPTATION]`,
  ];

  return lines.join('\n');
}
