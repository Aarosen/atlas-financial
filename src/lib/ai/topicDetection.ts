export type ConversationTopic =
  | 'emergency_fund'
  | 'debt'
  | 'budget'
  | 'savings'
  | 'net_worth'
  | 'retirement'
  | 'cashflow'
  | 'general';

const TOPIC_MAP: Record<ConversationTopic, string[]> = {
  emergency_fund: ['emergency', 'rainy day', 'safety net', 'cushion', 'liquid', 'unexpected'],
  debt: ['debt', 'credit card', 'loan', 'owe', 'interest', 'balance', 'pay off', 'payoff'],
  budget: ['budget', 'spending', 'expenses', 'cut', 'afford', 'overspend', 'where does', 'categories'],
  savings: ['save', 'saving', 'house', 'car', 'vacation', 'wedding', 'education', 'goal', 'down payment'],
  net_worth: ['net worth', 'assets', 'liabilities', 'wealthy', 'how much am i worth'],
  retirement: ['retire', 'retirement', '401k', 'ira', 'roth', 'fire', 'financial independence'],
  cashflow: ['income', 'take home', 'cash flow', 'make ends meet', 'running low', 'month to month'],
  general: [],
};

export function detectTopic(
  messages: Array<{ role: string; content: string }>
): ConversationTopic {
  const text = messages.map(m => m.content).join(' ').toLowerCase();
  for (const [topic, keywords] of Object.entries(TOPIC_MAP) as [ConversationTopic, string[]][]) {
    if (keywords.some(k => text.includes(k))) return topic;
  }
  return 'general';
}
