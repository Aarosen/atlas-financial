/**
 * ATLAS AI Adaptive Improvement Monitor
 * 
 * Tracks real-time improvements from adaptive intelligence layer.
 * Measures conversation quality, user satisfaction, and adaptation effectiveness.
 * Feeds metrics back into continuous improvement chain.
 */

export interface AdaptiveMetrics {
  conversationId: string;
  timestamp: number;
  
  // Signal detection metrics
  signalsDetected: string[];
  signalAccuracy: number; // 0-1
  
  // Response quality metrics
  responseQualityScore: number; // 0-100
  personalizationScore: number; // 0-100
  mentoringScore: number; // 0-100
  synthesisScore: number; // 0-100
  
  // Conversation flow metrics
  conversationPhase: 'discovery' | 'strategy' | 'implementation' | 'optimization';
  phaseDuration: number; // ms
  turnCount: number;
  
  // User engagement metrics
  userEngagement: 'low' | 'medium' | 'high';
  comprehensionLevel: 'beginner' | 'intermediate' | 'advanced';
  emotionalTone: 'positive' | 'neutral' | 'negative' | 'urgent';
  
  // Adaptation effectiveness
  adaptationApplied: boolean;
  adaptationEffectiveness: number; // 0-1
  goalAdjustmentMade: boolean;
  leverAdjustmentMade: boolean;
  
  // Action plan metrics
  readyForActionPlan: boolean;
  actionPlanGenerated: boolean;
  actionPlanClarity: number; // 0-100
  
  // Improvement indicators
  improvementVelocity: number; // 0-1 (how much better each turn)
  userSatisfactionEstimate: number; // 0-100
  competitiveScore: number; // 0-100 (vs competitors)
}

export interface ImprovementReport {
  reportId: string;
  timestamp: number;
  period: 'hourly' | 'daily' | 'weekly';
  
  // Aggregated metrics
  avgResponseQuality: number;
  avgPersonalization: number;
  avgMentoring: number;
  avgSynthesis: number;
  avgUserEngagement: number;
  avgAdaptationEffectiveness: number;
  avgCompetitiveScore: number;
  
  // Trend analysis
  qualityTrend: 'improving' | 'stable' | 'declining';
  adaptationTrend: 'improving' | 'stable' | 'declining';
  engagementTrend: 'improving' | 'stable' | 'declining';
  
  // Key findings
  topSignalsDetected: Array<{ signal: string; frequency: number }>;
  commonPhases: Array<{ phase: string; avgDuration: number }>;
  improvementOpportunities: string[];
  
  // Recommendations
  recommendations: Array<{
    area: string;
    current: number;
    target: number;
    action: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
  }>;
  
  // Competitive positioning
  meetsV4Standards: boolean;
  exceedsCompetition: boolean;
  readinessScore: number; // 0-100
}

/**
 * Collect metrics from a single conversation turn
 */
export function collectAdaptiveMetrics(
  conversationId: string,
  signals: string[],
  responseQuality: number,
  personalization: number,
  mentoring: number,
  synthesis: number,
  phase: 'discovery' | 'strategy' | 'implementation' | 'optimization',
  phaseDuration: number,
  turnCount: number,
  userEngagement: 'low' | 'medium' | 'high',
  comprehensionLevel: 'beginner' | 'intermediate' | 'advanced',
  emotionalTone: 'positive' | 'neutral' | 'negative' | 'urgent',
  adaptationApplied: boolean,
  adaptationEffectiveness: number,
  goalAdjustmentMade: boolean,
  leverAdjustmentMade: boolean,
  readyForActionPlan: boolean,
  actionPlanGenerated: boolean,
  actionPlanClarity: number
): AdaptiveMetrics {
  // Calculate improvement velocity (how much better this turn vs previous)
  const improvementVelocity = (responseQuality + personalization + mentoring + synthesis) / 400;
  
  // Estimate user satisfaction (weighted combination of metrics)
  const userSatisfactionEstimate = Math.round(
    responseQuality * 0.3 +
    personalization * 0.25 +
    mentoring * 0.2 +
    synthesis * 0.15 +
    (emotionalTone === 'positive' ? 20 : emotionalTone === 'negative' ? -10 : 0)
  );
  
  // Calculate competitive score (how well Atlas compares to competitors)
  const competitiveScore = Math.round(
    responseQuality * 0.25 +
    personalization * 0.25 +
    mentoring * 0.2 +
    synthesis * 0.15 +
    (adaptationApplied ? 15 : 0)
  );
  
  return {
    conversationId,
    timestamp: Date.now(),
    signalsDetected: signals,
    signalAccuracy: signals.length > 0 ? 0.85 : 0, // Assume 85% accuracy if signals detected
    responseQualityScore: responseQuality,
    personalizationScore: personalization,
    mentoringScore: mentoring,
    synthesisScore: synthesis,
    conversationPhase: phase,
    phaseDuration,
    turnCount,
    userEngagement,
    comprehensionLevel,
    emotionalTone,
    adaptationApplied,
    adaptationEffectiveness,
    goalAdjustmentMade,
    leverAdjustmentMade,
    readyForActionPlan,
    actionPlanGenerated,
    actionPlanClarity,
    improvementVelocity,
    userSatisfactionEstimate,
    competitiveScore,
  };
}

/**
 * Aggregate metrics into improvement report
 */
export function generateImprovementReport(
  metrics: AdaptiveMetrics[],
  period: 'hourly' | 'daily' | 'weekly'
): ImprovementReport {
  if (metrics.length === 0) {
    return {
      reportId: `report_${Date.now()}`,
      timestamp: Date.now(),
      period,
      avgResponseQuality: 0,
      avgPersonalization: 0,
      avgMentoring: 0,
      avgSynthesis: 0,
      avgUserEngagement: 0,
      avgAdaptationEffectiveness: 0,
      avgCompetitiveScore: 0,
      qualityTrend: 'stable',
      adaptationTrend: 'stable',
      engagementTrend: 'stable',
      topSignalsDetected: [],
      commonPhases: [],
      improvementOpportunities: [],
      recommendations: [],
      meetsV4Standards: false,
      exceedsCompetition: false,
      readinessScore: 0,
    };
  }

  // Calculate averages
  const avgResponseQuality = Math.round(
    metrics.reduce((sum, m) => sum + m.responseQualityScore, 0) / metrics.length
  );
  const avgPersonalization = Math.round(
    metrics.reduce((sum, m) => sum + m.personalizationScore, 0) / metrics.length
  );
  const avgMentoring = Math.round(
    metrics.reduce((sum, m) => sum + m.mentoringScore, 0) / metrics.length
  );
  const avgSynthesis = Math.round(
    metrics.reduce((sum, m) => sum + m.synthesisScore, 0) / metrics.length
  );
  const avgUserEngagement = calculateEngagementScore(metrics);
  const avgAdaptationEffectiveness = Math.round(
    metrics.reduce((sum, m) => sum + m.adaptationEffectiveness, 0) / metrics.length * 100
  );
  const avgCompetitiveScore = Math.round(
    metrics.reduce((sum, m) => sum + m.competitiveScore, 0) / metrics.length
  );

  // Analyze trends
  const qualityTrend = analyzeTrend(metrics.map(m => m.responseQualityScore));
  const adaptationTrend = analyzeTrend(metrics.map(m => m.adaptationEffectiveness * 100));
  const engagementTrend = analyzeTrend(metrics.map(m => engagementToScore(m.userEngagement)));

  // Find top signals
  const signalCounts = new Map<string, number>();
  metrics.forEach(m => {
    m.signalsDetected.forEach(signal => {
      signalCounts.set(signal, (signalCounts.get(signal) || 0) + 1);
    });
  });
  const topSignalsDetected = Array.from(signalCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([signal, frequency]) => ({ signal, frequency }));

  // Analyze phases
  const phaseDurations = new Map<string, number[]>();
  metrics.forEach(m => {
    if (!phaseDurations.has(m.conversationPhase)) {
      phaseDurations.set(m.conversationPhase, []);
    }
    phaseDurations.get(m.conversationPhase)!.push(m.phaseDuration);
  });
  const commonPhases = Array.from(phaseDurations.entries()).map(([phase, durations]) => ({
    phase,
    avgDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
  }));

  // Generate recommendations
  const recommendations = generateRecommendations(
    avgResponseQuality,
    avgPersonalization,
    avgMentoring,
    avgSynthesis,
    avgAdaptationEffectiveness
  );

  // Identify improvement opportunities
  const improvementOpportunities = identifyOpportunities(
    avgResponseQuality,
    avgPersonalization,
    avgMentoring,
    avgSynthesis
  );

  // Calculate readiness score
  const readinessScore = Math.round(
    avgResponseQuality * 0.25 +
    avgPersonalization * 0.25 +
    avgMentoring * 0.2 +
    avgSynthesis * 0.15 +
    avgAdaptationEffectiveness * 0.15
  );

  return {
    reportId: `report_${Date.now()}`,
    timestamp: Date.now(),
    period,
    avgResponseQuality,
    avgPersonalization,
    avgMentoring,
    avgSynthesis,
    avgUserEngagement,
    avgAdaptationEffectiveness,
    avgCompetitiveScore,
    qualityTrend,
    adaptationTrend,
    engagementTrend,
    topSignalsDetected,
    commonPhases,
    improvementOpportunities,
    recommendations,
    meetsV4Standards: readinessScore >= 75,
    exceedsCompetition: avgCompetitiveScore >= 80,
    readinessScore,
  };
}

/**
 * Analyze trend from score array
 */
function analyzeTrend(scores: number[]): 'improving' | 'stable' | 'declining' {
  if (scores.length < 2) return 'stable';
  
  const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
  const secondHalf = scores.slice(Math.floor(scores.length / 2));
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  const diff = secondAvg - firstAvg;
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

/**
 * Convert engagement level to numeric score
 */
function engagementToScore(engagement: 'low' | 'medium' | 'high'): number {
  return engagement === 'high' ? 80 : engagement === 'medium' ? 50 : 20;
}

/**
 * Calculate average engagement score
 */
function calculateEngagementScore(metrics: AdaptiveMetrics[]): number {
  const scores = metrics.map(m => engagementToScore(m.userEngagement));
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/**
 * Generate recommendations based on metrics
 */
function generateRecommendations(
  quality: number,
  personalization: number,
  mentoring: number,
  synthesis: number,
  adaptationEffectiveness: number
): Array<{ area: string; current: number; target: number; action: string; priority: 'critical' | 'high' | 'medium' | 'low' }> {
  const recommendations: Array<{ area: string; current: number; target: number; action: string; priority: 'critical' | 'high' | 'medium' | 'low' }> = [];

  if (quality < 75) {
    const priority: 'critical' | 'high' = quality < 60 ? 'critical' : 'high';
    recommendations.push({
      area: 'Response Quality',
      current: quality,
      target: 85,
      action: 'Enhance base response generation with more specific financial context',
      priority,
    });
  }

  if (personalization < 70) {
    const priority: 'critical' | 'high' = personalization < 55 ? 'critical' : 'high';
    recommendations.push({
      area: 'Personalization',
      current: personalization,
      target: 85,
      action: 'Increase use of user-specific financial data in responses',
      priority,
    });
  }

  if (mentoring < 65) {
    const priority: 'critical' | 'high' = mentoring < 50 ? 'critical' : 'high';
    recommendations.push({
      area: 'Mentoring',
      current: mentoring,
      target: 80,
      action: 'Add more teaching moments and financial education to responses',
      priority,
    });
  }

  if (synthesis < 60) {
    const priority: 'critical' | 'high' = synthesis < 45 ? 'critical' : 'high';
    recommendations.push({
      area: 'Conversation Synthesis',
      current: synthesis,
      target: 75,
      action: 'Improve multi-turn insight synthesis and pattern recognition',
      priority,
    });
  }

  return recommendations;
}

/**
 * Identify improvement opportunities
 */
function identifyOpportunities(
  quality: number,
  personalization: number,
  mentoring: number,
  synthesis: number
): string[] {
  const opportunities = [];

  if (quality >= 75 && personalization >= 75) {
    opportunities.push('Response quality and personalization strong - focus on mentoring depth');
  }

  if (mentoring >= 75 && synthesis >= 75) {
    opportunities.push('Teaching and synthesis excellent - expand to proactive opportunity detection');
  }

  if (quality >= 80 && personalization >= 80 && mentoring >= 80) {
    opportunities.push('Core metrics excellent - ready for advanced features like predictive recommendations');
  }

  if (quality < 70 || personalization < 70) {
    opportunities.push('Foundation metrics need improvement before expanding features');
  }

  return opportunities;
}
