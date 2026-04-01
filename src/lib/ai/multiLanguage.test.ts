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

  it('REM-F: detectLanguage does not misclassify English "budget" as French', () => {
    // REM-F: 'budget' removed from French keywords to prevent false positives
    // English users discussing budgeting should not be misclassified as French
    expect(detectLanguage('can you help me budget my money')).toBe('en');
    expect(detectLanguage('my budget is 5000 dollars')).toBe('en');
    expect(detectLanguage('I need to budget better')).toBe('en');
    // French users still detected via other keywords
    expect(detectLanguage('bonjour, je dois budgéter mieux')).toBe('fr');
    expect(detectLanguage('mon argent, mes dépenses')).toBe('fr');
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
