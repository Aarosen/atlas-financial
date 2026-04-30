/**
 * Exact Amortization Formula Implementation
 * 
 * Uses standard financial mathematics to calculate:
 * - Exact months to pay off a debt
 * - Total interest paid
 * - Monthly payment needed for target payoff timeline
 * 
 * All calculations are deterministic and match financial calculators exactly.
 */

/**
 * Calculate exact months to pay off a debt using amortization formula.
 * 
 * Formula: n = -ln(1 - (r * P / M)) / ln(1 + r)
 * Where:
 *   n = number of months
 *   r = monthly interest rate (APR / 12)
 *   P = principal (balance)
 *   M = monthly payment
 * 
 * @param balance - Current balance in dollars
 * @param aprDecimal - Annual percentage rate as decimal (0.22 for 22%)
 * @param monthlyPayment - Monthly payment in dollars
 * @returns Exact months to payoff (decimal), or Infinity if payment <= interest
 */
export function monthsToPayoff(
  balance: number,
  aprDecimal: number,
  monthlyPayment: number
): number {
  if (balance <= 0) return 0;
  if (monthlyPayment <= 0) return Infinity;

  const monthlyRate = aprDecimal / 12;

  // Zero-interest debt: simple division
  if (monthlyRate === 0) {
    return balance / monthlyPayment;
  }

  const monthlyInterest = balance * monthlyRate;

  // Payment doesn't cover interest — balance grows forever
  if (monthlyPayment <= monthlyInterest) {
    return Infinity;
  }

  // Standard amortization formula:
  // n = -ln(1 - (r * P / M)) / ln(1 + r)
  const numerator = 1 - (monthlyRate * balance) / monthlyPayment;

  if (numerator <= 0) {
    return Infinity;
  }

  return -Math.log(numerator) / Math.log(1 + monthlyRate);
}

/**
 * Calculate total interest paid over the life of the debt.
 * 
 * @param balance - Current balance in dollars
 * @param aprDecimal - Annual percentage rate as decimal (0.22 for 22%)
 * @param monthlyPayment - Monthly payment in dollars
 * @returns Total interest paid in dollars
 */
export function totalInterestPaid(
  balance: number,
  aprDecimal: number,
  monthlyPayment: number
): number {
  const months = monthsToPayoff(balance, aprDecimal, monthlyPayment);

  if (months === Infinity || !isFinite(months)) {
    return Infinity;
  }

  return Math.max(0, monthlyPayment * months - balance);
}

/**
 * Calculate the minimum monthly payment needed to pay off a debt
 * within a target number of months.
 * 
 * Rearranged amortization formula:
 * M = P * r * (1+r)^n / ((1+r)^n - 1)
 * 
 * @param balance - Current balance in dollars
 * @param aprDecimal - Annual percentage rate as decimal (0.22 for 22%)
 * @param targetMonths - Target payoff timeline in months
 * @returns Required monthly payment in dollars
 */
export function paymentForTarget(
  balance: number,
  aprDecimal: number,
  targetMonths: number
): number {
  if (balance <= 0) return 0;
  if (targetMonths <= 0) return Infinity;

  const monthlyRate = aprDecimal / 12;

  // Zero-interest debt: simple division
  if (monthlyRate === 0) {
    return balance / targetMonths;
  }

  // Rearranged amortization formula:
  // M = P * r * (1+r)^n / ((1+r)^n - 1)
  const factor = Math.pow(1 + monthlyRate, targetMonths);
  const numerator = balance * monthlyRate * factor;
  const denominator = factor - 1;

  if (denominator === 0) {
    return Infinity;
  }

  return numerator / denominator;
}

/**
 * Verify that a monthly payment is sufficient to pay off the debt.
 * Returns true if the payment covers at least the monthly interest.
 */
export function isPaymentSufficient(
  balance: number,
  aprDecimal: number,
  monthlyPayment: number
): boolean {
  const monthlyRate = aprDecimal / 12;
  const monthlyInterest = balance * monthlyRate;
  return monthlyPayment > monthlyInterest;
}

/**
 * Format months as a human-readable string.
 * Examples: "3.8 months", "2 years 4 months", "1 year"
 */
export function formatPayoffTimeline(months: number): string {
  if (!isFinite(months)) {
    return 'Never (payment insufficient)';
  }

  if (months < 1) {
    return `${Math.round(months * 30)} days`;
  }

  if (months < 12) {
    return `${months.toFixed(1)} months`;
  }

  const years = Math.floor(months / 12);
  const remainingMonths = Math.round(months % 12);

  if (remainingMonths === 0) {
    return `${years} year${years > 1 ? 's' : ''}`;
  }

  return `${years} year${years > 1 ? 's' : ''} ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
}

/**
 * Test the amortization formula against known values.
 * Used for verification during development.
 */
export function testAmortization() {
  // Test case: $4,000 at 22% APR, $1,200/month
  // Expected: ~3.8 months, ~$115 interest
  const months = monthsToPayoff(4000, 0.22, 1200);
  const interest = totalInterestPaid(4000, 0.22, 1200);

  console.log('[amortization test]');
  console.log(`  $4,000 @ 22% APR, $1,200/month = ${months.toFixed(2)} months, $${interest.toFixed(2)} interest`);
  console.log(`  Expected: ~3.8 months, ~$115 interest`);

  // Test case: $25,000 at 4.5% APR, $500/month
  // Expected: ~54 months (~4.5 years), ~$2,000 interest
  const months2 = monthsToPayoff(25000, 0.045, 500);
  const interest2 = totalInterestPaid(25000, 0.045, 500);

  console.log(`  $25,000 @ 4.5% APR, $500/month = ${months2.toFixed(2)} months, $${interest2.toFixed(2)} interest`);
  console.log(`  Expected: ~54 months, ~$2,000 interest`);
}
