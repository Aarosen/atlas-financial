import { describe, expect, it } from 'vitest';

import { culturallyRelevantExample } from './culturalExamples';

describe('culturalExamples', () => {
  it('returns a relevant example', () => {
    const ex = culturallyRelevantExample('budget');
    expect(ex.toLowerCase()).toContain('example');
  });
});
