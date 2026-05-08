export interface FinancialSnapshot {
  monthlyIncome: number | null;
  monthlyFixedExpenses: number | null;
  monthlyVariableExpenses: number | null;
  currentSavings: number | null;
  totalDebt: number | null;
  monthlyDebtPayments: number | null;
  debts: Array<{ name: string; balance: number; rate: number; minPayment: number }>;
}

export function extractFinancialSnapshot(
  messages: Array<{ role: string; content: string }>
): FinancialSnapshot | null {
  const userText = messages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join(' ');

  // Extract with confidence assessment
  const incomeMatch = userText.match(
    /(?:income|take.?home|earn|make|salary)\s*(?:is|of|:)?\s*(\$?[\d,]+k?)/i
  );
  const expenseMatch = userText.match(
    /(?:expenses?|spend|costs?)\s*(?:is|of|:)?\s*(\$?[\d,]+k?)/i
  );
  const savingsMatch = userText.match(
    /(?:savings?|saved|have)\s*(?:is|of|:)?\s*(\$?[\d,]+k?)/i
  );
  // T0.5: Extract monthly debt payments (required for DTI calculation)
  // Patterns: "pay $500 on debt", "debt payments are $300", "minimum payments $200"
  const debtPaymentMatch = userText.match(
    /(?:debt\s+)?(?:payment|pay|paying|minimum)\s*(?:is|of|:)?\s*(?:to|of)?\s*(\$?[\d,]+k?)/i
  );

  // Assess confidence: explicit numbers are high confidence
  // Numbers extracted from emotional phrases like "paycheck to paycheck" are low confidence
  const incomeConfidence = incomeMatch ? assessConfidence(incomeMatch[0], userText) : 0;
  const expenseConfidence = expenseMatch ? assessConfidence(expenseMatch[0], userText) : 0;
  const savingsConfidence = savingsMatch ? assessConfidence(savingsMatch[0], userText) : 0;
  const debtPaymentConfidence = debtPaymentMatch ? assessConfidence(debtPaymentMatch[0], userText) : 0;

  // Only accept extractions with high confidence (>0.7)
  // This prevents hallucination from emotional language like "paycheck to paycheck"
  const monthlyIncome = incomeConfidence > 0.7 && incomeMatch ? parseAmount(incomeMatch[1]) : null;
  const monthlyFixedExpenses = expenseConfidence > 0.7 && expenseMatch ? parseAmount(expenseMatch[1]) : null;
  const currentSavings = savingsConfidence > 0.7 && savingsMatch ? parseAmount(savingsMatch[1]) : null;
  const monthlyDebtPayments = debtPaymentConfidence > 0.7 && debtPaymentMatch ? parseAmount(debtPaymentMatch[1]) : null;

  if (monthlyIncome === null && monthlyFixedExpenses === null) return null;

  return {
    monthlyIncome,
    monthlyFixedExpenses,
    monthlyVariableExpenses: null,
    currentSavings: currentSavings ?? 0,
    totalDebt: null,
    monthlyDebtPayments,
    debts: [],
  };
}

// Assess confidence that an extraction is from explicit user input, not hallucination
function assessConfidence(matchedText: string, fullText: string): number {
  // High confidence: explicit number statement
  // "make $5000" or "income is $5000" = 0.95
  if (/(?:make|earn|have|got|received|get|income|salary|expenses?|spend|costs?|savings?|saved|debt\s+payment|paying|minimum)\s*(?:is|of|:)?\s*\$?[\d,]+/i.test(matchedText)) {
    return 0.95;
  }
  
  // Low confidence: number appears near emotional language or life event keywords
  // "paycheck to paycheck" or "drowning in debt" = 0.3
  // "$20k raise" should not be treated as income = 0.2
  if (/paycheck|drowning|struggling|broke|desperate|crisis|emergency|raise|bonus|promotion|annual increase/i.test(fullText)) {
    return 0.2;
  }
  
  // Medium confidence: number with context keyword but not explicit
  // "spend around $2000" or "about $5000" = 0.7
  if (/(?:around|about|roughly|approximately|maybe|probably)\s+\$?[\d,]+/i.test(matchedText)) {
    return 0.7;
  }
  
  // Default: moderate confidence
  return 0.6;
}

/**
 * Parse word-form numbers into numeric values.
 * Handles: "a billion", "one million", "5 million", "half a million",
 * "a couple thousand", "a few hundred", "80k", etc.
 * BUG-33-001 FIX: Support non-digit income input like "a billion"
 */
function parseWordNumber(text: string): number | null {
  const clean = text.toLowerCase().trim();

  // Multiplier map
  const multipliers: Record<string, number> = {
    hundred: 100,
    hundreds: 100,
    thousand: 1000,
    thousands: 1000,
    grand: 1000,
    k: 1000,
    million: 1_000_000,
    millions: 1_000_000,
    mil: 1_000_000,
    billion: 1_000_000_000,
    billions: 1_000_000_000,
    trillion: 1_000_000_000_000,
  };

  // Word-to-number for leading words
  const wordNums: Record<string, number> = {
    a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11,
    twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40,
    fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
    hundred: 100, couple: 2, few: 3, several: 4, half: 0.5,
  };

  // Pattern: "a billion", "one million", "5 million", "half a million"
  const wordMultiplierPattern = /^(a\s+half|half\s+a?|(?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|couple|few|several)?\s*\d*\.?\d*)\s*(hundred|thousand|grand|million|billion|trillion)s?$/i;
  const wmMatch = clean.match(wordMultiplierPattern);
  if (wmMatch) {
    const leadingStr = wmMatch[1].trim();
    const multiplierStr = wmMatch[2].toLowerCase();
    const multiplier = multipliers[multiplierStr] || 1;

    // Try numeric part first
    const numericPart = parseFloat(leadingStr.replace(/[^0-9.]/g, ''));
    if (!isNaN(numericPart) && numericPart > 0) {
      return numericPart * multiplier;
    }

    // Try word part
    for (const [word, val] of Object.entries(wordNums)) {
      if (leadingStr.includes(word)) {
        return val * multiplier;
      }
    }

    // "a billion" with no explicit leading number = 1 × multiplier
    if (/^a\b/i.test(leadingStr) || leadingStr === '') {
      return 1 * multiplier;
    }
  }

  // Pattern: bare multiplier word only — "billion", "million"
  for (const [word, val] of Object.entries(multipliers)) {
    if (clean === word || clean === `a ${word}` || clean === `one ${word}`) {
      return val;
    }
  }

  return null;
}

function parseAmount(str: string): number {
  const clean = str.replace(/[$,]/g, '').trim();
  // Handle k/K suffix
  if (/^\d+\.?\d*k$/i.test(clean)) return parseFloat(clean) * 1000;
  // Handle million/billion suffix on digits: "5m", "5M", "5mil"
  if (/^\d+\.?\d*\s*m(il(lion)?)?$/i.test(clean)) return parseFloat(clean) * 1_000_000;
  if (/^\d+\.?\d*\s*b(il(lion)?)?$/i.test(clean)) return parseFloat(clean) * 1_000_000_000;
  // Try word-form
  const wordVal = parseWordNumber(clean);
  if (wordVal !== null) return wordVal;
  // Fallback: plain parse
  return parseFloat(clean);
}
