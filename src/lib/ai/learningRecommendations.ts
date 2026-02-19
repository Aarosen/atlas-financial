export function recommendNextConcept(args: { learned: string[]; focus: string }): string[] {
  const bank: Record<string, string[]> = {
    stability: ['Emergency fund', 'Cashflow basics', 'Debt prioritization'],
    growth: ['Index funds', 'Asset allocation', 'Risk tolerance'],
    flexibility: ['Liquidity planning', 'Sinking funds', 'Budget buffers'],
    wealth_building: ['Retirement accounts', 'Tax optimization', 'Long-term investing'],
  };
  const picks = bank[args.focus] || bank.stability;
  return picks.filter((p) => !args.learned.includes(p)).slice(0, 2);
}
