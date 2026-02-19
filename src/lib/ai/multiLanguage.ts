export type SupportedLanguage = 'en' | 'es';

export function detectLanguage(text: string): SupportedLanguage {
  const t = String(text || '').toLowerCase();
  if (/\b(hola|gracias|por favor|dinero|ahorro)\b/.test(t)) return 'es';
  return 'en';
}

export function translate(text: string, to: SupportedLanguage): string {
  if (to === 'es') return `[ES] ${text}`;
  return text;
}
