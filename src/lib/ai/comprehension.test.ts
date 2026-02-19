import { describe, expect, it } from 'vitest';

import { detectComprehensionSignal } from './comprehension';

describe('comprehension', () => {
  it('detects low comprehension', () => {
    expect(detectComprehensionSignal('I am confused about this')).toBe('low');
  });

  it('detects high comprehension', () => {
    expect(detectComprehensionSignal('That makes sense, thanks')).toBe('high');
  });
});
