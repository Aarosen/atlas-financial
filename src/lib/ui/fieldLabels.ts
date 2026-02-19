export function humanizeFieldName(field: string): string {
  const map: Record<string, string> = {
    monthlyIncome: 'monthly income',
    essentialExpenses: 'essentials',
    discretionaryExpenses: 'discretionary spending',
    totalSavings: 'savings',
    highInterestDebt: 'high-interest debt',
    lowInterestDebt: 'low-interest debt',
    monthlyDebtPayments: 'debt payments',
    primaryGoal: 'primary goal',
    timeHorizonYears: 'time horizon',
    riskTolerance: 'risk tolerance',
    biggestConcern: 'biggest concern',
  };
  return map[field] || field;
}

export function humanizeFieldList(fields: string[]): string[] {
  return fields.map(humanizeFieldName);
}
