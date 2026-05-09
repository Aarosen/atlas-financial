import { describe, it, expect } from 'vitest';
import { voiceWrap, voiceWrapWithTone } from '../voiceWrap';

describe('voiceWrap (C0.1)', () => {
  it('returns bare question on turn 1 (intro handles it)', () => {
    expect(voiceWrap('What is your income?', 'monthlyIncome', 1)).toBe('What is your income?');
  });

  it('prepends income bridge on turn ≥ 2', () => {
    const out = voiceWrap('What is your income?', 'monthlyIncome', 2);
    expect(out).toMatch(/anchor on what comes in/);
    expect(out).toMatch(/What is your income\?$/);
  });

  it('emotion bridge takes priority over field bridge', () => {
    const out = voiceWrap('What is your income?', 'monthlyIncome', 2, 'baseline', 'overwhelmed');
    expect(out).toMatch(/Take a breath/);
    expect(out).not.toMatch(/anchor on what comes in/);
  });

  it('gentle tone softens the prompt', () => {
    const out = voiceWrapWithTone('What is your income?', 'monthlyIncome', 2, 'gentle');
    expect(out).toContain('What is your income?');
  });

  it('ambitious tone tightens the prompt', () => {
    const out = voiceWrapWithTone('What is your income?', 'monthlyIncome', 2, 'ambitious');
    expect(out).toContain('fundamentals locked');
  });

  it('returns empty bridge for unknown field', () => {
    const out = voiceWrap('Some question?', 'unknownField', 2);
    expect(out).toBe('Some question?');
  });
});
