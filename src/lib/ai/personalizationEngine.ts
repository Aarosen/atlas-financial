// Advanced Personalization Engine - Phase 3D
// Adapts Atlas responses based on user profile and conversation context

export interface UserProfile {
  id: string;
  name?: string;
  lifeStage: 'student' | 'early_career' | 'mid_career' | 'late_career' | 'retired';
  knowledgeLevel: 'beginner' | 'intermediate' | 'advanced';
  primaryConcern: 'stability' | 'growth' | 'flexibility' | 'wealth_building';
  communicationStyle: 'analytical' | 'narrative' | 'visual' | 'conversational';
  riskTolerance: 'cautious' | 'balanced' | 'growth';
  goals: string[];
  constraints: string[];
  preferredLanguage: string;
}

export interface ConversationContext {
  messageCount: number;
  topicsDiscussed: string[];
  emotionalState: 'stressed' | 'neutral' | 'positive' | 'anxious';
  progressMade: boolean;
  clarificationNeeded: string[];
  userConfidence: 'low' | 'medium' | 'high';
}

export interface PersonalizationSettings {
  complexityLevel: 'simple' | 'moderate' | 'detailed';
  responseLength: 'brief' | 'moderate' | 'comprehensive';
  useExamples: boolean;
  useMetrics: boolean;
  emphasizeAction: boolean;
  tone: 'warm' | 'professional' | 'urgent' | 'celebratory';
}

export class PersonalizationEngine {
  /**
   * Determine complexity level based on user profile and context
   */
  determineComplexityLevel(profile: UserProfile, context: ConversationContext): 'simple' | 'moderate' | 'detailed' {
    // Start with knowledge level
    let complexity: 'simple' | 'moderate' | 'detailed' = profile.knowledgeLevel === 'advanced' ? 'detailed' : profile.knowledgeLevel === 'intermediate' ? 'moderate' : 'simple';

    // Adjust based on conversation context
    if (context.emotionalState === 'stressed' || context.emotionalState === 'anxious') {
      complexity = 'simple';
    }

    if (context.userConfidence === 'high' && profile.knowledgeLevel !== 'beginner') {
      complexity = 'detailed';
    }

    return complexity;
  }

  /**
   * Determine response length based on context
   */
  determineResponseLength(profile: UserProfile, context: ConversationContext): 'brief' | 'moderate' | 'comprehensive' {
    // Analytical users prefer detailed responses
    if (profile.communicationStyle === 'analytical') {
      return 'comprehensive';
    }

    // Stressed users need brief responses
    if (context.emotionalState === 'stressed') {
      return 'brief';
    }

    // Early in conversation, be moderate
    if (context.messageCount < 5) {
      return 'moderate';
    }

    // Default to moderate
    return 'moderate';
  }

  /**
   * Determine appropriate tone
   */
  determineTone(profile: UserProfile, context: ConversationContext): 'warm' | 'professional' | 'urgent' | 'celebratory' {
    // Celebrate progress
    if (context.progressMade) {
      return 'celebratory';
    }

    // Urgent if stressed about finances
    if (context.emotionalState === 'stressed' && context.topicsDiscussed.includes('debt')) {
      return 'urgent';
    }

    // Professional for analytical users
    if (profile.communicationStyle === 'analytical') {
      return 'professional';
    }

    // Default to warm
    return 'warm';
  }

  /**
   * Determine if examples should be included
   */
  shouldIncludeExamples(profile: UserProfile, context: ConversationContext): boolean {
    // Visual learners benefit from examples
    if (profile.communicationStyle === 'visual' || profile.communicationStyle === 'narrative') {
      return true;
    }

    // Beginners benefit from examples
    if (profile.knowledgeLevel === 'beginner') {
      return true;
    }

    // If user is confused, include examples
    if (context.userConfidence === 'low') {
      return true;
    }

    return false;
  }

  /**
   * Determine if metrics should be emphasized
   */
  shouldUseMetrics(profile: UserProfile, context: ConversationContext): boolean {
    // Analytical users want metrics
    if (profile.communicationStyle === 'analytical') {
      return true;
    }

    // Growth-focused users want metrics
    if (profile.primaryConcern === 'growth' || profile.primaryConcern === 'wealth_building') {
      return true;
    }

    // Advanced users want metrics
    if (profile.knowledgeLevel === 'advanced') {
      return true;
    }

    return false;
  }

  /**
   * Determine if action items should be emphasized
   */
  shouldEmphasizeAction(profile: UserProfile, context: ConversationContext): boolean {
    // Growth-focused users want action
    if (profile.primaryConcern === 'growth' || profile.primaryConcern === 'wealth_building') {
      return true;
    }

    // Motivated users want action
    if (context.emotionalState === 'positive') {
      return true;
    }

    // Mid-career and late-career users want action
    if (profile.lifeStage === 'mid_career' || profile.lifeStage === 'late_career') {
      return true;
    }

    return false;
  }

  /**
   * Generate personalization settings
   */
  generateSettings(profile: UserProfile, context: ConversationContext): PersonalizationSettings {
    return {
      complexityLevel: this.determineComplexityLevel(profile, context),
      responseLength: this.determineResponseLength(profile, context),
      useExamples: this.shouldIncludeExamples(profile, context),
      useMetrics: this.shouldUseMetrics(profile, context),
      emphasizeAction: this.shouldEmphasizeAction(profile, context),
      tone: this.determineTone(profile, context),
    };
  }

  /**
   * Build personalized system prompt section
   */
  buildPersonalizationPrompt(settings: PersonalizationSettings, profile: UserProfile): string {
    let prompt = '\nPERSONALIZATION SETTINGS:\n';

    prompt += `- Complexity: ${settings.complexityLevel} (${
      settings.complexityLevel === 'simple'
        ? 'use plain language, avoid jargon'
        : settings.complexityLevel === 'moderate'
          ? 'balance clarity with detail'
          : 'provide comprehensive analysis'
    })\n`;

    prompt += `- Response length: ${settings.responseLength} (${
      settings.responseLength === 'brief'
        ? 'concise and direct'
        : settings.responseLength === 'moderate'
          ? 'balanced detail'
          : 'thorough and comprehensive'
    })\n`;

    if (settings.useExamples) {
      prompt += '- Include concrete examples and real-world scenarios\n';
    }

    if (settings.useMetrics) {
      prompt += '- Emphasize numbers, percentages, and quantifiable metrics\n';
    }

    if (settings.emphasizeAction) {
      prompt += '- Focus on actionable next steps and concrete recommendations\n';
    }

    prompt += `- Tone: ${settings.tone} (${
      settings.tone === 'warm'
        ? 'friendly and supportive'
        : settings.tone === 'professional'
          ? 'clear and analytical'
          : settings.tone === 'urgent'
            ? 'direct and protective'
            : 'celebratory and encouraging'
    })\n`;

    // Add life stage context
    prompt += `\nUSER CONTEXT:\n`;
    prompt += `- Life stage: ${profile.lifeStage}\n`;
    prompt += `- Financial knowledge: ${profile.knowledgeLevel}\n`;
    prompt += `- Primary concern: ${profile.primaryConcern}\n`;
    prompt += `- Communication style: ${profile.communicationStyle}\n`;

    if (profile.goals.length > 0) {
      prompt += `- Goals: ${profile.goals.join(', ')}\n`;
    }

    if (profile.constraints.length > 0) {
      prompt += `- Constraints: ${profile.constraints.join(', ')}\n`;
    }

    return prompt;
  }

  /**
   * Analyze conversation context from message history
   */
  analyzeContext(messages: Array<{ role: string; content: string }>): ConversationContext {
    const topicsDiscussed: string[] = [];
    let emotionalState: 'stressed' | 'neutral' | 'positive' | 'anxious' = 'neutral';
    let userConfidence: 'low' | 'medium' | 'high' = 'medium';

    // Analyze topics
    const allText = messages.map((m) => m.content.toLowerCase()).join(' ');

    if (allText.includes('debt') || allText.includes('credit card') || allText.includes('loan')) {
      topicsDiscussed.push('debt');
    }
    if (allText.includes('invest') || allText.includes('stock') || allText.includes('portfolio')) {
      topicsDiscussed.push('investing');
    }
    if (allText.includes('retire') || allText.includes('retirement') || allText.includes('401k')) {
      topicsDiscussed.push('retirement');
    }
    if (allText.includes('tax') || allText.includes('deduction') || allText.includes('irs')) {
      topicsDiscussed.push('tax');
    }
    if (allText.includes('budget') || allText.includes('expense') || allText.includes('spending')) {
      topicsDiscussed.push('budgeting');
    }

    // Analyze emotional state
    if (allText.includes('stressed') || allText.includes('worried') || allText.includes('anxious') || allText.includes('overwhelmed')) {
      emotionalState = 'stressed';
    } else if (allText.includes('excited') || allText.includes('happy') || allText.includes('great') || allText.includes('good')) {
      emotionalState = 'positive';
    } else if (allText.includes('confused') || allText.includes('lost') || allText.includes('uncertain')) {
      emotionalState = 'anxious';
    }

    // Analyze user confidence
    if (allText.includes('i know') || allText.includes('i understand') || allText.includes('makes sense')) {
      userConfidence = 'high';
    } else if (allText.includes('confused') || allText.includes('not sure') || allText.includes('unclear')) {
      userConfidence = 'low';
    }

    return {
      messageCount: messages.length,
      topicsDiscussed,
      emotionalState,
      progressMade: allText.includes('progress') || allText.includes('improved') || allText.includes('better'),
      clarificationNeeded: [],
      userConfidence,
    };
  }
}

// Singleton instance
let personalizationEngineInstance: PersonalizationEngine | null = null;

export function getPersonalizationEngine(): PersonalizationEngine {
  if (!personalizationEngineInstance) {
    personalizationEngineInstance = new PersonalizationEngine();
  }
  return personalizationEngineInstance;
}
