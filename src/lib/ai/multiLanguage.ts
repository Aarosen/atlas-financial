export type SupportedLanguage = 'en' | 'es' | 'fr' | 'zh';

export function detectLanguage(text: string): SupportedLanguage {
  // SAD-2: Language detection is a stub that only recognizes 4-5 keywords per language
  // Real translation requires a proper API (DeepL, Google Translate)
  // For now, always return 'en' to avoid false positives
  // TODO: Implement real translation API or remove multi-language support entirely
  return 'en';
}

export function translate(text: string, to: SupportedLanguage): string {
  // SAD-2: translate() is a non-functional stub that only adds language prefixes
  // This is not actual translation and provides a broken user experience
  // Real translation requires a proper API (DeepL, Google Translate)
  // For now, return text unchanged to avoid false promises
  // TODO: Implement real translation API or remove multi-language support entirely
  return text;
}
