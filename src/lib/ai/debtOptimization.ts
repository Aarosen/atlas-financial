/**
 * Advanced Debt Optimization
 * Analyzes debt structure and recommends consolidation, balance transfers, or refinancing
 */

export interface DebtOptimizationAnalysis {
  totalDebt: number;
  weightedApr: number;
  debtCount: number;
  monthlyPayment: number;
  optimizationStrategy: 'consolidation' | 'balance_transfer' | 'refinancing' | 'avalanche' | 'none';
  estimatedSavings: number;
  recommendations: DebtOptimizationRecommendation[];
  guidance: string;
}

export interface DebtOptimizationRecommendation {
  strategy: string;
  description: string;
  estimatedSavings: number;
  implementationTime: string;
  creditImpact: 'positive' | 'neutral' | 'negative';
  requirements: string;
}

/**
 * Analyze debt structure and recommend optimization
 */
export function analyzeDebtOptimization(
  highInterestDebt: number,
  lowInterestDebt: number,
  highInterestApr: number,
  lowInterestApr: number,
  monthlyIncome: number
): DebtOptimizationAnalysis {
  const totalDebt = highInterestDebt + lowInterestDebt;
  const debtCount = (highInterestDebt > 0 ? 1 : 0) + (lowInterestDebt > 0 ? 1 : 0);
  
  // Calculate weighted APR
  const weightedApr = totalDebt > 0
    ? (highInterestDebt * highInterestApr + lowInterestDebt * lowInterestApr) / totalDebt
    : 0;

  // Estimate monthly payment (assuming 3-5 year payoff)
  const monthlyPayment = Math.round(totalDebt / 48); // 4-year average

  // Determine optimization strategy
  let strategy: DebtOptimizationAnalysis['optimizationStrategy'] = 'none';
  let estimatedSavings = 0;

  if (debtCount >= 2 && highInterestDebt > 5000) {
    // Multiple debts with significant high-interest debt
    if (highInterestApr > 15) {
      strategy = 'consolidation'; // Consolidate to lower rate
      estimatedSavings = Math.round((highInterestApr - 8) / 100 * highInterestDebt * 3); // 3-year savings
    } else if (highInterestApr > 10) {
      strategy = 'balance_transfer'; // Balance transfer to 0% APR card
      estimatedSavings = Math.round(highInterestApr / 100 * highInterestDebt * 2); // 2-year savings
    } else {
      strategy = 'avalanche'; // Debt avalanche (highest APR first)
      estimatedSavings = Math.round((highInterestApr - lowInterestApr) / 100 * highInterestDebt * 2);
    }
  } else if (highInterestDebt > 10000 && highInterestApr > 12) {
    // Single large high-interest debt
    strategy = 'refinancing';
    estimatedSavings = Math.round((highInterestApr - 7) / 100 * highInterestDebt * 3);
  }

  const recommendations = getDebtOptimizationRecommendations(
    highInterestDebt,
    lowInterestDebt,
    highInterestApr,
    lowInterestApr,
    strategy,
    monthlyIncome
  );

  const guidance = buildDebtOptimizationGuidance(
    totalDebt,
    weightedApr,
    strategy,
    estimatedSavings,
    recommendations
  );

  return {
    totalDebt,
    weightedApr,
    debtCount,
    monthlyPayment,
    optimizationStrategy: strategy,
    estimatedSavings,
    recommendations,
    guidance,
  };
}

/**
 * Get debt optimization recommendations
 */
function getDebtOptimizationRecommendations(
  highInterestDebt: number,
  lowInterestDebt: number,
  highInterestApr: number,
  lowInterestApr: number,
  strategy: DebtOptimizationAnalysis['optimizationStrategy'],
  monthlyIncome: number
): DebtOptimizationRecommendation[] {
  const recommendations: DebtOptimizationRecommendation[] = [];

  if (strategy === 'consolidation') {
    recommendations.push({
      strategy: 'Debt Consolidation Loan',
      description: `Combine $${highInterestDebt.toLocaleString()} high-interest debt into a single personal loan at 8-10% APR`,
      estimatedSavings: Math.round((highInterestApr - 9) / 100 * highInterestDebt * 3),
      implementationTime: '1-2 weeks',
      creditImpact: 'negative', // Hard inquiry, new account
      requirements: 'Credit score 650+, debt-to-income ratio < 50%',
    });

    recommendations.push({
      strategy: 'Balance Transfer + Consolidation',
      description: `Transfer high-interest debt to 0% APR balance transfer card (12-21 months), pay off during promotional period`,
      estimatedSavings: Math.round(highInterestApr / 100 * highInterestDebt * 1.5),
      implementationTime: '1 week',
      creditImpact: 'negative', // Hard inquiry
      requirements: 'Credit score 700+, available credit limit',
    });
  }

  if (strategy === 'balance_transfer') {
    recommendations.push({
      strategy: '0% APR Balance Transfer Card',
      description: `Transfer $${highInterestDebt.toLocaleString()} to 0% APR card for 12-21 months (typical 3% transfer fee)`,
      estimatedSavings: Math.round(highInterestApr / 100 * highInterestDebt * 1.5),
      implementationTime: '1 week',
      creditImpact: 'negative',
      requirements: 'Credit score 700+, income verification',
    });

    recommendations.push({
      strategy: 'Aggressive Payoff During 0% Period',
      description: `Pay $${Math.round(highInterestDebt / 18)}/month to eliminate debt before promotional period ends`,
      estimatedSavings: Math.round(highInterestApr / 100 * highInterestDebt * 1.5),
      implementationTime: 'Ongoing',
      creditImpact: 'positive', // Reduces utilization
      requirements: 'Discipline to avoid new charges',
    });
  }

  if (strategy === 'refinancing') {
    recommendations.push({
      strategy: 'Personal Loan Refinancing',
      description: `Refinance $${highInterestDebt.toLocaleString()} at ${Math.max(6, highInterestApr - 4)}% APR (vs current ${highInterestApr}%)`,
      estimatedSavings: Math.round((highInterestApr - Math.max(6, highInterestApr - 4)) / 100 * highInterestDebt * 3),
      implementationTime: '1-2 weeks',
      creditImpact: 'negative', // Hard inquiry
      requirements: 'Credit score 680+, stable income',
    });

    if (highInterestDebt > 20000) {
      recommendations.push({
        strategy: 'Home Equity Line of Credit (HELOC)',
        description: `Borrow against home equity at 7-9% APR (tax-deductible interest)`,
        estimatedSavings: Math.round((highInterestApr - 8) / 100 * highInterestDebt * 3),
        implementationTime: '2-4 weeks',
        creditImpact: 'negative',
        requirements: 'Home equity available, credit score 700+',
      });
    }
  }

  if (strategy === 'avalanche') {
    recommendations.push({
      strategy: 'Debt Avalanche Method',
      description: `Pay minimum on low-interest debt ($${lowInterestDebt.toLocaleString()} @ ${lowInterestApr}%), attack high-interest debt ($${highInterestDebt.toLocaleString()} @ ${highInterestApr}%) first`,
      estimatedSavings: Math.round((highInterestApr - lowInterestApr) / 100 * highInterestDebt * 2),
      implementationTime: 'Ongoing',
      creditImpact: 'positive', // Reduces utilization
      requirements: 'Discipline and monthly budget',
    });

    if (highInterestApr > 15) {
      recommendations.push({
        strategy: 'Combine Avalanche + Balance Transfer',
        description: `Transfer high-interest debt to 0% card, use freed-up cash flow to attack low-interest debt`,
        estimatedSavings: Math.round((highInterestApr + lowInterestApr) / 100 * (highInterestDebt + lowInterestDebt) * 1.5),
        implementationTime: '1 week + ongoing',
        creditImpact: 'neutral',
        requirements: 'Credit score 700+, available credit',
      });
    }
  }

  return recommendations;
}

/**
 * Build debt optimization guidance
 */
function buildDebtOptimizationGuidance(
  totalDebt: number,
  weightedApr: number,
  strategy: DebtOptimizationAnalysis['optimizationStrategy'],
  estimatedSavings: number,
  recommendations: DebtOptimizationRecommendation[]
): string {
  let guidance = `DEBT OPTIMIZATION ANALYSIS:

Total Debt: $${totalDebt.toLocaleString()}
Weighted APR: ${weightedApr.toFixed(1)}%
Estimated Annual Interest Cost: $${Math.round(totalDebt * weightedApr / 100).toLocaleString()}`;

  if (strategy !== 'none') {
    guidance += `\n\nRECOMMENDED STRATEGY: ${strategy.replace(/_/g, ' ').toUpperCase()}
Estimated 3-Year Savings: $${estimatedSavings.toLocaleString()}`;
  }

  guidance += `\n\nOPTIONS TO CONSIDER:`;

  recommendations.forEach((rec, i) => {
    guidance += `\n\n${i + 1}. ${rec.strategy}
   ${rec.description}
   Savings: $${rec.estimatedSavings.toLocaleString()} | Time: ${rec.implementationTime}
   Credit Impact: ${rec.creditImpact} | Requirements: ${rec.requirements}`;
  });

  guidance += `\n\nIMPORTANT: Do NOT close paid-off accounts immediately. Keep them open to maintain credit history and lower credit utilization ratio. This helps your credit score long-term.`;

  return guidance;
}

/**
 * Build system prompt context for debt optimization
 */
export function buildDebtOptimizationContext(analysis: DebtOptimizationAnalysis): string {
  return `[DEBT_OPTIMIZATION_CONTEXT]
Total Debt: $${analysis.totalDebt.toLocaleString()}
Weighted APR: ${analysis.weightedApr.toFixed(1)}%
Recommended Strategy: ${analysis.optimizationStrategy}
Estimated Savings: $${analysis.estimatedSavings.toLocaleString()}
Available Options: ${analysis.recommendations.length} strategies
Guidance: ${analysis.guidance}
[END_DEBT_OPTIMIZATION_CONTEXT]`;
}
