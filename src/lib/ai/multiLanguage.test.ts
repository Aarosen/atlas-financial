import { describe, expect, it } from 'vitest';

import { detectLanguage, translate } from './multiLanguage';

describe('multiLanguage', () => {
  it('SAD-2: detectLanguage returns en to avoid false positives', () => {
    // Language detection is disabled to prevent broken translation promises
    expect(detectLanguage('hola, gracias')).toBe('en');
    expect(detectLanguage('bonjour, merci')).toBe('en');
    expect(detectLanguage('ni hao, xie xie')).toBe('en');
  });

  it('SAD-2: translate returns text unchanged (no fake translation)', () => {
    // Translation is disabled - no language prefixes or fake translations
    expect(translate('Hello', 'es')).toBe('Hello');
    expect(translate('Hello', 'fr')).toBe('Hello');
    expect(translate('Hello', 'zh')).toBe('Hello');
  });
});
