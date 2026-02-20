/**
 * D13 — Behavioral Finance & Cognitive Bias Recognition
 * Evaluates whether Atlas recognizes and skillfully addresses cognitive biases
 * that cause users to make bad financial decisions.
 *
 * Covers: D13-01 through D13-08
 */

export type CognitiveBias =
  | 'present_bias'
  | 'sunk_cost'
  | 'loss_aversion'
  | 'anchoring'
  | 'herd_mentality'
  | 'overconfidence'
  | 'status_quo_bias'
  | 'none';

export interface BiasDetectionResult {
  biasDetected: boolean;
  biasType: CognitiveBias;
  evidenceQuote: string | null;
  confidence: number; // 0-1
}

export interface BiasInterventionResult {
  result: 'PASS' | 'FAIL' | 'N/A';
  wasPreachyOrDismissive: boolean;
  wasEffective: boolean;
  approach: 'ignored' | 'named_it' | 'reframed' | 'quantified_cost' | 'all_three';
  reason: string;
}

/**
 * Detect cognitive biases in user messages
 */
export function detectCognitiveBias(userMessage: string): BiasDetectionResult {
  const text = userMessage.toLowerCase();

  // Present bias indicators
  if (/\b(next month|next year|later|eventually|when things calm down|after|soon)\b/.test(text) &&
      /\b(start|begin|save|invest|pay off|tackle)\b/.test(text)) {
    return {
      biasDetected: true,
      biasType: 'present_bias',
      evidenceQuote: userMessage,
      confidence: 0.85,
    };
  }

  // Sunk cost fallacy indicators
  if (/\b(already|invested|spent|put in|can't|won't|have to|locked in)\b/.test(text) &&
      /\b(loss|down|negative|can't sell|can't stop)\b/.test(text)) {
    return {
      biasDetected: true,
      biasType: 'sunk_cost',
      evidenceQuote: userMessage,
      confidence: 0.82,
    };
  }

  // Loss aversion indicators
  if (/\b(loss|losing|lose|down|negative|risk|afraid|scared|worried)\b/.test(text) &&
      /\b(sell|withdraw|move|change|stop)\b/.test(text)) {
    return {
      biasDetected: true,
      biasType: 'loss_aversion',
      evidenceQuote: userMessage,
      confidence: 0.78,
    };
  }

  // Anchoring indicators
  if (/\b(exactly|need|require|must have|at least|minimum)\b/.test(text) &&
      /\b(\$\d+|million|thousand)\b/.test(text) &&
      /\b(retire|goal|target|number)\b/.test(text)) {
    return {
      biasDetected: true,
      biasType: 'anchoring',
      evidenceQuote: userMessage,
      confidence: 0.75,
    };
  }

  // Herd mentality indicators
  if (/\b(everyone|everyone's|all my|my friends|people are|trending|popular|buzz)\b/.test(text)) {
    return {
      biasDetected: true,
      biasType: 'herd_mentality',
      evidenceQuote: userMessage,
      confidence: 0.80,
    };
  }

  // Overconfidence indicators
  if (/\b(i know|i'm sure|definitely|will|guaranteed|research|studied|confident)\b/.test(text) &&
      /\b(stock|market|crypto|investment|return|profit)\b/.test(text)) {
    return {
      biasDetected: true,
      biasType: 'overconfidence',
      evidenceQuote: userMessage,
      confidence: 0.76,
    };
  }

  // Status quo bias indicators
  if (/\b(always|never|same way|never changed|keep doing|stay|don't change)\b/.test(text)) {
    return {
      biasDetected: true,
      biasType: 'status_quo_bias',
      evidenceQuote: userMessage,
      confidence: 0.72,
    };
  }

  return {
    biasDetected: false,
    biasType: 'none',
    evidenceQuote: null,
    confidence: 0,
  };
}

/**
 * Evaluate whether Atlas response addresses the bias appropriately
 */
export function evaluateBiasIntervention(
  biasType: CognitiveBias,
  atlasResponse: string
): BiasInterventionResult {
  const text = atlasResponse.toLowerCase();

  if (biasType === 'none') {
    return {
      result: 'N/A',
      wasPreachyOrDismissive: false,
      wasEffective: false,
      approach: 'ignored',
      reason: 'No bias detected',
    };
  }

  // Check for preachy language
  const preachyPhrases = [
    "you're making a mistake",
    "that's a bad idea",
    "you should know better",
    "obviously",
    "clearly",
    "you're being irrational",
    "that's illogical",
  ];
  const wasPreachyOrDismissive = preachyPhrases.some(p => text.includes(p));

  // Check for effective interventions
  let approach: BiasInterventionResult['approach'] = 'ignored';
  let wasEffective = false;

  if (biasType === 'present_bias') {
    // Should quantify cost of delay
    if (/\b(cost|lost|miss out|delay|wait)\b/.test(text) && /\$\d+/.test(text)) {
      approach = 'quantified_cost';
      wasEffective = true;
    } else if (/\b(compound|growth|time|years)\b/.test(text)) {
      approach = 'reframed';
      wasEffective = true;
    }
  } else if (biasType === 'sunk_cost') {
    // Should name the fallacy and reframe
    if (/\b(sunk cost|past|forward|future|decision)\b/.test(text)) {
      approach = 'named_it';
      wasEffective = true;
    } else if (/\b(going forward|next step|future value)\b/.test(text)) {
      approach = 'reframed';
      wasEffective = true;
    }
  } else if (biasType === 'loss_aversion') {
    // Should introduce gain framing
    if (/\b(gain|opportunity|upside|growth|potential)\b/.test(text)) {
      approach = 'reframed';
      wasEffective = true;
    }
  } else if (biasType === 'anchoring') {
    // Should probe the number's origin
    if (/\b(where|come from|based on|why|how did you|research)\b/.test(text)) {
      approach = 'named_it';
      wasEffective = true;
    } else if (/\b(flexible|range|depends|varies)\b/.test(text)) {
      approach = 'reframed';
      wasEffective = true;
    }
  } else if (biasType === 'herd_mentality') {
    // Should redirect to user's own goals
    if (/\b(your goal|your situation|your risk|your timeline)\b/.test(text)) {
      approach = 'reframed';
      wasEffective = true;
    }
  } else if (biasType === 'overconfidence') {
    // Should introduce uncertainty
    if (/\b(uncertainty|risk|volatility|could|might|may|base rate)\b/.test(text)) {
      approach = 'reframed';
      wasEffective = true;
    }
  } else if (biasType === 'status_quo_bias') {
    // Should surface opportunity cost
    if (/\b(opportunity|cost|alternative|could|different|change)\b/.test(text)) {
      approach = 'reframed';
      wasEffective = true;
    }
  }

  return {
    result: wasEffective && !wasPreachyOrDismissive ? 'PASS' : 'FAIL',
    wasPreachyOrDismissive,
    wasEffective,
    approach,
    reason: wasEffective
      ? `Atlas ${approach} the bias effectively`
      : `Atlas did not address the ${biasType} bias`,
  };
}

/**
 * D13-03: Quantify cost of delay for present bias
 */
export function calculateDelayCost(
  monthlyContribution: number,
  annualRate: number,
  totalYears: number,
  delayMonths: number
): number {
  const r = annualRate / 12;
  const nFull = totalYears * 12;
  const nDelayed = nFull - delayMonths;

  const fvNow = monthlyContribution * (Math.pow(1 + r, nFull) - 1) / r;
  const fvDelayed = monthlyContribution * (Math.pow(1 + r, nDelayed) - 1) / r;

  return Math.round(fvNow - fvDelayed);
}

/**
 * D13-04: Detect and evaluate sunk cost handling
 */
export function evaluateSunkCostHandling(atlasResponse: string): {
  correctlyIdentified: boolean;
  reframedTowardFuture: boolean;
  score: number;
} {
  const text = atlasResponse.toLowerCase();

  const correctlyIdentified =
    /\b(sunk cost|past|already spent|can't recover)\b/.test(text);

  const reframedTowardFuture =
    /\b(going forward|future|next step|what matters now|decision ahead)\b/.test(text);

  const score = correctlyIdentified && reframedTowardFuture ? 10 : 
                correctlyIdentified || reframedTowardFuture ? 6 : 0;

  return {
    correctlyIdentified,
    reframedTowardFuture,
    score,
  };
}
