/**
 * System Intelligence Engine
 * Requirements 22-24: Multi-model ensemble, system learning, explainability
 */

export interface EnsembleModel {
  models: string[];
  weights: Record<string, number>;
  accuracy: number;
  lastUpdated: number;
}

export interface ExplainableResult {
  prediction: any;
  confidence: number;
  reasoning: string[];
  modelContributions: Record<string, number>;
  limitations: string[];
}

export function initializeEnsemble(modelIds: string[]): EnsembleModel {
  const weights: Record<string, number> = {};
  const equalWeight = 1 / modelIds.length;
  modelIds.forEach(id => {
    weights[id] = equalWeight;
  });

  return {
    models: modelIds,
    weights,
    accuracy: 0.5,
    lastUpdated: Date.now(),
  };
}

export function ensemblePredict(
  ensemble: EnsembleModel,
  predictions: Record<string, any>
): ExplainableResult {
  let weightedSum = 0;
  const contributions: Record<string, number> = {};

  for (const modelId of ensemble.models) {
    const weight = ensemble.weights[modelId] || 0;
    const prediction = predictions[modelId] || 0;
    weightedSum += prediction * weight;
    contributions[modelId] = weight;
  }

  return {
    prediction: weightedSum,
    confidence: ensemble.accuracy,
    reasoning: [
      `Ensemble combines ${ensemble.models.length} models`,
      `Weighted average prediction: ${weightedSum.toFixed(2)}`,
      `System accuracy: ${(ensemble.accuracy * 100).toFixed(0)}%`,
    ],
    modelContributions: contributions,
    limitations: [
      'Predictions assume historical patterns continue',
      'External factors not captured in data may affect outcomes',
      'Model accuracy decreases with longer time horizons',
    ],
  };
}

export function updateEnsembleWeights(
  ensemble: EnsembleModel,
  modelAccuracies: Record<string, number>
): EnsembleModel {
  const totalAccuracy = Object.values(modelAccuracies).reduce((a, b) => a + b, 0);

  for (const modelId of ensemble.models) {
    ensemble.weights[modelId] = (modelAccuracies[modelId] || 0.5) / totalAccuracy;
  }

  const avgAccuracy = totalAccuracy / ensemble.models.length;
  ensemble.accuracy = Math.min(1, avgAccuracy);
  ensemble.lastUpdated = Date.now();

  return ensemble;
}

export function explainDecision(
  decision: string,
  factors: Record<string, number>,
  threshold: number
): ExplainableResult {
  const reasoning: string[] = [];
  const relevantFactors = Object.entries(factors)
    .filter(([_, value]) => Math.abs(value) > threshold)
    .sort(([_, a], [__, b]) => Math.abs(b) - Math.abs(a));

  reasoning.push(`Decision: ${decision}`);
  reasoning.push(`Key factors:`);
  relevantFactors.forEach(([factor, value]) => {
    reasoning.push(`- ${factor}: ${value > 0 ? 'positive' : 'negative'} impact (${Math.abs(value).toFixed(2)})`);
  });

  return {
    prediction: decision,
    confidence: 0.8,
    reasoning,
    modelContributions: {},
    limitations: ['Explanation is simplified for clarity', 'Some interactions between factors not shown'],
  };
}

export function getSystemInsights(ensemble: EnsembleModel): string {
  return `System Intelligence: ${ensemble.models.length} models, ${(ensemble.accuracy * 100).toFixed(0)}% accuracy. Last updated: ${new Date(ensemble.lastUpdated).toLocaleDateString()}`;
}
