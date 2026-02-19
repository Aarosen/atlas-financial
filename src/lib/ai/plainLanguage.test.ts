import { describe, expect, it } from 'vitest';

import { simplifyExplanation } from './plainLanguage';

describe('plainLanguage', () => {
  it('expands common jargon', () => {
    const out = simplifyExplanation('Your APR is high.');
    expect(out).toContain('APR (interest rate)');
  });
});
