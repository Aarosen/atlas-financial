import { describe, expect, it } from 'vitest';

import { normalizeSlang } from './slangMapper';

describe('slangMapper', () => {
  it('normalizes English slang', () => {
    const result = normalizeSlang('I am broke and need a rainy day fund', 'en');
    expect(result.toLowerCase()).toContain('no money');
    expect(result.toLowerCase()).toContain('emergency fund');
  });

  it('normalizes Spanish slang', () => {
    const result = normalizeSlang('No tengo plata para ahorros', 'es');
    expect(result.toLowerCase()).toContain('dinero');
    expect(result.toLowerCase()).toContain('savings');
  });

  it('normalizes French slang', () => {
    const result = normalizeSlang('Je suis fauche et besoin de fric', 'fr');
    expect(result.toLowerCase()).toContain('argent');
  });

  it('normalizes Mandarin slang', () => {
    const result = normalizeSlang('我没钱，需要存钱', 'zh');
    expect(result).toContain('我');
  });
});
