import type { FinancialProfile } from '@/lib/types/profile';

export interface NetWorthResult {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  assetBreakdown: {
    savings: number;
    retirement: number;
    other: number;
  };
  liabilityBreakdown: {
    debt: number;
  };
}

export function calculateNetWorth(p: FinancialProfile): NetWorthResult | null {
  const savings = p.total_savings ?? 0;
  const debt = p.total_debt ?? 0;

  const totalAssets = savings;
  const totalLiabilities = debt;
  const netWorth = totalAssets - totalLiabilities;

  return {
    totalAssets: Math.round(totalAssets),
    totalLiabilities: Math.round(totalLiabilities),
    netWorth: Math.round(netWorth),
    assetBreakdown: {
      savings: Math.round(savings),
      retirement: 0,
      other: 0,
    },
    liabilityBreakdown: {
      debt: Math.round(debt),
    },
  };
}
