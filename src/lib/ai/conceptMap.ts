import type { Lever } from '@/lib/state/types';

const CONCEPTS: Record<string, string[]> = {
  cashflow: ['Income', 'Essentials', 'Discretionary spend', 'Debt payments'],
  debt: ['APR', 'Minimum payments', 'Debt snowball', 'Debt avalanche'],
  buffer: ['Emergency fund', 'Monthly essentials', 'Liquidity'],
  future: ['401(k)', 'Roth IRA', 'Index funds', 'Compounding'],
  spending: ['Budgeting', 'Subscriptions', 'Needs vs wants'],
};

export function conceptsForLever(lever: Lever): string[] {
  switch (lever) {
    case 'stabilize_cashflow':
      return CONCEPTS.cashflow;
    case 'eliminate_high_interest_debt':
      return CONCEPTS.debt;
    case 'build_emergency_buffer':
      return CONCEPTS.buffer;
    case 'increase_future_allocation':
      return CONCEPTS.future;
    default:
      return CONCEPTS.spending;
  }
}
