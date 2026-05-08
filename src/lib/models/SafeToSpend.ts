import { EnvelopeRecord, Envelopes, Transaction } from './Envelopes';

export interface UpcomingBill {
  day: number; // 1-31
  amount: number;
}

export interface SafeToSpendBreakdown {
  expectedIncome: number;
  incomeReceived: number;
  spentSoFar: number;
  reserved: number;
  remainingBills: number;
}

export interface SafeToSpendResult {
  amount: number;
  breakdown: SafeToSpendBreakdown;
}

export class SafeToSpend {
  /**
   * Compute safe-to-spend amount.
   *
   * CORRECTED FORMULA (per Task 2.16 acceptance criteria):
   * safe = (expectedIncome − spentSoFar) − reserved − remainingBills
   *
   * Do NOT add incomeReceived; spentSoFar already implicitly reduces against expected income.
   */
  static compute({
    today,
    envelopeRecord,
    txns,
    upcomingBills = [],
  }: {
    today: number;
    envelopeRecord?: EnvelopeRecord;
    txns: Transaction[];
    upcomingBills?: UpcomingBill[];
  }): SafeToSpendResult {
    const d = new Date(today);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const [year, month] = k.split('-').map(Number);
    const ts0 = new Date(year, month - 1, 1).getTime();
    const ts1 = new Date(year, month, 1).getTime();

    const monthTxns = txns.filter((t) => t.ts >= ts0 && t.ts < ts1);

    // Income received this month (positive)
    const incomeReceived = monthTxns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);

    // Spend so far this month
    const spentSoFar = monthTxns.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

    // Upcoming essential bills today→end of month
    const dayOfMonth = d.getDate();
    const lastDay = new Date(year, month, 0).getDate();
    const remainingBills = upcomingBills
      .filter((b) => b.day >= dayOfMonth && b.day <= lastDay)
      .reduce((s, b) => s + b.amount, 0);

    // Envelope reservations: how much of remaining envelope budget is essentials/savings
    let reserved = 0;
    if (envelopeRecord) {
      const actuals = Envelopes.actuals(envelopeRecord, txns);
      for (const e of envelopeRecord.envelopes) {
        if (['Rent/Mortgage', 'Utilities', 'Insurance', 'Future You', 'Health'].includes(e.name)) {
          reserved += Math.max(0, e.budgeted - (actuals[e.name] || 0));
        }
      }
    }

    const expectedIncome = envelopeRecord?.expectedIncome || 0;
    const total = expectedIncome - spentSoFar - reserved - remainingBills;

    return {
      amount: Math.max(0, total),
      breakdown: {
        expectedIncome,
        incomeReceived,
        spentSoFar,
        reserved,
        remainingBills,
      },
    };
  }
}
