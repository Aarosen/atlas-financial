import { describe, expect, it } from 'vitest';
import { detectLiteracyLevel, detectResponsePreference } from './personalization';

describe('personalization detection', () => {
  it('detects response preference', () => {
    expect(detectResponsePreference('Keep it short')).toBe('short');
    expect(detectResponsePreference('Can you explain this?')).toBe('explain');
  });

  it('detects literacy levels', () => {
    expect(detectLiteracyLevel('I am new to investing')).toBe('novice');
    expect(detectLiteracyLevel('Explain APR vs APY')).toBe('intermediate');
    expect(detectLiteracyLevel('Talk about tax loss harvesting')).toBe('advanced');
  });
});
