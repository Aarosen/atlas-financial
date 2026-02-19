import { describe, expect, it } from 'vitest';

import { recommendNextConcept } from './learningRecommendations';

describe('learningRecommendations', () => {
  it('recommends concepts based on focus', () => {
    const next = recommendNextConcept({ learned: ['Emergency fund'], focus: 'stability' });
    expect(next.length).toBeGreaterThan(0);
  });
});
