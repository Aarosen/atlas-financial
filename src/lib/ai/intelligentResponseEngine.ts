/**
 * ATLAS AI Intelligent Response Engine
 * 
 * Transforms base responses into mentoring, adaptive, context-aware guidance.
 * Detects conversation patterns, synthesizes multi-turn insights, and leads with empathy.
 * 
 * Key Features:
 * - Real-time mentoring based on user comprehension level
 * - Dynamic goal and lever adjustment
 * - Conversation synthesis (connecting dots across turns)
 * - Proactive opportunity detection
 * - Emotional intelligence and psychological safety
 */

import type { FinancialState } from '@/lib/state/types';

export interface IntelligentResponseContext {
  userMessage: string;
  baseResponse: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  financialState: FinancialState;
  turnCount: number;
}

export interface EnhancedIntelligentResponse {
  original: string;
  enhanced: string;
  mentoringSections: string[];
  adaptiveElements: string[];
  synthesisPoints: string[];
  emotionalIntelligence: string | null;
}

/**
 * Detect comprehension level from conversation patterns
 */
export function detectComprehensionLevel(
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): 'beginner' | 'intermediate' | 'advanced' {
  if (history.length < 2) return 'beginner';

  const userMessages = history.filter(h => h.role === 'user').map(h => h.content.toLowerCase());

  // Advanced: uses financial terminology, asks sophisticated questions
  const advancedIndicators = userMessages.filter(
    m =>
      /\b(diversif|allocation|rebalance|tax-loss|roth|401k|index|etf|asset class|yield|duration)\b/i.test(
        m
      )
  ).length;

  // Beginner: asks basic questions, expresses confusion
  const beginnerIndicators = userMessages.filter(
    m => /\b(confused|don't understand|what is|how do|explain|basic)\b/i.test(m)
  ).length;

  if (advancedIndicators > beginnerIndicators && advancedIndicators > 0) {
    return 'advanced';
  }
  if (beginnerIndicators > advancedIndicators && beginnerIndicators > 0) {
    return 'beginner';
  }
  return 'intermediate';
}

/**
 * Generate mentoring explanation tailored to comprehension level
 */
export function generateMentoringExplanation(
  concept: string,
  level: 'beginner' | 'intermediate' | 'advanced'
): string {
  const explanations: Record<string, Record<string, string>> = {
    debt_payoff: {
      beginner:
        'Debt payoff means paying back money you borrowed. The faster you pay it, the less interest you pay. Think of it like stopping a leak—the sooner you fix it, the less water you lose.',
      intermediate:
        'Debt payoff strategy involves prioritizing which debts to pay first. The debt avalanche method (highest interest first) saves the most money. The debt snowball method (smallest balance first) builds momentum.',
      advanced:
        'Optimal debt payoff considers interest rates, tax deductibility, opportunity cost of capital, and psychological factors. For high-interest debt, avalanche is mathematically superior. For behavioral motivation, snowball may be optimal.',
    },
    emergency_fund: {
      beginner:
        'An emergency fund is money you save for unexpected expenses—car repair, medical bill, job loss. It prevents you from going into debt when life happens.',
      intermediate:
        'Target 3-6 months of essential expenses in an accessible, low-risk account. This covers most emergencies without forcing you to use credit cards or loans.',
      advanced:
        'Emergency fund sizing depends on income stability, dependents, and risk tolerance. Self-employed individuals may need 6-12 months. Consider separate buckets for different emergency types.',
    },
    investing: {
      beginner:
        'Investing means putting money into assets (stocks, bonds, funds) that grow over time. You earn returns through price appreciation and dividends.',
      intermediate:
        'Diversified index funds are ideal for most investors—they spread risk across many companies and have low fees. Start with a simple portfolio: 70% stocks, 30% bonds.',
      advanced:
        'Asset allocation depends on time horizon, risk tolerance, and goals. Consider factor exposure, rebalancing frequency, tax efficiency, and behavioral biases. Modern portfolio theory suggests optimization across multiple dimensions.',
    },
  };

  return explanations[concept]?.[level] || `Let me explain ${concept} in a way that makes sense for you...`;
}

/**
 * Detect if response needs mentoring enhancement
 */
export function shouldAddMentoring(
  userMessage: string,
  baseResponse: string,
  comprehensionLevel: 'beginner' | 'intermediate' | 'advanced'
): boolean {
  // Add mentoring if user asks "why" or "how"
  if (/\b(why|how|what is|explain)\b/i.test(userMessage)) {
    return true;
  }

  // Add mentoring if base response contains financial concepts
  if (
    /\b(debt|interest|compound|diversif|allocation|tax|401k|ira|emergency|fund)\b/i.test(
      baseResponse
    )
  ) {
    return true;
  }

  // Always add mentoring for beginners
  if (comprehensionLevel === 'beginner') {
    return true;
  }

  return false;
}

/**
 * Extract financial concepts from response
 */
export function extractFinancialConcepts(text: string): string[] {
  const concepts = [
    'debt_payoff',
    'emergency_fund',
    'investing',
    'compound_interest',
    'diversification',
    'tax_optimization',
    'retirement',
    'budgeting',
  ];

  return concepts.filter(concept => {
    const pattern = new RegExp(`\\b(${concept.replace(/_/g, '\\s+')})\\b`, 'i');
    return pattern.test(text);
  });
}

/**
 * Generate adaptive element based on financial state
 */
export function generateAdaptiveElement(
  concept: string,
  financialState: FinancialState
): string | null {
  const { monthlyIncome, essentialExpenses, totalSavings, highInterestDebt, primaryGoal } =
    financialState;

  if (!monthlyIncome || !essentialExpenses) return null;

  const surplus = monthlyIncome - essentialExpenses;

  switch (concept) {
    case 'debt_payoff':
      if (highInterestDebt && highInterestDebt > 0) {
        const monthsToPayoff = Math.ceil(highInterestDebt / Math.max(100, surplus * 0.3));
        return `For your situation: with a $${surplus.toFixed(0)}/month surplus, you could pay off $${highInterestDebt.toFixed(0)} in about ${monthsToPayoff} months if you dedicate 30% of surplus to it.`;
      }
      return null;

    case 'emergency_fund':
      const targetEmergencyFund = essentialExpenses * 3;
      const currentEmergencyFund = totalSavings || 0;
      const emergencyGap = Math.max(0, targetEmergencyFund - currentEmergencyFund);
      if (emergencyGap > 0) {
        const monthsToEmergencyFund = Math.ceil(emergencyGap / Math.max(100, surplus * 0.2));
        return `Your target: $${targetEmergencyFund.toFixed(0)} (3 months of expenses). You're at $${currentEmergencyFund.toFixed(0)}. At $${Math.max(100, surplus * 0.2).toFixed(0)}/month, you'd reach it in ${monthsToEmergencyFund} months.`;
      }
      return null;

    case 'investing':
      if (primaryGoal === 'wealth_building' || primaryGoal === 'growth') {
        const investmentCapacity = Math.max(100, surplus * 0.25);
        return `With your $${surplus.toFixed(0)}/month surplus, you could invest $${investmentCapacity.toFixed(0)}/month. Over 30 years at 7% returns, that's $${(investmentCapacity * 1000).toFixed(0)}+.`;
      }
      return null;

    default:
      return null;
  }
}

/**
 * Synthesize insights from conversation history
 */
export function synthesizeConversationInsights(
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): string[] {
  const insights: string[] = [];
  const userMessages = history.filter(h => h.role === 'user').map(h => h.content.toLowerCase());

  // Pattern 1: User mentions multiple concerns
  const concerns = [];
  if (userMessages.some(m => /\b(debt|credit|loan)\b/.test(m))) concerns.push('debt');
  if (userMessages.some(m => /\b(saving|emergency|fund)\b/.test(m))) concerns.push('savings');
  if (userMessages.some(m => /\b(invest|retirement|401k)\b/.test(m))) concerns.push('investing');
  if (userMessages.some(m => /\b(budget|spend|expense)\b/.test(m))) concerns.push('budgeting');

  if (concerns.length > 1) {
    insights.push(
      `I'm noticing you're thinking about ${concerns.join(', ')}. These are all connected—let me show you how they fit together...`
    );
  }

  // Pattern 2: User shows progression in understanding
  if (history.length > 6) {
    const earlyMessages = userMessages.slice(0, 3).join(' ');
    const recentMessages = userMessages.slice(-3).join(' ');

    const earlyConfusion = /\b(confused|don't understand|what is)\b/.test(earlyMessages);
    const recentConfidence = /\b(makes sense|understand|got it)\b/.test(recentMessages);

    if (earlyConfusion && recentConfidence) {
      insights.push(
        `I can see you're getting clearer on this. That progression from confusion to understanding is exactly how financial mastery works.`
      );
    }
  }

  // Pattern 3: User shows urgency or emotion
  if (userMessages.some(m => /\b(urgent|emergency|crisis|stressed|overwhelm)\b/.test(m))) {
    insights.push(
      `I hear the urgency. Let's focus on immediate actions first, then build the long-term strategy.`
    );
  }

  return insights;
}

/**
 * Detect emotional tone and generate appropriate response
 */
export function detectEmotionalTone(userMessage: string): {
  tone: 'positive' | 'neutral' | 'negative' | 'urgent';
  emotionalResponse: string;
} {
  const msg = userMessage.toLowerCase();

  if (/\b(urgent|emergency|crisis|can't|desperate|help)\b/i.test(msg)) {
    return {
      tone: 'urgent',
      emotionalResponse:
        'I hear the urgency. We\'re going to focus on immediate stabilization first.',
    };
  }

  if (/\b(overwhelm|scared|anxious|stressed|worried|frustrated)\b/i.test(msg)) {
    return {
      tone: 'negative',
      emotionalResponse:
        'That feeling is completely valid. You\'re not alone in this. Let\'s break it into manageable pieces.',
    };
  }

  if (/\b(excited|great|awesome|thanks|appreciate)\b/i.test(msg)) {
    return {
      tone: 'positive',
      emotionalResponse: 'I love your energy! Let\'s channel that into momentum.',
    };
  }

  return {
    tone: 'neutral',
    emotionalResponse: '',
  };
}

/**
 * Enhance response with intelligent elements
 */
export function enhanceResponseIntelligently(
  context: IntelligentResponseContext
): EnhancedIntelligentResponse {
  const comprehensionLevel = detectComprehensionLevel(context.conversationHistory);
  const concepts = extractFinancialConcepts(context.baseResponse);
  const synthesisPoints = synthesizeConversationInsights(context.conversationHistory);
  const { tone, emotionalResponse } = detectEmotionalTone(context.userMessage);

  let enhanced = context.baseResponse;
  const mentoringSections: string[] = [];
  const adaptiveElements: string[] = [];

  // Add mentoring if needed
  if (shouldAddMentoring(context.userMessage, context.baseResponse, comprehensionLevel)) {
    for (const concept of concepts) {
      const mentoring = generateMentoringExplanation(concept, comprehensionLevel);
      if (mentoring && !enhanced.includes(mentoring)) {
        mentoringSections.push(mentoring);
        enhanced += `\n\n**Why this matters:** ${mentoring}`;
      }
    }
  }

  // Add adaptive elements
  for (const concept of concepts) {
    const adaptive = generateAdaptiveElement(concept, context.financialState);
    if (adaptive) {
      adaptiveElements.push(adaptive);
      enhanced += `\n\n**For your situation:** ${adaptive}`;
    }
  }

  // Add synthesis points
  if (synthesisPoints.length > 0 && context.turnCount > 4) {
    for (const point of synthesisPoints.slice(0, 2)) {
      enhanced += `\n\n${point}`;
    }
  }

  // Add emotional intelligence
  let emotionalIntelligence: string | null = null;
  if (emotionalResponse) {
    emotionalIntelligence = emotionalResponse;
    enhanced = emotionalResponse + ' ' + enhanced;
  }

  return {
    original: context.baseResponse,
    enhanced,
    mentoringSections,
    adaptiveElements,
    synthesisPoints,
    emotionalIntelligence,
  };
}

/**
 * Determine if response should include action plan
 */
export function shouldIncludeActionPlan(
  context: IntelligentResponseContext
): boolean {
  const hasBasicData =
    Boolean(context.financialState.monthlyIncome) &&
    Boolean(context.financialState.essentialExpenses) &&
    Boolean(context.financialState.primaryGoal);

  const hasEnoughTurns = context.turnCount >= 5;
  const userAskedForPlan = /\b(plan|action|what should|next step|what do i do)\b/i.test(
    context.userMessage
  );

  return hasBasicData && (hasEnoughTurns || userAskedForPlan);
}

/**
 * Generate specific next steps based on context
 */
export function generateNextSteps(financialState: FinancialState): string[] {
  const { monthlyIncome, essentialExpenses, totalSavings, highInterestDebt, primaryGoal } =
    financialState;

  if (!monthlyIncome || !essentialExpenses) {
    return ['Tell me more about your income and expenses'];
  }

  const steps: string[] = [];
  const surplus = monthlyIncome - essentialExpenses;
  const hasEmergencyFund = totalSavings && totalSavings >= essentialExpenses * 3;
  const hasHighInterestDebt = highInterestDebt && highInterestDebt > 0;

  // Priority 1: Emergency fund or debt
  if (hasHighInterestDebt && !hasEmergencyFund) {
    steps.push('Step 1: Build $1,000 emergency fund (1-2 months)');
    steps.push('Step 2: Attack high-interest debt with extra money');
  } else if (hasHighInterestDebt) {
    steps.push('Step 1: Accelerate high-interest debt payoff');
  } else if (!hasEmergencyFund) {
    steps.push('Step 1: Build emergency fund to 3-6 months of expenses');
  }

  // Priority 2: Based on goal
  if (primaryGoal === 'wealth_building' || primaryGoal === 'growth') {
    steps.push(`Step 2: Invest $${Math.max(100, Math.floor(surplus * 0.25))}/month in index funds`);
  } else if (primaryGoal === 'stability') {
    steps.push(`Step 2: Automate savings of $${Math.max(100, Math.floor(surplus * 0.3))}/month`);
  } else {
    steps.push(`Step 2: Allocate $${Math.max(100, Math.floor(surplus * 0.2))}/month to your goal`);
  }

  // Priority 3: Review
  steps.push('Step 3: Review progress monthly, adjust quarterly');

  return steps;
}
