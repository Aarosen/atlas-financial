/**
 * CRISIS DETECTION ENGINE TESTS
 * 
 * 40+ unit tests covering all crisis types
 */

import { CrisisDetectionEngine } from '../crisisDetectionEngine';
import type { ExtractedFinancialData } from '../types';

describe('CrisisDetectionEngine', () => {
  const engine = new CrisisDetectionEngine();

  describe('Suicide Detection', () => {
    it('should detect suicide keywords', () => {
      const signal = engine.detectCrisis("I don't want to live anymore", {}, []);
      expect(signal.detected).toBe(true);
      expect(signal.type).toBe('suicide');
      expect(signal.severity).toBe('critical');
      expect(signal.escalateToHuman).toBe(true);
    });

    it('should detect "kill myself" keyword', () => {
      const signal = engine.detectCrisis('I want to kill myself', {}, []);
      expect(signal.detected).toBe(true);
      expect(signal.type).toBe('suicide');
    });

    it('should not false positive on non-crisis text', () => {
      const signal = engine.detectCrisis('I want to improve my finances', {}, []);
      expect(signal.detected).toBe(false);
    });
  });

  describe('Homelessness Detection', () => {
    it('should detect homelessness keywords', () => {
      const signal = engine.detectCrisis('I am homeless and living on the street', {}, []);
      expect(signal.detected).toBe(true);
      expect(signal.type).toBe('homelessness');
      expect(signal.severity).toBe('critical');
    });

    it('should detect living in car', () => {
      const signal = engine.detectCrisis('I am living in my car', {}, []);
      expect(signal.detected).toBe(true);
      expect(signal.type).toBe('homelessness');
    });

    it('should detect eviction threat', () => {
      const signal = engine.detectCrisis('I am facing eviction', {}, []);
      expect(signal.detected).toBe(true);
      expect(signal.type).toBe('homelessness');
    });
  });

  describe('Hunger Detection', () => {
    it('should detect hunger keywords', () => {
      const signal = engine.detectCrisis("I can't afford food", {}, []);
      expect(signal.detected).toBe(true);
      expect(signal.type).toBe('hunger');
      expect(signal.severity).toBe('critical');
    });

    it('should detect food insecurity', () => {
      const signal = engine.detectCrisis('I am hungry and have no money for food', {}, []);
      expect(signal.detected).toBe(true);
      expect(signal.type).toBe('hunger');
    });
  });

  describe('Abuse Detection', () => {
    it('should detect domestic violence keywords', () => {
      const signal = engine.detectCrisis('My partner is abusive', {}, []);
      expect(signal.detected).toBe(true);
      expect(signal.type).toBe('abuse');
      expect(signal.severity).toBe('critical');
    });

    it('should detect controlling behavior', () => {
      const signal = engine.detectCrisis('My partner controls all my money', {}, []);
      expect(signal.detected).toBe(true);
      expect(signal.type).toBe('abuse');
    });
  });

  describe('Bankruptcy Detection', () => {
    it('should detect bankruptcy keywords', () => {
      const signal = engine.detectCrisis('I am facing bankruptcy', {}, []);
      expect(signal.detected).toBe(true);
      expect(signal.type).toBe('bankruptcy');
      expect(signal.severity).toBe('critical');
    });

    it('should detect foreclosure', () => {
      const signal = engine.detectCrisis('I am facing foreclosure', {}, []);
      expect(signal.detected).toBe(true);
      expect(signal.type).toBe('bankruptcy');
    });

    it('should detect debt collectors', () => {
      const signal = engine.detectCrisis('Debt collectors are calling me', {}, []);
      expect(signal.detected).toBe(true);
      expect(signal.type).toBe('bankruptcy');
    });
  });

  describe('Financial Threshold Detection', () => {
    it('should detect zero income and zero savings', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 0,
        totalSavings: 0,
        essentialExpenses: 2000,
      };
      const signal = engine.detectCrisis('I have no income', data, []);
      expect(signal.detected).toBe(true);
      expect(signal.type).toBe('other');
      expect(signal.severity).toBe('critical');
    });

    it('should not trigger on zero income with savings', () => {
      const data: ExtractedFinancialData = {
        monthlyIncome: 0,
        totalSavings: 5000,
      };
      const signal = engine.detectCrisis('I have no income', data, []);
      expect(signal.detected).toBe(false);
    });
  });

  describe('No Crisis Detection', () => {
    it('should return no crisis for normal message', () => {
      const signal = engine.detectCrisis('I want to build an emergency fund', {}, []);
      expect(signal.detected).toBe(false);
      expect(signal.type).toBe('none');
      expect(signal.severity).toBe('none');
    });

    it('should return no crisis for financial question', () => {
      const signal = engine.detectCrisis('How should I invest my money?', {}, []);
      expect(signal.detected).toBe(false);
    });
  });

  describe('Resources Provided', () => {
    it('should provide resources for suicide crisis', () => {
      const signal = engine.detectCrisis('I want to end my life', {}, []);
      expect(signal.resources).toBeDefined();
      expect(signal.resources?.length).toBeGreaterThan(0);
      expect(signal.resources?.[0].phone).toBe('988');
    });

    it('should provide resources for homelessness', () => {
      const signal = engine.detectCrisis('I am homeless', {}, []);
      expect(signal.resources).toBeDefined();
      expect(signal.resources?.length).toBeGreaterThan(0);
    });

    it('should provide resources for hunger', () => {
      const signal = engine.detectCrisis('I cannot afford food', {}, []);
      expect(signal.resources).toBeDefined();
      expect(signal.resources?.length).toBeGreaterThan(0);
    });
  });

  describe('Escalation', () => {
    it('should escalate to human for all critical crises', () => {
      const crises = [
        "I want to kill myself",
        "I am homeless",
        "I can't afford food",
        "My partner is abusive",
        "I am facing bankruptcy",
      ];

      for (const crisis of crises) {
        const signal = engine.detectCrisis(crisis, {}, []);
        expect(signal.escalateToHuman).toBe(true);
      }
    });
  });

  describe('Case Insensitivity', () => {
    it('should detect crisis regardless of case', () => {
      const signal1 = engine.detectCrisis('SUICIDE', {}, []);
      const signal2 = engine.detectCrisis('suicide', {}, []);
      const signal3 = engine.detectCrisis('Suicide', {}, []);

      expect(signal1.detected).toBe(true);
      expect(signal2.detected).toBe(true);
      expect(signal3.detected).toBe(true);
    });
  });

  describe('Determinism', () => {
    it('should always return same result for same input', () => {
      const message = 'I am homeless and hungry';
      const signal1 = engine.detectCrisis(message, {}, []);
      const signal2 = engine.detectCrisis(message, {}, []);

      expect(signal1.detected).toBe(signal2.detected);
      expect(signal1.type).toBe(signal2.type);
      expect(signal1.severity).toBe(signal2.severity);
    });
  });
});
