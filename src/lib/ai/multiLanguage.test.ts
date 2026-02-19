import { describe, expect, it } from 'vitest';

import { detectLanguage, translate } from './multiLanguage';

describe('multiLanguage', () => {
  it('detects Spanish', () => {
    expect(detectLanguage('hola, gracias')).toBe('es');
  });

  it('detects French', () => {
    expect(detectLanguage('bonjour, merci')).toBe('fr');
  });

  it('detects Mandarin', () => {
    expect(detectLanguage('ni hao, xie xie')).toBe('zh');
  });

  it('translates to Spanish prefix', () => {
    expect(translate('Hello', 'es')).toContain('[ES]');
  });
});
