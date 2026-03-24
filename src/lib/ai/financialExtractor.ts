export interface FinancialSnapshot {
  monthlyIncome: number | null;
  monthlyFixedExpenses: number | null;
  monthlyVariableExpenses: number | null;
  currentSavings: number | null;
  totalDebt: number | null;
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
    /(?:income|take.?home|earn|make|salary)[^\d]*(\$?[\d,]+k?)/i
  );
  const expenseMatch = userText.match(
    /(?:expenses?|spend|costs?)[^\d]*(\$?[\d,]+k?)/i
  );
  const savingsMatch = userText.match(
    /(?:savings?|saved|have)[^\d]*(\$?[\d,]+k?)/i
  );

  // Assess confidence: explicit numbers are high confidence
  // Numbers extracted from emotional phrases like "paycheck to paycheck" are low confidence
  const incomeConfidence = incomeMatch ? assessConfidence(incomeMatch[0], userText) : 0;
  const expenseConfidence = expenseMatch ? assessConfidence(expenseMatch[0], userText) : 0;
  const savingsConfidence = savingsMatch ? assessConfidence(savingsMatch[0], userText) : 0;

  // Only accept extractions with high confidence (>0.7)
  // This prevents hallucination from emotional language like "paycheck to paycheck"
  const monthlyIncome = incomeConfidence > 0.7 && incomeMatch ? parseAmount(incomeMatch[1]) : null;
  const monthlyFixedExpenses = expenseConfidence > 0.7 && expenseMatch ? parseAmount(expenseMatch[1]) : null;
  const currentSavings = savingsConfidence > 0.7 && savingsMatch ? parseAmount(savingsMatch[1]) : null;

  if (monthlyIncome === null && monthlyFixedExpenses === null) return null;

  return {
    monthlyIncome,
    monthlyFixedExpenses,
    monthlyVariableExpenses: null,
    currentSavings: currentSavings ?? 0,
    totalDebt: null,
    debts: [],
  };
}

// Assess confidence that an extraction is from explicit user input, not hallucination
function assessConfidence(matchedText: string, fullText: string): number {
  // High confidence: explicit number statement
  // "I make $5000" or "My income is $5000" = 0.95
  if (/^(I\s+)?(?:make|earn|have|got|received|get)\s+\$?[\d,]+/i.test(matchedText)) {
    return 0.95;
  }
  
  // Medium-high confidence: direct statement with keyword
  // "income: $5000" or "expenses: $2000" = 0.85
  if (/(?:income|salary|expenses?|costs?|savings?)[:\s]+\$?[\d,]+/i.test(matchedText)) {
    return 0.85;
  }
  
  // Low confidence: number appears near emotional language
  // "paycheck to paycheck" or "drowning in debt" = 0.3
  if (/paycheck|drowning|struggling|broke|desperate|crisis|emergency/i.test(fullText)) {
    return 0.3;
  }
  
  // Medium confidence: number with context keyword but not explicit
  // "spend around $2000" or "about $5000" = 0.7
  if (/(?:around|about|roughly|approximately|maybe|probably)\s+\$?[\d,]+/i.test(matchedText)) {
    return 0.7;
  }
  
  // Default: moderate confidence
  return 0.6;
}

function parseAmount(str: string): number {
  const clean = str.replace(/[$,]/g, '');
  if (clean.toLowerCase().endsWith('k')) return parseFloat(clean) * 1000;
  return parseFloat(clean);
}
