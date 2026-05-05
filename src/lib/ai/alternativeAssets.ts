/**
 * Alternative Assets Guidance
 * Provides high-net-worth users with alternative investment opportunities
 */

export interface AlternativeAssetPlan {
  netWorth: number;
  liquidAssets: number;
  wealthLevel: 'accredited' | 'high_net_worth' | 'ultra_high_net_worth';
  opportunities: AlternativeAsset[];
  guidance: string;
}

export interface AlternativeAsset {
  name: string;
  category: 'private_credit' | 'real_estate' | 'private_equity' | 'hedge_funds' | 'commodities' | 'collectibles';
  minimumInvestment: number;
  expectedReturn: number; // percentage
  riskLevel: 'low' | 'moderate' | 'high' | 'very_high';
  liquidity: 'high' | 'moderate' | 'low' | 'very_low';
  description: string;
  suitability: string;
}

// Wealth thresholds
const WEALTH_THRESHOLDS = {
  accredited: 1000000, // $1M net worth or $200k income
  high_net_worth: 5000000, // $5M net worth
  ultra_high_net_worth: 30000000, // $30M net worth
};

/**
 * Determine wealth level for alternative asset recommendations
 */
function getWealthLevel(netWorth: number): AlternativeAssetPlan['wealthLevel'] {
  if (netWorth < WEALTH_THRESHOLDS.accredited) return 'accredited';
  if (netWorth < WEALTH_THRESHOLDS.high_net_worth) return 'accredited';
  if (netWorth < WEALTH_THRESHOLDS.ultra_high_net_worth) return 'high_net_worth';
  return 'ultra_high_net_worth';
}

/**
 * Get alternative asset opportunities based on wealth level
 */
function getAlternativeAssets(
  netWorth: number,
  liquidAssets: number,
  wealthLevel: AlternativeAssetPlan['wealthLevel']
): AlternativeAsset[] {
  const assets: AlternativeAsset[] = [];

  // Accredited investors ($1M+)
  if (netWorth >= WEALTH_THRESHOLDS.accredited) {
    assets.push({
      name: 'Private Credit / Peer-to-Peer Lending',
      category: 'private_credit',
      minimumInvestment: 25000,
      expectedReturn: 6,
      riskLevel: 'moderate',
      liquidity: 'low',
      description: 'Direct lending to businesses or individuals, bypassing traditional banks',
      suitability: 'Income-focused investors seeking 6-8% returns with moderate risk',
    });

    assets.push({
      name: 'Real Estate Syndication',
      category: 'real_estate',
      minimumInvestment: 50000,
      expectedReturn: 8,
      riskLevel: 'moderate',
      liquidity: 'very_low',
      description: 'Passive real estate investments through syndications (apartments, office, retail)',
      suitability: 'Investors seeking real estate exposure without direct management',
    });

    assets.push({
      name: 'Regulation D Private Equity',
      category: 'private_equity',
      minimumInvestment: 100000,
      expectedReturn: 12,
      riskLevel: 'high',
      liquidity: 'very_low',
      description: 'Early-stage company investments through Reg D offerings',
      suitability: 'Growth-focused investors with 7-10 year time horizon',
    });
  }

  // High-net-worth investors ($5M+)
  if (netWorth >= WEALTH_THRESHOLDS.high_net_worth) {
    assets.push({
      name: 'Hedge Funds',
      category: 'hedge_funds',
      minimumInvestment: 500000,
      expectedReturn: 10,
      riskLevel: 'high',
      liquidity: 'low',
      description: 'Actively managed funds with flexible strategies (long/short, arbitrage, etc.)',
      suitability: 'Sophisticated investors seeking alpha and portfolio diversification',
    });

    assets.push({
      name: 'Commodities / Precious Metals',
      category: 'commodities',
      minimumInvestment: 50000,
      expectedReturn: 5,
      riskLevel: 'high',
      liquidity: 'high',
      description: 'Direct commodity investments (gold, oil, agricultural) for inflation protection',
      suitability: 'Inflation hedging and portfolio diversification (5-10% allocation)',
    });

    assets.push({
      name: 'Collectibles / Art Investment',
      category: 'collectibles',
      minimumInvestment: 100000,
      expectedReturn: 8,
      riskLevel: 'very_high',
      liquidity: 'very_low',
      description: 'Fine art, wine, watches, rare collectibles with appreciation potential',
      suitability: 'Collectors with expertise and long time horizons (10+ years)',
    });

    assets.push({
      name: 'Direct Private Equity',
      category: 'private_equity',
      minimumInvestment: 1000000,
      expectedReturn: 15,
      riskLevel: 'very_high',
      liquidity: 'very_low',
      description: 'Direct investments in private companies or co-investments with PE firms',
      suitability: 'Ultra-sophisticated investors with significant capital and expertise',
    });
  }

  // Ultra-high-net-worth investors ($30M+)
  if (netWorth >= WEALTH_THRESHOLDS.ultra_high_net_worth) {
    assets.push({
      name: 'Family Office Structure',
      category: 'private_equity',
      minimumInvestment: 5000000,
      expectedReturn: 12,
      riskLevel: 'moderate',
      liquidity: 'low',
      description: 'Dedicated team managing family wealth across multiple asset classes',
      suitability: 'Ultra-high-net-worth families with complex financial needs',
    });

    assets.push({
      name: 'Venture Capital Funds',
      category: 'private_equity',
      minimumInvestment: 500000,
      expectedReturn: 20,
      riskLevel: 'very_high',
      liquidity: 'very_low',
      description: 'Early-stage technology and innovation investments (10+ year horizon)',
      suitability: 'Growth-focused ultra-HNW investors with long time horizons',
    });
  }

  return assets;
}

/**
 * Build alternative asset plan
 */
export function buildAlternativeAssetPlan(
  netWorth: number,
  liquidAssets: number
): AlternativeAssetPlan {
  const wealthLevel = getWealthLevel(netWorth);
  const opportunities = getAlternativeAssets(netWorth, liquidAssets, wealthLevel);

  const guidance = buildAlternativeAssetGuidance(netWorth, wealthLevel, opportunities);

  return {
    netWorth,
    liquidAssets,
    wealthLevel,
    opportunities,
    guidance,
  };
}

/**
 * Build alternative asset guidance text
 */
function buildAlternativeAssetGuidance(
  netWorth: number,
  wealthLevel: AlternativeAssetPlan['wealthLevel'],
  opportunities: AlternativeAsset[]
): string {
  let guidance = `ALTERNATIVE ASSET OPPORTUNITIES FOR $${netWorth.toLocaleString()} NET WORTH (${wealthLevel.replace(/_/g, ' ').toUpperCase()}):

Alternative assets typically represent 10-30% of a diversified portfolio for HNW investors. They offer:
- Diversification beyond traditional stocks/bonds
- Inflation protection
- Potential for higher returns
- Tax efficiency (in some cases)

AVAILABLE OPPORTUNITIES (by risk level):`;

  // Group by risk level
  const lowRisk = opportunities.filter(a => a.riskLevel === 'low');
  const moderateRisk = opportunities.filter(a => a.riskLevel === 'moderate');
  const highRisk = opportunities.filter(a => a.riskLevel === 'high');
  const veryHighRisk = opportunities.filter(a => a.riskLevel === 'very_high');

  if (lowRisk.length > 0) {
    guidance += `\n\nLOW RISK (6-8% returns):`;
    lowRisk.forEach(a => {
      guidance += `\n- ${a.name}: Min $${a.minimumInvestment.toLocaleString()}. ${a.description}`;
    });
  }

  if (moderateRisk.length > 0) {
    guidance += `\n\nMODERATE RISK (8-12% returns):`;
    moderateRisk.forEach(a => {
      guidance += `\n- ${a.name}: Min $${a.minimumInvestment.toLocaleString()}. ${a.description}`;
    });
  }

  if (highRisk.length > 0) {
    guidance += `\n\nHIGH RISK (12-20% returns):`;
    highRisk.forEach(a => {
      guidance += `\n- ${a.name}: Min $${a.minimumInvestment.toLocaleString()}. ${a.description}`;
    });
  }

  if (veryHighRisk.length > 0) {
    guidance += `\n\nVERY HIGH RISK (20%+ returns, high volatility):`;
    veryHighRisk.forEach(a => {
      guidance += `\n- ${a.name}: Min $${a.minimumInvestment.toLocaleString()}. ${a.description}`;
    });
  }

  guidance += `\n\nIMPORTANT CONSIDERATIONS:
- Alternative assets are illiquid (lock-up periods of 3-10 years typical)
- Due diligence is critical — work with experienced advisors
- Diversify across multiple alternative assets (don't put all capital in one)
- Consider tax implications (some alternatives have preferential tax treatment)
- Maintain 6-12 months emergency fund in liquid assets before investing in alternatives

NEXT STEP: Consult with a fee-only wealth advisor or family office specialist to structure your alternative asset allocation.`;

  return guidance;
}

/**
 * Build system prompt context for alternative assets
 */
export function buildAlternativeAssetContext(plan: AlternativeAssetPlan): string {
  const opportunities = plan.opportunities.map(a => a.name).join(', ');

  return `[ALTERNATIVE_ASSET_CONTEXT]
Net Worth: $${plan.netWorth.toLocaleString()}
Wealth Level: ${plan.wealthLevel}
Available Opportunities: ${opportunities}
Guidance: ${plan.guidance}
[END_ALTERNATIVE_ASSET_CONTEXT]`;
}
