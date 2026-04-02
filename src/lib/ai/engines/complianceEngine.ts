/**
 * COMPLIANCE ENGINE
 * 
 * Deterministically detects regulated financial advice.
 * 100% deterministic - keyword matching only.
 * Zero tolerance for compliance violations.
 */

import type { ComplianceRisk, Message } from './types';

export class ComplianceEngine {
  /**
   * Detect compliance risks in user message
   */
  detectComplianceRisk(userMessage: string, conversationHistory: Message[]): ComplianceRisk {
    const allText = [userMessage, ...conversationHistory.map(m => m.content)].join(' ');

    // Investment advice detection - strict keywords
    if (/should i buy|which stock|invest in|portfolio allocation|crypto|bitcoin|ethereum/i.test(allText)) {
      return {
        detected: true,
        riskType: 'investment_advice',
        severity: 'critical',
        response: 'I cannot provide investment advice. Please consult with a licensed financial advisor.',
        redirectTo: 'Financial Planner or CFP',
      };
    }

    // Tax advice detection - strict keywords
    if (/tax deduction|tax strategy|irs audit|capital gains|tax filing|what deductions|what tax|how are.*taxed/i.test(allText)) {
      return {
        detected: true,
        riskType: 'tax_advice',
        severity: 'critical',
        response: 'I cannot provide tax advice. Please consult with a CPA or tax professional.',
        redirectTo: 'CPA or Tax Professional',
      };
    }

    // Legal advice detection - strict keywords
    if (/file a lawsuit|sign this contract|file for bankruptcy|divorce settlement/i.test(allText)) {
      return {
        detected: true,
        riskType: 'legal_advice',
        severity: 'critical',
        response: 'I cannot provide legal advice. Please consult with a licensed attorney.',
        redirectTo: 'Attorney',
      };
    }

    // Medical advice detection - strict keywords
    if (/should i take this medication|should i see a doctor|what should i do about my symptoms/i.test(allText)) {
      return {
        detected: true,
        riskType: 'medical_advice',
        severity: 'critical',
        response: 'I cannot provide medical advice. Please consult with a healthcare professional.',
        redirectTo: 'Healthcare Professional',
      };
    }

    return {
      detected: false,
      riskType: 'none',
      severity: 'none',
      response: '',
      redirectTo: '',
    };
  }

  private detectInvestmentAdvice(messageLower: string): boolean {
    const investmentKeywords = [
      'should i buy',
      'should i invest in',
      'which stock',
      'which etf',
      'which fund',
      'buy bitcoin',
      'buy crypto',
      'buy ethereum',
      'stock recommendation',
      'investment recommendation',
      'best investment',
      'best stock',
      'best crypto',
      'should i sell',
      'should i hold',
      'portfolio recommendation',
      'asset allocation recommendation',
    ];
    return investmentKeywords.some(keyword => messageLower.includes(keyword));
  }

  private detectTaxAdvice(messageLower: string): boolean {
    const taxKeywords = [
      'tax deduction',
      'tax strategy',
      'tax planning',
      'tax advice',
      'irs',
      'tax return',
      'tax filing',
      'tax bracket',
      'capital gains',
      'tax loss harvesting',
      'tax credit',
      'tax exemption',
      'tax shelter',
      'tax avoidance',
    ];
    return taxKeywords.some(keyword => messageLower.includes(keyword));
  }

  private detectLegalAdvice(messageLower: string): boolean {
    const legalKeywords = [
      'lawsuit',
      'legal action',
      'contract',
      'agreement',
      'attorney',
      'lawyer',
      'legal advice',
      'legal issue',
      'bankruptcy filing',
      'divorce',
      'custody',
      'will',
      'trust',
      'estate planning',
      'litigation',
    ];
    return legalKeywords.some(keyword => messageLower.includes(keyword));
  }

  private detectMedicalAdvice(messageLower: string): boolean {
    const medicalKeywords = [
      'doctor',
      'medication',
      'treatment',
      'medical advice',
      'health advice',
      'prescription',
      'diagnosis',
      'symptom',
      'disease',
      'illness',
      'hospital',
      'surgery',
      'therapy',
      'mental health',
    ];
    return medicalKeywords.some(keyword => messageLower.includes(keyword));
  }
}

// Export singleton instance
export const complianceEngine = new ComplianceEngine();
