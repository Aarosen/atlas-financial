/**
 * Context window extension through memory compression
 * Extends beyond 10-message hardcoded limit by compressing older messages
 */

export interface CompressedMemory {
  summary: string;
  keyFacts: Record<string, any>;
  decisions: string[];
}

/**
 * Compress conversation history when it exceeds threshold
 * Keeps recent messages intact, compresses older ones into summary
 */
export function compressConversationHistory(
  messages: Array<{ role: string; content: string }>,
  maxRecentMessages: number = 10
): {
  recentMessages: Array<{ role: string; content: string }>;
  compressedMemory: CompressedMemory | null;
} {
  if (messages.length <= maxRecentMessages) {
    return { recentMessages: messages, compressedMemory: null };
  }

  const recentMessages = messages.slice(-maxRecentMessages);
  const olderMessages = messages.slice(0, -maxRecentMessages);

  // Extract key facts from older messages
  const keyFacts: Record<string, any> = {};
  const decisions: string[] = [];

  for (const msg of olderMessages) {
    // Extract financial numbers
    const incomeMatch = msg.content.match(/\$?([\d,]+)\s*(?:per month|monthly|income)/i);
    if (incomeMatch) {
      keyFacts.monthlyIncome = parseFloat(incomeMatch[1].replace(/,/g, ''));
    }

    const expenseMatch = msg.content.match(/\$?([\d,]+)\s*(?:in expenses?|spend)/i);
    if (expenseMatch) {
      keyFacts.monthlyExpenses = parseFloat(expenseMatch[1].replace(/,/g, ''));
    }

    const savingsMatch = msg.content.match(/\$?([\d,]+)\s*(?:in savings?|saved)/i);
    if (savingsMatch) {
      keyFacts.totalSavings = parseFloat(savingsMatch[1].replace(/,/g, ''));
    }

    const debtMatch = msg.content.match(/\$?([\d,]+)\s*(?:in debt|owe)/i);
    if (debtMatch) {
      keyFacts.totalDebt = parseFloat(debtMatch[1].replace(/,/g, ''));
    }

    // Extract decisions and commitments
    if (msg.role === 'user' && msg.content.match(/\b(will|going to|commit|promise|plan to)\b/i)) {
      decisions.push(msg.content.substring(0, 150));
    }
  }

  // Build summary of compressed history
  const summary = `Earlier in this conversation, the user discussed their financial situation. Key facts: ${
    Object.entries(keyFacts)
      .map(([key, value]) => `${key}: $${value.toLocaleString()}`)
      .join(', ') || 'financial details'
  }. ${decisions.length > 0 ? `They made commitments: ${decisions.join('; ')}` : ''}`;

  return {
    recentMessages,
    compressedMemory: {
      summary,
      keyFacts,
      decisions,
    },
  };
}

/**
 * Format compressed memory for injection into system prompt
 */
export function formatCompressedMemory(memory: CompressedMemory): string {
  return `━━━ CONVERSATION HISTORY SUMMARY ━━━\n${memory.summary}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
}
