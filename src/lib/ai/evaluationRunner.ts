// AI Evaluation Runner - Execute 20 evaluations and generate quality gate report
import { ALL_EVALS, QUALITY_GATE, calculateEvaluationScore, evaluationPassed, type EvaluationResult } from './evaluationFramework';

export interface EvaluationReport {
  timestamp: string;
  totalEvals: number;
  passedEvals: number;
  failedEvals: number;
  passRate: number;
  overallScore: number;
  categoryScores: Record<string, number>;
  qualityGatePassed: boolean;
  criticalFailures: EvaluationResult[];
  recommendations: string[];
}

/**
 * Mock evaluation runner - simulates running all 20 evaluations
 * In production, this would call Claude with each prompt and score the response
 */
export async function runEvaluationSuite(): Promise<EvaluationReport> {
  const results: EvaluationResult[] = [];
  const categoryResults: Record<string, EvaluationResult[]> = {
    coreLiteracy: [],
    emotionalSafety: [],
    advancedKnowledge: [],
    bestFriendFeel: [],
  };

  // Simulate evaluation results (in production, these would be actual Claude responses)
  for (const evalDef of ALL_EVALS) {
    const mockResult: EvaluationResult = {
      evalId: evalDef.id,
      category: evalDef.id.startsWith('EVAL-0') && parseInt(evalDef.id.slice(-2)) <= 5 ? 'coreLiteracy'
        : evalDef.id.startsWith('EVAL-0') && parseInt(evalDef.id.slice(-2)) <= 10 ? 'emotionalSafety'
        : evalDef.id.startsWith('EVAL-1') && parseInt(evalDef.id.slice(-2)) <= 15 ? 'advancedKnowledge'
        : 'bestFriendFeel',
      prompt: evalDef.prompt,
      response: 'Mock response from Claude', // In production: actual Claude response
      scores: {
        accuracy: 4.2,
        empathy: 4.3,
        safety: 4.5,
        personalization: 4.1,
        actionability: 4.0,
      },
      averageScore: 0, // Will be calculated
      passed: false, // Will be determined
      feedback: 'Mock evaluation feedback',
    };

    mockResult.averageScore = calculateEvaluationScore(mockResult.scores);
    mockResult.passed = evaluationPassed(mockResult, evalDef.minScore);

    results.push(mockResult);
    categoryResults[mockResult.category].push(mockResult);
  }

  // Calculate metrics
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.length - passedCount;
  const passRate = passedCount / results.length;
  const overallScore = results.reduce((sum, r) => sum + r.averageScore, 0) / results.length;

  // Calculate category scores
  const categoryScores: Record<string, number> = {};
  for (const [category, evals] of Object.entries(categoryResults)) {
    categoryScores[category] = evals.reduce((sum, e) => sum + e.averageScore, 0) / evals.length;
  }

  // Identify critical failures
  const criticalFailures = results.filter(r => !r.passed || r.scores.safety < 3);

  // Generate recommendations
  const recommendations: string[] = [];
  if (passRate < QUALITY_GATE.passRate) {
    recommendations.push(`Pass rate (${(passRate * 100).toFixed(1)}%) below target (${(QUALITY_GATE.passRate * 100).toFixed(1)}%)`);
  }
  if (overallScore < QUALITY_GATE.minOverallScore) {
    recommendations.push(`Overall score (${overallScore.toFixed(2)}/5.0) below target (${QUALITY_GATE.minOverallScore}/5.0)`);
  }
  for (const [category, minScore] of Object.entries(QUALITY_GATE.categories)) {
    if (categoryScores[category] < minScore.minScore) {
      recommendations.push(`${category} score (${categoryScores[category].toFixed(2)}/5.0) below target (${minScore.minScore}/5.0)`);
    }
  }

  const qualityGatePassed = passRate >= QUALITY_GATE.passRate && overallScore >= QUALITY_GATE.minOverallScore;

  return {
    timestamp: new Date().toISOString(),
    totalEvals: results.length,
    passedEvals: passedCount,
    failedEvals: failedCount,
    passRate,
    overallScore,
    categoryScores,
    qualityGatePassed,
    criticalFailures,
    recommendations,
  };
}

/**
 * Generate human-readable evaluation report
 */
export function formatEvaluationReport(report: EvaluationReport): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════════',
    'ATLAS AI EVALUATION FRAMEWORK - QUALITY GATE REPORT',
    '═══════════════════════════════════════════════════════════════',
    '',
    `Timestamp: ${report.timestamp}`,
    `Quality Gate Status: ${report.qualityGatePassed ? '✅ PASSED' : '❌ FAILED'}`,
    '',
    '─── OVERALL METRICS ───',
    `Total Evaluations: ${report.totalEvals}`,
    `Passed: ${report.passedEvals} / Failed: ${report.failedEvals}`,
    `Pass Rate: ${(report.passRate * 100).toFixed(1)}% (Target: ${(QUALITY_GATE.passRate * 100).toFixed(1)}%)`,
    `Overall Score: ${report.overallScore.toFixed(2)}/5.0 (Target: ${QUALITY_GATE.minOverallScore}/5.0)`,
    '',
    '─── CATEGORY SCORES ───',
  ];

  for (const [category, score] of Object.entries(report.categoryScores)) {
    const categoryKey = category as keyof typeof QUALITY_GATE.categories;
    const target = QUALITY_GATE.categories[categoryKey]?.minScore || 4.0;
    const status = score >= target ? '✅' : '❌';
    lines.push(`${status} ${category}: ${score.toFixed(2)}/5.0 (Target: ${target}/5.0)`);
  }

  if (report.criticalFailures.length > 0) {
    lines.push('');
    lines.push('─── CRITICAL FAILURES ───');
    for (const failure of report.criticalFailures) {
      lines.push(`❌ ${failure.evalId}: ${failure.feedback}`);
    }
  }

  if (report.recommendations.length > 0) {
    lines.push('');
    lines.push('─── RECOMMENDATIONS ───');
    for (const rec of report.recommendations) {
      lines.push(`• ${rec}`);
    }
  }

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}
