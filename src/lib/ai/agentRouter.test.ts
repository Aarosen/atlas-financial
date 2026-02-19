import { describe, expect, it } from 'vitest';

import { routeAgentForText } from './agentRouter';

describe('agentRouter', () => {
  it('routes tax/accounting queries', () => {
    const r = routeAgentForText('How do I file my taxes for a 1099?');
    expect(r.domain).toBe('taxes_accounting');
  });

  it('routes investment queries', () => {
    const r = routeAgentForText('Should I buy an ETF or index fund?');
    expect(r.domain).toBe('investments');
  });

  it('routes retirement queries', () => {
    const r = routeAgentForText('How much should I put in my 401k?');
    expect(r.domain).toBe('retirement');
  });

  it('defaults to personal finance', () => {
    const r = routeAgentForText('I want to cut my spending this month');
    expect(r.domain).toBe('personal_finance');
  });
});
