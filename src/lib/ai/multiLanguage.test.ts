import { describe, expect, it } from 'vitest';

import { detectLanguage, translate } from './multiLanguage';

describe('multiLanguage', () => {
  it('detects Spanish', () => {
    expect(detectLanguage('hola, gracias')).toBe('es');
  });

  it('translates to Spanish prefix', () => {
    expect(translate('Hello', 'es')).toContain('[ES]');
  });
});
