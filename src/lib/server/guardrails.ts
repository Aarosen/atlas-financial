export function violatesGuardrails(t: string) {
  const s = String(t || '').trim();
  if (!s) return true;

  const qmarks = (s.match(/\?/g) || []).length;
  if (qmarks > 1) return true;

  const hasList = /\n\s*[-*]\s+/.test(s) || /\n\s*\d+\./.test(s) || /(^|\n)\s*(?:-\s|\*\s|\d+\.)/.test(s);
  if (hasList) return true;

  const sentenceEnds = s.match(/[.!?](?:\s|$)/g) || [];
  const sentenceCount = sentenceEnds.length || 1;
  if (sentenceCount > 2) return true;

  return false;
}

export function fallbackAnswer(question: string) {
  const q = String(question || '').trim();
  if (!q) return 'I can help with that. What are you trying to figure out?';
  if (q.includes('?')) return `I can help with that. ${q}`;
  return `I can help with that. ${q}?`;
}
