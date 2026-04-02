/**
 * MULTI-PROVIDER ROUTING ENGINE
 * 
 * Deterministically selects best LLM provider based on complexity and cost.
 * 100% deterministic - no randomness.
 * Optimizes for cost while maintaining quality.
 */

import type {
  ProviderRoutingDecision,
  ProviderName,
  FinancialDecision,
  ExtractedFinancialData,
} from './types';

export class MultiProviderRoutingEngine {
  /**
   * Provider metadata
   */
  private readonly PROVIDERS: Record<
    ProviderName,
    {
      costPer1MInput: number;
      costPer1MOutput: number;
      latencyMs: number;
      contextWindow: number;
    }
  > = {
    claude: {
      costPer1MInput: 3,
      costPer1MOutput: 15,
      latencyMs: 800,
      contextWindow: 200000,
    },
    openai: {
      costPer1MInput: 5,
      costPer1MOutput: 15,
      latencyMs: 600,
      contextWindow: 128000,
    },
    gemini: {
      costPer1MInput: 0.075,
      costPer1MOutput: 0.3,
      latencyMs: 700,
      contextWindow: 1000000,
    },
    together: {
      costPer1MInput: 0.2,
      costPer1MOutput: 0.6,
      latencyMs: 500,
      contextWindow: 32000,
    },
  };

  /**
   * Select best provider based on complexity and cost
   */
  selectProvider(
    decision: FinancialDecision,
    data: ExtractedFinancialData,
    userTier: 'free' | 'pro' | 'enterprise' = 'free'
  ): ProviderRoutingDecision {
    const complexity = this.calculateComplexity(decision, data);

    // Determine provider based on complexity and user tier
    let selectedProvider: ProviderName;
    let fallbackChain: ProviderName[];

    if (userTier === 'enterprise') {
      // Enterprise: use best quality, cost is secondary
      if (complexity === 'complex') {
        selectedProvider = 'claude';
        fallbackChain = ['openai', 'gemini', 'together'];
      } else if (complexity === 'moderate') {
        selectedProvider = 'openai';
        fallbackChain = ['claude', 'gemini', 'together'];
      } else {
        selectedProvider = 'gemini';
        fallbackChain = ['together', 'openai', 'claude'];
      }
    } else if (userTier === 'pro') {
      // Pro: balance cost and quality
      if (complexity === 'complex') {
        selectedProvider = 'openai';
        fallbackChain = ['claude', 'gemini', 'together'];
      } else if (complexity === 'moderate') {
        selectedProvider = 'gemini';
        fallbackChain = ['openai', 'together', 'claude'];
      } else {
        selectedProvider = 'together';
        fallbackChain = ['gemini', 'openai', 'claude'];
      }
    } else {
      // Free: optimize for cost
      if (complexity === 'complex') {
        selectedProvider = 'gemini';
        fallbackChain = ['openai', 'together', 'claude'];
      } else if (complexity === 'moderate') {
        selectedProvider = 'together';
        fallbackChain = ['gemini', 'openai', 'claude'];
      } else {
        selectedProvider = 'together';
        fallbackChain = ['gemini', 'openai', 'claude'];
      }
    }

    const estimatedCost = this.estimateCost(selectedProvider, complexity);
    const estimatedLatency = this.PROVIDERS[selectedProvider].latencyMs;

    return {
      selectedProvider,
      reason: `Selected ${selectedProvider} for ${complexity} complexity (tier: ${userTier})`,
      fallbackChain,
      estimatedCost,
      estimatedLatency,
    };
  }

  /**
   * Calculate request complexity
   */
  private calculateComplexity(
    decision: FinancialDecision,
    data: ExtractedFinancialData
  ): 'simple' | 'moderate' | 'complex' {
    let score = 0;

    // Decision complexity
    if (decision.domain === 'general') score += 1;
    if (decision.domain === 'budget') score += 2;
    if (decision.domain === 'emergency_fund') score += 2;
    if (decision.domain === 'debt_payoff') score += 3;
    if (decision.domain === 'investment') score += 4;
    if (decision.domain === 'retirement') score += 4;

    // Data completeness
    const fieldsProvided = Object.values(data).filter(v => v !== undefined).length;
    if (fieldsProvided >= 7) score += 2;
    else if (fieldsProvided >= 5) score += 1;

    // Urgency
    if (decision.urgency === 'critical') score += 2;
    if (decision.urgency === 'high') score += 1;

    // Classify
    if (score >= 8) return 'complex';
    if (score >= 4) return 'moderate';
    return 'simple';
  }

  /**
   * Estimate cost for request
   */
  private estimateCost(provider: ProviderName, complexity: 'simple' | 'moderate' | 'complex'): number {
    // Estimate tokens based on complexity
    const inputTokens = complexity === 'simple' ? 500 : complexity === 'moderate' ? 1000 : 2000;
    const outputTokens = complexity === 'simple' ? 200 : complexity === 'moderate' ? 400 : 800;

    const providerData = this.PROVIDERS[provider];
    const inputCost = (inputTokens / 1000000) * providerData.costPer1MInput;
    const outputCost = (outputTokens / 1000000) * providerData.costPer1MOutput;

    return inputCost + outputCost;
  }
}

// Export singleton instance
export const multiProviderRoutingEngine = new MultiProviderRoutingEngine();
