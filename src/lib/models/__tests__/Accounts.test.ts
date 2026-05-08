import { describe, it, expect } from 'vitest';
import { Accounts, Account } from '../Accounts';

describe('Accounts model', () => {
  it('should rollup accounts correctly with net worth calculation', () => {
    const accounts: Account[] = [
      {
        id: 'acc_1',
        name: 'Chase checking',
        type: 'checking',
        balance: 5000,
        liquid: true,
        taxTreatment: 'cash',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'acc_2',
        name: 'Vanguard 401k',
        type: 'traditional_401k',
        balance: 50000,
        liquid: false,
        taxTreatment: 'pre_tax',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'acc_3',
        name: 'Credit card',
        type: 'credit_card',
        balance: 20000,
        apr: 0.22,
        liquid: true,
        taxTreatment: 'na',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'acc_4',
        name: 'Mortgage',
        type: 'mortgage',
        balance: 250000,
        apr: 0.045,
        liquid: false,
        taxTreatment: 'na',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const rollup = Accounts.rollup(accounts);

    expect(rollup.assets).toBe(55000); // 5k + 50k
    expect(rollup.liabilities).toBe(270000); // 20k + 250k
    expect(rollup.netWorth).toBe(-215000); // 55k - 270k
    expect(rollup.liquid).toBe(5000); // only checking
    expect(rollup.liquidNetWorth).toBe(-265000); // 5k - 270k
    expect(rollup.derivedHighInterestDebt).toBe(20000); // credit card at 22%
    expect(rollup.derivedLowInterestDebt).toBe(250000); // mortgage at 4.5%
  });

  it('should categorize accounts by tax treatment', () => {
    const accounts: Account[] = [
      {
        id: 'acc_1',
        name: 'Checking',
        type: 'checking',
        balance: 5000,
        liquid: true,
        taxTreatment: 'cash',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'acc_2',
        name: 'Traditional 401k',
        type: 'traditional_401k',
        balance: 100000,
        liquid: false,
        taxTreatment: 'pre_tax',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'acc_3',
        name: 'Roth IRA',
        type: 'roth_ira',
        balance: 50000,
        liquid: false,
        taxTreatment: 'tax_free',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const rollup = Accounts.rollup(accounts);

    expect(rollup.tax.postTax).toBe(5000);
    expect(rollup.tax.preTax).toBe(100000);
    expect(rollup.tax.taxFree).toBe(50000);
  });

  it('should handle empty accounts list', () => {
    const rollup = Accounts.rollup([]);

    expect(rollup.assets).toBe(0);
    expect(rollup.liabilities).toBe(0);
    expect(rollup.netWorth).toBe(0);
    expect(rollup.liquid).toBe(0);
    expect(rollup.liquidNetWorth).toBe(0);
  });

  it('should classify high-interest debt correctly', () => {
    const accounts: Account[] = [
      {
        id: 'cc1',
        name: 'Credit card',
        type: 'credit_card',
        balance: 5000,
        apr: 0.22,
        liquid: true,
        taxTreatment: 'na',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'sl1',
        name: 'Student loan',
        type: 'student_loan',
        balance: 30000,
        apr: 0.05,
        liquid: false,
        taxTreatment: 'na',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const rollup = Accounts.rollup(accounts);

    expect(rollup.derivedHighInterestDebt).toBe(5000); // only CC (22% > 8%)
    expect(rollup.derivedLowInterestDebt).toBe(30000); // student loan (5% < 8%)
  });
});
