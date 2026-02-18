export type QualityScore = {
  total: number;
  max: number;
  details: Record<string, { score: number; max: number }>;
};

type EvalInput = {
  response: string;
  intent: 'onboarding_question' | 'explanation' | 'empathy';
};

const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));

const countMatches = (t: string, r: RegExp) => (t.match(r) || []).length;

const hasWhyItMatters = (t: string) => /\b(this|that)\s+(helps|tells|shows|lets|means)\b/i.test(t) || /\bwhy\s+it\s+matters\b/i.test(t);

const hasEmpathySignal = (t: string) =>
  /\b(i hear you|that makes sense|you're not alone|totally normal|i get why|i can see why|that sounds hard)\b/i.test(t);

const hasExplanationStructure = (t: string) =>
  /\bwhat it is\b/i.test(t) && /\bwhy it matters\b/i.test(t) && /\bnext step\b/i.test(t);

const countQuestions = (t: string) => countMatches(t, /\?/g);

export function scoreResponseQuality(input: EvalInput): QualityScore {
  const text = String(input.response || '').trim();
  const details: QualityScore['details'] = {};

  if (!text) {
    return { total: 0, max: 6, details: { empty: { score: 0, max: 6 } } };
  }

  if (input.intent === 'onboarding_question') {
    const why = hasWhyItMatters(text) ? 1 : 0;
    const questionCount = countQuestions(text);
    const singleQuestion = questionCount <= 1 ? 1 : 0;
    const lengthOk = text.length <= 220 ? 1 : 0;

    details.why = { score: why, max: 1 };
    details.singleQuestion = { score: singleQuestion, max: 1 };
    details.length = { score: lengthOk, max: 1 };

    const total = why + singleQuestion + lengthOk;
    return { total, max: 3, details };
  }

  if (input.intent === 'explanation') {
    const structure = hasExplanationStructure(text) ? 2 : 0;
    const questionCount = countQuestions(text);
    const singleQuestion = questionCount <= 1 ? 1 : 0;
    const lengthOk = text.length >= 200 ? 1 : 0;

    details.structure = { score: structure, max: 2 };
    details.singleQuestion = { score: singleQuestion, max: 1 };
    details.length = { score: lengthOk, max: 1 };

    const total = structure + singleQuestion + lengthOk;
    return { total, max: 4, details };
  }

  const empathy = hasEmpathySignal(text) ? 1 : 0;
  const lengthOk = text.length <= 240 ? 1 : 0;
  const questionCount = countQuestions(text);
  const singleQuestion = questionCount <= 1 ? 1 : 0;

  details.empathy = { score: empathy, max: 1 };
  details.length = { score: lengthOk, max: 1 };
  details.singleQuestion = { score: singleQuestion, max: 1 };

  const total = empathy + lengthOk + singleQuestion;
  return { total, max: 3, details };
}

export function meetsQualityThreshold(input: EvalInput, minRatio = 0.75) {
  const score = scoreResponseQuality(input);
  const ratio = score.max === 0 ? 0 : clamp(score.total / score.max);
  return { score, ratio, pass: ratio >= minRatio };
}
