export type ActionFrequency = 'one_time' | 'weekly' | 'biweekly' | 'monthly';

export type ActionEvent = {
  id?: string;
  type: 'auto_transfer' | 'extra_payment' | 'opened_account' | 'budget_cut' | 'other';
  amountUsd?: number;
  frequency?: ActionFrequency;
  createdAt: number;
  note?: string;
};

export type ActionImpact = {
  monthlyUsd: number;
  yearlyUsd: number;
  fiveYearUsd: number;
};

const WEEKLY_MULTIPLIER = 4.33;
const BIWEEKLY_MULTIPLIER = 2.17;

export function detectAction(text: string): ActionEvent | null {
  const t = String(text || '').toLowerCase();
  if (!t) return null;

  const amountMatch = t.match(/\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(k|thousand)?/i);
  const amount = amountMatch
    ? Number.parseFloat(amountMatch[1].replace(/,/g, '')) * (amountMatch[2] ? 1000 : 1)
    : undefined;

  if (/auto\s*-?transfer|automatic\s*transfer|auto\s*save|set\s*up\s*transfer/.test(t)) {
    return { type: 'auto_transfer', amountUsd: amount, frequency: detectFrequency(t), createdAt: Date.now() };
  }
  if (/extra\s*(payment|pay|paid)|pay\s*extra|additional\s*payment/.test(t)) {
    return { type: 'extra_payment', amountUsd: amount, frequency: 'one_time', createdAt: Date.now() };
  }
  if (/opened\s*(a\s*)?(savings|checking|account)|open\s*account/.test(t)) {
    return { type: 'opened_account', createdAt: Date.now() };
  }
  if (/cut\s*spend|reduced\s*spend|cancel(ed)?\s*(subscription|subscriptions)|saved\s*\$/.test(t)) {
    return { type: 'budget_cut', amountUsd: amount, frequency: detectFrequency(t), createdAt: Date.now() };
  }

  return null;
}

export function estimateActionImpact(action: ActionEvent | null): ActionImpact | null {
  if (!action) return null;
  const amount = action.amountUsd ?? 0;
  if (amount <= 0) return null;

  const monthly = normalizeToMonthly(amount, action.frequency ?? 'one_time');
  return {
    monthlyUsd: monthly,
    yearlyUsd: monthly * 12,
    fiveYearUsd: monthly * 12 * 5,
  };
}

export function describeAction(action: ActionEvent | null): string | null {
  if (!action) return null;
  const amount = action.amountUsd ? `$${Math.round(action.amountUsd)}` : '';
  switch (action.type) {
    case 'auto_transfer':
      return `Set up an auto-transfer ${amount ? `of ${amount}` : ''}`.trim();
    case 'extra_payment':
      return `Made an extra payment ${amount ? `of ${amount}` : ''}`.trim();
    case 'opened_account':
      return 'Opened a new account';
    case 'budget_cut':
      return `Cut spending ${amount ? `by ${amount}` : ''}`.trim();
    default:
      return 'Took a financial action';
  }
}

export function buildActionFeedback(action: ActionEvent | null, impact: ActionImpact | null): string | null {
  if (!action) return null;
  const desc = describeAction(action) || 'Logged a financial action';
  if (!impact) return `Action logged: ${desc}. Consistency is what compounds.`;

  const monthly = Math.round(impact.monthlyUsd);
  const yearly = Math.round(impact.yearlyUsd);
  const fiveYear = Math.round(impact.fiveYearUsd);
  return `Action logged: ${desc}. If you keep this consistent, that's about $${monthly}/month, ~$${yearly}/year, and ~$${fiveYear} over 5 years. Slow, steady, and real.`;
}

function detectFrequency(text: string): ActionFrequency {
  if (/weekly|per\s*week|\/\s*week/.test(text)) return 'weekly';
  if (/biweekly|every\s*two\s*weeks/.test(text)) return 'biweekly';
  if (/monthly|per\s*month|\/\s*month/.test(text)) return 'monthly';
  return 'one_time';
}

function normalizeToMonthly(amount: number, freq: ActionFrequency): number {
  if (freq === 'weekly') return amount * WEEKLY_MULTIPLIER;
  if (freq === 'biweekly') return amount * BIWEEKLY_MULTIPLIER;
  if (freq === 'monthly') return amount;
  return amount; // one_time treated as a single-month impact
}
