import { describe, expect, it } from 'vitest';

import { detectLanguage, translate, translateSync } from './multiLanguage';

describe('multiLanguage', () => {
  it('REM-D: detectLanguage detects Spanish, French, Chinese indicators', () => {
    // Real language detection with keyword indicators
    expect(detectLanguage('hola, gracias, dinero')).toBe('es');
    expect(detectLanguage('bonjour, merci, argent')).toBe('fr');
    expect(detectLanguage('你好，谢谢')).toBe('zh');
    expect(detectLanguage('hello world')).toBe('en');
  });

  it('REM-D: translate returns text unchanged when DEEPL_API_KEY not set', async () => {
    // Translation requires API key - returns original text without key
    const result = await translate('Hello', 'es');
    expect(result).toBe('Hello');
  });

  it('REM-D: translateSync returns text unchanged (no async API available)', () => {
    // Synchronous version cannot call async APIs
    expect(translateSync('Hello', 'es')).toBe('Hello');
    expect(translateSync('Hello', 'en')).toBe('Hello');
  });
});
