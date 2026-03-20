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

  const incomeMatch = userText.match(
    /(?:income|take.?home|earn|make|salary)[^\d]*(\$?[\d,]+k?)/i
  );
  const expenseMatch = userText.match(
    /(?:expenses?|spend|costs?)[^\d]*(\$?[\d,]+k?)/i
  );
  const savingsMatch = userText.match(
    /(?:savings?|saved|have)[^\d]*(\$?[\d,]+k?)/i
  );

  const monthlyIncome = incomeMatch ? parseAmount(incomeMatch[1]) : null;
  const monthlyFixedExpenses = expenseMatch ? parseAmount(expenseMatch[1]) : null;
  const currentSavings = savingsMatch ? parseAmount(savingsMatch[1]) : null;

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

function parseAmount(str: string): number {
  const clean = str.replace(/[$,]/g, '');
  if (clean.toLowerCase().endsWith('k')) return parseFloat(clean) * 1000;
  return parseFloat(clean);
}
