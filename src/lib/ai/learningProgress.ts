export function detectLearnedConcepts(text: string): string[] {
  const t = String(text || '').toLowerCase();
  const concepts: Array<{ key: string; match: RegExp }> = [
    { key: 'Emergency fund', match: /emergency fund|buffer|cushion/i },
    { key: 'APR', match: /\bapr\b|interest rate/i },
    { key: 'Cashflow', match: /cashflow|money left each month/i },
    { key: 'Debt payoff', match: /debt payoff|avalanche|snowball/i },
    { key: 'Index funds', match: /index fund|etf/i },
    { key: '401(k)', match: /401\(k\)|401k/i },
    { key: 'Roth IRA', match: /roth\s*ira/i },
  ];
  return concepts.filter((c) => c.match.test(t)).map((c) => c.key);
}
