export type SupportedLanguage = 'en' | 'es' | 'fr' | 'zh';

/**
 * Detect language from text using simple heuristics
 * For production, integrate with language detection API (franc, textcat, or cloud API)
 */
export function detectLanguage(text: string): SupportedLanguage {
  const t = text.toLowerCase();
  
  // Spanish indicators
  if (/\b(hola|gracias|dinero|presupuesto|ahorrar|deuda|ingresos|gastos|pago|tarjeta|crédito|préstamo)\b/.test(t)) {
    return 'es';
  }
  
  // French indicators
  if (/\b(bonjour|merci|argent|budget|épargner|dette|revenus|dépenses|paiement|carte|crédit|prêt)\b/.test(t)) {
    return 'fr';
  }
  
  // Chinese indicators (Simplified)
  if (/[\u4E00-\u9FFF]/.test(t)) {
    return 'zh';
  }
  
  // Default to English
  return 'en';
}

/**
 * Translate text to target language
 * REM-D: Implement real translation via API (DeepL recommended for financial accuracy)
 * 
 * For production deployment:
 * 1. Set DEEPL_API_KEY environment variable
 * 2. Uncomment the API call below
 * 3. Handle rate limits and errors gracefully
 * 
 * Alternative: Use Google Translate API or other service
 */
export async function translate(text: string, to: SupportedLanguage): Promise<string> {
  // If target is English, no translation needed
  if (to === 'en') {
    return text;
  }
  
  // REM-D: Wire to DeepL API for production
  // This is a placeholder that returns the original text
  // In production, call: https://api-free.deepl.com/v1/document or similar
  
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    console.warn('DEEPL_API_KEY not set. Returning original text. Set DEEPL_API_KEY to enable translation.');
    return text;
  }
  
  try {
    // DeepL API call (example using free tier)
    const targetLang = to === 'es' ? 'ES' : to === 'fr' ? 'FR' : to === 'zh' ? 'ZH' : 'EN';
    
    const response = await fetch('https://api-free.deepl.com/v1/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        target_lang: targetLang,
      }),
    });
    
    if (!response.ok) {
      console.error('DeepL API error:', response.statusText);
      return text;
    }
    
    const data = await response.json() as { translations: Array<{ text: string }> };
    return data.translations[0]?.text || text;
  } catch (error) {
    console.error('Translation error:', error);
    return text;
  }
}

/**
 * Synchronous version for use in non-async contexts
 * Returns original text if translation not available
 */
export function translateSync(text: string, to: SupportedLanguage): string {
  if (to === 'en') {
    return text;
  }
  
  // For synchronous contexts, we cannot call async APIs
  // This is a limitation that requires refactoring to async/await in calling code
  console.warn(`Translation to ${to} requires async API call. Use translate() instead of translateSync().`);
  return text;
}
