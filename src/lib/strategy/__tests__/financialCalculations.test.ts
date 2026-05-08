import { describe, it, expect } from 'vitest';
import {
  calcDti,
  dtiTier,
  calcEmergencyFundMonths,
  calcSavingsRate,
  calcDisposableIncome,
} from '../financialCalculations';

describe('calcDti (CFPB definition)', () => {
  it('matches the CFPB worked example: $2,000 payments / $6,000 income = 33.3%', () => {
    expect(calcDti(2000, 6000)).toBeCloseTo(0.3333, 4);
  });

  it('returns 0 when income is 0 (treat as unknown, not healthy)', () => {
    expect(calcDti(2000, 0)).toBe(0);
  });

  it('returns 0 when income is negative', () => {
    expect(calcDti(2000, -1000)).toBe(0);
  });

  it('returns 0 when payments are 0 (no debt → tier=healthy via dtiTier)', () => {
    expect(calcDti(0, 6000)).toBe(0);
    expect(dtiTier(0)).toBe('healthy');
  });

  it('handles negative or NaN defensively', () => {
    expect(calcDti(-100, 6000)).toBe(0);
    expect(calcDti(NaN, 6000)).toBe(0);
    expect(calcDti(2000, NaN)).toBe(0);
  });

  it('handles undefined inputs', () => {
    expect(calcDti(undefined as any, 6000)).toBe(0);
    expect(calcDti(2000, undefined as any)).toBe(0);
  });

  it('handles null inputs', () => {
    expect(calcDti(null as any, 6000)).toBe(0);
    expect(calcDti(2000, null as any)).toBe(0);
  });

  it('is monotonic in payments (more payments → higher DTI)', () => {
    const income = 6000;
    expect(calcDti(1000, income)).toBeLessThan(calcDti(2000, income));
    expect(calcDti(2000, income)).toBeLessThan(calcDti(3000, income));
  });

  it('is monotonic-decreasing in income (higher income → lower DTI)', () => {
    const payments = 2000;
    expect(calcDti(payments, 10000)).toBeLessThan(calcDti(payments, 6000));
    expect(calcDti(payments, 6000)).toBeLessThan(calcDti(payments, 4000));
  });
});

describe('dtiTier', () => {
  it('tier boundaries match documented thresholds', () => {
    expect(dtiTier(0.19)).toBe('healthy');
    expect(dtiTier(0.20)).toBe('manageable');
    expect(dtiTier(0.35)).toBe('manageable');
    expect(dtiTier(0.36)).toBe('stretched');
    expect(dtiTier(0.42)).toBe('stretched');
    expect(dtiTier(0.43)).toBe('distressed');
    expect(dtiTier(0.99)).toBe('distressed');
  });

  it('always returns one of four tiers', () => {
    const tiers = ['healthy', 'manageable', 'stretched', 'distressed'];
    for (let i = 0; i <= 1; i += 0.1) {
      expect(tiers).toContain(dtiTier(i));
    }
  });
});

describe('calcEmergencyFundMonths', () => {
  it('calculates months correctly: $30k / $5k essentials = 6 months', () => {
    expect(calcEmergencyFundMonths(30000, 5000)).toBe(6);
  });

  it('returns 0 when savings is 0', () => {
    expect(calcEmergencyFundMonths(0, 5000)).toBe(0);
  });

  it('returns null when essentials is 0 (cannot divide by zero)', () => {
    expect(calcEmergencyFundMonths(10000, 0)).toBeNull();
  });

  it('returns null when essentials is negative', () => {
    expect(calcEmergencyFundMonths(10000, -1000)).toBeNull();
  });

  it('handles fractional months: $7500 / $5000 = 1.5 months', () => {
    expect(calcEmergencyFundMonths(7500, 5000)).toBe(1.5);
  });

  it('handles undefined inputs', () => {
    expect(calcEmergencyFundMonths(undefined as any, 5000)).toBe(0);
    expect(calcEmergencyFundMonths(10000, undefined as any)).toBeNull();
  });
});

describe('calcSavingsRate', () => {
  it('calculates savings rate: $10k − $5k − $2k = 30%', () => {
    const r = calcSavingsRate({
      monthlyIncome: 10000,
      essentialExpenses: 5000,
      discretionaryExpenses: 2000,
    });
    expect(r.value).toBeCloseTo(0.30, 2);
    expect(r.confidence).toBe('full');
  });

  it('falls back when discretionary is undefined', () => {
    const r = calcSavingsRate({
      monthlyIncome: 10000,
      essentialExpenses: 5000,
      discretionaryExpenses: undefined,
    });
    expect(r.value).toBeCloseTo(0.50, 2);
    expect(r.confidence).toBe('partial');
  });

  it('returns 0 when income is 0', () => {
    const r = calcSavingsRate({
      monthlyIncome: 0,
      essentialExpenses: 5000,
      discretionaryExpenses: 2000,
    });
    expect(r.value).toBe(0);
  });

  it('returns 0 (not negative) when expenses exceed income', () => {
    const r = calcSavingsRate({
      monthlyIncome: 5000,
      essentialExpenses: 4000,
      discretionaryExpenses: 2000,
    });
    expect(r.value).toBe(0); // clamped to 0
  });
});

describe('calcDisposableIncome', () => {
  it('calculates disposable income: $8000 − $3000 − $1500 = $3500', () => {
    expect(calcDisposableIncome(8000, 3000, 1500)).toBe(3500);
  });

  it('returns negative when expenses exceed income', () => {
    expect(calcDisposableIncome(5000, 4000, 2000)).toBe(-1000);
  });

  it('returns 0 when income is 0', () => {
    expect(calcDisposableIncome(0, 3000, 1500)).toBe(-4500);
  });
});

describe('property: calcDti monotonicity', () => {
  it('is monotonic in payments for fixed income', () => {
    const income = 6000;
    const payments = [0, 500, 1000, 1500, 2000, 2500];
    const dtiValues = payments.map(p => calcDti(p, income));
    for (let i = 1; i < dtiValues.length; i++) {
      expect(dtiValues[i]).toBeGreaterThanOrEqual(dtiValues[i - 1]);
    }
  });

  it('is monotonic-decreasing in income for fixed payments', () => {
    const payments = 2000;
    const incomes = [10000, 8000, 6000, 4000, 2000];
    const dtiValues = incomes.map(inc => calcDti(payments, inc));
    for (let i = 1; i < dtiValues.length; i++) {
      expect(dtiValues[i]).toBeGreaterThanOrEqual(dtiValues[i - 1]);
    }
  });
});
