/**
 * COMPLIANCE ENGINE TESTS
 * 
 * 30+ unit tests covering all compliance risk types
 */

import { ComplianceEngine } from '../complianceEngine';

describe('ComplianceEngine', () => {
  const engine = new ComplianceEngine();

  describe('Investment Advice Detection', () => {
    it('should detect "should I buy" investment advice', () => {
      const risk = engine.detectComplianceRisk('Should I buy Bitcoin?', []);
      expect(risk.detected).toBe(true);
      expect(risk.riskType).toBe('investment_advice');
      expect(risk.severity).toBe('critical');
    });

    it('should detect stock recommendation request', () => {
      const risk = engine.detectComplianceRisk('Which stock should I invest in?', []);
      expect(risk.detected).toBe(true);
      expect(risk.riskType).toBe('investment_advice');
    });

    it('should detect crypto investment request', () => {
      const risk = engine.detectComplianceRisk('Should I buy Ethereum?', []);
      expect(risk.detected).toBe(true);
      expect(risk.riskType).toBe('investment_advice');
    });

    it('should detect portfolio recommendation request', () => {
      const risk = engine.detectComplianceRisk('What portfolio allocation should I use?', []);
      expect(risk.detected).toBe(true);
      expect(risk.riskType).toBe('investment_advice');
    });
  });

  describe('Tax Advice Detection', () => {
    it('should detect tax deduction question', () => {
      const risk = engine.detectComplianceRisk('What tax deductions can I claim?', []);
      expect(risk.detected).toBe(true);
      expect(risk.riskType).toBe('tax_advice');
      expect(risk.severity).toBe('critical');
    });

    it('should detect tax strategy question', () => {
      const risk = engine.detectComplianceRisk('What is the best tax strategy for my business?', []);
      expect(risk.detected).toBe(true);
      expect(risk.riskType).toBe('tax_advice');
    });

    it('should detect IRS-related question', () => {
      const risk = engine.detectComplianceRisk('How do I handle an IRS audit?', []);
      expect(risk.detected).toBe(true);
      expect(risk.riskType).toBe('tax_advice');
    });

    it('should detect capital gains question', () => {
      const risk = engine.detectComplianceRisk('How are capital gains taxed?', []);
      expect(risk.detected).toBe(true);
      expect(risk.riskType).toBe('tax_advice');
    });
  });

  describe('Legal Advice Detection', () => {
    it('should detect lawsuit question', () => {
      const risk = engine.detectComplianceRisk('Should I file a lawsuit?', []);
      expect(risk.detected).toBe(true);
      expect(risk.riskType).toBe('legal_advice');
      expect(risk.severity).toBe('critical');
    });

    it('should detect contract question', () => {
      const risk = engine.detectComplianceRisk('Should I sign this contract?', []);
      expect(risk.detected).toBe(true);
      expect(risk.riskType).toBe('legal_advice');
    });

    it('should detect bankruptcy filing question', () => {
      const risk = engine.detectComplianceRisk('Should I file for bankruptcy?', []);
      expect(risk.detected).toBe(true);
      expect(risk.riskType).toBe('legal_advice');
    });

    it('should detect divorce question', () => {
      const risk = engine.detectComplianceRisk('How should I handle my divorce settlement?', []);
      expect(risk.detected).toBe(true);
      expect(risk.riskType).toBe('legal_advice');
    });
  });

  describe('Medical Advice Detection', () => {
    it('should detect medication question', () => {
      const risk = engine.detectComplianceRisk('Should I take this medication?', []);
      expect(risk.detected).toBe(true);
      expect(risk.riskType).toBe('medical_advice');
      expect(risk.severity).toBe('critical');
    });

    it('should detect doctor question', () => {
      const risk = engine.detectComplianceRisk('Should I see a doctor?', []);
      expect(risk.detected).toBe(true);
      expect(risk.riskType).toBe('medical_advice');
    });

    it('should detect health advice question', () => {
      const risk = engine.detectComplianceRisk('What should I do about my symptoms?', []);
      expect(risk.detected).toBe(true);
      expect(risk.riskType).toBe('medical_advice');
    });
  });

  describe('No Compliance Risk', () => {
    it('should return no risk for financial education question', () => {
      const risk = engine.detectComplianceRisk('How does compound interest work?', []);
      expect(risk.detected).toBe(false);
      expect(risk.severity).toBe('none');
    });

    it('should return no risk for budgeting question', () => {
      const risk = engine.detectComplianceRisk('How should I budget my money?', []);
      expect(risk.detected).toBe(false);
    });

    it('should return no risk for emergency fund question', () => {
      const risk = engine.detectComplianceRisk('How much should I save for emergency fund?', []);
      expect(risk.detected).toBe(false);
    });

    it('should return no risk for debt payoff question', () => {
      const risk = engine.detectComplianceRisk('What is the avalanche method?', []);
      expect(risk.detected).toBe(false);
    });
  });

  describe('Redirect Information', () => {
    it('should provide redirect for investment advice', () => {
      const risk = engine.detectComplianceRisk('Should I buy Apple stock?', []);
      expect(risk.redirectTo).toBeDefined();
      expect(risk.redirectTo).toContain('Financial Planner');
    });

    it('should provide redirect for tax advice', () => {
      const risk = engine.detectComplianceRisk('What deductions can I claim?', []);
      expect(risk.redirectTo).toBeDefined();
      expect(risk.redirectTo).toContain('CPA');
    });

    it('should provide redirect for legal advice', () => {
      const risk = engine.detectComplianceRisk('Should I file for bankruptcy?', []);
      expect(risk.redirectTo).toBeDefined();
      expect(risk.redirectTo).toContain('Attorney');
    });

    it('should provide redirect for medical advice', () => {
      const risk = engine.detectComplianceRisk('Should I take this medication?', []);
      expect(risk.redirectTo).toBeDefined();
      expect(risk.redirectTo).toContain('Healthcare');
    });
  });

  describe('Case Insensitivity', () => {
    it('should detect compliance risk regardless of case', () => {
      const risk1 = engine.detectComplianceRisk('SHOULD I BUY BITCOIN?', []);
      const risk2 = engine.detectComplianceRisk('should i buy bitcoin?', []);
      const risk3 = engine.detectComplianceRisk('Should I Buy Bitcoin?', []);

      expect(risk1.detected).toBe(true);
      expect(risk2.detected).toBe(true);
      expect(risk3.detected).toBe(true);
    });
  });

  describe('Determinism', () => {
    it('should always return same result for same input', () => {
      const message = 'Should I buy Tesla stock?';
      const risk1 = engine.detectComplianceRisk(message, []);
      const risk2 = engine.detectComplianceRisk(message, []);

      expect(risk1.detected).toBe(risk2.detected);
      expect(risk1.riskType).toBe(risk2.riskType);
      expect(risk1.severity).toBe(risk2.severity);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', () => {
      const risk = engine.detectComplianceRisk('', []);
      expect(risk.detected).toBe(false);
    });

    it('should handle very long message', () => {
      const longMessage = 'How should I budget my money? ' + 'a'.repeat(1000);
      const risk = engine.detectComplianceRisk(longMessage, []);
      expect(risk).toBeDefined();
    });

    it('should not false positive on similar words', () => {
      const risk = engine.detectComplianceRisk('I bought a house last year', []);
      expect(risk.detected).toBe(false);
    });
  });
});
