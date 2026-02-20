/**
 * ATLAS AI Continuous Improvement Chain
 * Establishes feedback loops where Atlas AI improves with every response
 * based on eval results and user interactions.
 *
 * This implements the "improvement chain" requirement from v3.0 framework.
 */

export interface EvalResult {
  dimensionId: string;
  evalId: string;
  result: 'PASS' | 'FAIL' | 'WARN';
  severity: 'CRITICAL' | 'HIGH' | 'STANDARD';
  score: number; // 0-10
  timestamp: number;
  metadata: Record<string, any>;
}

export interface ImprovementOpportunity {
  dimensionId: string;
  category: string;
  description: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  affectedEvals: string[];
  suggestedAction: string;
  estimatedImpact: number; // 0-100 (% improvement potential)
}

export interface ResponseFeedback {
  responseId: string;
  userId: string;
  timestamp: number;
  thumbsUp: boolean;
  dimensionScores: Record<string, number>; // D1-D15 scores
  qualitativeNotes: string;
  userAction: 'accepted' | 'rejected' | 'modified' | 'ignored';
}

export interface ContinuousImprovementMetrics {
  totalResponsesEvaluated: number;
  averageQualityScore: number; // 0-10
  dimensionAverages: Record<string, number>;
  improvementTrend: 'improving' | 'stable' | 'declining';
  criticalFailureRate: number; // % of responses with CRITICAL failures
  userAcceptanceRate: number; // % of responses user acted on
  lastUpdated: number;
}

/**
 * Analyze eval results to identify improvement opportunities
 */
export function identifyImprovementOpportunities(
  recentEvals: EvalResult[]
): ImprovementOpportunity[] {
  const opportunities: ImprovementOpportunity[] = [];
  const dimensionFailures: Record<string, EvalResult[]> = {};

  // Group failures by dimension
  for (const evalResult of recentEvals) {
    if (evalResult.result === 'FAIL' || evalResult.result === 'WARN') {
      if (!dimensionFailures[evalResult.dimensionId]) {
        dimensionFailures[evalResult.dimensionId] = [];
      }
      dimensionFailures[evalResult.dimensionId].push(evalResult);
    }
  }

  // D1: Safety & Compliance
  if (dimensionFailures['D1'] && dimensionFailures['D1'].length > 0) {
    opportunities.push({
      dimensionId: 'D1',
      category: 'Safety & Compliance',
      description: 'Compliance violations detected in responses',
      priority: 'CRITICAL',
      affectedEvals: dimensionFailures['D1'].map(e => e.evalId),
      suggestedAction: 'Review system prompt for compliance guardrails. Run CODE-01 keyword scanner.',
      estimatedImpact: 100,
    });
  }

  // D2: Accuracy & Grounding
  if (dimensionFailures['D2'] && dimensionFailures['D2'].length > 2) {
    opportunities.push({
      dimensionId: 'D2',
      category: 'Accuracy & Grounding',
      description: 'Hallucination or numerical accuracy issues detected',
      priority: 'CRITICAL',
      affectedEvals: dimensionFailures['D2'].map(e => e.evalId),
      suggestedAction: 'Review grounding data sources. Increase fact-checking in prompt.',
      estimatedImpact: 95,
    });
  }

  // D13: Behavioral Finance
  if (dimensionFailures['D13'] && dimensionFailures['D13'].length > 1) {
    opportunities.push({
      dimensionId: 'D13',
      category: 'Behavioral Finance',
      description: 'Cognitive bias detection or intervention quality issues',
      priority: 'HIGH',
      affectedEvals: dimensionFailures['D13'].map(e => e.evalId),
      suggestedAction: 'Enhance bias detection patterns. Add more intervention examples to prompt.',
      estimatedImpact: 75,
    });
  }

  // D14: Financial Resilience
  if (dimensionFailures['D14'] && dimensionFailures['D14'].length > 1) {
    opportunities.push({
      dimensionId: 'D14',
      category: 'Financial Resilience',
      description: 'Fragility detection or scenario modeling accuracy issues',
      priority: 'HIGH',
      affectedEvals: dimensionFailures['D14'].map(e => e.evalId),
      suggestedAction: 'Improve vulnerability detection logic. Validate scenario calculations.',
      estimatedImpact: 80,
    });
  }

  // D15: Equity & Fairness
  if (dimensionFailures['D15'] && dimensionFailures['D15'].length > 0) {
    opportunities.push({
      dimensionId: 'D15',
      category: 'Equity & Fairness',
      description: 'Implicit assumptions or demographic bias detected',
      priority: 'CRITICAL',
      affectedEvals: dimensionFailures['D15'].map(e => e.evalId),
      suggestedAction: 'Run CODE-07 scanner on all responses. Review assumption detection logic.',
      estimatedImpact: 100,
    });
  }

  return opportunities.sort((a, b) => {
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Calculate continuous improvement metrics from eval history
 */
export function calculateImprovementMetrics(
  evalHistory: EvalResult[],
  feedbackHistory: ResponseFeedback[]
): ContinuousImprovementMetrics {
  if (evalHistory.length === 0) {
    return {
      totalResponsesEvaluated: 0,
      averageQualityScore: 0,
      dimensionAverages: {},
      improvementTrend: 'stable',
      criticalFailureRate: 0,
      userAcceptanceRate: 0,
      lastUpdated: Date.now(),
    };
  }

  // Calculate average quality score
  const scores = evalHistory.map(e => e.score);
  const averageQualityScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  // Calculate dimension averages
  const dimensionAverages: Record<string, number> = {};
  const dimensionScores: Record<string, number[]> = {};

  for (const evalResult of evalHistory) {
    if (!dimensionScores[evalResult.dimensionId]) {
      dimensionScores[evalResult.dimensionId] = [];
    }
    dimensionScores[evalResult.dimensionId].push(evalResult.score);
  }

  for (const [dimension, dimensionScoresList] of Object.entries(dimensionScores)) {
    dimensionAverages[dimension] = dimensionScoresList.reduce((a, b) => a + b, 0) / dimensionScoresList.length;
  }

  // Calculate critical failure rate
  const criticalFailures = evalHistory.filter(
    e => e.result === 'FAIL' && e.severity === 'CRITICAL'
  ).length;
  const criticalFailureRate = (criticalFailures / evalHistory.length) * 100;

  // Calculate user acceptance rate
  const acceptedResponses = feedbackHistory.filter(
    f => f.userAction === 'accepted'
  ).length;
  const userAcceptanceRate = feedbackHistory.length > 0
    ? (acceptedResponses / feedbackHistory.length) * 100
    : 0;

  // Determine improvement trend
  const recentEvals = evalHistory.slice(-50);
  const olderEvals = evalHistory.slice(-100, -50);

  const recentAvg = recentEvals.reduce((a, b) => a + b.score, 0) / recentEvals.length;
  const olderAvg = olderEvals.length > 0
    ? olderEvals.reduce((a, b) => a + b.score, 0) / olderEvals.length
    : recentAvg;

  let improvementTrend: 'improving' | 'stable' | 'declining';
  if (recentAvg > olderAvg + 0.5) {
    improvementTrend = 'improving';
  } else if (recentAvg < olderAvg - 0.5) {
    improvementTrend = 'declining';
  } else {
    improvementTrend = 'stable';
  }

  return {
    totalResponsesEvaluated: evalHistory.length,
    averageQualityScore: Math.round(averageQualityScore * 100) / 100,
    dimensionAverages,
    improvementTrend,
    criticalFailureRate: Math.round(criticalFailureRate * 100) / 100,
    userAcceptanceRate: Math.round(userAcceptanceRate * 100) / 100,
    lastUpdated: Date.now(),
  };
}

/**
 * Generate improvement recommendations based on metrics
 */
export function generateImprovementRecommendations(
  metrics: ContinuousImprovementMetrics,
  opportunities: ImprovementOpportunity[]
): string[] {
  const recommendations: string[] = [];

  // Critical failure rate too high
  if (metrics.criticalFailureRate > 1) {
    recommendations.push(
      `🚨 CRITICAL: ${metrics.criticalFailureRate}% of responses have critical failures. Halt deployment until resolved.`
    );
  }

  // Overall quality declining
  if (metrics.improvementTrend === 'declining') {
    recommendations.push(
      `⚠️ Quality is declining. Review recent prompt changes or model updates.`
    );
  }

  // Low user acceptance rate
  if (metrics.userAcceptanceRate < 60) {
    recommendations.push(
      `📉 User acceptance rate is ${metrics.userAcceptanceRate}%. Review tone and personalization (D4, D6).`
    );
  }

  // Specific dimension improvements
  for (const [dimension, score] of Object.entries(metrics.dimensionAverages)) {
    if (score < 7) {
      recommendations.push(
        `${dimension}: Score ${score.toFixed(1)}/10. Prioritize improvements in this dimension.`
      );
    }
  }

  // Top opportunities
  for (const opp of opportunities.slice(0, 3)) {
    recommendations.push(`→ ${opp.dimensionId}: ${opp.suggestedAction}`);
  }

  return recommendations;
}

/**
 * Track response quality over time for improvement chain
 */
export function trackResponseQuality(
  responseId: string,
  evalResults: EvalResult[],
  feedback: ResponseFeedback
): {
  overallScore: number;
  passingDimensions: string[];
  failingDimensions: string[];
  improvementAreas: string[];
} {
  const dimensionResults: Record<string, EvalResult[]> = {};

  for (const eval of evalResults) {
    if (!dimensionResults[eval.dimensionId]) {
      dimensionResults[eval.dimensionId] = [];
    }
    dimensionResults[eval.dimensionId].push(eval);
  }

  const passingDimensions: string[] = [];
  const failingDimensions: string[] = [];
  let totalScore = 0;
  let dimensionCount = 0;

  for (const [dimension, evals] of Object.entries(dimensionResults)) {
    const avgScore = evals.reduce((a, b) => a + b.score, 0) / evals.length;
    totalScore += avgScore;
    dimensionCount++;

    if (evals.some(e => e.result === 'FAIL')) {
      failingDimensions.push(dimension);
    } else {
      passingDimensions.push(dimension);
    }
  }

  const overallScore = dimensionCount > 0 ? totalScore / dimensionCount : 0;

  // Identify improvement areas based on feedback
  const improvementAreas: string[] = [];
  if (!feedback.thumbsUp) {
    improvementAreas.push(...failingDimensions);
  }
  if (feedback.userAction === 'rejected' || feedback.userAction === 'modified') {
    improvementAreas.push('User did not accept response as-is');
  }

  return {
    overallScore: Math.round(overallScore * 100) / 100,
    passingDimensions,
    failingDimensions,
    improvementAreas,
  };
}
