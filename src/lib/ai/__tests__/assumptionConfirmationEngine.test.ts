import {
  detectAssumptions,
  generateConfirmationPrompt,
  processAssumptionResponse,
  updateAssumptionsBasedOnResponse,
  shouldApologizeForMisunderstanding,
  generateApology,
} from '../assumptionConfirmationEngine';

describe('Assumption Confirmation Engine', () => {
  describe('detectAssumptions', () => {
    it('should detect debt priority assumption', () => {
      const analysis = detectAssumptions('debt_stress', { totalDebt: 20000 }, []);
      expect(analysis.assumptions.length).toBeGreaterThan(0);
      expect(analysis.assumptions.some(a => a.id === 'debt_priority')).toBe(true);
    });

    it('should detect savings priority assumption', () => {
      const analysis = detectAssumptions('savings_gap', { currentSavings: 5000, savingsGoal: 20000 }, []);
      expect(analysis.assumptions.some(a => a.id === 'savings_priority')).toBe(true);
    });

    it('should detect expense concern assumption', () => {
      const analysis = detectAssumptions('budgeting_help', {}, []);
      expect(analysis.assumptions.some(a => a.id === 'expense_concern')).toBe(true);
    });

    it('should detect investing priority assumption', () => {
      const analysis = detectAssumptions('investing_interest', {}, []);
      expect(analysis.assumptions.some(a => a.id === 'investing_priority')).toBe(true);
    });

    it('should detect income priority assumption', () => {
      const analysis = detectAssumptions('income_growth', {}, []);
      expect(analysis.assumptions.some(a => a.id === 'income_priority')).toBe(true);
    });

    it('should detect emergency fund priority assumption', () => {
      const analysis = detectAssumptions('emergency_fund', {}, []);
      expect(analysis.assumptions.some(a => a.id === 'emergency_fund_priority')).toBe(true);
    });

    it('should identify primary assumption', () => {
      const analysis = detectAssumptions('debt_stress', { totalDebt: 20000 }, []);
      expect(analysis.primaryAssumption).not.toBeNull();
      expect(analysis.primaryAssumption?.confidence).toBeGreaterThan(0);
    });

    it('should determine if confirmation is needed', () => {
      const analysis = detectAssumptions('debt_stress', { totalDebt: 20000 }, []);
      expect(analysis.shouldConfirm).toBe(true);
    });

    it('should provide reasoning for assumptions', () => {
      const analysis = detectAssumptions('debt_stress', { totalDebt: 20000 }, []);
      expect(analysis.reasoning).toContain('assuming');
    });
  });

  describe('generateConfirmationPrompt', () => {
    it('should generate conversational confirmation prompt', () => {
      const assumption = {
        id: 'debt_priority',
        assumption: 'Your main priority is paying off debt',
        confidence: 0.8,
        basedOn: ['You mentioned debt'],
        confirmationQuestion: 'Is paying off debt your main priority?',
      };
      const prompt = generateConfirmationPrompt(assumption);
      expect(prompt).toContain('sounds like');
      expect(prompt).toContain('paying off debt');
      expect(prompt).toContain('?');
    });
  });

  describe('processAssumptionResponse', () => {
    it('should confirm assumption with affirmative response', () => {
      const assumption = {
        id: 'debt_priority',
        assumption: 'Your main priority is paying off debt',
        confidence: 0.8,
        basedOn: ['You mentioned debt'],
        confirmationQuestion: 'Is this your priority?',
      };
      const result = processAssumptionResponse(assumption, 'Yes, that\'s right');
      expect(result.confirmed).toBe(true);
    });

    it('should reject assumption with negative response', () => {
      const assumption = {
        id: 'debt_priority',
        assumption: 'Your main priority is paying off debt',
        confidence: 0.8,
        basedOn: ['You mentioned debt'],
        confirmationQuestion: 'Is this your priority?',
      };
      const result = processAssumptionResponse(assumption, 'No, not really');
      expect(result.confirmed).toBe(false);
    });

    it('should extract new priority from response', () => {
      const assumption = {
        id: 'debt_priority',
        assumption: 'Your main priority is paying off debt',
        confidence: 0.8,
        basedOn: ['You mentioned debt'],
        confirmationQuestion: 'Is this your priority?',
      };
      const result = processAssumptionResponse(assumption, 'Actually, I want to focus on investing');
      expect(result.newPriority).toBe('investing');
    });

    it('should handle unclear responses', () => {
      const assumption = {
        id: 'debt_priority',
        assumption: 'Your main priority is paying off debt',
        confidence: 0.8,
        basedOn: ['You mentioned debt'],
        confirmationQuestion: 'Is this your priority?',
      };
      const result = processAssumptionResponse(assumption, 'Maybe, I\'m not sure');
      expect(result.confirmed).toBe(false);
    });
  });

  describe('updateAssumptionsBasedOnResponse', () => {
    it('should reduce confidence of contradicted assumptions', () => {
      const assumptions = [
        {
          id: 'debt_priority',
          assumption: 'Your main priority is paying off debt',
          confidence: 0.8,
          basedOn: ['You mentioned debt'],
          confirmationQuestion: 'Is this your priority?',
        },
      ];
      const updated = updateAssumptionsBasedOnResponse(assumptions, 'No, I want to invest');
      expect(updated[0].confidence).toBeLessThan(0.8);
    });

    it('should maintain confidence of confirmed assumptions', () => {
      const assumptions = [
        {
          id: 'debt_priority',
          assumption: 'Your main priority is paying off debt',
          confidence: 0.8,
          basedOn: ['You mentioned debt'],
          confirmationQuestion: 'Is this your priority?',
        },
      ];
      const updated = updateAssumptionsBasedOnResponse(assumptions, 'Yes, exactly');
      expect(updated[0].confidence).toBe(0.8);
    });
  });

  describe('shouldApologizeForMisunderstanding', () => {
    it('should apologize for high-confidence misunderstandings', () => {
      const assumption = {
        id: 'debt_priority',
        assumption: 'Your main priority is paying off debt',
        confidence: 0.85,
        basedOn: ['You mentioned debt'],
        confirmationQuestion: 'Is this your priority?',
      };
      expect(shouldApologizeForMisunderstanding(assumption, false)).toBe(true);
    });

    it('should not apologize for low-confidence misunderstandings', () => {
      const assumption = {
        id: 'debt_priority',
        assumption: 'Your main priority is paying off debt',
        confidence: 0.6,
        basedOn: ['You mentioned debt'],
        confirmationQuestion: 'Is this your priority?',
      };
      expect(shouldApologizeForMisunderstanding(assumption, false)).toBe(false);
    });

    it('should not apologize for confirmed assumptions', () => {
      const assumption = {
        id: 'debt_priority',
        assumption: 'Your main priority is paying off debt',
        confidence: 0.85,
        basedOn: ['You mentioned debt'],
        confirmationQuestion: 'Is this your priority?',
      };
      expect(shouldApologizeForMisunderstanding(assumption, true)).toBe(false);
    });
  });

  describe('generateApology', () => {
    it('should generate sincere apology', () => {
      const assumption = {
        id: 'debt_priority',
        assumption: 'Your main priority is paying off debt',
        confidence: 0.85,
        basedOn: ['You mentioned debt'],
        confirmationQuestion: 'Is this your priority?',
      };
      const apology = generateApology(assumption);
      expect(apology).toContain('apologize');
      expect(apology).toContain('misunderstanding');
      expect(apology).toContain('paying off debt');
    });
  });
});
