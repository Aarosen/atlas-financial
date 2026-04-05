/**
 * Generates specific, number-applied recommendation body text for the ATLAS RECOMMENDS card.
 * This replaces the hardcoded template with dynamic text that includes actual dollar figures
 * and calculated targets from the user's financial profile.
 */

export interface FinancialData {
  monthlyIncome: number;
  essentialExpenses: number;
  totalSavings: number;
  highInterestDebt: number | null;
  lowInterestDebt: number | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateRecommendationBody(
  lever: string,
  fin: FinancialData
): string {
  const surplus = fin.monthlyIncome - fin.essentialExpenses;
  const emergencyFundTarget = fin.essentialExpenses * 3;
  const emergencyFundGap = Math.max(0, emergencyFundTarget - fin.totalSavings);
  const monthsToEmergencyFund = emergencyFundGap > 0 ? Math.ceil(emergencyFundGap / Math.max(surplus, 100)) : 0;

  // Scenario 1: Emergency Fund (stabilize_cashflow or build_emergency_buffer)
  if (lever === 'stabilize_cashflow' || lever === 'build_emergency_buffer') {
    if (surplus > 0) {
      const monthlyTransfer = Math.max(100, Math.round(emergencyFundGap / Math.max(monthsToEmergencyFund, 1)));
      return `Your ${formatCurrency(surplus)} monthly surplus is the asset here. To hit a 3-month emergency fund (${formatCurrency(emergencyFundTarget)}), transfer ${formatCurrency(monthlyTransfer)}/month — you're there in ${monthsToEmergencyFund} months.`;
    } else {
      return `With ${formatCurrency(Math.abs(surplus))} monthly shortfall, the first move is to find ${formatCurrency(Math.abs(surplus))} in cuts or income. Once you're cash-flow positive, build the emergency fund.`;
    }
  }

  // Scenario 2: High-Interest Debt
  if (lever === 'eliminate_high_interest_debt' && fin.highInterestDebt && fin.highInterestDebt > 0) {
    const monthlyInterest = Math.round((fin.highInterestDebt * 0.23) / 12); // Assume ~23% APR for high-interest
    const monthlyPayment = Math.max(500, Math.round(surplus * 0.7)); // 70% of surplus toward debt
    const monthsToPayoff = Math.ceil(fin.highInterestDebt / Math.max(monthlyPayment, 100));
    const totalInterestPaid = Math.round(monthlyInterest * monthsToPayoff);

    return `At ${formatCurrency(fin.highInterestDebt)} and ~23% APR, you're paying ~${formatCurrency(monthlyInterest)}/month just in interest. Put ${formatCurrency(monthlyPayment)}/month toward this — you're debt-free in ${monthsToPayoff} months and save ${formatCurrency(totalInterestPaid)} in interest.`;
  }

  // Scenario 3: Increase Future Allocation (grow future savings)
  if (lever === 'increase_future_allocation') {
    const currentSavings = fin.totalSavings;
    const targetMonths = 6;
    const targetAmount = fin.essentialExpenses * targetMonths;
    const needed = Math.max(0, targetAmount - currentSavings);
    const monthsToTarget = surplus > 0 ? Math.ceil(needed / Math.max(surplus, 100)) : null;
    
    if (monthsToTarget === null || monthsToTarget === 0) {
      return `You have ${formatCurrency(currentSavings)} saved — already at or above a ${targetMonths}-month cushion. The next move is putting your ${formatCurrency(surplus)}/month surplus into a vehicle that compounds — not a checking account.`;
    }
    return `You have ${formatCurrency(currentSavings)} saved. A full ${targetMonths}-month cushion is ${formatCurrency(targetAmount)}. Put ${formatCurrency(Math.max(100, Math.round(surplus * 0.5)))}/month toward savings and you're there in ${monthsToTarget} months.`;
  }

  // Scenario 4: Optimize Discretionary Spend
  if (lever === 'optimize_discretionary_spend') {
    const income = fin.monthlyIncome;
    const essentials = fin.essentialExpenses;
    const discretionaryAvailable = surplus;
    const potentialRedirect = Math.round(discretionaryAvailable * 0.3); // 30% of surplus
    
    return `Your essentials are ${formatCurrency(essentials)}/month against ${formatCurrency(income)} income. That leaves ${formatCurrency(discretionaryAvailable)} for everything else. Even redirecting ${formatCurrency(potentialRedirect)} monthly (30% of your surplus) to savings or debt payoff changes the trajectory significantly.`;
  }

  // Default fallback
  return `Your ${formatCurrency(surplus)} monthly surplus is the lever here. Let's put it to work on your biggest priority.`;
}
