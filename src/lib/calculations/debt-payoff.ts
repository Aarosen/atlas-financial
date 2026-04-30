import type { FinancialProfile, Debt } from '@/lib/types/profile';
import { monthsToPayoff, totalInterestPaid } from './amortization';

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
      monthsToPayoff: Math.ceil(
        monthsToPayoff(
          snowball[0].balance,
          snowball[0].rate / 100,
          (snowball[0].min_payment ?? 0) + extraPayment
        )
      ),
    },
    extraPaymentAvailable: Math.round(extraPayment),
    recommendation: avalanche[0].rate > 10 ? 'avalanche' : 'snowball',
  };
}

function simulatePayoff(debts: Debt[], minPayments: number, extra: number): number {
  // Use exact amortization formula for each debt in order
  // For avalanche/snowball, we pay minimums on all debts except the focus debt
  // which gets minimum + extra payment
  
  let totalMonths = 0;
  let remainingExtra = extra;

  for (let i = 0; i < debts.length; i++) {
    const debt = debts[i];
    const payment = (debt.min_payment ?? 0) + remainingExtra;
    const aprDecimal = debt.rate / 100;
    
    const months = monthsToPayoff(debt.balance, aprDecimal, payment);
    
    if (months === Infinity) {
      // Payment insufficient — this shouldn't happen with proper validation
      return 600; // Cap at 50 years
    }
    
    totalMonths = Math.max(totalMonths, months);
    
    // After this debt is paid, its payment becomes available for next debt
    remainingExtra += debt.min_payment ?? 0;
  }
  
  return Math.ceil(totalMonths);
}
