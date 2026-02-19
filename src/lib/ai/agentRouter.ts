export type AgentDomain = 'personal_finance' | 'taxes_accounting' | 'investments' | 'retirement';

export type AgentRoute = {
  domain: AgentDomain;
  label: string;
};

const DOMAIN_LABELS: Record<AgentDomain, string> = {
  personal_finance: 'Personal Finance & Finance Agent',
  taxes_accounting: 'Taxes & Accounting Agent',
  investments: 'Investments Agent',
  retirement: 'Retirement Agent',
};

export function routeAgentForText(text: string): AgentRoute {
  const t = String(text || '').toLowerCase();

  if (/tax|irs|deduction|credit|w-2|1099|filing|write\s*off|withholding|accounting|bookkeep/i.test(t)) {
    return { domain: 'taxes_accounting', label: DOMAIN_LABELS.taxes_accounting };
  }
  if (/invest|portfolio|etf|index fund|stock|bond|allocation|return|dividend|brokerage/i.test(t)) {
    return { domain: 'investments', label: DOMAIN_LABELS.investments };
  }
  if (/retire|retirement|401\(k\)|401k|ira|roth|pension|fire|withdrawal|social security/i.test(t)) {
    return { domain: 'retirement', label: DOMAIN_LABELS.retirement };
  }
  return { domain: 'personal_finance', label: DOMAIN_LABELS.personal_finance };
}
