import { describe, it, expect } from 'vitest';
import { extractFinancialSnapshot } from '../financialExtractor';

describe('extractFinancialSnapshot', () => {
  it('extracts income, expenses, and savings', () => {
    const messages = [
      { role: 'user', content: 'I make $5000 a month and spend $3000 on essentials. I have $10000 saved.' },
    ];
    const result = extractFinancialSnapshot(messages);
    
    expect(result).not.toBeNull();
    expect(result?.monthlyIncome).toBe(5000);
    expect(result?.monthlyFixedExpenses).toBe(3000);
    expect(result?.currentSavings).toBe(10000);
  });

  it('returns null when insufficient data', () => {
    const messages = [
      { role: 'user', content: 'I am struggling with my finances.' },
    ];
    const result = extractFinancialSnapshot(messages);
    
    expect(result).toBeNull();
  });

  // T0.5: Monthly debt payments extraction
  describe('T0.5 Monthly Debt Payments Extraction', () => {
    it('extracts monthly debt payments from explicit statement', () => {
      const messages = [
        { role: 'user', content: 'I make $6000 a month and spend $3000 on rent and bills. I pay $500 on debt.' },
      ];
      const result = extractFinancialSnapshot(messages);
      
      expect(result).not.toBeNull();
      expect(result?.monthlyDebtPayments).toBe(500);
    });

    it('extracts monthly debt payments with "debt payments" phrasing', () => {
      const messages = [
        { role: 'user', content: 'My income is $5000, expenses are $2000, and debt payments are $800.' },
      ];
      const result = extractFinancialSnapshot(messages);
      
      expect(result).not.toBeNull();
      expect(result?.monthlyDebtPayments).toBe(800);
    });

    it('extracts monthly debt payments with "minimum payments" phrasing', () => {
      const messages = [
        { role: 'user', content: 'I earn $4000 a month, spend $2500, and my minimum payments total $300.' },
      ];
      const result = extractFinancialSnapshot(messages);
      
      expect(result).not.toBeNull();
      expect(result?.monthlyDebtPayments).toBe(300);
    });

    it('extracts monthly debt payments with "paying" phrasing', () => {
      const messages = [
        { role: 'user', content: 'I make $7000, spend $4000 on essentials, and I am paying $600 toward debt.' },
      ];
      const result = extractFinancialSnapshot(messages);
      
      expect(result).not.toBeNull();
      expect(result?.monthlyDebtPayments).toBe(600);
    });

    it('handles k notation for debt payments', () => {
      const messages = [
        { role: 'user', content: 'Income: $10k, expenses: $5k, debt payments: $1.5k' },
      ];
      const result = extractFinancialSnapshot(messages);
      
      expect(result).not.toBeNull();
      expect(result?.monthlyDebtPayments).toBe(1500);
    });

    it('returns null for debt payments when confidence is low', () => {
      const messages = [
        { role: 'user', content: 'I make $5000 and I am drowning in $10000 of debt.' },
      ];
      const result = extractFinancialSnapshot(messages);
      
      // Should extract income and expenses if present, but not debt payment (low confidence)
      expect(result?.monthlyDebtPayments).toBeNull();
    });

    it('extracts all four fields together', () => {
      const messages = [
        { role: 'user', content: 'I earn $6000 monthly, spend $3800 on rent and bills, have $15000 saved, and pay $400 on debt.' },
      ];
      const result = extractFinancialSnapshot(messages);
      
      expect(result).not.toBeNull();
      expect(result?.monthlyIncome).toBe(6000);
      expect(result?.monthlyFixedExpenses).toBe(3800);
      expect(result?.currentSavings).toBe(15000);
      expect(result?.monthlyDebtPayments).toBe(400);
    });

    it('handles multiple messages in conversation', () => {
      const messages = [
        { role: 'user', content: 'I make $5000 a month.' },
        { role: 'assistant', content: 'What are your expenses?' },
        { role: 'user', content: 'I spend $3000 on essentials and pay $500 on debt.' },
      ];
      const result = extractFinancialSnapshot(messages);
      
      expect(result).not.toBeNull();
      expect(result?.monthlyIncome).toBe(5000);
      expect(result?.monthlyFixedExpenses).toBe(3000);
      expect(result?.monthlyDebtPayments).toBe(500);
    });
  });
});
