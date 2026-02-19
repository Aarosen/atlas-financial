import { describe, expect, it } from 'vitest';

import { trimPromptSections } from './promptTrim';

describe('promptTrim', () => {
  it('trims sections by max length', () => {
    const result = trimPromptSections(['a', 'b', 'c'], 2);
    expect(result.length).toBeLessThanOrEqual(2);
  });
});
