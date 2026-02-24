/**
 * ATLAS AI Adaptive Conversation Engine
 * 
 * Transforms rigid question-answer flows into intelligent, context-aware conversations.
 * Detects user signals, adapts response strategy, and mentors in real-time.
 * 
 * Core Principles:
 * - Never follow a script; respond to what the user actually said
 * - Adapt goals and levers based on user context and signals
 * - Mentor proactively; don't wait for questions
 * - Lead with empathy; follow with strategy
 * - Synthesize multi-turn conversations into coherent guidance
 */

import type { FinancialState } from '@/lib/state/types';

export interface UserSignal {
  type: 'confusion' | 'resistance' | 'urgency' | 'opportunity' | 'emotion' | 'context_shift';
  confidence: number; // 0-1
  indicators: string[];
  suggestedAdaptation: string;
}

export interface ConversationContext {
  userMessage: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  financialState: FinancialState;
  turnCount: number;
  sessionDuration: number; // ms
  detectedConcern: string;
}

export interface AdaptiveResponse {
  baseResponse: string;
  adaptations: {
    mentoring: string | null;
    contextShift: string | null;
    goalAdjustment: string | null;
    leverRecommendation: string | null;
    synthesisOfPriorTurns: string | null;
  };
  userSignals: UserSignal[];
  shouldAskFollowUp: boolean;
  followUpQuestion: string | null;
  conversationPhase: 'discovery' | 'strategy' | 'implementation' | 'optimization';
}

/**
 * Detect user signals from message content and conversation history
 */
export function detectUserSignals(context: ConversationContext): UserSignal[] {
  const signals: UserSignal[] = [];
  const msg = context.userMessage.toLowerCase();
  const history = context.conversationHistory;

  // Confusion signals
  if (/\b(confused|don't understand|what do you mean|how does|explain|not clear)\b/i.test(msg)) {
    signals.push({
      type: 'confusion',
      confidence: 0.9,
      indicators: ['explicit confusion language'],
      suggestedAdaptation: 'Simplify explanation, use concrete examples, break into smaller steps',
    });
  }

  // Resistance signals
  if (/\b(but|however|that won't work|can't|impossible|too hard|not realistic)\b/i.test(msg)) {
    signals.push({
      type: 'resistance',
      confidence: 0.85,
      indicators: ['objection or pushback'],
      suggestedAdaptation: 'Acknowledge concern, validate emotion, offer alternative approach',
    });
  }

  // Urgency signals
  if (/\b(urgent|emergency|asap|right now|immediately|crisis|can't wait|desperate)\b/i.test(msg)) {
    signals.push({
      type: 'urgency',
      confidence: 0.95,
      indicators: ['time-critical language'],
      suggestedAdaptation: 'Shift to triage mode, surface immediate actions, defer long-term planning',
    });
  }

  // Opportunity signals
  if (/\b(opportunity|bonus|inheritance|raise|promotion|windfall|extra money)\b/i.test(msg)) {
    signals.push({
      type: 'opportunity',
      confidence: 0.88,
      indicators: ['positive financial event'],
      suggestedAdaptation: 'Reframe strategy, optimize allocation, accelerate goals',
    });
  }

  // Emotional signals
  if (/\b(overwhelm|scared|anxious|stressed|frustrated|hopeless|worried|angry|feel|feeling)\b/i.test(msg)) {
    signals.push({
      type: 'emotion',
      confidence: 0.9,
      indicators: ['emotional language'],
      suggestedAdaptation: 'Lead with empathy, validate feelings, offer psychological safety',
    });
  }

  // Context shift signals (user introduces new information)
  if (history.length > 2) {
    const previousTopics = history.slice(-4).map(h => h.content.toLowerCase()).join(' ');
    const newTopics = msg;
    const topicShift = !previousTopics.includes('debt') && newTopics.includes('debt');
    const goalShift = !previousTopics.includes('retirement') && newTopics.includes('retirement');
    
    if (topicShift || goalShift) {
      signals.push({
        type: 'context_shift',
        confidence: 0.8,
        indicators: ['new topic or goal introduced'],
        suggestedAdaptation: 'Acknowledge shift, recalibrate strategy, update priorities',
      });
    }
  }

  return signals;
}

/**
 * Determine conversation phase based on data collected and turns
 */
export function determineConversationPhase(
  context: ConversationContext
): 'discovery' | 'strategy' | 'implementation' | 'optimization' {
  const hasBasicData =
    context.financialState.monthlyIncome &&
    context.financialState.essentialExpenses &&
    context.financialState.primaryGoal;

  const hasDetailedData =
    hasBasicData &&
    context.financialState.totalSavings !== undefined &&
    (context.financialState.highInterestDebt !== undefined ||
      context.financialState.lowInterestDebt !== undefined);

  if (!hasBasicData) return 'discovery';
  if (!hasDetailedData) return 'discovery';
  if (context.turnCount < 5) return 'strategy';
  return 'optimization';
}

/**
 * Detect if user is asking a meta question (about the app, company, account, etc.)
 */
export function detectMetaQuestion(userMessage: string): boolean {
  const metaPatterns = [
    /\b(how do i open|create account|sign up|register|company|who are you|what is atlas|how does atlas work|fees|cost|privacy|security|data|account)\b/i,
    /\b(app|website|platform|service|support|help|contact|email|phone)\b/i,
  ];

  return metaPatterns.some(pattern => pattern.test(userMessage));
}

/**
 * Generate meta question response (about company, account, etc.)
 */
export function generateMetaResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase();

  if (/\b(open|create|account|sign up|register)\b/i.test(msg)) {
    return `Great question! Atlas is currently in beta. You can join the waitlist at atlas-financial.vercel.app. Once you're in, you'll be able to create an account and start your financial journey with us.`;
  }

  if (/\b(who are you|what is atlas|how does atlas work)\b/i.test(msg)) {
    return `Atlas is an AI financial mentor designed to help you build a personalized financial strategy. We combine expert financial knowledge with adaptive conversation to understand your unique situation and guide you toward your goals.`;
  }

  if (/\b(fees|cost|pricing)\b/i.test(msg)) {
    return `Atlas is currently free during beta. We're focused on building the best financial guidance experience first. Pricing details will be shared as we approach full launch.`;
  }

  if (/\b(privacy|security|data)\b/i.test(msg)) {
    return `Your financial data is private and secure. We use industry-standard encryption and never share your information. You can review our full privacy policy at atlas-financial.vercel.app/privacy.`;
  }

  return `That's a great question. For detailed information about Atlas, visit atlas-financial.vercel.app or check out our Privacy and How It Works pages. Is there anything else about your finances I can help with?`;
}

/**
 * Synthesize conversation history into coherent guidance
 */
export function synthesizeConversation(
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): string | null {
  if (history.length < 6) return null; // Need enough turns to synthesize

  // Extract key themes from conversation
  const userMessages = history.filter(h => h.role === 'user').map(h => h.content.toLowerCase());
  
  const hasDebtTheme = userMessages.some(m => /\b(debt|credit|loan|payment)\b/.test(m));
  const hasSavingsTheme = userMessages.some(m => /\b(saving|emergency|fund|account)\b/.test(m));
  const hasInvestmentTheme = userMessages.some(m => /\b(invest|retirement|401k|ira|stock)\b/.test(m));
  const hasIncomeTheme = userMessages.some(m => /\b(income|earn|salary|raise|side)\b/.test(m));

  const themes = [];
  if (hasDebtTheme) themes.push('debt management');
  if (hasSavingsTheme) themes.push('emergency savings');
  if (hasInvestmentTheme) themes.push('long-term investing');
  if (hasIncomeTheme) themes.push('income growth');

  if (themes.length === 0) return null;

  return `I'm noticing we've been talking about ${themes.join(', ')}. These are all connected—let me show you how they fit together in your overall strategy...`;
}

/**
 * Recommend goal or lever adjustments based on user context
 */
export function recommendAdaptations(context: ConversationContext, signals: UserSignal[]): {
  goalAdjustment: string | null;
  leverRecommendation: string | null;
} {
  const urgencySignal = signals.find(s => s.type === 'urgency');
  const opportunitySignal = signals.find(s => s.type === 'opportunity');
  const emotionSignal = signals.find(s => s.type === 'emotion');

  let goalAdjustment: string | null = null;
  let leverRecommendation: string | null = null;

  // If urgent, shift to immediate action
  if (urgencySignal) {
    goalAdjustment = 'Shifting to immediate crisis triage. Long-term planning can wait.';
    leverRecommendation = 'Focus on: (1) immediate cash needs, (2) stop bleeding money, (3) stabilize.';
    return { goalAdjustment, leverRecommendation };
  }

  // If opportunity, accelerate goals
  if (opportunitySignal) {
    goalAdjustment = 'You have a financial opportunity. Let\'s accelerate your goals.';
    leverRecommendation = 'Consider: (1) debt payoff acceleration, (2) emergency fund boost, (3) investment increase.';
    return { goalAdjustment, leverRecommendation };
  }

  // If emotional, add psychological support
  if (emotionSignal) {
    goalAdjustment = 'I hear you. Financial stress is real. Let\'s break this into manageable pieces.';
    leverRecommendation = 'Start with one small win to build momentum. Progress over perfection.';
    return { goalAdjustment, leverRecommendation };
  }

  return { goalAdjustment, leverRecommendation };
}

/**
 * Generate adaptive response that responds to user signals
 */
export function generateAdaptiveResponse(context: ConversationContext): AdaptiveResponse {
  const signals = detectUserSignals(context);
  const phase = determineConversationPhase(context);
  const isMetaQuestion = detectMetaQuestion(context.userMessage);
  const synthesis = synthesizeConversation(context.conversationHistory);
  const { goalAdjustment, leverRecommendation } = recommendAdaptations(context, signals);

  let baseResponse = '';

  // Handle meta questions
  if (isMetaQuestion) {
    baseResponse = generateMetaResponse(context.userMessage);
  } else {
    // Generate contextual response based on phase and signals
    if (signals.some(s => s.type === 'confusion')) {
      baseResponse = `Let me break that down more simply. ${context.userMessage.includes('?') ? 'Here\'s what I mean:' : 'Here\'s the key part:'}`;
    } else if (signals.some(s => s.type === 'resistance')) {
      baseResponse = `I hear you—that's a common concern. Let me show you why this actually works for your situation:`;
    } else if (signals.some(s => s.type === 'urgency')) {
      baseResponse = `This is urgent, so let's focus on what matters right now. Here's the immediate action plan:`;
    } else if (signals.some(s => s.type === 'emotion')) {
      baseResponse = `That feeling is valid. You're not alone in this. Here's what we can do:`;
    } else {
      baseResponse = `Good question. Here's what I'm seeing:`;
    }
  }

  // Determine if follow-up is needed
  const shouldAskFollowUp = !isMetaQuestion && phase === 'discovery';
  const followUpQuestion = shouldAskFollowUp
    ? generateContextualFollowUp(context, signals)
    : null;

  return {
    baseResponse,
    adaptations: {
      mentoring: synthesis,
      contextShift: signals.find(s => s.type === 'context_shift')?.suggestedAdaptation || null,
      goalAdjustment,
      leverRecommendation,
      synthesisOfPriorTurns: synthesis,
    },
    userSignals: signals,
    shouldAskFollowUp,
    followUpQuestion,
    conversationPhase: phase,
  };
}

/**
 * Generate contextual follow-up question based on signals and phase
 */
export function generateContextualFollowUp(
  context: ConversationContext,
  signals: UserSignal[]
): string {
  const confusionSignal = signals.find(s => s.type === 'confusion');
  const resistanceSignal = signals.find(s => s.type === 'resistance');
  const opportunitySignal = signals.find(s => s.type === 'opportunity');

  if (confusionSignal) {
    return 'Does that make sense, or should I explain it differently?';
  }

  if (resistanceSignal) {
    return 'What part feels unrealistic for your situation?';
  }

  if (opportunitySignal) {
    return 'How much of this opportunity do you want to allocate to your goals?';
  }

  // Default contextual follow-up
  const msg = context.userMessage.toLowerCase();
  if (msg.includes('debt')) {
    return 'What\'s the interest rate on that debt?';
  }
  if (msg.includes('savings') || msg.includes('emergency')) {
    return 'How many months of expenses would feel safe?';
  }
  if (msg.includes('invest') || msg.includes('retirement')) {
    return 'What\'s your timeline for this money?';
  }

  return 'What else should I know about your situation?';
}

/**
 * Evaluate if conversation is ready to move to action plan
 */
export function isReadyForActionPlan(context: ConversationContext): boolean {
  const hasBasicData =
    Boolean(context.financialState.monthlyIncome) &&
    Boolean(context.financialState.essentialExpenses) &&
    Boolean(context.financialState.primaryGoal);

  const hasMinimumTurns = context.turnCount >= 5;
  const hasReasonableSessionDuration = context.sessionDuration > 60000; // At least 1 minute

  return hasBasicData && hasMinimumTurns && hasReasonableSessionDuration;
}

/**
 * Generate comprehensive action plan that synthesizes entire conversation
 */
export function generateActionPlan(context: ConversationContext): string {
  const { monthlyIncome, essentialExpenses, primaryGoal, highInterestDebt, totalSavings } =
    context.financialState;

  if (!monthlyIncome || !essentialExpenses || !primaryGoal) {
    return 'We need a bit more information before I can create your action plan. Let\'s continue...';
  }

  const surplus = monthlyIncome - essentialExpenses;
  const hasEmergencyFund = totalSavings && totalSavings >= essentialExpenses * 3;
  const hasHighInterestDebt = highInterestDebt && highInterestDebt > 0;

  const steps: string[] = [];

  // Step 1: Emergency fund or debt payoff
  if (hasHighInterestDebt && !hasEmergencyFund) {
    steps.push('Step 1: Build a small emergency fund ($1,000) while paying minimums on debt');
    steps.push('Step 2: Attack high-interest debt with any extra money');
  } else if (hasHighInterestDebt) {
    steps.push('Step 1: Accelerate high-interest debt payoff');
  } else if (!hasEmergencyFund) {
    steps.push('Step 1: Build emergency fund to 3-6 months of expenses');
  }

  // Step 2: Based on goal
  if (primaryGoal === 'wealth_building' || primaryGoal === 'growth') {
    steps.push(`Step 2: Invest $${Math.max(100, Math.floor(surplus * 0.2))} monthly in diversified index funds`);
  } else if (primaryGoal === 'stability') {
    steps.push(`Step 2: Automate savings of $${Math.max(100, Math.floor(surplus * 0.3))} monthly`);
  }

  // Step 3: Optimize
  steps.push('Step 3: Review and adjust quarterly based on progress');

  return `Here's your personalized action plan:\n\n${steps.join('\n')}\n\nLet's start with step 1 this week.`;
}
