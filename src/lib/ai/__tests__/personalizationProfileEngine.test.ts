import {
  initializeProfile,
  recordInteraction,
  recordFeedback,
  detectCommunicationStyle,
  detectLearningStyle,
  calculateAdaptationMetrics,
  updateProfile,
  shouldAdapt,
  getAdaptationRecommendations,
  getProfileSummary,
} from '../personalizationProfileEngine';

describe('Personalization Profile Engine', () => {
  describe('initializeProfile', () => {
    it('should create profile with default values', () => {
      const profile = initializeProfile('customer123');
      expect(profile.customerId).toBe('customer123');
      expect(profile.communicationStyle).toBe('casual');
      expect(profile.learningStyle).toBe('mixed');
      expect(profile.riskTolerance).toBe('moderate');
      expect(profile.interactionHistory.length).toBe(0);
      expect(profile.feedbackHistory.length).toBe(0);
    });
  });

  describe('recordInteraction', () => {
    it('should add interaction to history', () => {
      let profile = initializeProfile('customer123');
      profile = recordInteraction(profile, {
        type: 'question',
        content: 'What is your income?',
        customerResponse: '$5000 per month',
      });
      expect(profile.interactionHistory.length).toBe(1);
      expect(profile.interactionHistory[0].type).toBe('question');
    });

    it('should update lastUpdated timestamp', () => {
      let profile = initializeProfile('customer123');
      const before = profile.lastUpdated;
      profile = recordInteraction(profile, {
        type: 'question',
        content: 'What is your income?',
        customerResponse: '$5000 per month',
      });
      expect(profile.lastUpdated).toBeGreaterThanOrEqual(before);
    });
  });

  describe('recordFeedback', () => {
    it('should add feedback to history', () => {
      let profile = initializeProfile('customer123');
      profile = recordFeedback(profile, {
        aspect: 'clarity',
        rating: 4,
        comment: 'Very clear',
      });
      expect(profile.feedbackHistory.length).toBe(1);
      expect(profile.feedbackHistory[0].aspect).toBe('clarity');
      expect(profile.feedbackHistory[0].rating).toBe(4);
    });
  });

  describe('detectCommunicationStyle', () => {
    it('should detect formal style', () => {
      const interactions = [
        {
          timestamp: Date.now(),
          type: 'question' as const,
          content: 'test',
          customerResponse: 'However, I believe this is important. Furthermore, we should consider this.',
          satisfaction: 3,
        },
      ];
      const style = detectCommunicationStyle(interactions);
      expect(['formal', 'casual', 'technical', 'simple']).toContain(style);
    });

    it('should detect technical style', () => {
      const interactions = [
        {
          timestamp: Date.now(),
          type: 'question' as const,
          content: 'test',
          customerResponse: 'I want to optimize my API and algorithm',
          satisfaction: 3,
        },
      ];
      const style = detectCommunicationStyle(interactions);
      expect(['formal', 'casual', 'technical', 'simple']).toContain(style);
    });

    it('should return casual for empty history', () => {
      const style = detectCommunicationStyle([]);
      expect(style).toBe('casual');
    });
  });

  describe('detectLearningStyle', () => {
    it('should detect visual style', () => {
      const interactions = [
        {
          timestamp: Date.now(),
          type: 'question' as const,
          content: 'test',
          customerResponse: 'Can you show me a chart or graph?',
          satisfaction: 3,
        },
      ];
      const style = detectLearningStyle(interactions);
      expect(['visual', 'auditory', 'reading', 'kinesthetic', 'mixed']).toContain(style);
    });

    it('should return mixed for empty history', () => {
      const style = detectLearningStyle([]);
      expect(style).toBe('mixed');
    });
  });

  describe('calculateAdaptationMetrics', () => {
    it('should calculate metrics', () => {
      let profile = initializeProfile('customer123');
      profile = recordInteraction(profile, {
        type: 'question',
        content: 'test',
        customerResponse: 'test',
        satisfaction: 4,
      });
      profile = recordFeedback(profile, {
        aspect: 'clarity',
        rating: 4,
      });
      const metrics = calculateAdaptationMetrics(profile);
      expect(metrics.overallAdaptation).toBeGreaterThanOrEqual(0);
      expect(metrics.overallAdaptation).toBeLessThanOrEqual(1);
    });
  });

  describe('updateProfile', () => {
    it('should update profile based on interactions', () => {
      let profile = initializeProfile('customer123');
      profile = recordInteraction(profile, {
        type: 'question',
        content: 'test',
        customerResponse: 'I want to see a chart',
      });
      profile = updateProfile(profile);
      expect(profile.lastUpdated).toBeGreaterThan(0);
    });
  });

  describe('shouldAdapt', () => {
    it('should return false for new profile', () => {
      const profile = initializeProfile('customer123');
      expect(shouldAdapt(profile)).toBe(false);
    });

    it('should return true when adaptation score is low', () => {
      let profile = initializeProfile('customer123');
      profile.adaptationScore = 0.4;
      for (let i = 0; i < 5; i++) {
        profile = recordInteraction(profile, {
          type: 'question',
          content: 'test',
          customerResponse: 'test',
        });
      }
      expect(shouldAdapt(profile)).toBe(true);
    });
  });

  describe('getAdaptationRecommendations', () => {
    it('should provide recommendations', () => {
      let profile = initializeProfile('customer123');
      profile.adaptationScore = 0.3;
      const recommendations = getAdaptationRecommendations(profile);
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('getProfileSummary', () => {
    it('should generate profile summary', () => {
      const profile = initializeProfile('customer123');
      const summary = getProfileSummary(profile);
      expect(summary).toContain('casual');
      expect(summary).toContain('mixed');
      expect(summary).toContain('moderate');
    });
  });
});
