export type ComprehensionSignal = 'low' | 'high' | null;

export function detectComprehensionSignal(text: string): ComprehensionSignal {
  const t = String(text || '').toLowerCase();
  if (!t) return null;
  if (/\b(confused|lost|don'?t get|not sure|no idea|unclear)\b/.test(t)) return 'low';
  if (/\b(got it|makes sense|clear|understand|that helps)\b/.test(t)) return 'high';
  return null;
}
