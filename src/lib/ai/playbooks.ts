type Playbook = {
  title: string;
  body: string;
};

const playbooks: Array<{ key: string; match: RegExp; playbook: Playbook }> = [
  {
    key: 'emergency_fund',
    match: /\b(emergency fund|buffer|rainy day)\b/i,
    playbook: {
      title: 'Emergency fund',
      body: `What it is: cash you can access quickly for surprises.
Why it matters: it keeps one unexpected bill from turning into high‑interest debt.
What “good” can look like: 1 month is relief, 3 months is stable, 6 months is strong.
How to improve it: automate small weekly transfers and reduce one spending leak.
One next step: pick a weekly auto‑transfer you’d keep (even $10–$25).`,
    },
  },
  {
    key: 'apr',
    match: /\bapr|apy\b/i,
    playbook: {
      title: 'APR vs APY',
      body: `What it is: APR is the annual cost of borrowing; APY is the annual yield after compounding.
Why it matters: APR tells you what debt costs; APY tells you what savings earns.
What “good” can look like: lower APR is better for debt; higher APY is better for savings.
How to improve it: refinance high APR debt; shop for higher‑APY savings.
One next step: list your highest APR balance and we’ll target the fastest win.`,
    },
  },
  {
    key: 'dti',
    match: /\bdebt[-\s]?to[-\s]?income|dti\b/i,
    playbook: {
      title: 'Debt‑to‑income (DTI)',
      body: `What it is: your monthly debt payments divided by monthly income.
Why it matters: it shows how much debt pressure you carry and affects approvals.
What “good” can look like: under ~36% is typically healthy; lower is better.
How to improve it: pay down high‑interest balances or increase income.
One next step: share your monthly debt payments and income and I’ll calculate it.`,
    },
  },
];

export function getPlaybookResponse(question: string): Playbook | null {
  const q = String(question || '').trim();
  if (!q) return null;
  const entry = playbooks.find((p) => p.match.test(q));
  return entry ? entry.playbook : null;
}
