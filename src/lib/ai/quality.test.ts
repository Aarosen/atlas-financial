import { describe, expect, it } from 'vitest';
import { meetsQualityThreshold, scoreResponseQuality } from './quality';

describe('AI quality scoring', () => {
  it('flags onboarding questions without why-it-matters', () => {
    const out = meetsQualityThreshold({
      intent: 'onboarding_question',
      response: "What's your monthly income?",
    });
    expect(out.pass).toBe(false);
    expect(out.score.details.why.score).toBe(0);
  });

  it('passes onboarding question with why-it-matters and single question', () => {
    const out = meetsQualityThreshold({
      intent: 'onboarding_question',
      response: "What's your monthly take-home? (This tells us what we can safely work with.)",
    });
    expect(out.pass).toBe(true);
  });

  it('detects explanation structure cues', () => {
    const out = scoreResponseQuality({
      intent: 'explanation',
      response: 'What it is: APR is the annual cost of borrowing. Why it matters: it determines total interest paid. Next step: compare APRs before choosing a card.',
    });
    expect(out.details.structure.score).toBe(2);
  });

  it('flags missing empathy signals for empathy intent', () => {
    const out = meetsQualityThreshold({
      intent: 'empathy',
      response: 'You should lower your spending.',
    });
    expect(out.pass).toBe(false);
  });
});
