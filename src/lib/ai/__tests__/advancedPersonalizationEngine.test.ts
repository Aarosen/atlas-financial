import {
  initializePersonalization,
  getCommunicationTemplate,
  generateLearningContent,
  alignRecommendationToRisk,
  personalizeMessage,
  getPersonalizationSummary,
} from '../advancedPersonalizationEngine';

describe('Advanced Personalization Engine', () => {
  describe('initializePersonalization', () => {
    it('should create default settings', () => {
      const settings = initializePersonalization();
      expect(settings.communicationStyle).toBe('casual');
      expect(settings.riskTolerance).toBe('moderate');
      expect(settings.goalAlignment).toEqual([]);
    });
  });

  describe('getCommunicationTemplate', () => {
    it('should return formal template', () => {
      const template = getCommunicationTemplate('formal');
      expect(template.style).toBe('formal');
      expect(template.greeting).toContain('well');
    });

    it('should return casual template', () => {
      const template = getCommunicationTemplate('casual');
      expect(template.style).toBe('casual');
      expect(template.greeting).toContain('Hey');
    });
  });

  describe('generateLearningContent', () => {
    it('should generate visual content', () => {
      const content = generateLearningContent('visual', 'Budgeting');
      expect(content.type).toBe('visual');
      expect(content.format).toBe('infographic');
    });

    it('should generate reading content', () => {
      const content = generateLearningContent('reading', 'Investing');
      expect(content.type).toBe('reading');
      expect(content.format).toBe('article');
    });
  });

  describe('alignRecommendationToRisk', () => {
    it('should align to conservative risk', () => {
      const aligned = alignRecommendationToRisk('Invest in stocks', 'conservative', []);
      expect(aligned).toContain('cautious');
    });

    it('should include goals in recommendation', () => {
      const aligned = alignRecommendationToRisk('Save money', 'moderate', ['retirement', 'emergency fund']);
      expect(aligned).toContain('retirement');
    });
  });

  describe('personalizeMessage', () => {
    it('should personalize message', () => {
      const settings = initializePersonalization();
      const message = personalizeMessage('This is important', settings);
      expect(message).toContain('Hey');
      expect(message).toContain('important');
    });
  });

  describe('getPersonalizationSummary', () => {
    it('should provide summary', () => {
      const settings = initializePersonalization();
      const summary = getPersonalizationSummary(settings);
      expect(summary).toContain('casual');
      expect(summary).toContain('moderate');
    });
  });
});
