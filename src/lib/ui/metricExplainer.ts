import type { FinancialState, Strategy } from '@/lib/state/types';

type Formatters = {
  fc: (n: number) => string;
  fp: (n: number) => string;
};

export function buildMetricExplainer(
  metric: string,
  fin: FinancialState,
  baseline: Strategy,
  fmt: Formatters
) {
  const net = (baseline.metrics as any)?.net ?? fin.monthlyIncome - fin.essentialExpenses - fin.monthlyDebtPayments;

  if (metric === 'net') {
    return `Money left each month\n\n- What it is: what stays after essentials and minimum debt payments.\n- Why it matters: it shows if your month is safe or tight.\n- Your number: ${fmt.fc(net)} per month.\n- What “good” looks like: ${fmt.fc(0)} or higher, then growing over time.\n- How to improve it: cut one cost, lower debt payments, or earn more.\n\nOne next step: tell me one category you can cut by $50–$150 this week (rent, groceries, subscriptions, phone, insurance).`;
  }

  if (metric === 'buffer') {
    return `Emergency cushion\n\n- What it is: months you can cover essentials if income stops.\n- Why it matters: it buys time and avoids new high-interest debt.\n- Your number: ${baseline.bufMo.toFixed(1)} months.\n- What “good” looks like: 1 month helps, 3 months is solid, 6 months is strong.\n- How to improve it: set a small auto-transfer and trim one leak.\n\nOne next step: pick a weekly auto-transfer you can keep (even $10–$25).`;
  }

  if (metric === 'future') {
    return `Future savings\n\n- What it is: the % of your income you save for the future.\n- Why it matters: it builds long-term security.\n- Your number: ${fmt.fp(baseline.futPct)}.\n- What “good” looks like: 10% is a start; 15% is strong for most people.\n- How to improve it: small % bumps and simple automations.\n\nOne next step: do you have a 401(k) match or a Roth IRA?`;
  }

  return `Debt load\n\n- What it is: how heavy your debt payments feel each month.\n- Why it matters: high load makes every month fragile.\n- Your number: ${baseline.dExp}.\n- What “good” looks like: Low (or getting lower over time).\n- How to improve it: pay high-interest balances first and avoid new debt.\n\nOne next step: list your highest-interest debt (card name + balance + APR, rough is fine).`;
}
