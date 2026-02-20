import {
  sequenceQuestionsForConcern,
  getNextQuestion,
  shouldSkipQuestion,
  getReasonForQuestion,
  adaptSequencingIfConcernChanges,
} from '../questionSequencingEngine';

describe('Question Sequencing Engine', () => {
  describe('sequenceQuestionsForConcern', () => {
    it('should sequence questions for debt concern', () => {
      const sequence = sequenceQuestionsForConcern('debt_stress');
      expect(sequence.questions.length).toBeGreaterThan(0);
      expect(sequence.questions[0].id).toBe('debt_type');
    });

    it('should sequence questions for savings concern', () => {
      const sequence = sequenceQuestionsForConcern('savings_gap');
      expect(sequence.questions.length).toBeGreaterThan(0);
      expect(sequence.questions[0].id).toBe('current_savings');
    });

    it('should skip irrelevant questions', () => {
      const sequence = sequenceQuestionsForConcern('debt_stress');
      const questionIds = sequence.questions.map(q => q.id);
      expect(questionIds).not.toContain('risk_tolerance');
    });

    it('should prioritize core questions', () => {
      const sequence = sequenceQuestionsForConcern('budgeting_help');
      const coreQuestions = sequence.questions.filter(q => q.category === 'core');
      expect(coreQuestions.length).toBeGreaterThan(0);
      expect(sequence.questions.slice(0, coreQuestions.length)).toEqual(coreQuestions);
    });

    it('should track skipped questions', () => {
      const sequence = sequenceQuestionsForConcern('debt_stress');
      expect(sequence.skippedQuestions.length).toBeGreaterThan(0);
    });

    it('should respect answered questions', () => {
      const answered = new Set(['debt_type', 'debt_amount']);
      const sequence = sequenceQuestionsForConcern('debt_stress', answered);
      const questionIds = sequence.questions.map(q => q.id);
      expect(questionIds).not.toContain('debt_type');
      expect(questionIds).not.toContain('debt_amount');
    });

    it('should provide reasoning', () => {
      const sequence = sequenceQuestionsForConcern('debt_stress');
      expect(sequence.reasoning).toContain('Sequenced');
    });
  });

  describe('getNextQuestion', () => {
    it('should return first unanswered question', () => {
      const question = getNextQuestion('debt_stress');
      expect(question).not.toBeNull();
      expect(question?.id).toBe('debt_type');
    });

    it('should return null when all questions answered', () => {
      const allQuestionIds = new Set([
        'debt_type', 'debt_amount', 'interest_rate', 'monthly_payment',
        'income', 'essentials', 'savings', 'goals',
      ]);
      const question = getNextQuestion('debt_stress', allQuestionIds);
      expect(question).toBeNull();
    });

    it('should skip answered questions', () => {
      const answered = new Set(['debt_type']);
      const question = getNextQuestion('debt_stress', answered);
      expect(question?.id).not.toBe('debt_type');
    });

    it('should return different question for different concerns', () => {
      const debtQuestion = getNextQuestion('debt_stress');
      const savingsQuestion = getNextQuestion('savings_gap');
      expect(debtQuestion?.id).not.toBe(savingsQuestion?.id);
    });
  });

  describe('shouldSkipQuestion', () => {
    it('should skip irrelevant questions', () => {
      const shouldSkip = shouldSkipQuestion('risk_tolerance', 'debt_stress');
      expect(shouldSkip).toBe(true);
    });

    it('should not skip relevant questions', () => {
      const shouldSkip = shouldSkipQuestion('debt_type', 'debt_stress');
      expect(shouldSkip).toBe(false);
    });

    it('should handle unknown questions', () => {
      const shouldSkip = shouldSkipQuestion('unknown_question', 'debt_stress');
      expect(shouldSkip).toBe(false);
    });
  });

  describe('getReasonForQuestion', () => {
    it('should provide reason for debt questions', () => {
      const reason = getReasonForQuestion('debt_type', 'debt_stress');
      expect(reason).toContain('understand');
      expect(reason.length).toBeGreaterThan(10);
    });

    it('should provide reason for savings questions', () => {
      const reason = getReasonForQuestion('current_savings', 'savings_gap');
      expect(reason).toContain('where');
    });

    it('should provide reason for income questions', () => {
      const reason = getReasonForQuestion('income', 'budgeting_help');
      expect(reason).toContain('foundation');
    });

    it('should provide default reason for unknown context', () => {
      const reason = getReasonForQuestion('unknown_question', 'debt_stress');
      expect(reason).toContain('understand');
    });
  });

  describe('adaptSequencingIfConcernChanges', () => {
    it('should resequence questions when concern changes', () => {
      const oldSequence = sequenceQuestionsForConcern('debt_stress');
      const newSequence = adaptSequencingIfConcernChanges('debt_stress', 'savings_gap', new Set());
      
      expect(newSequence.questions[0].id).not.toBe(oldSequence.questions[0].id);
    });

    it('should mention concern shift in reasoning', () => {
      const result = adaptSequencingIfConcernChanges('debt_stress', 'savings_gap', new Set());
      expect(result.reasoning).toContain('shifted');
    });

    it('should preserve answered questions', () => {
      const answered = new Set(['debt_type']);
      const result = adaptSequencingIfConcernChanges('debt_stress', 'savings_gap', answered);
      const questionIds = result.questions.map(q => q.id);
      expect(questionIds).not.toContain('debt_type');
    });

    it('should handle multiple concern changes', () => {
      const result1 = adaptSequencingIfConcernChanges('debt_stress', 'savings_gap', new Set());
      const result2 = adaptSequencingIfConcernChanges('savings_gap', 'investing_interest', new Set());
      
      expect(result1.questions[0].id).not.toBe(result2.questions[0].id);
    });
  });
});
