import type { FinancialState, Strategy } from '@/lib/state/types';

export type ActionSuggestion = {
  title: string;
  prompt: string;
};

export function suggestActions(args: {
  fin: FinancialState;
  baseline: Strategy;
}): ActionSuggestion[] {
  const { baseline } = args;
  switch (baseline.lever) {
    case 'stabilize_cashflow':
      return [
        {
          title: 'Trim one expense',
          prompt: 'Pick one bill or category to cut by $50–$150 this week.',
        },
        {
          title: 'Track your top leak',
          prompt: 'Name one category that quietly runs high (dining, subscriptions, delivery).',
        },
      ];
    case 'eliminate_high_interest_debt':
      return [
        {
          title: 'List your top APR',
          prompt: 'Share your highest-interest card (balance + APR).',
        },
        {
          title: 'Auto-pay minimums',
          prompt: 'Confirm auto-pay is on for all cards to avoid fees.',
        },
      ];
    case 'build_emergency_buffer':
      return [
        {
          title: 'Start a small transfer',
          prompt: 'Choose a weekly auto-transfer amount you can keep (even $10–$25).',
        },
        {
          title: 'Name the account',
          prompt: 'Tell me where you want the buffer to live (bank/savings).',
        },
      ];
    case 'increase_future_allocation':
      return [
        {
          title: 'Check your match',
          prompt: 'Do you have a 401(k) match or a Roth IRA option?',
        },
        {
          title: 'Add 1–2%',
          prompt: 'Would you be open to a 1–2% future savings bump?',
        },
      ];
    default:
      return [
        {
          title: 'Shrink one category',
          prompt: 'Pick one discretionary category to trim this week.',
        },
      ];
  }
}
