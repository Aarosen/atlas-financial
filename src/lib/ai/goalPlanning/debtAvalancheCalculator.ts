/**
 * TASK 3.2: Multi-Debt Avalanche Calculation Module
 * Calculates optimal debt payoff strategy using avalanche method
 */

export interface DebtAccount {
  name: string;
  balance: number;
  apr: number;
  minimumPayment: number;
}

export interface DebtPayoffPlan {
  totalDebt: number;
  totalMinimumPayment: number;
  monthlyExtraPayment: number;
  strategy: 'avalanche' | 'snowball';
  payoffSequence: PayoffStep[];
  totalInterestPaid: number;
  monthsToPayoff: number;
  yearsToPayoff: number;
  interestSavings: number;
  recommendations: string[];
}

export interface PayoffStep {
  month: number;
  account: string;
  principalPayment: number;
  interestPayment: number;
  balance: number;
  isCompleted: boolean;
}

/**
 * Calculate debt avalanche payoff plan
 * Prioritizes highest APR debt first (mathematically optimal)
 * Assumes minimum payments on all debts, extra payment to highest APR
 */
export function calculateDebtAvalanche(
  debts: DebtAccount[],
  monthlyExtraPayment: number
): DebtPayoffPlan {
  // Sort by APR (highest first) for avalanche method
  const sortedDebts = [...debts].sort((a, b) => b.apr - a.apr);
  
  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
  const totalMinimumPayment = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
  
  // Simulate payoff month by month
  const payoffSequence: PayoffStep[] = [];
  const accountBalances = new Map(debts.map(d => [d.name, d.balance]));
  const accountMinPayments = new Map(debts.map(d => [d.name, d.minimumPayment]));
  const accountAPRs = new Map(debts.map(d => [d.name, d.apr]));
  
  let month = 0;
  let totalInterestPaid = 0;
  let remainingExtraPayment = monthlyExtraPayment;
  
  while (accountBalances.size > 0) {
    month++;
    if (month > 600) break; // Safety limit (50 years)
    
    // Calculate interest for all accounts
    const monthlyInterest = new Map<string, number>();
    for (const [name, balance] of accountBalances.entries()) {
      const apr = accountAPRs.get(name) || 0;
      const monthlyRate = apr / 100 / 12;
      const interest = Math.round(balance * monthlyRate);
      monthlyInterest.set(name, interest);
    }
    
    // Apply minimum payments
    const remainingBalance = new Map(accountBalances);
    for (const [name, minPayment] of accountMinPayments.entries()) {
      if (!remainingBalance.has(name)) continue;
      const balance = remainingBalance.get(name) || 0;
      const interest = monthlyInterest.get(name) || 0;
      const principal = Math.min(balance, Math.max(0, minPayment - interest));
      const newBalance = Math.max(0, balance - principal);
      
      if (newBalance === 0) {
        remainingBalance.delete(name);
      } else {
        remainingBalance.set(name, newBalance);
      }
      
      totalInterestPaid += interest;
    }
    
    // Apply extra payment to highest APR debt
    const highestAPRDebt = Array.from(remainingBalance.keys())
      .sort((a, b) => (accountAPRs.get(b) || 0) - (accountAPRs.get(a) || 0))[0];
    
    if (highestAPRDebt && remainingExtraPayment > 0) {
      const balance = remainingBalance.get(highestAPRDebt) || 0;
      const extraPayment = Math.min(balance, remainingExtraPayment);
      const newBalance = Math.max(0, balance - extraPayment);
      
      if (newBalance === 0) {
        remainingBalance.delete(highestAPRDebt);
      } else {
        remainingBalance.set(highestAPRDebt, newBalance);
      }
    }
    
    // Record payoff step for highest APR debt
    if (highestAPRDebt) {
      const interest = monthlyInterest.get(highestAPRDebt) || 0;
      const balance = remainingBalance.get(highestAPRDebt) || 0;
      const principalPayment = (accountBalances.get(highestAPRDebt) || 0) - balance - interest;
      
      payoffSequence.push({
        month,
        account: highestAPRDebt,
        principalPayment: Math.max(0, principalPayment),
        interestPayment: interest,
        balance: Math.max(0, balance),
        isCompleted: balance === 0,
      });
    }
    
    accountBalances.clear();
    for (const [name, balance] of remainingBalance.entries()) {
      accountBalances.set(name, balance);
    }
  }
  
  // Calculate interest savings vs minimum payments only
  const minimumPaymentOnlyInterest = calculateMinimumPaymentInterest(debts);
  const interestSavings = Math.max(0, minimumPaymentOnlyInterest - totalInterestPaid);
  
  const yearsToPayoff = Math.floor(month / 12);
  const monthsRemaining = month % 12;
  
  // Generate recommendations
  const recommendations: string[] = [];
  recommendations.push(`Pay off debts in this order: ${sortedDebts.map(d => d.name).join(' → ')}`);
  recommendations.push(`Total payoff time: ${yearsToPayoff} years ${monthsRemaining} months`);
  recommendations.push(`Total interest paid: $${totalInterestPaid.toLocaleString()}`);
  if (interestSavings > 0) {
    recommendations.push(`Interest savings vs minimum payments: $${interestSavings.toLocaleString()}`);
  }
  
  return {
    totalDebt,
    totalMinimumPayment,
    monthlyExtraPayment,
    strategy: 'avalanche',
    payoffSequence: payoffSequence.slice(0, 60), // Show first 5 years
    totalInterestPaid,
    monthsToPayoff: month,
    yearsToPayoff,
    interestSavings,
    recommendations,
  };
}

function calculateMinimumPaymentInterest(debts: DebtAccount[]): number {
  let totalInterest = 0;
  const balances = new Map(debts.map(d => [d.name, d.balance]));
  
  for (let month = 0; month < 600; month++) {
    let allPaid = true;
    
    for (const debt of debts) {
      const balance = balances.get(debt.name) || 0;
      if (balance <= 0) continue;
      
      allPaid = false;
      const monthlyRate = debt.apr / 100 / 12;
      const interest = Math.round(balance * monthlyRate);
      const principal = Math.max(0, debt.minimumPayment - interest);
      const newBalance = Math.max(0, balance - principal);
      
      balances.set(debt.name, newBalance);
      totalInterest += interest;
    }
    
    if (allPaid) break;
  }
  
  return totalInterest;
}

/**
 * Build system prompt context for debt avalanche planning
 */
export function buildDebtAvalancheContext(plan: DebtPayoffPlan): string {
  const sequenceText = plan.payoffSequence
    .filter((_, i) => i % 12 === 0) // Show every 12 months
    .slice(0, 5)
    .map(step => `Month ${step.month}: ${step.account} balance $${step.balance.toLocaleString()}`)
    .join('; ');
  
  return `DEBT AVALANCHE PLAN:
Total debt: $${plan.totalDebt.toLocaleString()}
Total minimum payment: $${plan.totalMinimumPayment.toLocaleString()}
Monthly extra payment: $${plan.monthlyExtraPayment.toLocaleString()}
Strategy: ${plan.strategy} (highest APR first)
Payoff timeline: ${plan.yearsToPayoff} years ${plan.monthsToPayoff % 12} months
Total interest paid: $${plan.totalInterestPaid.toLocaleString()}
Interest savings: $${plan.interestSavings.toLocaleString()}
Sequence: ${sequenceText}
Recommendations: ${plan.recommendations.join('. ')}`;
}

/**
 * Detect if user is discussing debt payoff
 */
export function isDebtPayoffContext(text: string): boolean {
  const patterns = [
    /\b(debt|loan|credit card|mortgage).{0,30}(payoff|pay off|eliminate|get rid of)\b/i,
    /\b(how long).{0,30}(pay off|eliminate).{0,30}(debt|loan)\b/i,
    /\b(multiple|several).{0,30}(debt|loan|credit card)\b/i,
  ];
  
  return patterns.some(p => p.test(text));
}
