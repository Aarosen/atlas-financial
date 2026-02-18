import { describe, expect, it } from 'vitest';
import { explainNextStep } from './explainStep';

describe('explainStep', () => {
  it('explains stabilize_cashflow lever', () => {
    const ex = explainNextStep('stabilize_cashflow');
    expect(ex.whyThisStep.toLowerCase()).toContain('cashflow');
    expect(ex.expectedOutcome).toBeTruthy();
    expect(ex.riskIfSkipped).toBeTruthy();
  });

  it('explains build_emergency_buffer lever', () => {
    const ex = explainNextStep('build_emergency_buffer');
    expect(ex.whyThisStep.toLowerCase()).toContain('buffer');
  });

  it('provides fallback for unknown lever', () => {
    const ex = explainNextStep('unknown_lever');
    expect(ex.step).toBe('unknown_lever');
    expect(ex.whyThisStep).toBeTruthy();
  });
});
