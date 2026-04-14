/**
 * DEBT PAYOFF CALCULATIONS
 *
 * Deterministic calculations for debt payoff timelines using avalanche and snowball methods.
 * Provides exact payoff dates, total interest paid, and strategy comparison.
 */

export interface Debt {
  name: string;
  balance: number;
  interestRate: number | null; // Annual percentage rate (e.g., 18.5 for 18.5%), null if unknown
  minimumPayment: number;
}

export interface DebtPayoffResult {
  strategy: 'avalanche' | 'snowball';
  monthsToPayoff: number;
  payoffDate: string;
  totalInterestPaid: number;
  totalAmountPaid: number;
  payoffOrder: string[];
  monthlyBreakdown: MonthlyPayment[];
}

export interface MonthlyPayment {
  month: number;
  date: string;
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
  debtsPaid: string[];
}

export interface DebtPayoffComparison {
  avalanche: DebtPayoffResult;
  snowball: DebtPayoffResult;
  interestSavings: number;
  monthsSaved: number;
  recommendation: string;
}

/**
 * Calculate debt payoff using avalanche method (highest interest rate first)
 */
export function calculateAvalanche(
  debts: Debt[],
  monthlyPayment: number
): DebtPayoffResult {
  // AUDIT 26 FIX REM-26-A Part 2: Filter out debts with unknown APR
  // Cannot calculate payoff timeline without APR — skip them entirely
  const debtsWithAPR = debts.filter((d) => d.interestRate !== null && d.interestRate !== undefined);
  
  if (debtsWithAPR.length === 0 || monthlyPayment <= 0) {
    return {
      strategy: 'avalanche',
      monthsToPayoff: 0,
      payoffDate: new Date().toISOString().split('T')[0],
      totalInterestPaid: 0,
      totalAmountPaid: 0,
      payoffOrder: [],
      monthlyBreakdown: [],
    };
  }

  // Sort by interest rate (highest first)
  const sortedDebts = debtsWithAPR
    .map((d) => ({ ...d, interestRate: d.interestRate as number }))
    .sort((a, b) => b.interestRate - a.interestRate);

  return simulatePayoff(sortedDebts, monthlyPayment, 'avalanche');
}

/**
 * Calculate debt payoff using snowball method (smallest balance first)
 */
export function calculateSnowball(
  debts: Debt[],
  monthlyPayment: number
): DebtPayoffResult {
  // AUDIT 26 FIX REM-26-A Part 2: Filter out debts with unknown APR
  // Cannot calculate payoff timeline without APR — skip them entirely
  const debtsWithAPR = debts.filter((d) => d.interestRate !== null && d.interestRate !== undefined);
  
  if (debtsWithAPR.length === 0 || monthlyPayment <= 0) {
    return {
      strategy: 'snowball',
      monthsToPayoff: 0,
      payoffDate: new Date().toISOString().split('T')[0],
      totalInterestPaid: 0,
      totalAmountPaid: 0,
      payoffOrder: [],
      monthlyBreakdown: [],
    };
  }

  // Sort by balance (smallest first)
  const sortedDebts = debtsWithAPR
    .map((d) => ({ ...d, interestRate: d.interestRate as number }))
    .sort((a, b) => a.balance - b.balance);

  return simulatePayoff(sortedDebts, monthlyPayment, 'snowball');
}

/**
 * Simulate month-by-month payoff
 * AUDIT 26 FIX REM-26-A Part 2: Only accepts debts with known APR (number, not null)
 */
function simulatePayoff(
  debts: Debt[],
  monthlyPayment: number,
  strategy: 'avalanche' | 'snowball'
): DebtPayoffResult {
  const debtsCopy = debts.map((d) => ({ ...d }));
  const monthlyBreakdown: MonthlyPayment[] = [];
  let totalInterestPaid = 0;
  let totalAmountPaid = 0;
  let month = 0;
  const payoffOrder: string[] = [];

  // Simulate month by month
  while (debtsCopy.some((d) => d.balance > 0) && month < 600) {
    // 50 year max
    month++;

    // Calculate interest for all debts
    let totalInterestThisMonth = 0;
    for (const debt of debtsCopy) {
      if (debt.balance > 0 && debt.interestRate !== null && typeof debt.interestRate === 'number') {
        const monthlyRate = debt.interestRate / 100 / 12;
        const interestCharge = debt.balance * monthlyRate;
        debt.balance += interestCharge;
        totalInterestThisMonth += interestCharge;
      }
    }

    // Apply payment to debts (in priority order)
    let remainingPayment = monthlyPayment;
    const debtsPaidThisMonth: string[] = [];

    for (const debt of debtsCopy) {
      if (remainingPayment <= 0) break;

      if (debt.balance > 0) {
        const payment = Math.min(remainingPayment, debt.balance);
        debt.balance -= payment;
        remainingPayment -= payment;

        if (debt.balance <= 0.01) {
          // Debt paid off
          debt.balance = 0;
          if (!payoffOrder.includes(debt.name)) {
            payoffOrder.push(debt.name);
          }
          debtsPaidThisMonth.push(debt.name);
        }
      }
    }

    totalInterestPaid += totalInterestThisMonth;
    totalAmountPaid += monthlyPayment;

    monthlyBreakdown.push({
      month,
      date: addMonths(new Date(), month).toISOString().split('T')[0],
      principalPaid: monthlyPayment - totalInterestThisMonth,
      interestPaid: totalInterestThisMonth,
      remainingBalance: debtsCopy.reduce((sum, d) => sum + Math.max(0, d.balance), 0),
      debtsPaid: debtsPaidThisMonth,
    });
  }

  const payoffDate = addMonths(new Date(), month).toISOString().split('T')[0];

  return {
    strategy,
    monthsToPayoff: month,
    payoffDate,
    totalInterestPaid: Math.round(totalInterestPaid),
    totalAmountPaid: Math.round(totalAmountPaid),
    payoffOrder,
    monthlyBreakdown: monthlyBreakdown.slice(0, 12), // Return first 12 months for display
  };
}

/**
 * Compare avalanche vs snowball strategies
 */
export function compareDebtStrategies(
  debts: Debt[],
  monthlyPayment: number
): DebtPayoffComparison {
  const avalanche = calculateAvalanche(debts, monthlyPayment);
  const snowball = calculateSnowball(debts, monthlyPayment);

  const interestSavings = snowball.totalInterestPaid - avalanche.totalInterestPaid;
  const monthsSaved = snowball.monthsToPayoff - avalanche.monthsToPayoff;

  let recommendation = '';
  if (interestSavings > 0) {
    recommendation = `Avalanche saves $${Math.round(interestSavings)} in interest and ${monthsSaved} months compared to snowball.`;
  } else if (interestSavings < 0) {
    recommendation = `Snowball saves $${Math.round(Math.abs(interestSavings))} in interest compared to avalanche.`;
  } else {
    // When there's only one debt, both methods are identical
    if (debts.length === 1) {
      recommendation = `With only one debt, both avalanche and snowball methods produce identical results. Focus on paying $${Math.round(monthlyPayment)} monthly to be debt-free in ${avalanche.monthsToPayoff} months.`;
    } else {
      recommendation = 'Both strategies result in the same total interest paid. Choose based on psychological preference: avalanche minimizes interest, snowball builds momentum.';
    }
  }

  return {
    avalanche,
    snowball,
    interestSavings: Math.round(interestSavings),
    monthsSaved,
    recommendation,
  };
}

/**
 * Format debt payoff calculation as a system prompt block
 */
export function formatDebtPayoffBlock(comparison: DebtPayoffComparison): string {
  const avalanche = comparison.avalanche;
  const snowball = comparison.snowball;

  let block = `
CALCULATION RESULTS (use these exact numbers):
AVALANCHE METHOD (highest interest rate first):
- Payoff date: ${avalanche.payoffDate}
- Months to payoff: ${avalanche.monthsToPayoff}
- Total interest paid: $${avalanche.totalInterestPaid}
- Total amount paid: $${avalanche.totalAmountPaid}
- Payoff order: ${avalanche.payoffOrder.join(' → ')}

SNOWBALL METHOD (smallest balance first):
- Payoff date: ${snowball.payoffDate}
- Months to payoff: ${snowball.monthsToPayoff}
- Total interest paid: $${snowball.totalInterestPaid}
- Total amount paid: $${snowball.totalAmountPaid}
- Payoff order: ${snowball.payoffOrder.join(' → ')}

COMPARISON:
- Interest savings with avalanche: $${comparison.interestSavings}
- Time savings with avalanche: ${comparison.monthsSaved} months
- Recommendation: ${comparison.recommendation}`;

  return block;
}

/**
 * Helper: Add months to a date
 */
function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
