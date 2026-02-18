export type LatencyCost = {
  latencyMs: number;
  tokensUsed: number;
  costUsd: number;
};

const COST_PER_1K_INPUT = 0.003;
const COST_PER_1K_OUTPUT = 0.006;

export function estimateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1000) * COST_PER_1K_INPUT + (outputTokens / 1000) * COST_PER_1K_OUTPUT;
}

export function checkLatencyBudget(latencyMs: number, budgetMs: number = 5000): boolean {
  return latencyMs <= budgetMs;
}

export function checkCostBudget(costUsd: number, budgetUsd: number = 0.05): boolean {
  return costUsd <= budgetUsd;
}
