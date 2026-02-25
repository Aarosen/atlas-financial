/**
 * Investment Domain Module
 * Provides CFA-grade investment education and portfolio guidance
 * Covers asset allocation, diversification, index funds, risk-return tradeoff
 */

export interface InvestmentContext {
  investmentAmount: number;
  timeHorizon: number; // years
  riskTolerance: 'cautious' | 'balanced' | 'growth';
  currentInvestments?: Record<string, number>;
  hasEmergencyFund: boolean;
  hasHighInterestDebt: boolean;
}

export interface AssetAllocation {
  stocks: number; // percentage
  bonds: number;
  cash: number;
  alternatives: number;
}

export interface InvestmentAnalysis {
  recommendedAllocation: AssetAllocation;
  expectedAnnualReturn: number;
  expectedVolatility: number;
  recommendations: string[];
  educationalMoments: string[];
}

const ALLOCATION_TEMPLATES = {
  cautious: {
    stocks: 30,
    bonds: 60,
    cash: 10,
    alternatives: 0,
    expectedReturn: 0.04,
    expectedVolatility: 0.06,
  },
  balanced: {
    stocks: 60,
    bonds: 30,
    cash: 5,
    alternatives: 5,
    expectedReturn: 0.07,
    expectedVolatility: 0.10,
  },
  growth: {
    stocks: 80,
    bonds: 15,
    cash: 2,
    alternatives: 3,
    expectedReturn: 0.09,
    expectedVolatility: 0.14,
  },
};

export function getRecommendedAllocation(ctx: InvestmentContext): AssetAllocation {
  const template = ALLOCATION_TEMPLATES[ctx.riskTolerance];

  // Adjust for time horizon: shorter horizons = more conservative
  if (ctx.timeHorizon < 5) {
    return {
      stocks: Math.max(10, template.stocks * 0.5),
      bonds: Math.min(70, template.bonds * 1.5),
      cash: 20,
      alternatives: 0,
    };
  }

  // Longer horizons can be more aggressive
  if (ctx.timeHorizon > 20) {
    return {
      stocks: Math.min(90, template.stocks * 1.2),
      bonds: Math.max(5, template.bonds * 0.8),
      cash: 2,
      alternatives: template.alternatives,
    };
  }

  return template;
}

export function calculateExpectedReturn(allocation: AssetAllocation): number {
  // Historical average returns (simplified)
  const stockReturn = 0.10;
  const bondReturn = 0.04;
  const cashReturn = 0.05;
  const altReturn = 0.07;

  return (
    (allocation.stocks / 100) * stockReturn +
    (allocation.bonds / 100) * bondReturn +
    (allocation.cash / 100) * cashReturn +
    (allocation.alternatives / 100) * altReturn
  );
}

export function calculateVolatility(allocation: AssetAllocation): number {
  // Simplified volatility calculation
  const stockVol = 0.18;
  const bondVol = 0.05;
  const cashVol = 0.01;
  const altVol = 0.12;

  return (
    (allocation.stocks / 100) * stockVol +
    (allocation.bonds / 100) * bondVol +
    (allocation.cash / 100) * cashVol +
    (allocation.alternatives / 100) * altVol
  );
}

export function generateInvestmentRecommendations(ctx: InvestmentContext): string[] {
  const recommendations: string[] = [];

  // Emergency fund check
  if (!ctx.hasEmergencyFund) {
    recommendations.push(
      'Before investing, ensure you have an emergency fund of 3-6 months of expenses in a high-yield savings account. This prevents you from needing to sell investments at a loss during hardship.'
    );
  }

  // High-interest debt check
  if (ctx.hasHighInterestDebt) {
    recommendations.push(
      'High-interest debt (credit cards, personal loans) typically costs more than you can earn investing. Consider paying down high-interest debt before aggressive investing.'
    );
  }

  // Index fund recommendation
  recommendations.push(
    'For most investors, low-cost index funds (S&P 500, total market, international) outperform actively managed funds over time. Consider a simple three-fund portfolio: US stocks, international stocks, bonds.'
  );

  // Dollar-cost averaging
  if (ctx.investmentAmount > 50000) {
    recommendations.push(
      'For large lump sums, consider dollar-cost averaging: invest the money gradually over 3-6 months. This reduces the risk of investing everything at a market peak.'
    );
  }

  // Rebalancing
  recommendations.push(
    'Rebalance your portfolio annually or when allocations drift >5% from targets. This forces you to "buy low, sell high" automatically.'
  );

  return recommendations;
}

export function generateInvestmentEducation(ctx: InvestmentContext): string[] {
  const moments: string[] = [];

  moments.push(
    'Diversification reduces risk by spreading investments across different asset classes and sectors. A diversified portfolio experiences smaller losses during downturns because different investments move differently.'
  );

  moments.push(
    'The risk-return tradeoff: higher-risk investments (stocks) have higher expected returns but more volatility. Lower-risk investments (bonds) have lower returns but more stability. Your allocation should match your risk tolerance and time horizon.'
  );

  moments.push(
    'Compound growth is powerful: $10,000 invested at 7% annual return grows to ~$76,000 in 30 years. Time in the market beats timing the market. Consistent investing through market ups and downs is the key.'
  );

  moments.push(
    'Active trading and market timing rarely work. Studies show that 80-90% of active fund managers underperform low-cost index funds over 15+ years. Fees matter: a 1% fee difference compounds to massive underperformance over decades.'
  );

  return moments;
}

export function analyzeInvestmentSituation(ctx: InvestmentContext): InvestmentAnalysis {
  const allocation = getRecommendedAllocation(ctx);
  const expectedReturn = calculateExpectedReturn(allocation);
  const volatility = calculateVolatility(allocation);

  return {
    recommendedAllocation: allocation,
    expectedAnnualReturn: expectedReturn,
    expectedVolatility: volatility,
    recommendations: generateInvestmentRecommendations(ctx),
    educationalMoments: generateInvestmentEducation(ctx),
  };
}
