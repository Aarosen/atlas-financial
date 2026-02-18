export type TraceInput = {
  decision: 'ask' | 'answer' | 'meta';
  questionKey?: string;
  missingCount?: number;
  answeredCount?: number;
};

export function buildReasoningTrace(input: TraceInput) {
  const facts: string[] = [];
  if (input.questionKey) facts.push(`missing:${input.questionKey}`);
  if (typeof input.missingCount === 'number') facts.push(`missing_count:${input.missingCount}`);
  if (typeof input.answeredCount === 'number') facts.push(`answered_count:${input.answeredCount}`);
  return {
    decision: input.decision,
    facts,
    alternative: input.decision === 'ask' ? 'answer' : 'ask',
  };
}
