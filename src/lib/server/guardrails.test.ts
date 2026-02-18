import { describe, expect, it } from 'vitest';
import { fallbackAnswer, violatesGuardrails } from './guardrails';

describe('server guardrails', () => {
  it('allows a single short question', () => {
    expect(violatesGuardrails("What's your income?")).toBe(false);
  });

  it('rejects more than one question mark', () => {
    expect(violatesGuardrails('One? Two?')).toBe(true);
  });

  it('rejects lists', () => {
    expect(violatesGuardrails('Here:\n- one\n- two')).toBe(true);
    expect(violatesGuardrails('Steps:\n1. one\n2. two')).toBe(true);
  });

  it('rejects more than two sentences', () => {
    expect(violatesGuardrails('One. Two. Three.')).toBe(true);
  });

  it('fallbackAnswer always returns <= 1 question mark', () => {
    const a1 = fallbackAnswer('what is an emergency fund');
    const a2 = fallbackAnswer('what is an emergency fund?');
    expect((a1.match(/\?/g) || []).length).toBeLessThanOrEqual(1);
    expect((a2.match(/\?/g) || []).length).toBeLessThanOrEqual(1);
  });
});
