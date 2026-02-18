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

export type ComplianceRisk = 'investment_advice' | 'tax_legal' | 'illegal';

export function detectComplianceRisk(input: string): ComplianceRisk | null {
  const t = String(input || '').toLowerCase();
  if (!t) return null;

  if (/\b(tax\s+evasion|evade\s+tax(?:es)?|hide\s+income|money\s+launder|launder)\b/i.test(t)) return 'illegal';
  if (/\b(buy|sell|short|long|invest\s+in|should\s+i\s+buy)\b.*\b(stock|crypto|coin|option|etf|fund)\b/i.test(t)) return 'investment_advice';
  if (/\b(tax\s+return|audit|deduction|write[-\s]?off|legal\s+advice|lawsuit)\b/i.test(t)) return 'tax_legal';
  return null;
}

export function complianceResponse(question: string, risk: ComplianceRisk) {
  const base = String(question || '').trim();
  if (risk === 'illegal') {
    return "I can't help with anything illegal. If you're unsure what's allowed, I can explain the legal options and the safe next steps.";
  }
  if (risk === 'investment_advice') {
    return `I can share educational context and help you compare options, but I can't tell you exactly what to buy or sell. What are you deciding between?`;
  }
  if (risk === 'tax_legal') {
    return `I can explain how this typically works and help you get organized, but for filing or legal advice it’s best to confirm with a qualified tax or legal pro. What part are you unsure about?`;
  }
  return base ? `I can help with that. ${base}` : 'I can help with that.';
}
