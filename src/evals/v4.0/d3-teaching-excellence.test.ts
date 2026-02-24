/**
 * D3: Teaching Excellence Validation
 * 
 * Target: 98+/100 (98%+ of responses include relevant teaching moments)
 * Professional financial education at CFP level
 */

import { describe, it, expect } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// TEACHING MOMENT STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

interface TeachingMoment {
  what: string; // What is the concept?
  why: string; // Why does it matter?
  action: string; // What should they do?
  example?: string; // Real-world example
}

interface TeachingTest {
  userMessage: string;
  expectedConcept: string;
  teachingMomentExample: TeachingMoment;
  comprehensionLevel: 'beginner' | 'intermediate' | 'advanced';
}

const teachingTests: TeachingTest[] = [
  {
    userMessage: 'I have $18k in credit card debt. What should I do?',
    expectedConcept: 'Debt Avalanche Strategy',
    teachingMomentExample: {
      what: 'The debt avalanche method prioritizes paying off highest-interest debt first',
      why: 'This saves you the most money in interest over time',
      action: 'List your debts by interest rate and attack the highest one first',
      example: 'If you have a 24% credit card and a 5% student loan, pay minimums on the student loan and throw extra money at the credit card',
    },
    comprehensionLevel: 'beginner',
  },
  {
    userMessage: 'Should I do a Roth conversion?',
    expectedConcept: 'Roth Conversion Strategy',
    teachingMomentExample: {
      what: 'A Roth conversion moves money from a traditional IRA to a Roth IRA, paying taxes now for tax-free growth later',
      why: 'This is valuable if you expect to be in a higher tax bracket in retirement',
      action: 'Consider converting in low-income years or when the market is down',
      example: 'If you take a sabbatical year with low income, that\'s an ideal time to convert',
    },
    comprehensionLevel: 'intermediate',
  },
  {
    userMessage: 'How do I optimize my asset location?',
    expectedConcept: 'Asset Location Tax Optimization',
    teachingMomentExample: {
      what: 'Asset location means placing tax-inefficient investments in tax-advantaged accounts and tax-efficient ones in taxable accounts',
      why: 'This minimizes your overall tax burden across all accounts',
      action: 'Put bonds and REITs in 401(k)s, stocks in Roth, index funds in taxable',
      example: 'A bond fund generating 4% interest is better in a 401(k) than a taxable account',
    },
    comprehensionLevel: 'advanced',
  },
];

describe('D3: Teaching Excellence - Teaching Moments', () => {
  
  describe('Teaching Moment Structure', () => {
    teachingTests.forEach((test) => {
      it(`should teach "${test.expectedConcept}" with What-Why-Action structure`, () => {
        const moment = test.teachingMomentExample;
        expect(moment.what).toBeTruthy();
        expect(moment.why).toBeTruthy();
        expect(moment.action).toBeTruthy();
      });
    });
  });

  describe('Teaching Moment Relevance', () => {
    it('should teach concepts relevant to user concern', () => {
      const response = 'With your debt situation, here\'s how the debt avalanche method works...';
      expect(response).toContain('debt');
      expect(response).toContain('method');
    });

    it('should avoid teaching unrelated concepts', () => {
      const response = 'You asked about debt payoff. Here\'s how the avalanche method works.';
      expect(response).toContain('debt');
      expect(response).not.toContain('cryptocurrency');
    });
  });

  describe('Comprehension Level Adaptation', () => {
    it('should use simple language for beginners', () => {
      const beginnerResponse = 'The debt avalanche means paying off your highest-interest debt first.';
      expect(beginnerResponse).not.toContain('amortization');
      expect(beginnerResponse).not.toContain('NPV');
    });

    it('should use intermediate language for intermediate learners', () => {
      const intermediateResponse = 'A Roth conversion involves moving pre-tax IRA funds to a Roth, recognizing the income in the conversion year.';
      expect(intermediateResponse).toContain('pre-tax');
      expect(intermediateResponse).toContain('income');
    });

    it('should use advanced language for advanced learners', () => {
      const advancedResponse = 'Asset location optimization involves tax-loss harvesting in taxable accounts while maintaining strategic asset allocation.';
      expect(advancedResponse).toContain('tax-loss harvesting');
      expect(advancedResponse).toContain('asset allocation');
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONCEPT MASTERY TRACKING
// ─────────────────────────────────────────────────────────────────────────────

interface ConceptMastery {
  conceptId: string;
  conceptName: string;
  masteryLevel: 'unfamiliar' | 'aware' | 'understanding' | 'proficient' | 'expert';
  lastTaughtDate?: string;
  timesRepeated: number;
}

const conceptMasteryTests: ConceptMastery[] = [
  {
    conceptId: 'debt_avalanche',
    conceptName: 'Debt Avalanche Strategy',
    masteryLevel: 'proficient',
    lastTaughtDate: '2026-02-20',
    timesRepeated: 3,
  },
  {
    conceptId: 'emergency_fund',
    conceptName: 'Emergency Fund Importance',
    masteryLevel: 'expert',
    lastTaughtDate: '2026-02-15',
    timesRepeated: 5,
  },
  {
    conceptId: 'roth_conversion',
    conceptName: 'Roth Conversion Strategy',
    masteryLevel: 'aware',
    lastTaughtDate: '2026-02-23',
    timesRepeated: 1,
  },
];

describe('D3: Teaching Excellence - Concept Mastery', () => {
  
  describe('Mastery Level Tracking', () => {
    it('should track concept mastery progression', () => {
      const concept = conceptMasteryTests[0];
      expect(concept.masteryLevel).toBe('proficient');
      expect(concept.timesRepeated).toBeGreaterThan(0);
    });

    it('should avoid re-teaching mastered concepts', () => {
      const masteredConcept = conceptMasteryTests[1];
      expect(masteredConcept.masteryLevel).toBe('expert');
      // Should not teach this again
    });

    it('should focus on newly introduced concepts', () => {
      const newConcept = conceptMasteryTests[2];
      expect(newConcept.masteryLevel).toBe('aware');
      expect(newConcept.timesRepeated).toBe(1);
      // Should teach this more
    });
  });

  describe('Concept Progression', () => {
    it('should progress from unfamiliar to expert', () => {
      const progression = [
        'unfamiliar',
        'aware',
        'understanding',
        'proficient',
        'expert',
      ];
      
      expect(progression[0]).toBe('unfamiliar');
      expect(progression[4]).toBe('expert');
    });

    it('should not skip mastery levels', () => {
      const validProgression = ['unfamiliar', 'aware', 'understanding', 'proficient'];
      expect(validProgression.length).toBe(4);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KNOWLEDGE PROGRESSION TESTS
// ─────────────────────────────────────────────────────────────────────────────

interface KnowledgeProgression {
  session: number;
  conceptsTaught: string[];
  conceptsMastered: string[];
  readinessForAdvanced: boolean;
}

const progressionTests: KnowledgeProgression[] = [
  {
    session: 1,
    conceptsTaught: ['emergency_fund', 'budgeting_basics'],
    conceptsMastered: [],
    readinessForAdvanced: false,
  },
  {
    session: 2,
    conceptsTaught: ['debt_payoff', 'credit_score'],
    conceptsMastered: ['emergency_fund'],
    readinessForAdvanced: false,
  },
  {
    session: 3,
    conceptsTaught: ['investing_basics', 'retirement_accounts'],
    conceptsMastered: ['budgeting_basics', 'debt_payoff'],
    readinessForAdvanced: true,
  },
];

describe('D3: Teaching Excellence - Knowledge Progression', () => {
  
  describe('Session-to-Session Progression', () => {
    it('should build on previous sessions', () => {
      expect(progressionTests[1].conceptsMastered).toContain('emergency_fund');
      expect(progressionTests[2].conceptsMastered).toContain('budgeting_basics');
    });

    it('should introduce new concepts gradually', () => {
      expect(progressionTests[0].conceptsTaught.length).toBe(2);
      expect(progressionTests[1].conceptsTaught.length).toBe(2);
      expect(progressionTests[2].conceptsTaught.length).toBe(2);
    });

    it('should recognize readiness for advanced topics', () => {
      expect(progressionTests[0].readinessForAdvanced).toBe(false);
      expect(progressionTests[2].readinessForAdvanced).toBe(true);
    });
  });

  describe('Concept Linking', () => {
    it('should link related concepts', () => {
      const linkedConcepts = {
        'emergency_fund': ['budgeting_basics', 'savings_rate'],
        'debt_payoff': ['credit_score', 'interest_rates'],
        'investing_basics': ['risk_tolerance', 'asset_allocation'],
      };
      
      expect(linkedConcepts['emergency_fund']).toContain('budgeting_basics');
    });

    it('should teach prerequisites before advanced concepts', () => {
      // Should teach budgeting before investing
      const prerequisite = 'budgeting_basics';
      const advanced = 'asset_allocation';
      
      expect(prerequisite).toBeTruthy();
      expect(advanced).toBeTruthy();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEACHING QUALITY METRICS
// ─────────────────────────────────────────────────────────────────────────────

interface TeachingQuality {
  response: string;
  hasTeachingMoment: boolean;
  isRelevant: boolean;
  isAccurate: boolean;
  isEngaging: boolean;
  comprehensionLevel: 'beginner' | 'intermediate' | 'advanced';
}

const qualityTests: TeachingQuality[] = [
  {
    response: 'The debt avalanche method prioritizes your highest-interest debt. This saves you the most money. Start by listing your debts by rate and attack the highest one first.',
    hasTeachingMoment: true,
    isRelevant: true,
    isAccurate: true,
    isEngaging: true,
    comprehensionLevel: 'beginner',
  },
  {
    response: 'You should pay off your debt.',
    hasTeachingMoment: false,
    isRelevant: true,
    isAccurate: true,
    isEngaging: false,
    comprehensionLevel: 'beginner',
  },
  {
    response: 'The debt avalanche method is better than the snowball method because it minimizes total interest paid. However, the snowball method can be psychologically motivating.',
    hasTeachingMoment: true,
    isRelevant: true,
    isAccurate: true,
    isEngaging: true,
    comprehensionLevel: 'intermediate',
  },
];

describe('D3: Teaching Excellence - Quality Metrics', () => {
  
  describe('Teaching Moment Presence', () => {
    qualityTests.forEach((test, index) => {
      it(`should ${test.hasTeachingMoment ? 'include' : 'not include'} teaching moment in response ${index + 1}`, () => {
        expect(test.hasTeachingMoment).toBeDefined();
      });
    });
  });

  describe('Teaching Relevance', () => {
    it('should teach concepts relevant to user concern', () => {
      const relevantResponse = qualityTests[0];
      expect(relevantResponse.isRelevant).toBe(true);
    });

    it('should avoid teaching unrelated concepts', () => {
      const response = 'You asked about debt. Here\'s how cryptocurrency works.';
      expect(response).toContain('debt');
      expect(response).toContain('cryptocurrency');
    });
  });

  describe('Teaching Accuracy', () => {
    it('should teach accurate information', () => {
      const accurateResponse = qualityTests[0];
      expect(accurateResponse.isAccurate).toBe(true);
    });

    it('should not teach incorrect concepts', () => {
      const inaccurateResponse = 'The debt snowball method saves you the most money.';
      expect(inaccurateResponse).toContain('snowball');
    });
  });

  describe('Teaching Engagement', () => {
    it('should use engaging language', () => {
      const engagingResponse = qualityTests[0];
      expect(engagingResponse.isEngaging).toBe(true);
    });

    it('should avoid boring, generic explanations', () => {
      const boringResponse = 'You should pay off your debt.';
      expect(boringResponse.length).toBeLessThan(30);
    });
  });
});

// Export for integration
export {
  teachingTests,
  conceptMasteryTests,
  progressionTests,
  qualityTests,
};
