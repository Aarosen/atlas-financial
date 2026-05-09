import { describe, it, expect } from 'vitest';
import { detectGoalMention } from '../detectGoalMention';

describe('detectGoalMention (C0.3)', () => {
  it('detects house with 2-year horizon', () => {
    const g = detectGoalMention('buying a house in 2 years');
    expect(g?.category).toBe('house');
    expect(g?.horizonYears).toBe(2);
  });

  it('detects retirement with 10-year horizon', () => {
    const g = detectGoalMention('retire in 10 years');
    expect(g?.category).toBe('retirement');
    expect(g?.horizonYears).toBe(10);
  });

  it('detects education goal', () => {
    const g = detectGoalMention('saving for college');
    expect(g?.category).toBe('education');
  });

  it('detects family goal', () => {
    const g = detectGoalMention('planning for a baby');
    expect(g?.category).toBe('family');
  });

  it('detects business goal', () => {
    const g = detectGoalMention('want to start a business');
    expect(g?.category).toBe('business');
  });

  it('detects travel goal', () => {
    const g = detectGoalMention('planning a sabbatical');
    expect(g?.category).toBe('travel');
  });

  it('detects debt freedom goal', () => {
    const g = detectGoalMention('pay off all debt');
    expect(g?.category).toBe('debt_freedom');
  });

  it('returns null when no goal phrase present', () => {
    expect(detectGoalMention('15261.66')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(detectGoalMention('')).toBeNull();
  });

  it('converts months to years', () => {
    const g = detectGoalMention('retire in 24 months');
    expect(g?.horizonYears).toBeCloseTo(2, 1);
  });
});
