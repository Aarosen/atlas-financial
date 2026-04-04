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

  // Scenario 1: Emergency Fund (stabilize_cashflow or build_emergency_fund)
  if (lever === 'stabilize_cashflow' || lever === 'build_emergency_fund') {
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

  // Scenario 3: Low-Interest Debt (refinance or consolidate)
  if (lever === 'refinance_low_interest_debt' && fin.lowInterestDebt && fin.lowInterestDebt > 0) {
    const monthlyPayment = Math.round(fin.lowInterestDebt / 60); // 5-year payoff
    return `${formatCurrency(fin.lowInterestDebt)} at low rates is manageable. Pay ${formatCurrency(monthlyPayment)}/month and you're done in 5 years. Focus on the high-interest debt first if you have it.`;
  }

  // Scenario 4: Build Savings
  if (lever === 'build_savings_buffer') {
    const savingsTarget = fin.essentialExpenses * 6; // 6-month target
    const savingsGap = Math.max(0, savingsTarget - fin.totalSavings);
    const monthlyToSavings = Math.max(100, Math.round(surplus * 0.3)); // 30% of surplus
    const monthsToTarget = savingsGap > 0 ? Math.ceil(savingsGap / Math.max(monthlyToSavings, 100)) : 0;

    return `You have ${formatCurrency(fin.totalSavings)} saved. A 6-month buffer is ${formatCurrency(savingsTarget)}. Put ${formatCurrency(monthlyToSavings)}/month toward savings — you hit the target in ${monthsToTarget} months.`;
  }

  // Scenario 5: Invest for Growth
  if (lever === 'invest_for_growth') {
    const investmentAmount = Math.max(100, Math.round(surplus * 0.5)); // 50% of surplus
    const yearlyReturn = Math.round(investmentAmount * 12 * 0.07); // 7% annual return

    return `With ${formatCurrency(surplus)}/month surplus and emergency fund covered, invest ${formatCurrency(investmentAmount)}/month. At 7% annual return, that's ${formatCurrency(yearlyReturn)}/year in growth.`;
  }

  // Default fallback
  return `Your ${formatCurrency(surplus)} monthly surplus is the lever here. Let's put it to work on your biggest priority.`;
}
