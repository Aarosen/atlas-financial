export type ResponsePreference = 'short' | 'explain';
export type LiteracyLevel = 'novice' | 'intermediate' | 'advanced';

export function detectResponsePreference(text: string): ResponsePreference | null {
  const t = String(text || '').toLowerCase();
  if (!t) return null;
  if (/\b(short|brief|tl;dr|too long|keep it short|quick answer)\b/.test(t)) return 'short';
  if (/\b(explain|details|deep dive|walk me through|teach me)\b/.test(t)) return 'explain';
  return null;
}

export function detectLiteracyLevel(text: string): LiteracyLevel | null {
  const t = String(text || '').toLowerCase();
  if (!t) return null;
  if (/\b(new to|beginner|novice|no idea|not sure how|explain like)\b/.test(t)) return 'novice';
  if (/\b(irr|basis points|duration|alpha|beta|tax loss harvesting|amortization)\b/.test(t)) return 'advanced';
  if (/\b(401k|ira|apr|apy|index fund|roth)\b/.test(t)) return 'intermediate';
  return null;
}
