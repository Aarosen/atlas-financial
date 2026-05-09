import { describe, it, expect } from 'vitest';
import { detectEmotion } from '../detectEmotion';

describe('detectEmotion (C0.2)', () => {
  it('detects "complex" as overwhelmed', () => {
    expect(detectEmotion('my complex finances')).toBe('overwhelmed');
  });

  it('detects "terrible with money" as shame', () => {
    expect(detectEmotion("i'm terrible with money")).toBe('shame');
  });

  it('detects "spreadsheet" as analytical', () => {
    expect(detectEmotion('i want to build a spreadsheet')).toBe('analytical');
  });

  it('detects "maybe" as uncertain', () => {
    expect(detectEmotion('maybe around 5000')).toBe('uncertain');
  });

  it('detects "ready" as motivated', () => {
    expect(detectEmotion("let's do this i'm ready")).toBe('motivated');
  });

  it('returns null for plain numeric answer', () => {
    expect(detectEmotion('15261.66')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(detectEmotion('')).toBeNull();
  });
});
