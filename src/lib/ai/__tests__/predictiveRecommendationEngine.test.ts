import {
  calculateFinancialMetrics,
  predictRecommendations,
  formatRecommendationForConversation,
  shouldPresentRecommendation,
} from '../predictiveRecommendationEngine';

describe('Predictive Recommendation Engine', () => {
  describe('calculateFinancialMetrics', () => {
    it('should calculate metrics from partial data', () => {
      const metrics = calculateFinancialMetrics({
        monthlyIncome: 5000,
        monthlyExpenses: 3000,
        totalDebt: 20000,
      });
      expect(metrics.monthlyIncome).toBe(5000);
      expect(metrics.monthlyExpenses).toBe(3000);
      expect(metrics.totalDebt).toBe(20000);
    });

    it('should default missing values to 0', () => {
      const metrics = calculateFinancialMetrics({ monthlyIncome: 4000 });
      expect(metrics.monthlyExpenses).toBe(0);
      expect(metrics.totalDebt).toBe(0);
      expect(metrics.currentSavings).toBe(0);
    });
  });

  describe('predictRecommendations', () => {
    it('should recommend debt payoff for high-interest debt', () => {
      const metrics = calculateFinancialMetrics({
        monthlyIncome: 5000,
        monthlyExpenses: 3000,
        totalDebt: 20000,
        debtInterestRate: 18,
        monthlyDebtPayment: 500,
      });
      const analysis = predictRecommendations(metrics);
      expect(analysis.topRecommendations.length).toBeGreaterThan(0);
      expect(analysis.topRecommendations.some(r => r.focusArea === 'debt_payoff')).toBe(true);
    });

    it('should recommend emergency fund when savings are low', () => {
      const metrics = calculateFinancialMetrics({
        monthlyIncome: 4000,
        monthlyExpenses: 3000,
        currentSavings: 2000,
      });
      const analysis = predictRecommendations(metrics);
      expect(analysis.topRecommendations.some(r => r.focusArea === 'emergency_fund')).toBe(true);
    });

    it('should recommend savings growth when below goal', () => {
      const metrics = calculateFinancialMetrics({
        monthlyIncome: 5000,
        monthlyExpenses: 3000,
        currentSavings: 5000,
        savingsGoal: 20000,
      });
      const analysis = predictRecommendations(metrics);
      expect(analysis.topRecommendations.some(r => r.focusArea === 'savings_growth')).toBe(true);
    });

    it('should recommend expense reduction when savings rate is low', () => {
      const metrics = calculateFinancialMetrics({
        monthlyIncome: 3000,
        monthlyExpenses: 2800,
      });
      const analysis = predictRecommendations(metrics);
      expect(analysis.topRecommendations.some(r => r.focusArea === 'expense_reduction')).toBe(true);
    });

    it('should recommend investing when financially healthy', () => {
      const metrics = calculateFinancialMetrics({
        monthlyIncome: 6000,
        monthlyExpenses: 3000,
        currentSavings: 15000,
        totalDebt: 0,
      });
      const analysis = predictRecommendations(metrics);
      expect(analysis.topRecommendations.some(r => r.focusArea === 'investing')).toBe(true);
    });

    it('should calculate monthly net income', () => {
      const metrics = calculateFinancialMetrics({
        monthlyIncome: 5000,
        monthlyExpenses: 3000,
      });
      const analysis = predictRecommendations(metrics);
      expect(analysis.monthlyNetIncome).toBe(2000);
    });

    it('should calculate debt to income ratio', () => {
      const metrics = calculateFinancialMetrics({
        monthlyIncome: 5000,
        totalDebt: 60000,
      });
      const analysis = predictRecommendations(metrics);
      expect(analysis.debtToIncomeRatio).toBe(1);
    });

    it('should calculate savings rate', () => {
      const metrics = calculateFinancialMetrics({
        monthlyIncome: 5000,
        monthlyExpenses: 3000,
      });
      const analysis = predictRecommendations(metrics);
      expect(analysis.savingsRate).toBe(40);
    });

    it('should calculate emergency fund months', () => {
      const metrics = calculateFinancialMetrics({
        monthlyExpenses: 3000,
        currentSavings: 9000,
      });
      const analysis = predictRecommendations(metrics);
      expect(analysis.emergencyFundMonths).toBe(3);
    });

    it('should return top 3 recommendations', () => {
      const metrics = calculateFinancialMetrics({
        monthlyIncome: 5000,
        monthlyExpenses: 3000,
        totalDebt: 20000,
        debtInterestRate: 15,
        monthlyDebtPayment: 500,
        currentSavings: 2000,
        savingsGoal: 20000,
      });
      const analysis = predictRecommendations(metrics);
      expect(analysis.topRecommendations.length).toBeLessThanOrEqual(3);
    });
  });

  describe('formatRecommendationForConversation', () => {
    it('should format recommendation as conversational text', () => {
      const rec = {
        id: 'test',
        focusArea: 'debt_payoff' as const,
        title: 'Pay Off Debt',
        description: 'You have high-interest debt.',
        impact: {
          metric: 'Interest Saved',
          value: 5000,
          unit: 'dollars',
          timeframe: '12 months',
        },
        reasoning: 'High interest costs money.',
        confidence: 0.9,
      };
      const formatted = formatRecommendationForConversation(rec);
      expect(formatted).toContain('Pay Off Debt');
      expect(formatted).toContain('5,000');
      expect(formatted).toContain('12 months');
    });
  });

  describe('shouldPresentRecommendation', () => {
    it('should present high-confidence recommendations', () => {
      const rec = {
        id: 'test',
        focusArea: 'debt_payoff' as const,
        title: 'Pay Off Debt',
        description: 'Test',
        impact: { metric: 'Test', value: 0, unit: 'dollars', timeframe: '1 month' },
        reasoning: 'Test',
        confidence: 0.85,
      };
      expect(shouldPresentRecommendation(rec)).toBe(true);
    });

    it('should not present low-confidence recommendations', () => {
      const rec = {
        id: 'test',
        focusArea: 'debt_payoff' as const,
        title: 'Pay Off Debt',
        description: 'Test',
        impact: { metric: 'Test', value: 0, unit: 'dollars', timeframe: '1 month' },
        reasoning: 'Test',
        confidence: 0.5,
      };
      expect(shouldPresentRecommendation(rec)).toBe(false);
    });

    it('should present recommendation matching customer preference', () => {
      const rec = {
        id: 'test',
        focusArea: 'debt_payoff' as const,
        title: 'Pay Off Debt',
        description: 'Test',
        impact: { metric: 'Test', value: 0, unit: 'dollars', timeframe: '1 month' },
        reasoning: 'Test',
        confidence: 0.6,
      };
      expect(shouldPresentRecommendation(rec, 'debt_payoff')).toBe(true);
    });

    it('should not present recommendation not matching customer preference', () => {
      const rec = {
        id: 'test',
        focusArea: 'debt_payoff' as const,
        title: 'Pay Off Debt',
        description: 'Test',
        impact: { metric: 'Test', value: 0, unit: 'dollars', timeframe: '1 month' },
        reasoning: 'Test',
        confidence: 0.6,
      };
      expect(shouldPresentRecommendation(rec, 'savings_growth')).toBe(false);
    });
  });
});
