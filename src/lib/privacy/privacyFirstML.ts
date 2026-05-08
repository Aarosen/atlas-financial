/**
 * T3.6: Privacy-First Machine Learning
 *
 * Implements federated learning and privacy budgets for ML.
 */

export interface FederatedModel {
  id: string;
  name: string;
  version: number;
  globalWeights: number[];
  participantCount: number;
  accuracy: number;
  privacyBudget: number;
  timestamp: number;
}

export interface LocalModel {
  id: string;
  participantId: string;
  weights: number[];
  accuracy: number;
  dataSize: number;
  timestamp: number;
}

export interface PrivacyBudgetAllocation {
  modelId: string;
  totalBudget: number;
  usedBudget: number;
  remainingBudget: number;
  allocations: Record<string, number>;
}

const federatedModels: Map<string, FederatedModel> = new Map();
const localModels: Map<string, LocalModel> = new Map();
const privacyBudgets: Map<string, PrivacyBudgetAllocation> = new Map();

/**
 * Initialize federated model
 */
export function initializeFederatedModel(
  name: string,
  initialWeights: number[],
  privacyBudget: number = 10
): FederatedModel {
  const id = `model_${Date.now()}`;

  const model: FederatedModel = {
    id,
    name,
    version: 1,
    globalWeights: initialWeights,
    participantCount: 0,
    accuracy: 0,
    privacyBudget,
    timestamp: Date.now(),
  };

  federatedModels.set(id, model);

  privacyBudgets.set(id, {
    modelId: id,
    totalBudget: privacyBudget,
    usedBudget: 0,
    remainingBudget: privacyBudget,
    allocations: {},
  });

  return model;
}

/**
 * Train local model
 */
export function trainLocalModel(
  participantId: string,
  trainingData: number[],
  initialWeights: number[]
): LocalModel {
  const id = `local_${Date.now()}`;

  // Simplified training: adjust weights based on data
  const weights = initialWeights.map((w, i) => {
    const dataPoint = trainingData[i] || 0;
    return w + dataPoint * 0.01; // Simple gradient update
  });

  // Calculate accuracy (simplified)
  const accuracy = 0.7 + Math.random() * 0.2;

  const model: LocalModel = {
    id,
    participantId,
    weights,
    accuracy,
    dataSize: trainingData.length,
    timestamp: Date.now(),
  };

  localModels.set(id, model);
  return model;
}

/**
 * Aggregate local models (federated averaging)
 */
export function aggregateLocalModels(
  modelId: string,
  localModelIds: string[]
): FederatedModel | null {
  const model = federatedModels.get(modelId);
  if (!model) return null;

  const localModels_ = localModelIds
    .map(id => localModels.get(id))
    .filter((m): m is LocalModel => m !== undefined);

  if (localModels_.length === 0) return null;

  // Federated averaging: average weights from all participants
  const numWeights = model.globalWeights.length;
  const aggregatedWeights = Array(numWeights).fill(0);

  localModels_.forEach(local => {
    local.weights.forEach((w, i) => {
      aggregatedWeights[i] += w;
    });
  });

  aggregatedWeights.forEach((_, i) => {
    aggregatedWeights[i] /= localModels_.length;
  });

  model.globalWeights = aggregatedWeights;
  model.version++;
  model.participantCount = localModels_.length;
  model.accuracy = localModels_.reduce((sum, m) => sum + m.accuracy, 0) / localModels_.length;
  model.timestamp = Date.now();

  // Update privacy budget
  const budget = privacyBudgets.get(modelId);
  if (budget) {
    const epsilonUsed = 1.0 / localModels_.length;
    budget.usedBudget += epsilonUsed;
    budget.remainingBudget = budget.totalBudget - budget.usedBudget;
    budget.allocations[`round_${model.version}`] = epsilonUsed;
  }

  return model;
}

/**
 * Get federated model
 */
export function getFederatedModel(modelId: string): FederatedModel | undefined {
  return federatedModels.get(modelId);
}

/**
 * Get local model
 */
export function getLocalModel(modelId: string): LocalModel | undefined {
  return localModels.get(modelId);
}

/**
 * Get privacy budget status
 */
export function getPrivacyBudgetStatus(modelId: string): PrivacyBudgetAllocation | undefined {
  return privacyBudgets.get(modelId);
}

/**
 * Get federated learning report
 */
export function getFederatedLearningReport(): {
  totalModels: number;
  totalParticipants: number;
  averageAccuracy: number;
  budgetUtilization: number;
  recommendations: string[];
} {
  const models = Array.from(federatedModels.values());
  const totalParticipants = models.reduce((sum, m) => sum + m.participantCount, 0);
  const averageAccuracy = models.length > 0 ? models.reduce((sum, m) => sum + m.accuracy, 0) / models.length : 0;

  let totalBudgetUsed = 0;
  let totalBudgetAvailable = 0;

  privacyBudgets.forEach(budget => {
    totalBudgetUsed += budget.usedBudget;
    totalBudgetAvailable += budget.totalBudget;
  });

  const budgetUtilization = totalBudgetAvailable > 0 ? (totalBudgetUsed / totalBudgetAvailable) * 100 : 0;

  const recommendations: string[] = [];

  if (averageAccuracy < 0.8) {
    recommendations.push('Model accuracy below target, consider more training rounds');
  }

  if (budgetUtilization > 80) {
    recommendations.push('Privacy budget nearly exhausted, plan for budget renewal');
  }

  if (totalParticipants < 10) {
    recommendations.push('Increase number of participants for better model robustness');
  }

  return {
    totalModels: models.length,
    totalParticipants,
    averageAccuracy,
    budgetUtilization,
    recommendations,
  };
}

/**
 * Clear privacy-first ML data (for testing)
 */
export function clearPrivacyFirstMLData(): void {
  federatedModels.clear();
  localModels.clear();
  privacyBudgets.clear();
}
