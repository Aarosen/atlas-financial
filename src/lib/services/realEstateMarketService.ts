/**
 * Real Estate Market Data Service
 * Fetches actual housing market data from Zillow API
 * Never hardcodes prices — always uses real data
 */

export interface MarketData {
  city: string;
  state: string;
  medianHomePrice: number;
  pricePerSqFt: number;
  yearOverYearChange: number; // percentage (e.g., 5.2 for 5.2%)
  listingCount: number;
  daysOnMarket: number;
  lastUpdated: string;
}

export interface ProjectedPrice {
  currentPrice: number;
  projectedPrice: number;
  yearsToProject: number;
  annualAppreciationRate: number;
  totalAppreciation: number;
  totalAppreciationPercent: number;
}

/**
 * Get real market data from Zillow API
 * Requires ZILLOW_API_KEY environment variable
 */
export async function getMarketData(city: string, state: string): Promise<MarketData> {
  const apiKey = process.env.ZILLOW_API_KEY;
  if (!apiKey) {
    throw new Error('ZILLOW_API_KEY not configured. Atlas cannot fetch real housing market data.');
  }

  try {
    // Zillow API endpoint for market data
    const url = `https://api.zillow.com/v1/GetRegionChildren.htm?zws-id=${apiKey}&regionName=${encodeURIComponent(city)}&state=${state}&childtype=city`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Zillow API error: ${response.statusText}`);
    }

    const text = await response.text();
    
    // Parse XML response (Zillow returns XML)
    const medianPriceMatch = text.match(/<zestimate><amount currency="USD">([\d,]+)<\/amount>/);
    const pricePerSqFtMatch = text.match(/<pricePerSquareFoot>([\d.]+)<\/pricePerSquareFoot>/);
    const changeMatch = text.match(/<valueChange duration="30days" currency="USD">([\d.-]+)<\/valueChange>/);
    const listingCountMatch = text.match(/<totalListings>(\d+)<\/totalListings>/);
    const daysMatch = text.match(/<daysOnZillow>(\d+)<\/daysOnZillow>/);

    if (!medianPriceMatch) {
      throw new Error(`No market data found for ${city}, ${state}`);
    }

    const medianPrice = parseInt(medianPriceMatch[1].replace(/,/g, ''), 10);
    const pricePerSqFt = pricePerSqFtMatch ? parseFloat(pricePerSqFtMatch[1]) : 0;
    const thirtyDayChange = changeMatch ? parseFloat(changeMatch[1]) : 0;
    // Annualize the 30-day change
    const annualChange = (thirtyDayChange / medianPrice) * (365 / 30) * 100;

    return {
      city,
      state,
      medianHomePrice: medianPrice,
      pricePerSqFt,
      yearOverYearChange: annualChange,
      listingCount: listingCountMatch ? parseInt(listingCountMatch[1], 10) : 0,
      daysOnMarket: daysMatch ? parseInt(daysMatch[1], 10) : 0,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[RealEstateMarketService] Error fetching market data:', error);
    throw error;
  }
}

/**
 * Project home price into the future based on real market appreciation rates
 */
export function projectHomePrice(
  currentPrice: number,
  yearsToProject: number,
  annualAppreciationRate: number
): ProjectedPrice {
  // Use compound growth formula: FV = PV * (1 + r)^n
  const rateDecimal = annualAppreciationRate / 100;
  const projectedPrice = Math.round(currentPrice * Math.pow(1 + rateDecimal, yearsToProject));
  const totalAppreciation = projectedPrice - currentPrice;
  const totalAppreciationPercent = (totalAppreciation / currentPrice) * 100;

  return {
    currentPrice,
    projectedPrice,
    yearsToProject,
    annualAppreciationRate,
    totalAppreciation,
    totalAppreciationPercent,
  };
}

/**
 * Assess home purchase feasibility based on user finances
 */
export function assessAffordability(
  projectedPrice: number,
  monthlyIncome: number,
  currentSavings: number,
  yearsToSave: number,
  downPaymentPercent: number = 20
): {
  isAffordable: boolean;
  reason: string;
  monthlyNeeded: number;
  downPaymentAmount: number;
  savingsGap: number;
} {
  const downPaymentAmount = Math.round(projectedPrice * (downPaymentPercent / 100));
  const savingsGap = Math.max(0, downPaymentAmount - currentSavings);
  const monthsToSave = yearsToSave * 12;
  const monthlyNeeded = monthsToSave > 0 ? Math.ceil(savingsGap / monthsToSave) : 0;

  // Affordability checks
  const maxAffordablePayment = monthlyIncome * 0.28; // 28% debt-to-income ratio
  const estimatedMonthlyPayment = (projectedPrice * 0.8) * (0.07 / 12) * (1 + 0.07 / 12) ** 360 / ((1 + 0.07 / 12) ** 360 - 1); // 30-year mortgage at 7%

  const canAffordPayment = estimatedMonthlyPayment <= maxAffordablePayment;
  const canSaveDownPayment = monthlyNeeded <= (monthlyIncome * 0.2); // Can save 20% of income

  const isAffordable = canAffordPayment && canSaveDownPayment;

  let reason = '';
  if (!canAffordPayment) {
    reason = `Monthly mortgage payment (~$${Math.round(estimatedMonthlyPayment).toLocaleString()}) exceeds 28% of your income ($${Math.round(maxAffordablePayment).toLocaleString()}). This home is financially unrealistic at your current income level.`;
  } else if (!canSaveDownPayment) {
    reason = `You'd need to save $${monthlyNeeded.toLocaleString()}/month for the down payment, which is ${Math.round((monthlyNeeded / monthlyIncome) * 100)}% of your income. That's unrealistic. You need either higher income or a longer timeline.`;
  } else {
    reason = `This is achievable. Save $${monthlyNeeded.toLocaleString()}/month for ${yearsToSave} years, and your monthly mortgage will be ~$${Math.round(estimatedMonthlyPayment).toLocaleString()} (${Math.round((estimatedMonthlyPayment / monthlyIncome) * 100)}% of income).`;
  }

  return {
    isAffordable,
    reason,
    monthlyNeeded,
    downPaymentAmount,
    savingsGap,
  };
}
