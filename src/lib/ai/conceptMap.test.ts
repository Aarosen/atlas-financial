import { describe, expect, it } from 'vitest';

import { conceptsForLever } from './conceptMap';

describe('conceptMap', () => {
  it('returns concepts for cashflow lever', () => {
    const concepts = conceptsForLever('stabilize_cashflow');
    expect(concepts.length).toBeGreaterThan(0);
  });
});
