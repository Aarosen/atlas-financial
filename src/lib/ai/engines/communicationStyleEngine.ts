/**
 * COMMUNICATION STYLE ENGINE
 * 
 * Deterministically adapts communication style.
 * 100% deterministic - no LLM calls.
 * Applied after response generation (post-processing).
 */

import type { CommunicationStyle, Message, Language, Tone, Complexity } from './types';

export class CommunicationStyleEngine {
  /**
   * Determine communication style based on conversation history
   */
  determineCommunicationStyle(
    conversationHistory: Message[],
    userProfile?: { language?: Language; tone?: Tone }
  ): CommunicationStyle {
    const language = userProfile?.language || this.detectLanguage(conversationHistory);
    const tone = userProfile?.tone || this.detectTone(conversationHistory);
    const complexity = this.detectComplexity(conversationHistory);

    return {
      tone,
      complexity,
      language,
      personalization: {
        referencePriorGoals: this.shouldReferencePriorGoals(conversationHistory),
        usedMetaphors: false,
      },
    };
  }

  /**
   * Adapt response to communication style
   */
  adaptResponse(response: string, style: CommunicationStyle): string {
    let adapted = response;

    // Apply tone adjustments
    adapted = this.applyTone(adapted, style.tone);

    // Apply complexity adjustments
    adapted = this.applyComplexity(adapted, style.complexity);

    // Apply language adjustments
    adapted = this.applyLanguage(adapted, style.language);

    return adapted;
  }

  private detectLanguage(conversationHistory: Message[]): Language {
    // Simple language detection based on keywords
    const allText = conversationHistory.map(m => m.content).join(' ').toLowerCase();

    if (/hola|gracias|dinero|ahorrar/i.test(allText)) return 'es';
    if (/bonjour|merci|argent|économiser/i.test(allText)) return 'fr';
    if (/你好|谢谢|钱|储蓄/i.test(allText)) return 'zh';

    return 'en';
  }

  private detectTone(conversationHistory: Message[]): Tone {
    const allText = conversationHistory.map(m => m.content).join(' ').toLowerCase();

    // Detect anxiety/stress
    if (/worried|anxious|stressed|scared|afraid|panic/i.test(allText)) {
      return 'supportive';
    }

    // Detect urgency
    if (/urgent|immediately|asap|emergency|crisis/i.test(allText)) {
      return 'urgent';
    }

    // Detect analytical/technical
    if (/calculate|formula|algorithm|technical|detailed/i.test(allText)) {
      return 'professional';
    }

    // Default to warm
    return 'warm';
  }

  private detectComplexity(conversationHistory: Message[]): Complexity {
    const userMessages = conversationHistory.filter(m => m.role === 'user');
    if (userMessages.length === 0) return 'simple';

    const avgLength = userMessages.reduce((sum, m) => sum + m.content.length, 0) / userMessages.length;
    const hasFinancialTerms = userMessages.some(m =>
      /derivative|hedge|arbitrage|volatility|correlation|rebalance|asset allocation/i.test(m.content)
    );

    if (hasFinancialTerms || avgLength > 200) return 'advanced';
    if (avgLength > 100) return 'moderate';
    return 'simple';
  }

  private shouldReferencePriorGoals(conversationHistory: Message[]): boolean {
    return conversationHistory.length > 3;
  }

  private applyTone(response: string, tone: Tone): string {
    switch (tone) {
      case 'warm':
        // Add warmth: use "you", "we", contractions
        return response
          .replace(/cannot/g, "can't")
          .replace(/will not/g, "won't")
          .replace(/should not/g, "shouldn't");

      case 'professional':
        // Remove contractions, be formal
        return response
          .replace(/can't/g, 'cannot')
          .replace(/won't/g, 'will not')
          .replace(/shouldn't/g, 'should not');

      case 'urgent':
        // Add urgency markers
        if (!response.includes('immediately') && !response.includes('now')) {
          return response.replace(/\.$/, '. Act now.');
        }
        return response;

      case 'supportive':
        // Add supportive language
        if (!response.includes('understand') && !response.includes('support')) {
          return `I understand your concern. ${response}`;
        }
        return response;

      default:
        return response;
    }
  }

  private applyComplexity(response: string, complexity: Complexity): string {
    switch (complexity) {
      case 'simple':
        // Simplify language
        return response
          .replace(/utilize/g, 'use')
          .replace(/facilitate/g, 'help')
          .replace(/implement/g, 'do')
          .replace(/optimize/g, 'improve');

      case 'advanced':
        // Add technical depth (if not already present)
        if (!response.includes('volatility') && !response.includes('correlation')) {
          // Keep as is - don't over-complicate
        }
        return response;

      case 'moderate':
      default:
        return response;
    }
  }

  private applyLanguage(response: string, language: Language): string {
    // Language-specific adjustments would go here
    // For now, just return as-is (actual translation would require external service)
    return response;
  }
}

// Export singleton instance
export const communicationStyleEngine = new CommunicationStyleEngine();
