/**
 * Gate for extraction pipeline — determines if a message contains financial data
 * that warrants extraction. Prevents extraction from firing on follow-up questions,
 * clarifications, and non-financial messages.
 */

/**
 * Detects if a user message contains financial data patterns.
 * Returns true if the message likely contains new financial information.
 * Returns false if it's a follow-up question, clarification, or non-financial message.
 */
export function containsFinancialData(message: string): boolean {
  if (!message || message.trim().length === 0) return false;

  const lowerMsg = message.toLowerCase();

  // Patterns that indicate financial data
  const financialPatterns = [
    /\$[\d,]+/,                    // Dollar amounts: $1000, $1,500
    /\b\d+k\b/,                    // Thousands: 5k, 50k
    /\bincome\b/,                  // Income-related
    /\bsalary\b/,                  // Salary
    /\bexpense|spending|cost|spend/,     // Expense-related (added "spend")
    /\bdebt|loan|credit card|cc\b/,     // Debt-related (including "cc")
    /\bsavings|saved/,             // Savings
    /\bmonth|annual|yearly/,       // Time period (often with amounts)
    /\bpay|payment|paying/,        // Payment-related
    /\brent|mortgage|housing/,     // Housing costs
    /\bfood|groceries|utilities/,  // Common expenses
    /\binvest|retirement|401k/,    // Investment-related
    /\bapr|interest|rate/,         // Financial terms
    /\bgoal|goals/,                // Goal-related (financial goals)
  ];

  // Check if message matches any financial pattern
  const hasFinancialPattern = financialPatterns.some(pattern => pattern.test(lowerMsg));

  if (!hasFinancialPattern) return false;

  // Additional check: reject messages that are purely questions without data
  // "What should I do?" "Can you help?" "How much?" — these are follow-ups
  const purelyQuestionPattern = /^(what|how|can|should|do|will|would|is|are|why|when|where)\b/i;
  const startsWithQuestion = purelyQuestionPattern.test(lowerMsg.trim());

  // If it starts with a question word AND has no dollar amounts or specific numbers, it's likely a follow-up
  // EXCEPTION: If it mentions debt/credit/loan, it's financial data even if it starts with a question
  const mentionsDebt = /\bdebt|loan|credit card|cc\b/.test(lowerMsg);
  if (startsWithQuestion && !/\$[\d,]+|\b\d+k\b|\b\d{3,}\b/.test(lowerMsg) && !mentionsDebt) {
    return false;
  }

  return true;
}

/**
 * Determines if extraction should be gated (skipped) for this message.
 * Returns true if extraction should be SKIPPED (gate is closed).
 * Returns false if extraction should PROCEED (gate is open).
 */
export function shouldGateExtraction(message: string): boolean {
  // If message doesn't contain financial data, gate (skip) extraction
  return !containsFinancialData(message);
}
