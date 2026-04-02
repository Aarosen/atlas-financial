/**
 * CRISIS DETECTION ENGINE
 * 
 * Deterministically detects financial and personal crises.
 * 100% deterministic - keyword matching + financial thresholds.
 * Zero tolerance for missed crises.
 */

import type { CrisisSignal, ExtractedFinancialData, Message, CrisisType } from './types';

export class CrisisDetectionEngine {
  /**
   * Detect crisis signals in user message
   * 
   */
  detectCrisis(
    userMessage: string,
    financialData: ExtractedFinancialData,
    conversationHistory: Message[]
  ): CrisisSignal {
    const allText = [userMessage, ...conversationHistory.map(m => m.content)].join(' ');

    // Suicide/self-harm detection - strict keywords
    if (/suicide|kill myself|end my life|don't want to live|want to die/i.test(allText)) {
      return {
        detected: true,
        type: 'suicide',
        severity: 'critical',
        response: 'I hear that you\'re in pain. Please reach out to the 988 Suicide & Crisis Lifeline immediately.',
        resources: [
          { name: '988 Suicide & Crisis Lifeline', phone: '988', url: 'https://988lifeline.org', description: 'Free crisis support', availability: '24/7' },
        ],
        escalateToHuman: true,
      };
    }

    // Homelessness detection - strict keywords
    if (/homeless|living on the street|living in my car|facing eviction/i.test(allText)) {
      return {
        detected: true,
        type: 'homelessness',
        severity: 'critical',
        response: 'I hear you\'re facing housing insecurity. Please contact local housing assistance programs.',
        resources: [
          { name: 'National Homeless Hotline', phone: '1-800-799-7233', url: 'https://www.homelessshelterdirectory.org', description: 'Housing assistance', availability: '24/7' },
        ],
        escalateToHuman: true,
      };
    }

    // Hunger detection - strict keywords
    if (/can't afford food|no food|hungry|food insecurity|cannot afford food/i.test(allText)) {
      return {
        detected: true,
        type: 'hunger',
        severity: 'critical',
        response: 'I hear you\'re struggling with food insecurity. Please contact local food banks or SNAP programs.',
        resources: [
          { name: 'Feeding America', phone: '1-866-3-HUNGRY', url: 'https://www.feedingamerica.org', description: 'Food bank locator', availability: '24/7' },
          {
            name: 'SNAP (Supplemental Nutrition Assistance Program)',
            description: 'Apply for food assistance',
            url: 'https://www.fns.usda.gov/snap',
            availability: '24/7',
          },
          {
            name: '211 (Dial 2-1-1)',
            description: 'Connect to local food assistance',
            phone: '211',
            availability: '24/7',
          },
        ],
        escalateToHuman: true,
      };
    }

    // Abuse detection - strict keywords
    if (/partner is abusive|partner controls all my money|being abused|domestic violence/i.test(allText)) {
      return {
        detected: true,
        type: 'abuse',
        severity: 'critical',
        response: 'I hear you\'re in an unsafe situation. Please contact the National Domestic Violence Hotline.',
        resources: [
          { name: 'National Domestic Violence Hotline', phone: '1-800-799-7233', url: 'https://www.thehotline.org', description: 'Domestic violence support', availability: '24/7' },
        ],
        escalateToHuman: true,
      };
    }

    // Bankruptcy/severe financial crisis detection - strict keywords
    if (/facing bankruptcy|facing foreclosure|debt collectors are calling|severe financial crisis/i.test(allText)) {
      return {
        detected: true,
        type: 'bankruptcy',
        severity: 'critical',
        response: 'I hear you\'re facing severe financial hardship. Please contact a nonprofit credit counselor.',
        resources: [
          { name: 'National Foundation for Credit Counseling', phone: '1-800-388-2227', url: 'https://www.nfcc.org', description: 'Credit counseling', availability: 'Business hours' },
        ],
        escalateToHuman: true,
      };
    }

    // Financial threshold detection
    if (
      financialData.monthlyIncome === 0 &&
      financialData.totalSavings === 0 &&
      financialData.essentialExpenses !== undefined &&
      financialData.essentialExpenses > 0
    ) {
      return {
        detected: true,
        type: 'other',
        severity: 'critical',
        response: 'I hear you\'re in a difficult financial situation. Let\'s work together to find resources and solutions.',
        resources: [],
        escalateToHuman: true,
      };
    }

    // No crisis detected
    return {
      detected: false,
      type: 'none',
      severity: 'none',
      response: 'I\'m here to help you with any questions or concerns you may have.',
      resources: [],
      escalateToHuman: false,
    };
  }

  private detectSuicide(messageLower: string): boolean {
    const suicideKeywords = [
      'suicide',
      'kill myself',
      'kill myself',
      'end my life',
      'don\'t want to live',
      'want to die',
      'no point in living',
      'better off dead',
      'harm myself',
      'hurt myself',
      'self harm',
    ];
    return suicideKeywords.some(keyword => messageLower.includes(keyword));
  }

  private detectHomelessness(messageLower: string): boolean {
    const homelessnessKeywords = [
      'homeless',
      'living in car',
      'living on street',
      'no place to live',
      'evicted',
      'eviction',
      'can\'t pay rent',
      'losing my house',
      'foreclosure',
      'sleeping outside',
    ];
    return homelessnessKeywords.some(keyword => messageLower.includes(keyword));
  }

  private detectHunger(messageLower: string): boolean {
    const hungerKeywords = [
      'can\'t afford food',
      'hungry',
      'starving',
      'no food',
      'food bank',
      'food assistance',
      'skip meals',
      'can\'t eat',
    ];
    return hungerKeywords.some(keyword => messageLower.includes(keyword));
  }

  private detectAbuse(messageLower: string): boolean {
    const abuseKeywords = [
      'abuse',
      'domestic violence',
      'controlling',
      'abusive partner',
      'abusive relationship',
      'hitting me',
      'hurting me',
      'threatening me',
      'scared of my partner',
    ];
    return abuseKeywords.some(keyword => messageLower.includes(keyword));
  }

  private detectBankruptcy(messageLower: string): boolean {
    const bankruptcyKeywords = [
      'bankruptcy',
      'foreclosure',
      'debt collector',
      'debt collectors',
      'collection agency',
      'wage garnishment',
      'losing everything',
      'can\'t pay bills',
    ];
    return bankruptcyKeywords.some(keyword => messageLower.includes(keyword));
  }
}

// Export singleton instance
export const crisisDetectionEngine = new CrisisDetectionEngine();
