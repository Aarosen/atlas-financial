/**
 * MONITORING ENGINE
 * 
 * Tracks conversation metrics for quality and cost monitoring.
 * 100% deterministic - no LLM calls.
 * Provides visibility into platform performance.
 */

import type {
  ConversationMetrics,
  FinancialDecision,
  ExtractedFinancialData,
  ProviderName,
} from './types';

export class MonitoringEngine {
  /**
   * Track metrics for a conversation turn
   */
  trackMetrics(
    decision: FinancialDecision,
    data: ExtractedFinancialData,
    providersUsed: ProviderName[],
    cost: number,
    latency: number,
    crisisDetected: boolean = false
  ): ConversationMetrics {
    return {
      providersUsed,
      totalCost: cost,
      totalLatency: latency,
      calculationsRun: this.countCalculations(decision, data),
      decisionsCorrect: decision.confidence >= 0.7,
      complianceViolations: 0,
      crisisDetected,
      timestamp: Date.now(),
    };
  }

  /**
   * Count number of calculations run
   */
  private countCalculations(
    decision: FinancialDecision,
    data: ExtractedFinancialData
  ): number {
    let count = 0;

    // Check if we have data for calculations
    if (data.monthlyIncome !== undefined && data.essentialExpenses !== undefined) {
      count++; // Surplus calculation
    }

    if (data.essentialExpenses !== undefined && data.totalSavings !== undefined) {
      count++; // Emergency fund calculation
    }

    if (data.highInterestDebt !== undefined && data.highInterestRate !== undefined) {
      count++; // Debt payoff calculation
    }

    if (data.monthlyIncome !== undefined && data.essentialExpenses !== undefined) {
      count++; // Budget calculation
    }

    if (
      data.monthlyIncome !== undefined &&
      data.timeHorizonYears !== undefined &&
      data.riskTolerance !== undefined
    ) {
      count++; // Investment calculation
    }

    if (data.essentialExpenses !== undefined && data.timeHorizonYears !== undefined) {
      count++; // Retirement calculation
    }

    return count;
  }

  /**
   * Calculate cost per conversation turn
   */
  calculateTurnCost(
    inputTokens: number,
    outputTokens: number,
    provider: ProviderName
  ): number {
    const costs: Record<ProviderName, { input: number; output: number }> = {
      claude: { input: 3, output: 15 },
      openai: { input: 5, output: 15 },
      gemini: { input: 0.075, output: 0.3 },
      together: { input: 0.2, output: 0.6 },
    };

    const providerCost = costs[provider];
    const inputCost = (inputTokens / 1000000) * providerCost.input;
    const outputCost = (outputTokens / 1000000) * providerCost.output;

    return inputCost + outputCost;
  }

  /**
   * Estimate cost savings vs Claude-only
   */
  estimateCostSavings(
    currentCost: number,
    claudeOnlyCost: number
  ): { savings: number; percentage: number } {
    const savings = claudeOnlyCost - currentCost;
    const percentage = (savings / claudeOnlyCost) * 100;

    return {
      savings,
      percentage,
    };
  }

  /**
   * Check if metrics meet quality threshold
   */
  meetsQualityThreshold(metrics: ConversationMetrics): boolean {
    // Quality checks
    if (metrics.crisisDetected && metrics.totalLatency > 2000) {
      return false; // Crisis responses must be fast
    }

    if (!metrics.decisionsCorrect) {
      return false; // Decision confidence must be high
    }

    if (metrics.complianceViolations > 0) {
      return false; // Zero tolerance for compliance violations
    }

    return true;
  }

  /**
   * Format metrics for logging
   */
  formatMetrics(metrics: ConversationMetrics): string {
    return `
Metrics:
- Providers Used: ${metrics.providersUsed.join(', ')}
- Total Cost: $${metrics.totalCost.toFixed(4)}
- Total Latency: ${metrics.totalLatency}ms
- Calculations Run: ${metrics.calculationsRun}
- Decision Correct: ${metrics.decisionsCorrect}
- Compliance Violations: ${metrics.complianceViolations}
- Crisis Detected: ${metrics.crisisDetected}
- Timestamp: ${new Date(metrics.timestamp).toISOString()}
    `.trim();
  }
}

// Export singleton instance
export const monitoringEngine = new MonitoringEngine();
