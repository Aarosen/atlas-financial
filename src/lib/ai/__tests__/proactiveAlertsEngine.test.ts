import { describe, it, expect } from 'vitest';
import { proactiveAlertsEngine } from '../proactiveAlertsEngine';

describe('Proactive Alerts Engine', () => {
  it('detects high-interest debt alerts', () => {
    const alerts = proactiveAlertsEngine.detectDebtAlerts(5000, 0);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].type).toBe('debt_milestone');
    expect(alerts[0].priority).toBe('high');
  });

  it('detects debt payoff milestone when close to zero', () => {
    const alerts = proactiveAlertsEngine.detectDebtAlerts(300, 0);
    expect(alerts.some((a) => a.title.includes('Close'))).toBe(true);
  });

  it('detects subscription renewal alerts', () => {
    const alerts = proactiveAlertsEngine.detectSubscriptionAlerts(3000);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].type).toBe('subscription_renewal');
  });

  it('detects emergency fund gaps', () => {
    const alerts = proactiveAlertsEngine.detectSavingsAlerts(2000, 5000, 0);
    expect(alerts.some((a) => a.title.includes('Emergency'))).toBe(true);
  });

  it('detects investment opportunities when emergency fund is solid', () => {
    const alerts = proactiveAlertsEngine.detectSavingsAlerts(20000, 5000, 0);
    expect(alerts.some((a) => a.title.includes('Investing'))).toBe(true);
  });

  it('detects credit score improvement opportunities', () => {
    const alerts = proactiveAlertsEngine.detectCreditAlerts(650);
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0].type).toBe('credit_score_improvement');
  });

  it('generates all relevant alerts', () => {
    const alerts = proactiveAlertsEngine.generateAllAlerts({
      monthlyIncome: 5000,
      highInterestDebt: 3000,
      lowInterestDebt: 10000,
      totalSavings: 5000,
      monthlyExpenses: 3500,
      creditScore: 680,
    });

    expect(alerts.length).toBeGreaterThan(0);
    // Should be sorted by priority
    const priorities = alerts.map((a) => a.priority);
    expect(['critical', 'high']).toContain(priorities[0]);
  });

  it('formats alerts for conversation', () => {
    const alerts = proactiveAlertsEngine.generateAllAlerts({
      monthlyIncome: 4000,
      highInterestDebt: 2000,
      lowInterestDebt: 5000,
      totalSavings: 3000,
      monthlyExpenses: 2500,
    });

    const formatted = proactiveAlertsEngine.formatAlertsForConversation(alerts, 2);
    expect(formatted).toContain('Things I noticed');
    expect(formatted).toContain('priority');
  });

  it('limits alerts displayed in conversation', () => {
    const alerts = proactiveAlertsEngine.generateAllAlerts({
      monthlyIncome: 5000,
      highInterestDebt: 5000,
      lowInterestDebt: 20000,
      totalSavings: 2000,
      monthlyExpenses: 3500,
      creditScore: 600,
    });

    const formatted = proactiveAlertsEngine.formatAlertsForConversation(alerts, 2);
    // Should mention that there are more alerts
    if (alerts.length > 2) {
      expect(formatted).toContain('more alerts');
    }
  });
});
