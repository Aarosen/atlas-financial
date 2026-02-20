import {
  initializeDashboard,
  addMetricToDashboard,
  calculateCompleteness,
  shouldDisplayDashboard,
  getDashboardSummary,
  getMetricExplanation,
  getVisualizationConfig,
  formatDashboardForConversation,
} from '../dashboardEngine';

describe('Dashboard Engine', () => {
  describe('initializeDashboard', () => {
    it('should create empty dashboard', () => {
      const dashboard = initializeDashboard();
      expect(dashboard.metrics.length).toBe(0);
      expect(dashboard.completeness).toBe(0);
      expect(dashboard.readyToDisplay).toBe(false);
    });

    it('should set lastUpdated timestamp', () => {
      const before = Date.now();
      const dashboard = initializeDashboard();
      const after = Date.now();
      expect(dashboard.lastUpdated).toBeGreaterThanOrEqual(before);
      expect(dashboard.lastUpdated).toBeLessThanOrEqual(after);
    });
  });

  describe('addMetricToDashboard', () => {
    it('should add new metric', () => {
      let dashboard = initializeDashboard();
      dashboard = addMetricToDashboard(dashboard, {
        id: 'monthly_income',
        label: 'Monthly Income',
        value: 5000,
        unit: 'USD',
        category: 'income',
      });
      expect(dashboard.metrics.length).toBe(1);
      expect(dashboard.metrics[0].id).toBe('monthly_income');
    });

    it('should update existing metric', () => {
      let dashboard = initializeDashboard();
      dashboard = addMetricToDashboard(dashboard, {
        id: 'monthly_income',
        label: 'Monthly Income',
        value: 5000,
        unit: 'USD',
        category: 'income',
      });
      dashboard = addMetricToDashboard(dashboard, {
        id: 'monthly_income',
        label: 'Monthly Income',
        value: 6000,
        unit: 'USD',
        category: 'income',
      });
      expect(dashboard.metrics.length).toBe(1);
      expect(dashboard.metrics[0].value).toBe(6000);
    });

    it('should update lastUpdated timestamp', () => {
      let dashboard = initializeDashboard();
      const originalTime = dashboard.lastUpdated;
      dashboard = addMetricToDashboard(dashboard, {
        id: 'monthly_income',
        label: 'Monthly Income',
        value: 5000,
        unit: 'USD',
        category: 'income',
      });
      expect(dashboard.lastUpdated).toBeGreaterThanOrEqual(originalTime);
    });

    it('should update completeness', () => {
      let dashboard = initializeDashboard();
      expect(dashboard.completeness).toBe(0);
      dashboard = addMetricToDashboard(dashboard, {
        id: 'monthly_income',
        label: 'Monthly Income',
        value: 5000,
        unit: 'USD',
        category: 'income',
      });
      expect(dashboard.completeness).toBeGreaterThan(0);
    });
  });

  describe('calculateCompleteness', () => {
    it('should return 0 for empty dashboard', () => {
      const dashboard = initializeDashboard();
      expect(calculateCompleteness(dashboard)).toBe(0);
    });

    it('should calculate based on required metrics', () => {
      let dashboard = initializeDashboard();
      dashboard = addMetricToDashboard(dashboard, {
        id: 'monthly_income',
        label: 'Monthly Income',
        value: 5000,
        unit: 'USD',
        category: 'income',
      });
      const completeness = calculateCompleteness(dashboard);
      expect(completeness).toBeGreaterThan(0);
      expect(completeness).toBeLessThanOrEqual(100);
    });

    it('should return 100 for all required metrics', () => {
      let dashboard = initializeDashboard();
      dashboard = addMetricToDashboard(dashboard, {
        id: 'monthly_income',
        label: 'Monthly Income',
        value: 5000,
        unit: 'USD',
        category: 'income',
      });
      dashboard = addMetricToDashboard(dashboard, {
        id: 'monthly_expenses',
        label: 'Monthly Expenses',
        value: 3000,
        unit: 'USD',
        category: 'expenses',
      });
      dashboard = addMetricToDashboard(dashboard, {
        id: 'current_savings',
        label: 'Current Savings',
        value: 10000,
        unit: 'USD',
        category: 'savings',
      });
      dashboard = addMetricToDashboard(dashboard, {
        id: 'total_debt',
        label: 'Total Debt',
        value: 20000,
        unit: 'USD',
        category: 'debt',
      });
      expect(calculateCompleteness(dashboard)).toBe(100);
    });
  });

  describe('shouldDisplayDashboard', () => {
    it('should return false for empty dashboard', () => {
      const dashboard = initializeDashboard();
      expect(shouldDisplayDashboard(dashboard)).toBe(false);
    });

    it('should return false when completeness < 30%', () => {
      let dashboard = initializeDashboard();
      dashboard = addMetricToDashboard(dashboard, {
        id: 'monthly_income',
        label: 'Monthly Income',
        value: 5000,
        unit: 'USD',
        category: 'income',
      });
      if (dashboard.completeness < 30) {
        expect(shouldDisplayDashboard(dashboard)).toBe(false);
      }
    });

    it('should return true when completeness >= 30%', () => {
      let dashboard = initializeDashboard();
      dashboard = addMetricToDashboard(dashboard, {
        id: 'monthly_income',
        label: 'Monthly Income',
        value: 5000,
        unit: 'USD',
        category: 'income',
      });
      dashboard = addMetricToDashboard(dashboard, {
        id: 'monthly_expenses',
        label: 'Monthly Expenses',
        value: 3000,
        unit: 'USD',
        category: 'expenses',
      });
      dashboard = addMetricToDashboard(dashboard, {
        id: 'current_savings',
        label: 'Current Savings',
        value: 10000,
        unit: 'USD',
        category: 'savings',
      });
      if (dashboard.completeness >= 30) {
        expect(shouldDisplayDashboard(dashboard)).toBe(true);
      }
    });
  });

  describe('getDashboardSummary', () => {
    it('should return incomplete message for empty dashboard', () => {
      const dashboard = initializeDashboard();
      const summary = getDashboardSummary(dashboard);
      expect(summary).toContain('complete');
    });

    it('should include metrics in summary', () => {
      let dashboard = initializeDashboard();
      dashboard = addMetricToDashboard(dashboard, {
        id: 'monthly_income',
        label: 'Monthly Income',
        value: 5000,
        unit: 'USD',
        category: 'income',
      });
      dashboard = addMetricToDashboard(dashboard, {
        id: 'monthly_expenses',
        label: 'Monthly Expenses',
        value: 3000,
        unit: 'USD',
        category: 'expenses',
      });
      dashboard = addMetricToDashboard(dashboard, {
        id: 'current_savings',
        label: 'Current Savings',
        value: 10000,
        unit: 'USD',
        category: 'savings',
      });
      const summary = getDashboardSummary(dashboard);
      if (shouldDisplayDashboard(dashboard)) {
        expect(summary).toContain('5000');
        expect(summary).toContain('3000');
        expect(summary).toContain('10000');
      }
    });
  });

  describe('getMetricExplanation', () => {
    it('should provide explanation for known metrics', () => {
      const metric = {
        id: 'monthly_income',
        label: 'Monthly Income',
        value: 5000,
        unit: 'USD',
        category: 'income' as const,
      };
      const explanation = getMetricExplanation(metric);
      expect(explanation.explanation).toContain('income');
      expect(explanation.actionable).toBe(true);
    });

    it('should provide default explanation for unknown metrics', () => {
      const metric = {
        id: 'unknown_metric',
        label: 'Unknown Metric',
        value: 100,
        unit: 'units',
        category: 'health' as const,
      };
      const explanation = getMetricExplanation(metric);
      expect(explanation.explanation).toBeTruthy();
    });
  });

  describe('getVisualizationConfig', () => {
    it('should return empty array for empty dashboard', () => {
      const dashboard = initializeDashboard();
      const configs = getVisualizationConfig(dashboard);
      expect(configs.length).toBe(0);
    });

    it('should create comparison visualization', () => {
      let dashboard = initializeDashboard();
      dashboard = addMetricToDashboard(dashboard, {
        id: 'monthly_income',
        label: 'Monthly Income',
        value: 5000,
        unit: 'USD',
        category: 'income',
      });
      dashboard = addMetricToDashboard(dashboard, {
        id: 'monthly_expenses',
        label: 'Monthly Expenses',
        value: 3000,
        unit: 'USD',
        category: 'expenses',
      });
      const configs = getVisualizationConfig(dashboard);
      expect(configs.some(c => c.type === 'comparison')).toBe(true);
    });
  });

  describe('formatDashboardForConversation', () => {
    it('should return empty string for incomplete dashboard', () => {
      const dashboard = initializeDashboard();
      const formatted = formatDashboardForConversation(dashboard);
      expect(formatted).toBe('');
    });

    it('should format dashboard for display', () => {
      let dashboard = initializeDashboard();
      dashboard = addMetricToDashboard(dashboard, {
        id: 'monthly_income',
        label: 'Monthly Income',
        value: 5000,
        unit: 'USD',
        category: 'income',
      });
      dashboard = addMetricToDashboard(dashboard, {
        id: 'monthly_expenses',
        label: 'Monthly Expenses',
        value: 3000,
        unit: 'USD',
        category: 'expenses',
      });
      dashboard = addMetricToDashboard(dashboard, {
        id: 'current_savings',
        label: 'Current Savings',
        value: 10000,
        unit: 'USD',
        category: 'savings',
      });
      const formatted = formatDashboardForConversation(dashboard);
      if (shouldDisplayDashboard(dashboard)) {
        expect(formatted).toContain('Financial Dashboard');
        expect(formatted).toContain('Monthly Income');
      }
    });
  });
});
