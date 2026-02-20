import {
  initializeModel,
  predictDebtPayoff,
  predictSavingsGrowth,
  detectAnomalies,
  generateContextualRecommendation,
  updateModelAccuracy,
} from '../predictiveModelingEngine';

describe('Predictive Modeling Engine', () => {
  describe('initializeModel', () => {
    it('should create model with default values', () => {
      const model = initializeModel('model1', 'debt_payoff');
      expect(model.modelId).toBe('model1');
      expect(model.type).toBe('debt_payoff');
      expect(model.accuracy).toBe(0.5);
      expect(model.predictions.length).toBe(0);
    });
  });

  describe('predictDebtPayoff', () => {
    it('should predict debt payoff timeline', () => {
      const predictions = predictDebtPayoff(20000, 500, 10);
      expect(predictions.length).toBeGreaterThan(0);
      expect(predictions[0].value).toBeGreaterThan(0);
      expect(predictions[0].confidence).toBeGreaterThan(0.7);
    });

    it('should handle zero payment', () => {
      const predictions = predictDebtPayoff(20000, 0, 10);
      expect(predictions.length).toBeGreaterThan(0);
    });
  });

  describe('predictSavingsGrowth', () => {
    it('should predict savings growth', () => {
      const predictions = predictSavingsGrowth(10000, 500, 7);
      expect(predictions.length).toBeGreaterThan(0);
      expect(predictions[0].value).toBeGreaterThan(10000);
    });

    it('should have decreasing confidence over time', () => {
      const predictions = predictSavingsGrowth(10000, 500, 7);
      if (predictions.length > 1) {
        expect(predictions[0].confidence).toBeGreaterThan(predictions[predictions.length - 1].confidence);
      }
    });
  });

  describe('detectAnomalies', () => {
    it('should detect high anomalies', () => {
      const anomalies = detectAnomalies(5000, 1000, 500);
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].severity).toBe('high');
    });

    it('should not detect normal values', () => {
      const anomalies = detectAnomalies(1100, 1000, 500);
      expect(anomalies.length).toBe(0);
    });
  });

  describe('generateContextualRecommendation', () => {
    it('should generate recommendation', () => {
      const prediction = {
        timeframe: '5 years',
        value: 50000,
        confidence: 0.85,
        reasoning: 'Test prediction',
      };
      const rec = generateContextualRecommendation('debt', prediction, []);
      expect(rec).toContain('prediction');
    });
  });

  describe('updateModelAccuracy', () => {
    it('should update accuracy based on prediction error', () => {
      let model = initializeModel('model1', 'debt_payoff');
      const originalAccuracy = model.accuracy;
      model = updateModelAccuracy(model, 100, 110);
      expect(model.accuracy).not.toBe(originalAccuracy);
    });
  });
});
