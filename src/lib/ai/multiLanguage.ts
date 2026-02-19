export type SupportedLanguage = 'en' | 'es' | 'fr' | 'zh';

export function detectLanguage(text: string): SupportedLanguage {
  const t = String(text || '').toLowerCase();
  if (/\b(hola|gracias|por favor|dinero|ahorro)\b/.test(t)) return 'es';
  if (/\b(bonjour|merci|s'il vous plaît|argent|épargne)\b/.test(t)) return 'fr';
  if (/\b(ni hao|xie xie|qian|chuxu)\b/.test(t)) return 'zh';
  return 'en';
}

export function translate(text: string, to: SupportedLanguage): string {
  if (to === 'es') return `[ES] ${text}`;
  if (to === 'fr') return `[FR] ${text}`;
  if (to === 'zh') return `[ZH] ${text}`;
  return text;
}
