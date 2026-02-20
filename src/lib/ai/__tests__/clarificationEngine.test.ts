import {
  detectAmbiguity,
  generateClarifyingQuestions,
  shouldAskClarifyingQuestion,
  clarifyAnswer,
  calculateClarificationRate,
  trackClarificationAccuracy,
} from '../clarificationEngine';

describe('Clarification Engine', () => {
  describe('detectAmbiguity', () => {
    it('should detect vague language', () => {
      const result = detectAmbiguity('I have some debt');
      expect(result.isAmbiguous).toBe(true);
      expect(result.ambiguityType).toBe('vague');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect ranges', () => {
      const result = detectAmbiguity('I make between 3000 and 5000 a month');
      expect(result.isAmbiguous).toBe(true);
      expect(result.ambiguityType).toBe('range');
    });

    it('should detect multiple interpretations', () => {
      const result = detectAmbiguity('I have credit cards or student loans');
      expect(result.isAmbiguous).toBe(true);
      expect(result.ambiguityType).toBe('multiple_interpretations');
    });

    it('should detect incomplete answers', () => {
      const result = detectAmbiguity('I spend money on rent, food, and stuff');
      expect(result.isAmbiguous).toBe(true);
      expect(result.ambiguityType).toBe('incomplete');
    });

    it('should detect unclear units', () => {
      const result = detectAmbiguity('I have 50k in savings');
      expect(result.isAmbiguous).toBe(true);
      expect(result.ambiguityType).toBe('unclear_unit');
    });

    it('should recognize clear answers', () => {
      const result = detectAmbiguity('$4000 per month');
      expect(result.isAmbiguous).toBe(false);
      expect(result.ambiguityType).toBe('none');
      expect(result.confidence).toBeLessThanOrEqual(0.5);
    });

    it('should provide clarifying questions', () => {
      const result = detectAmbiguity('I have some debt');
      expect(result.clarifyingQuestions.length).toBeGreaterThan(0);
      expect(result.clarifyingQuestions[0]).toContain('?');
    });

    it('should provide reasoning', () => {
      const result = detectAmbiguity('I have some debt');
      expect(result.reasoning).toContain('Detected');
    });
  });

  describe('generateClarifyingQuestions', () => {
    it('should generate income-specific clarifying questions', () => {
      const questions = generateClarifyingQuestions('around 4k', 'What is your monthly income?');
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.some(q => q.toLowerCase().includes('monthly') || q.toLowerCase().includes('annual'))).toBe(true);
    });

    it('should generate debt-specific clarifying questions', () => {
      const questions = generateClarifyingQuestions('I have some debt', 'What kind of debt do you have?');
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.some(q => q.toLowerCase().includes('type'))).toBe(true);
    });

    it('should generate savings-specific clarifying questions', () => {
      const questions = generateClarifyingQuestions('between 5k and 10k', 'How much do you have in savings?');
      expect(questions.length).toBeGreaterThan(0);
    });

    it('should return empty array for clear answers', () => {
      const questions = generateClarifyingQuestions('$4000 per month');
      expect(questions.length).toBe(0);
    });

    it('should limit to 3 questions', () => {
      const questions = generateClarifyingQuestions('some kind of debt or maybe savings, etc.');
      expect(questions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('shouldAskClarifyingQuestion', () => {
    it('should return true for ambiguous answers above threshold', () => {
      const result = shouldAskClarifyingQuestion('I have some debt', 0.5);
      expect(result).toBe(true);
    });

    it('should return false for clear answers', () => {
      const result = shouldAskClarifyingQuestion('I have $20000 in credit card debt', 0.5);
      expect(result).toBe(false);
    });

    it('should respect confidence threshold', () => {
      const result = shouldAskClarifyingQuestion('I have some debt', 0.9);
      expect(result).toBe(false);
    });
  });

  describe('clarifyAnswer', () => {
    it('should add unit clarification', () => {
      const clarified = clarifyAnswer('50k', { unit: 'dollars' });
      expect(clarified).toContain('50k');
      expect(clarified).toContain('dollars');
    });

    it('should replace with specific value', () => {
      const clarified = clarifyAnswer('around 4k', { specificity: '$4000' });
      expect(clarified).toBe('$4000');
    });

    it('should add type clarification', () => {
      const clarified = clarifyAnswer('I have debt', { type: 'credit cards' });
      expect(clarified).toContain('debt');
      expect(clarified).toContain('credit cards');
    });

    it('should handle multiple clarifications', () => {
      const clarified = clarifyAnswer('some debt', { type: 'credit cards' });
      expect(clarified).toContain('some debt');
      expect(clarified).toContain('credit cards');
    });
  });

  describe('calculateClarificationRate', () => {
    it('should calculate rate for ambiguous answers', () => {
      const answers = ['I have some debt', 'I make $4000 a month', 'around 5k in savings'];
      const rate = calculateClarificationRate(answers);
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThanOrEqual(1);
    });

    it('should return 0 for clear answers', () => {
      const answers = ['I have $20000 in debt', 'I make $4000 a month', 'I have $5000 in savings'];
      const rate = calculateClarificationRate(answers);
      expect(rate).toBeLessThanOrEqual(0.5);
    });

    it('should return 1 for all ambiguous answers', () => {
      const answers = ['some debt', 'around 4k', 'kind of savings'];
      const rate = calculateClarificationRate(answers);
      expect(rate).toBe(1);
    });

    it('should handle empty array', () => {
      const rate = calculateClarificationRate([]);
      expect(rate).toBe(0);
    });
  });

  describe('trackClarificationAccuracy', () => {
    it('should track accurate clarifications', () => {
      const result = trackClarificationAccuracy('around 4k', '$4000', true);
      expect(result.accuracy).toBe(1);
      expect(result.improvement).toBeGreaterThanOrEqual(0);
    });

    it('should track inaccurate clarifications', () => {
      const result = trackClarificationAccuracy('around 4k', '$8000', false);
      expect(result.accuracy).toBe(0);
    });

    it('should measure improvement in clarity', () => {
      const result = trackClarificationAccuracy('some debt', '$20000 in credit card debt', true);
      expect(result.improvement).toBeGreaterThan(0);
    });

    it('should not have negative improvement', () => {
      const result = trackClarificationAccuracy('$4000', 'around 4k', true);
      expect(result.improvement).toBeGreaterThanOrEqual(0);
    });
  });
});
