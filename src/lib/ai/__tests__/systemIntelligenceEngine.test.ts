import {
  initializeEnsemble,
  ensemblePredict,
  updateEnsembleWeights,
  explainDecision,
  getSystemInsights,
} from '../systemIntelligenceEngine';

describe('System Intelligence Engine', () => {
  describe('initializeEnsemble', () => {
    it('should create ensemble with equal weights', () => {
      const ensemble = initializeEnsemble(['model1', 'model2', 'model3']);
      expect(ensemble.models.length).toBe(3);
      expect(Object.keys(ensemble.weights).length).toBe(3);
      expect(ensemble.weights['model1']).toBeCloseTo(1/3);
    });
  });

  describe('ensemblePredict', () => {
    it('should combine predictions', () => {
      const ensemble = initializeEnsemble(['model1', 'model2']);
      const predictions = { model1: 100, model2: 200 };
      const result = ensemblePredict(ensemble, predictions);
      expect(result.prediction).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should provide reasoning', () => {
      const ensemble = initializeEnsemble(['model1', 'model2']);
      const predictions = { model1: 100, model2: 200 };
      const result = ensemblePredict(ensemble, predictions);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('updateEnsembleWeights', () => {
    it('should update weights based on accuracy', () => {
      let ensemble = initializeEnsemble(['model1', 'model2']);
      ensemble = updateEnsembleWeights(ensemble, { model1: 0.9, model2: 0.7 });
      expect(ensemble.weights['model1']).toBeGreaterThan(ensemble.weights['model2']);
    });
  });

  describe('explainDecision', () => {
    it('should explain decision with factors', () => {
      const result = explainDecision('Increase savings', { income: 0.8, expenses: -0.3 }, 0.2);
      expect(result.prediction).toBe('Increase savings');
      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('getSystemInsights', () => {
    it('should provide system insights', () => {
      const ensemble = initializeEnsemble(['model1', 'model2']);
      const insights = getSystemInsights(ensemble);
      expect(insights).toContain('System Intelligence');
      expect(insights).toContain('2 models');
    });
  });
});
