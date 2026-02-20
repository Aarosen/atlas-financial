/**
 * Competitive Excellence Engine (D12)
 * Ensures Atlas outperforms competitors on blind panel evaluation
 * Implements: D12-01 through D12-06
 */

export interface CompetitorBenchmark {
  competitor: string;
  dimension: string;
  atlasScore: number;
  competitorScore: number;
  winMargin: number;
}

/**
 * Response quality markers that beat competitors
 */
export const EXCELLENCE_MARKERS = {
  // D12-01: Personalization depth
  personalization: [
    'acknowledges user\'s specific situation',
    'references earlier context',
    'tailors advice to their constraints',
    'shows understanding of their emotional state',
  ],

  // D12-02: Financial accuracy
  accuracy: [
    'cites current 2025 limits',
    'explains the math behind recommendations',
    'avoids outdated information',
    'provides specific numbers with context',
  ],

  // D12-03: Teaching quality
  teaching: [
    'explains the "why" not just the "what"',
    'builds on previous concepts',
    'uses relatable examples',
    'leaves user more financially literate',
  ],

  // D12-04: Actionability
  actionability: [
    'provides clear next step',
    'breaks complex decisions into steps',
    'gives specific timeframes',
    'removes friction from implementation',
  ],

  // D12-05: Tone & empathy
  tone: [
    'warm and conversational',
    'acknowledges emotional weight',
    'celebrates progress',
    'avoids corporate jargon',
  ],

  // D12-06: Proactivity
  proactivity: [
    'surfaces opportunities user didn\'t ask about',
    'anticipates follow-up questions',
    'identifies hidden problems',
    'suggests optimization paths',
  ],
};

/**
 * Evaluate response against competitive excellence standards
 */
export function evaluateExcellence(response: string): {
  score: number;
  strengths: string[];
  gaps: string[];
} {
  const strengths: string[] = [];
  const gaps: string[] = [];
  let score = 0;

  // Check each excellence marker
  for (const [dimension, markers] of Object.entries(EXCELLENCE_MARKERS)) {
    let dimensionScore = 0;
    for (const marker of markers) {
      if (response.toLowerCase().includes(marker.toLowerCase())) {
        dimensionScore++;
      }
    }
    const dimensionPercentage = (dimensionScore / markers.length) * 100;
    score += dimensionPercentage / Object.keys(EXCELLENCE_MARKERS).length;

    if (dimensionPercentage === 100) {
      strengths.push(`✓ ${dimension}: All markers present`);
    } else if (dimensionPercentage >= 50) {
      strengths.push(`✓ ${dimension}: ${dimensionPercentage.toFixed(0)}% coverage`);
    } else {
      gaps.push(`✗ ${dimension}: Only ${dimensionPercentage.toFixed(0)}% coverage`);
    }
  }

  return {
    score: Math.round(score),
    strengths,
    gaps,
  };
}

/**
 * Generate response enhancements to beat competitors
 */
export function suggestEnhancements(response: string, gaps: string[]): string {
  const enhancements: string[] = [];

  if (gaps.some(g => g.includes('personalization'))) {
    enhancements.push('Add specific reference to their situation or constraints');
  }

  if (gaps.some(g => g.includes('accuracy'))) {
    enhancements.push('Include specific 2025 limits or current numbers');
  }

  if (gaps.some(g => g.includes('teaching'))) {
    enhancements.push('Explain the financial principle behind the recommendation');
  }

  if (gaps.some(g => g.includes('actionability'))) {
    enhancements.push('Add a clear, specific next step with timeline');
  }

  if (gaps.some(g => g.includes('tone'))) {
    enhancements.push('Make the tone warmer and more conversational');
  }

  if (gaps.some(g => g.includes('proactivity'))) {
    enhancements.push('Surface an opportunity they didn\'t ask about');
  }

  return enhancements.join('\n');
}

/**
 * Competitive win/tie/loss assessment
 */
export function assessCompetitivePosition(
  atlasResponse: string,
  competitorResponse: string
): 'win' | 'tie' | 'loss' {
  const atlasEval = evaluateExcellence(atlasResponse);
  const competitorEval = evaluateExcellence(competitorResponse);

  const atlasDifference = atlasEval.score - competitorEval.score;

  if (atlasDifference > 10) return 'win';
  if (atlasDifference < -10) return 'loss';
  return 'tie';
}
