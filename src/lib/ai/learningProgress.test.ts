import { describe, expect, it } from 'vitest';

import { detectLearnedConcepts } from './learningProgress';

describe('learningProgress', () => {
  it('detects learned concepts from text', () => {
    const concepts = detectLearnedConcepts('Build an emergency fund and learn about APR.');
    expect(concepts).toContain('Emergency fund');
    expect(concepts).toContain('APR');
  });
});
