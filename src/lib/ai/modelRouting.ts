export type ModelTier = 'light' | 'premium';

const ANALYTICAL_TERMS = [
  'roi',
  'apr',
  'yield',
  'basis points',
  'allocation',
  'portfolio',
  'cashflow',
  'net',
  'debt-to-income',
  'dti',
  'amortization',
  'tax',
  'ira',
  '401k',
];

export function inferModelTier(args: {
  type: string;
  question?: string;
  messages?: Array<{ role: string; content: string }>;
}): ModelTier {
  const type = String(args.type || '').toLowerCase();
  if (type === 'extract') return 'light';
  if (type === 'answer_explain' || type === 'answer_explain_stream') return 'premium';
  if (type === 'answer' || type === 'answer_stream') return 'light';

  const lastUser = [...(args.messages || [])].reverse().find((m) => m.role === 'user');
  const t = String(args.question || lastUser?.content || '').toLowerCase();

  if (t.length > 220) return 'premium';
  if (ANALYTICAL_TERMS.some((term) => t.includes(term))) return 'premium';
  return 'light';
}
