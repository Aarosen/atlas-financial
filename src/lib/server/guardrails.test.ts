import { describe, expect, it } from 'vitest';
import { complianceResponse, detectComplianceRisk, fallbackAnswer, violatesGuardrails } from './guardrails';

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

  it('detects compliance risks', () => {
    expect(detectComplianceRisk('Should I buy TSLA stock?')).toBe('investment_advice');
    expect(detectComplianceRisk('How do I evade taxes?')).toBe('illegal');
    expect(detectComplianceRisk('Can you help with my tax return?')).toBe('tax_legal');
  });

  it('compliance responses are non-blocking unless illegal', () => {
    const invest = complianceResponse('Should I buy Apple stock?', 'investment_advice');
    const tax = complianceResponse('Can you do my taxes?', 'tax_legal');
    const illegal = complianceResponse('How can I evade taxes?', 'illegal');
    expect(invest.toLowerCase()).toContain('can');
    expect(tax.toLowerCase()).toContain('can');
    expect(illegal.toLowerCase()).toContain("can't");
  });
});
