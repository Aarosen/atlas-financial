import type { FinancialProfile, Debt } from '@/lib/types/profile';

export interface DebtPayoffResult {
  hasDebts: boolean;
  totalDebt: number;
  monthlyInterestCost: number;
  annualInterestCost: number;
  avalancheOrder: string[];
  snowballOrder: string[];
  avalancheMonths: number;
  snowballMonths: number;
  highestRateDebt: { name: string; rate: number; balance: number } | null;
  quickWin: { name: string; balance: number; monthsToPayoff: number } | null;
  extraPaymentAvailable: number;
  recommendation: 'avalanche' | 'snowball';
}

export function calculateDebtPayoff(p: FinancialProfile): DebtPayoffResult | null {
  const debts: Debt[] = p.debt_breakdown ?? [];
  if (!debts.length) return null;

  const surplus =
    (p.monthly_income ?? 0) -
    (p.monthly_fixed_expenses ?? 0) -
    (p.monthly_variable_expenses ?? 0);
  const totalMinPayments = debts.reduce((s, d) => s + (d.min_payment ?? 0), 0);
  const extraPayment = Math.max(0, surplus - totalMinPayments);

  const monthlyInterestCost = debts.reduce(
    (s, d) => s + (d.balance * d.rate / 100 / 12),
    0
  );

  const avalanche = [...debts].sort((a, b) => b.rate - a.rate);
  const snowball = [...debts].sort((a, b) => a.balance - b.balance);

  const avalancheMonths = simulatePayoff(avalanche, totalMinPayments, extraPayment);
  const snowballMonths = simulatePayoff(snowball, totalMinPayments, extraPayment);

  return {
    hasDebts: true,
    totalDebt: Math.round(debts.reduce((s, d) => s + d.balance, 0)),
    monthlyInterestCost: Math.round(monthlyInterestCost * 100) / 100,
    annualInterestCost: Math.round(monthlyInterestCost * 12),
    avalancheOrder: avalanche.map(d => d.name),
    snowballOrder: snowball.map(d => d.name),
    avalancheMonths,
    snowballMonths,
    highestRateDebt: {
      name: avalanche[0].name,
      rate: avalanche[0].rate,
      balance: Math.round(avalanche[0].balance),
    },
    quickWin: {
      name: snowball[0].name,
      balance: Math.round(snowball[0].balance),
      monthsToPayoff: Math.ceil(snowball[0].balance / (totalMinPayments + extraPayment)),
    },
    extraPaymentAvailable: Math.round(extraPayment),
    recommendation: avalanche[0].rate > 10 ? 'avalanche' : 'snowball',
  };
}

function simulatePayoff(debts: Debt[], minPayments: number, extra: number): number {
  let balances = debts.map(d => d.balance);
  let months = 0;
  while (balances.some(b => b > 0) && months < 600) {
    months++;
    for (let i = 0; i < debts.length; i++) {
      if (balances[i] <= 0) continue;
      const interest = balances[i] * debts[i].rate / 100 / 12;
      const payment = Math.min(
        balances[i] + interest,
        (debts[i].min_payment ?? 0) + (i === 0 ? extra : 0)
      );
      balances[i] = Math.max(0, balances[i] + interest - payment);
    }
  }
  return months;
}
