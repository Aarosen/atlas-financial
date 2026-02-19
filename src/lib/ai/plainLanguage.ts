const JARGON_MAP: Record<string, string> = {
  apr: 'APR (interest rate)',
  dti: 'DTI (debt-to-income ratio)',
  liquidity: 'liquidity (easy access cash)',
};

export function simplifyExplanation(text: string): string {
  let out = String(text || '');
  Object.entries(JARGON_MAP).forEach(([term, expanded]) => {
    const re = new RegExp(`\\b${term}\\b`, 'gi');
    out = out.replace(re, expanded);
  });
  return out;
}
