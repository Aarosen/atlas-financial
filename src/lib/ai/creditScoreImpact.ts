/**
 * Credit Score Impact Analysis
 * Analyzes how financial decisions affect credit score
 */

export interface CreditScoreImpactAnalysis {
  currentScore: number;
  scoreRange: 'poor' | 'fair' | 'good' | 'very_good' | 'excellent';
  factors: CreditScoreFactor[];
  recommendations: CreditRecommendation[];
  projectedScore: number;
  guidance: string;
}

export interface CreditScoreFactor {
  category: string;
  weight: number; // percentage of credit score
  impact: 'positive' | 'neutral' | 'negative';
  currentStatus: string;
  improvement: string;
}

export interface CreditRecommendation {
  action: string;
  impact: number; // points gained
  timeline: string;
  difficulty: 'easy' | 'moderate' | 'hard';
  description: string;
}

// Credit score ranges
const SCORE_RANGES = {
  poor: { min: 300, max: 669 },
  fair: { min: 670, max: 739 },
  good: { min: 740, max: 799 },
  very_good: { min: 800, max: 849 },
  excellent: { min: 850, max: 850 },
};

/**
 * Determine credit score range
 */
function getScoreRange(score: number): CreditScoreImpactAnalysis['scoreRange'] {
  if (score <= 669) return 'poor';
  if (score <= 739) return 'fair';
  if (score <= 799) return 'good';
  if (score <= 849) return 'very_good';
  return 'excellent';
}

/**
 * Analyze credit score impact
 */
export function analyzeCreditScoreImpact(
  currentScore: number,
  creditUtilization: number, // 0-100
  paymentHistory: number, // 0-100 (% on-time)
  debtCount: number,
  hardInquiries: number,
  accountAge: number // years
): CreditScoreImpactAnalysis {
  const factors = getCreditScoreFactors(creditUtilization, paymentHistory, debtCount, hardInquiries, accountAge);
  const recommendations = generateCreditRecommendations(creditUtilization, paymentHistory, debtCount, hardInquiries);
  
  // Calculate projected score improvement
  const potentialImprovement = recommendations.reduce((sum, r) => sum + r.impact, 0);
  const projectedScore = Math.min(850, currentScore + potentialImprovement);

  const guidance = buildCreditGuidance(currentScore, getScoreRange(currentScore), factors, recommendations, projectedScore);

  return {
    currentScore,
    scoreRange: getScoreRange(currentScore),
    factors,
    recommendations,
    projectedScore,
    guidance,
  };
}

/**
 * Get credit score factors
 */
function getCreditScoreFactors(
  creditUtilization: number,
  paymentHistory: number,
  debtCount: number,
  hardInquiries: number,
  accountAge: number
): CreditScoreFactor[] {
  const factors: CreditScoreFactor[] = [];

  // Payment History (35%)
  factors.push({
    category: 'Payment History',
    weight: 35,
    impact: paymentHistory >= 95 ? 'positive' : paymentHistory >= 80 ? 'neutral' : 'negative',
    currentStatus: `${paymentHistory}% on-time payments`,
    improvement: 'Make all payments on time, every time',
  });

  // Credit Utilization (30%)
  factors.push({
    category: 'Credit Utilization',
    weight: 30,
    impact: creditUtilization <= 30 ? 'positive' : creditUtilization <= 50 ? 'neutral' : 'negative',
    currentStatus: `${creditUtilization}% of available credit used`,
    improvement: `Keep utilization below 30% (ideal is 10%)`,
  });

  // Length of Credit History (15%)
  factors.push({
    category: 'Length of Credit History',
    weight: 15,
    impact: accountAge >= 7 ? 'positive' : accountAge >= 3 ? 'neutral' : 'negative',
    currentStatus: `Average account age: ${accountAge} years`,
    improvement: 'Keep old accounts open, avoid closing accounts',
  });

  // Credit Mix (10%)
  factors.push({
    category: 'Credit Mix',
    weight: 10,
    impact: debtCount >= 3 ? 'positive' : debtCount >= 1 ? 'neutral' : 'negative',
    currentStatus: `${debtCount} active credit accounts`,
    improvement: 'Maintain diverse credit types (credit cards, loans, etc.)',
  });

  // Hard Inquiries (10%)
  factors.push({
    category: 'Hard Inquiries',
    weight: 10,
    impact: hardInquiries <= 1 ? 'positive' : hardInquiries <= 3 ? 'neutral' : 'negative',
    currentStatus: `${hardInquiries} hard inquiries in past 12 months`,
    improvement: 'Minimize new credit applications',
  });

  return factors;
}

/**
 * Generate credit improvement recommendations
 */
function generateCreditRecommendations(
  creditUtilization: number,
  paymentHistory: number,
  debtCount: number,
  hardInquiries: number
): CreditRecommendation[] {
  const recommendations: CreditRecommendation[] = [];

  // Payment history recommendations
  if (paymentHistory < 95) {
    recommendations.push({
      action: 'Establish perfect payment history',
      impact: 50,
      timeline: '6-12 months',
      difficulty: 'easy',
      description: 'Set up automatic payments for all bills to ensure 100% on-time payment',
    });
  }

  // Credit utilization recommendations
  if (creditUtilization > 30) {
    const targetUtilization = Math.round(creditUtilization * 0.5);
    recommendations.push({
      action: `Reduce credit utilization to ${targetUtilization}%`,
      impact: Math.round((creditUtilization - targetUtilization) * 0.5),
      timeline: '1-3 months',
      difficulty: 'moderate',
      description: 'Pay down credit card balances or request credit limit increases',
    });
  }

  // Hard inquiry recommendations
  if (hardInquiries > 3) {
    recommendations.push({
      action: 'Avoid new credit applications',
      impact: 20,
      timeline: '12 months',
      difficulty: 'easy',
      description: 'Hard inquiries stay on your report for 12 months. Avoid applying for new credit.',
    });
  }

  // Credit mix recommendations
  if (debtCount < 3) {
    recommendations.push({
      action: 'Diversify credit mix',
      impact: 15,
      timeline: '3-6 months',
      difficulty: 'moderate',
      description: 'Consider a mix of credit cards, installment loans, and other credit types',
    });
  }

  // Debt payoff recommendations
  recommendations.push({
    action: 'Pay off debt',
    impact: 40,
    timeline: 'Ongoing',
    difficulty: 'hard',
    description: 'Paying down debt reduces utilization and improves credit score over time',
  });

  // Account age recommendations
  recommendations.push({
    action: 'Keep old accounts open',
    impact: 25,
    timeline: 'Ongoing',
    difficulty: 'easy',
    description: 'Do not close old credit accounts. Length of credit history is important.',
  });

  return recommendations.sort((a, b) => b.impact - a.impact);
}

/**
 * Build credit score guidance
 */
function buildCreditGuidance(
  currentScore: number,
  scoreRange: CreditScoreImpactAnalysis['scoreRange'],
  factors: CreditScoreFactor[],
  recommendations: CreditRecommendation[],
  projectedScore: number
): string {
  const scoreRangeLabel = scoreRange.replace(/_/g, ' ').toUpperCase();
  
  let guidance = `CREDIT SCORE ANALYSIS:

Current Score: ${currentScore} (${scoreRangeLabel})
Projected Score (with improvements): ${projectedScore} (+${projectedScore - currentScore} points)

CREDIT SCORE FACTORS:`;

  // Sort factors by weight
  factors.sort((a, b) => b.weight - a.weight);
  factors.forEach(factor => {
    const icon = factor.impact === 'positive' ? '✓' : factor.impact === 'neutral' ? '○' : '✗';
    guidance += `\n\n${icon} ${factor.category} (${factor.weight}% of score)
   Status: ${factor.currentStatus}
   Improvement: ${factor.improvement}`;
  });

  guidance += `\n\nTOP RECOMMENDATIONS TO IMPROVE YOUR SCORE:`;
  recommendations.slice(0, 5).forEach((rec, i) => {
    guidance += `\n\n${i + 1}. ${rec.action}
   Impact: +${rec.impact} points | Timeline: ${rec.timeline}
   Difficulty: ${rec.difficulty} | ${rec.description}`;
  });

  guidance += `\n\nIMPORTANT NOTES:
- Credit score changes take time (typically 30-90 days to reflect on reports)
- Check your credit report annually at annualcreditreport.com (free)
- Dispute any errors on your credit report immediately
- Avoid closing old accounts, even after paying them off`;

  return guidance;
}

/**
 * Build system prompt context for credit score impact
 */
export function buildCreditScoreContext(analysis: CreditScoreImpactAnalysis): string {
  const topRecommendations = analysis.recommendations.slice(0, 3).map(r => r.action).join(', ');

  return `[CREDIT_SCORE_CONTEXT]
Current Score: ${analysis.currentScore} (${analysis.scoreRange})
Projected Score: ${analysis.projectedScore}
Potential Improvement: +${analysis.projectedScore - analysis.currentScore} points
Top Recommendations: ${topRecommendations}
Guidance: ${analysis.guidance}
[END_CREDIT_SCORE_CONTEXT]`;
}
