/**
 * Predictive Modeling Engine
 * Requirements 19-21: Predictive modeling, anomaly detection, contextual recommendations
 */

export interface PredictiveModel {
  modelId: string;
  type: 'debt_payoff' | 'savings_growth' | 'expense_trend' | 'income_projection';
  accuracy: number;
  predictions: Prediction[];
  lastUpdated: number;
}

export interface Prediction {
  timeframe: string;
  value: number;
  confidence: number;
  reasoning: string;
}

export interface Anomaly {
  type: 'unusual_expense' | 'income_drop' | 'savings_spike' | 'debt_increase';
  severity: 'low' | 'medium' | 'high';
  value: number;
  expectedValue: number;
  message: string;
}

export function initializeModel(modelId: string, type: PredictiveModel['type']): PredictiveModel {
  return {
    modelId,
    type,
    accuracy: 0.5,
    predictions: [],
    lastUpdated: Date.now(),
  };
}

export function predictDebtPayoff(currentDebt: number, monthlyPayment: number, interestRate: number): Prediction[] {
  const predictions: Prediction[] = [];
  let remaining = currentDebt;
  let months = 0;

  while (remaining > 0 && months < 360) {
    remaining = remaining * (1 + interestRate / 100 / 12) - monthlyPayment;
    months++;
  }

  predictions.push({
    timeframe: `${Math.ceil(months / 12)} years`,
    value: months,
    confidence: 0.85,
    reasoning: `At $${monthlyPayment}/month, debt will be paid off in ${months} months`,
  });

  return predictions;
}

export function predictSavingsGrowth(currentSavings: number, monthlyContribution: number, annualReturn: number): Prediction[] {
  const predictions: Prediction[] = [];
  let balance = currentSavings;

  for (const year of [1, 3, 5, 10]) {
    for (let i = 0; i < year * 12; i++) {
      balance = balance * (1 + annualReturn / 100 / 12) + monthlyContribution;
    }
    predictions.push({
      timeframe: `${year} year${year > 1 ? 's' : ''}`,
      value: Math.round(balance),
      confidence: 0.8 - year * 0.05,
      reasoning: `With $${monthlyContribution}/month contribution and ${annualReturn}% return`,
    });
  }

  return predictions;
}

export function detectAnomalies(currentValue: number, historicalAverage: number, standardDeviation: number): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const zScore = Math.abs((currentValue - historicalAverage) / standardDeviation);

  if (zScore > 2) {
    const type = currentValue > historicalAverage ? 'unusual_expense' : 'income_drop';
    anomalies.push({
      type: type as any,
      severity: zScore > 3 ? 'high' : 'medium',
      value: currentValue,
      expectedValue: historicalAverage,
      message: `Unusual ${type}: ${currentValue} vs expected ${Math.round(historicalAverage)}`,
    });
  }

  return anomalies;
}

export function generateContextualRecommendation(
  concern: string,
  prediction: Prediction,
  anomalies: Anomaly[]
): string {
  if (anomalies.length > 0 && anomalies[0].severity === 'high') {
    return `Alert: ${anomalies[0].message}. Consider reviewing your ${concern} patterns.`;
  }

  return `Based on predictions: ${prediction.reasoning}. Confidence: ${(prediction.confidence * 100).toFixed(0)}%`;
}

export function updateModelAccuracy(model: PredictiveModel, actualValue: number, predictedValue: number): PredictiveModel {
  const error = Math.abs(actualValue - predictedValue) / actualValue;
  const newAccuracy = Math.max(0, Math.min(1, model.accuracy * 0.9 + (1 - error) * 0.1));
  model.accuracy = newAccuracy;
  model.lastUpdated = Date.now();
  return model;
}
