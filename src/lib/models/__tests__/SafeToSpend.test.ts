import { describe, it, expect } from 'vitest';
import { SafeToSpend } from '../SafeToSpend';
import { EnvelopeRecord } from '../Envelopes';

describe('SafeToSpend calculator', () => {
  it('should compute safe-to-spend with corrected formula', () => {
    const today = new Date('2026-05-15').getTime();
    const envelopeRecord: EnvelopeRecord = {
      k: '2026-05',
      expectedIncome: 5000,
      envelopes: [
        { name: 'Rent/Mortgage', budgeted: 1500, rolloverPolicy: 'reset' },
        { name: 'Groceries', budgeted: 400, rolloverPolicy: 'reset' },
        { name: 'Utilities', budgeted: 200, rolloverPolicy: 'reset' },
        { name: 'Future You', budgeted: 1000, rolloverPolicy: 'sweep_to_goal' },
        { name: 'Buffer', budgeted: 900, rolloverPolicy: 'rollover' },
      ],
      finalized: false,
      createdAt: Date.now(),
    };

    const txns = [
      {
        ts: new Date('2026-05-01').getTime(),
        amount: 2500, // income
        cat: 'income',
      },
      {
        ts: new Date('2026-05-05').getTime(),
        amount: -1500, // rent
        cat: 'housing',
      },
      {
        ts: new Date('2026-05-10').getTime(),
        amount: -200, // groceries
        cat: 'groceries',
      },
    ];

    const result = SafeToSpend.compute({
      today,
      envelopeRecord,
      txns,
      upcomingBills: [{ day: 20, amount: 100 }],
    });

    // Formula: (expectedIncome - spentSoFar) - reserved - remainingBills
    // Reserved = max(0, budgeted - actual) for: Rent/Mortgage, Utilities, Insurance, Future You, Health
    // Rent: max(0, 1500 - 1500) = 0
    // Utilities: max(0, 200 - 0) = 200
    // Future You: max(0, 1000 - 0) = 1000
    // Total reserved = 1200
    // = (5000 - 1700) - 1200 - 100
    // = 3300 - 1200 - 100
    // = 2000
    expect(result.amount).toBe(2000);
    expect(result.breakdown.expectedIncome).toBe(5000);
    expect(result.breakdown.spentSoFar).toBe(1700);
    expect(result.breakdown.reserved).toBe(1200); // Utilities + Future You (Rent already spent)
    expect(result.breakdown.remainingBills).toBe(100);
  });

  it('should never return negative safe-to-spend', () => {
    const today = new Date('2026-05-15').getTime();
    const envelopeRecord: EnvelopeRecord = {
      k: '2026-05',
      expectedIncome: 3000,
      envelopes: [
        { name: 'Rent/Mortgage', budgeted: 2000, rolloverPolicy: 'reset' },
        { name: 'Future You', budgeted: 1500, rolloverPolicy: 'sweep_to_goal' },
      ],
      finalized: false,
      createdAt: Date.now(),
    };

    const txns = [
      {
        ts: new Date('2026-05-05').getTime(),
        amount: -2000,
        cat: 'housing',
      },
    ];

    const result = SafeToSpend.compute({
      today,
      envelopeRecord,
      txns,
      upcomingBills: [],
    });

    // Over-allocated: 3000 - 2000 - 3500 = -2500 → clamped to 0
    expect(result.amount).toBeGreaterThanOrEqual(0);
  });

  it('should handle missing envelope record gracefully', () => {
    const today = new Date('2026-05-15').getTime();
    const txns = [
      {
        ts: new Date('2026-05-05').getTime(),
        amount: -500,
        cat: 'dining',
      },
    ];

    const result = SafeToSpend.compute({
      today,
      envelopeRecord: undefined,
      txns,
      upcomingBills: [],
    });

    // With no envelope: safe = 0 - 500 - 0 - 0 = -500 → 0
    expect(result.amount).toBe(0);
    expect(result.breakdown.expectedIncome).toBe(0);
    expect(result.breakdown.reserved).toBe(0);
  });
});
