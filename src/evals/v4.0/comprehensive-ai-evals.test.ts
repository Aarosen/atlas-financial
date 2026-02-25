/**
 * COMPREHENSIVE AI EVALS v4.0
 * 
 * CODE-11 through CODE-16: New AI engine evals
 * Tests for conversation arc, crisis detection, cultural finance, objections, tone
 */

import { describe, it, expect } from 'vitest';
import { buildConversationArc, generateSessionSynthesis, isReadyForSynthesis } from '@/lib/ai/conversationArcEngine';
import { detectCrisisSignals, generateCrisisResponse } from '@/lib/ai/crisisDetectionEngine';
import { extractCulturalContext, calculateMonthlyObligations } from '@/lib/ai/culturalFinanceEngine';
import { detectObjections, generateProactiveObjectionResponse } from '@/lib/ai/objectionHandlingEngine';
import { detectAppropriateTone, generatePersonalityPrompt } from '@/lib/ai/tonePersonalityEngine';

describe('CODE-11: Conversation Arc Detection & Synthesis', () => {
  it('should detect conversation phases correctly', () => {
    const history = [
      { role: 'user' as const, content: 'I have $50k debt' },
      { role: 'assistant' as const, content: 'Here are your options...' },
      { role: 'user' as const, content: 'What about my emergency fund?' },
      { role: 'assistant' as const, content: 'Good question...' },
      { role: 'user' as const, content: 'How long will this take?' },
    ];

    const arc = buildConversationArc(history, {
      monthlyIncome: 5000,
      essentialExpenses: 3000,
      highInterestDebt: 50000,
    } as any);

    expect(arc.questionsAsked.length).toBeGreaterThan(0);
    expect(arc.primaryTopic).toBeDefined();
  });

  it('should synthesize multi-turn conversations', () => {
    const history = [
      { role: 'user' as const, content: 'I have $50k credit card debt at 18% interest' },
      { role: 'assistant' as const, content: 'Here are your options...' },
      { role: 'user' as const, content: 'I make $5k/month after taxes' },
      { role: 'assistant' as const, content: 'Good, that helps...' },
      { role: 'user' as const, content: 'Should I stop investing?' },
      { role: 'assistant' as const, content: 'No, here\'s why...' },
      { role: 'user' as const, content: 'What\'s my first step?' },
    ];

    const arc = buildConversationArc(history, {
      monthlyIncome: 5000,
      essentialExpenses: 3000,
      highInterestDebt: 50000,
    } as any);

    const synthesis = generateSessionSynthesis(arc, {} as any, history);

    expect(synthesis.summary).toBeDefined();
    expect(synthesis.nextSteps.length).toBeGreaterThan(0);
    expect(synthesis.exportableText).toContain('Financial Plan');
  });

  it('should detect readiness for synthesis', () => {
    const history = [
      { role: 'user' as const, content: 'Question 1?' },
      { role: 'assistant' as const, content: 'Answer 1' },
      { role: 'user' as const, content: 'Question 2?' },
      { role: 'assistant' as const, content: 'Answer 2' },
      { role: 'user' as const, content: 'Question 3?' },
    ];

    const ready = isReadyForSynthesis(history);
    expect(ready).toBe(true);
  });
});

describe('CODE-12: Crisis Signal Detection', () => {
  it('should detect housing crisis', () => {
    const signal = detectCrisisSignals(
      "I can't pay my rent this month and I'm getting evicted",
      [],
      {} as any
    );

    expect(signal).toBeDefined();
    expect(signal?.level).toBe('critical');
    expect(signal?.type).toBe('housing_crisis');
    expect(signal?.escalateToHuman).toBe(true);
  });

  it('should detect food insecurity', () => {
    const signal = detectCrisisSignals(
      "I can't afford food and I'm hungry",
      [],
      {} as any
    );

    expect(signal).toBeDefined();
    expect(signal?.level).toBe('critical');
    expect(signal?.type).toBe('food_insecurity');
  });

  it('should detect acute cash shortage', () => {
    const signal = detectCrisisSignals(
      "I have $47 until my next paycheck in 5 days",
      [],
      {} as any
    );

    expect(signal).toBeDefined();
    expect(signal?.level).toBe('urgent');
    expect(signal?.type).toBe('acute_cash_shortage');
  });

  it('should detect job loss', () => {
    const signal = detectCrisisSignals(
      "I just lost my job and have no income",
      [],
      {} as any
    );

    expect(signal).toBeDefined();
    expect(signal?.level).toBe('urgent');
    expect(signal?.type).toBe('income_disruption');
  });

  it('should detect emotional escalation', () => {
    const history = [
      { role: 'user' as const, content: "I'm a little stressed about money" },
      { role: 'assistant' as const, content: 'Here are some tips...' },
      { role: 'user' as const, content: "I'm worried and anxious" },
      { role: 'assistant' as const, content: 'Let me help...' },
      { role: 'user' as const, content: "I don't know how I'm going to survive" },
    ];

    const signal = detectCrisisSignals(
      "I don't know how I'm going to survive",
      history,
      {} as any
    );

    expect(signal).toBeDefined();
    expect(signal?.level).toBe('urgent');
  });

  it('should generate appropriate crisis response', () => {
    const signal = detectCrisisSignals(
      "I can't pay my rent",
      [],
      {} as any
    );

    if (signal) {
      const response = generateCrisisResponse(signal);
      expect(response).toContain('IMMEDIATE ACTION');
      expect(response).toContain('211');
      expect(response).toContain('resources');
    }
  });
});

describe('CODE-13: Cultural Context Recognition', () => {
  it('should detect remittances', () => {
    const history = [
      { role: 'user' as const, content: 'I send $450 to my family in Guatemala every month' },
    ];

    const context = extractCulturalContext(history);

    expect(context.obligations.length).toBeGreaterThan(0);
    expect(context.obligations[0].type).toBe('remittance');
    expect(context.obligations[0].monthlyAmount).toBe(450);
    expect(context.obligations[0].priority).toBe('first');
  });

  it('should detect tithing', () => {
    const history = [
      { role: 'user' as const, content: 'I tithe 10% of my income before anything else' },
    ];

    const context = extractCulturalContext(history);

    expect(context.obligations.some(o => o.type === 'tithing')).toBe(true);
  });

  it('should detect halal finance constraints', () => {
    const history = [
      { role: 'user' as const, content: "I can't use regular savings because I don't do interest (halal)" },
    ];

    const context = extractCulturalContext(history);

    expect(context.constraints.noInterest).toBe(true);
  });

  it('should detect non-standard household', () => {
    const history = [
      { role: 'user' as const, content: 'I support three parents (own + spouse\'s) plus sending money to sibling abroad' },
    ];

    const context = extractCulturalContext(history);

    expect(context.householdStructure.supportedAdults).toBeGreaterThan(0);
  });

  it('should calculate monthly obligations correctly', () => {
    const context = {
      obligations: [
        { type: 'remittance' as const, description: 'Guatemala', monthlyAmount: 450, priority: 'first' as const, isFixed: true },
        { type: 'tithing' as const, description: 'Tithing', monthlyAmount: 0, priority: 'first' as const, isFixed: true },
      ],
      constraints: { noInterest: false, noAlcoholRelated: false, noGambling: false, other: [] },
      householdStructure: { dependents: 0, supportedAdults: 0, description: '' },
      remittanceDestinations: [],
    };

    const { total, breakdown } = calculateMonthlyObligations(context, 5000);

    expect(total).toBeGreaterThan(0);
    expect(breakdown['Guatemala']).toBe(450);
  });
});

describe('CODE-14: Objection Handling', () => {
  it('should detect affordability objection', () => {
    const objections = detectObjections("But I can't afford it");

    expect(objections.length).toBeGreaterThan(0);
    expect(objections[0].category).toBe('affordability');
  });

  it('should detect time objection', () => {
    const objections = detectObjections("I don't have time for this, I'm too busy");

    expect(objections.length).toBeGreaterThan(0);
    expect(objections[0].category).toBe('time');
  });

  it('should detect debt objection', () => {
    const objections = detectObjections("But I have debt, shouldn't I pay that off first?");

    expect(objections.length).toBeGreaterThan(0);
    expect(objections[0].category).toBe('debt');
  });

  it('should generate proactive objection response', () => {
    const objections = detectObjections("I can't afford this");
    const response = generateProactiveObjectionResponse(objections);

    expect(response).toBeDefined();
    expect(response.length).toBeGreaterThan(0);
    expect(response).toContain('Alternatives');
  });
});

describe('CODE-15: Conversation Continuity', () => {
  it('should preserve specific numbers across conversation', () => {
    const history = [
      { role: 'user' as const, content: 'I have $50k credit card debt at 18% interest' },
      { role: 'assistant' as const, content: 'Here are your options...' },
      { role: 'user' as const, content: 'I make $5k/month after taxes' },
    ];

    const arc = buildConversationArc(history, {
      monthlyIncome: 5000,
      essentialExpenses: 3000,
      highInterestDebt: 50000,
    } as any);

    expect(arc.keyNumbers['total']).toBeGreaterThan(0);
  });
});

describe('CODE-16: Tone & Personality', () => {
  it('should detect warm tone for first message', () => {
    const tone = detectAppropriateTone('Hi, I need help with my finances', {
      isCrisis: false,
      hasProgress: false,
      isFirstMessage: true,
      emotionalState: 'neutral',
    });

    expect(tone).toBe('warm');
  });

  it('should detect urgent tone for crisis', () => {
    const tone = detectAppropriateTone('I can\'t pay rent', {
      isCrisis: true,
      hasProgress: false,
      isFirstMessage: false,
      emotionalState: 'stressed',
    });

    expect(tone).toBe('urgent');
  });

  it('should detect celebratory tone for progress', () => {
    const tone = detectAppropriateTone('I paid off my first $1000!', {
      isCrisis: false,
      hasProgress: true,
      isFirstMessage: false,
      emotionalState: 'positive',
    });

    expect(tone).toBe('celebratory');
  });

  it('should generate personality prompt', () => {
    const prompt = generatePersonalityPrompt('warm');

    expect(prompt).toContain('warm');
    expect(prompt).toContain('contractions');
    expect(prompt).toContain('conversational');
  });
});

describe('Integration: Complete AI Engine Suite', () => {
  it('should handle complex multi-engine scenario', () => {
    const history = [
      { role: 'user' as const, content: 'I have $50k debt and I send $450 to Guatemala monthly' },
      { role: 'assistant' as const, content: 'Here are your options...' },
      { role: 'user' as const, content: 'But I can\'t afford to invest right now' },
    ];

    // Crisis detection
    const crisis = detectCrisisSignals(history[0].content, history, {} as any);
    expect(crisis).toBeNull(); // Not a crisis

    // Cultural context
    const culture = extractCulturalContext(history);
    expect(culture.obligations.some(o => o.type === 'remittance')).toBe(true);

    // Objection handling
    const objections = detectObjections(history[2].content);
    expect(objections.length).toBeGreaterThan(0);

    // Tone detection
    const tone = detectAppropriateTone(history[2].content, {
      isCrisis: false,
      hasProgress: false,
      isFirstMessage: false,
      emotionalState: 'stressed',
    });
    expect(tone).toBeDefined();

    // Conversation arc
    const arc = buildConversationArc(history, {
      monthlyIncome: 5000,
      essentialExpenses: 3000,
      highInterestDebt: 50000,
    } as any);
    expect(arc.primaryTopic).toBe('debt');
  });
});
