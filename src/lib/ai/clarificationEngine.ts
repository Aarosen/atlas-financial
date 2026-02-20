/**
 * Clarification Engine
 * Requirement 7: Clarification Questions (Not Assumptions)
 * 
 * Detects ambiguous customer answers and generates clarifying questions
 * to ensure accuracy and show the customer that Atlas is paying attention.
 */

export interface AmbiguityDetection {
  isAmbiguous: boolean;
  ambiguityType: 'vague' | 'range' | 'multiple_interpretations' | 'incomplete' | 'unclear_unit' | 'none';
  confidence: number; // 0-1
  clarifyingQuestions: string[];
  reasoning: string;
}

export interface ClarificationResult {
  originalAnswer: string;
  clarifyingQuestions: string[];
  clarificationNeeded: boolean;
  ambiguityTypes: string[];
}

const ambiguityPatterns = {
  vague: {
    keywords: ['some', 'a bit', 'a little', 'kind of', 'sort of', 'roughly', 'about', 'around', 'maybe', 'probably', 'i think', 'not sure'],
    patterns: [/^(some|a bit|a little|kind of|sort of|roughly|about|around)$/i],
  },
  range: {
    keywords: ['between', 'to', '-', 'or', 'around', 'approximately'],
    patterns: [/\d+\s*-\s*\d+/, /between\s+\d+\s+and\s+\d+/i, /\d+\s+to\s+\d+/i],
  },
  multiple_interpretations: {
    keywords: ['or', 'either', 'maybe', 'could be', 'might be'],
    patterns: [/\s+or\s+/i, /either\s+.*\s+or\s+/i],
  },
  incomplete: {
    keywords: ['etc', 'and stuff', 'and things', 'you know', 'whatever'],
    patterns: [/etc\.?/i, /and stuff/i, /and things/i, /you know/i],
  },
  unclear_unit: {
    keywords: ['k', 'grand', 'hundred', 'thousand', 'million'],
    patterns: [/\d+k$/i, /\d+\s+grand/i, /\d+\s+hundred/i],
  },
};

export function detectAmbiguity(answer: string): AmbiguityDetection {
  const lowerAnswer = answer.toLowerCase().trim();
  const detectedAmbiguities: string[] = [];
  let maxConfidence = 0;
  const clarifyingQuestions: string[] = [];

  // Check for vague language
  if (ambiguityPatterns.vague.keywords.some(kw => lowerAnswer.includes(kw))) {
    detectedAmbiguities.push('vague');
    maxConfidence = Math.max(maxConfidence, 0.7);
    clarifyingQuestions.push('Can you give me a more specific number or range?');
  }

  // Check for ranges
  if (ambiguityPatterns.range.patterns.some(p => p.test(answer))) {
    detectedAmbiguities.push('range');
    maxConfidence = Math.max(maxConfidence, 0.6);
    clarifyingQuestions.push('Is that a range, or do you have a specific number in mind?');
  }

  // Check for multiple interpretations
  if (ambiguityPatterns.multiple_interpretations.keywords.some(kw => lowerAnswer.includes(kw))) {
    detectedAmbiguities.push('multiple_interpretations');
    maxConfidence = Math.max(maxConfidence, 0.65);
    clarifyingQuestions.push('Which one is it?');
  }

  // Check for incomplete answers
  if (ambiguityPatterns.incomplete.keywords.some(kw => lowerAnswer.includes(kw))) {
    detectedAmbiguities.push('incomplete');
    maxConfidence = Math.max(maxConfidence, 0.6);
    clarifyingQuestions.push('Can you be more specific about what you mean?');
  }

  // Check for unclear units
  if (ambiguityPatterns.unclear_unit.keywords.some(kw => lowerAnswer.includes(kw))) {
    detectedAmbiguities.push('unclear_unit');
    maxConfidence = Math.max(maxConfidence, 0.5);
    clarifyingQuestions.push('Just to clarify, is that in thousands or the exact amount?');
  }

  const isAmbiguous = detectedAmbiguities.length > 0;
  const ambiguityType = (detectedAmbiguities[0] || 'none') as any;

  return {
    isAmbiguous,
    ambiguityType,
    confidence: maxConfidence,
    clarifyingQuestions: clarifyingQuestions.slice(0, 2),
    reasoning: isAmbiguous
      ? `Detected ${detectedAmbiguities.join(', ')} in answer: "${answer}"`
      : 'Answer is clear and specific',
  };
}

export function generateClarifyingQuestions(answer: string, questionContext?: string): string[] {
  const ambiguity = detectAmbiguity(answer);
  const questions: string[] = [];

  if (!ambiguity.isAmbiguous) {
    return [];
  }

  // Add context-specific clarifying questions
  if (questionContext?.includes('income')) {
    if (ambiguity.ambiguityType === 'range') {
      questions.push('Is that your monthly or annual income?');
      questions.push('Is that before or after taxes?');
    } else if (ambiguity.ambiguityType === 'vague') {
      questions.push('Can you give me a monthly or annual figure?');
    }
  } else if (questionContext?.includes('debt')) {
    if (ambiguity.ambiguityType === 'vague') {
      questions.push('What types of debt do you have? (credit cards, student loans, car loan, mortgage?)');
    }
  } else if (questionContext?.includes('savings')) {
    if (ambiguity.ambiguityType === 'range') {
      questions.push('Do you have a specific target amount in mind?');
    }
  }

  // Add generic clarifying questions
  questions.push(...ambiguity.clarifyingQuestions);

  return questions.slice(0, 3);
}

export function shouldAskClarifyingQuestion(answer: string, confidenceThreshold: number = 0.5): boolean {
  const ambiguity = detectAmbiguity(answer);
  return ambiguity.isAmbiguous && ambiguity.confidence >= confidenceThreshold;
}

export function clarifyAnswer(
  originalAnswer: string,
  clarifications: Record<string, string>
): string {
  let clarifiedAnswer = originalAnswer;

  // Apply clarifications
  for (const [key, value] of Object.entries(clarifications)) {
    if (key === 'unit') {
      clarifiedAnswer = `${originalAnswer} ${value}`;
    } else if (key === 'specificity') {
      clarifiedAnswer = value;
    } else if (key === 'type') {
      clarifiedAnswer = `${originalAnswer} (${value})`;
    }
  }

  return clarifiedAnswer;
}

export function calculateClarificationRate(
  answers: string[],
  confidenceThreshold: number = 0.5
): number {
  if (answers.length === 0) return 0;
  const ambiguousCount = answers.filter(a => shouldAskClarifyingQuestion(a, confidenceThreshold)).length;
  return ambiguousCount / answers.length;
}

export function trackClarificationAccuracy(
  originalAnswer: string,
  clarifiedAnswer: string,
  isAccurate: boolean
): { accuracy: number; improvement: number } {
  const originalAmbiguity = detectAmbiguity(originalAnswer);
  const clarifiedAmbiguity = detectAmbiguity(clarifiedAnswer);

  const accuracyScore = isAccurate ? 1 : 0;
  const improvementScore = originalAmbiguity.confidence - clarifiedAmbiguity.confidence;

  return {
    accuracy: accuracyScore,
    improvement: Math.max(0, improvementScore),
  };
}
